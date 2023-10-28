import json
import os
import uuid
import logging
from pathlib import Path
from typing import Union
import boto3
import botocore
from botocore.exceptions import NoCredentialsError
from dwc_validator.validate_dwca import validate_archive
from dwca.darwincore.utils import qualname as qn
from dwca.read import DwCAReader
from fastapi import APIRouter, Request, Depends, UploadFile, File
from routers.licences import get_licence
from util.airflow import start_ingest_dag
from util.collectory import get_data_resource, update_conn_params, create_or_update_data_resource
from util.config import get_app_config, AppConfig
from util.auth import check_auth
from util.eml import extract_metadata
from util.responses import ErrorResponse

router = APIRouter()


@router.post(
    "/process",
    tags=["publish"],
    name="Validate and publish a dataset",
    description="Validate and publish a dataset using the supplied darwin core archive",
    summary="Validate and publish a dataset",
)
async def process(
        request: Request,
        file: UploadFile = File(...),
        config: AppConfig = Depends(get_app_config)):
    return await reprocess(request, None, file, config)

@router.post(
    "/process/{dataResourceUid}",
    name="Validate and publish a dataset",
    description="Validate and republish a dataset using the supplied darwin core archive",
    summary="Validate and republish a dataset",
    tags=["publish"]
)
async def reprocess(
        request: Request,
        dataResourceUid: Union[str, None] = None,
        file: UploadFile = File(...),
        config: AppConfig = Depends(get_app_config)):
    """
    Validate and publish a dataset using the supplied darwin core archive
    :param file:
    :param request:
    :param dataResourceUid:
    :param config:
    :return:
    """
    # check user is authenticated
    user = check_auth(request)
    if not user:
        return ErrorResponse(error='NOT_AUTHORIZED', message='Please provide authentication details')

    if user.is_publisher is False and user.is_admin is False:
        return ErrorResponse(error='NOT_AUTHORIZED', message='You are not authorised to publish datasets')

    # generate request ID for status calls
    request_id = str(uuid.uuid4())

    # read the uploaded file
    file2store = await file.read()

    # Check if the post request has the file part
    if not file2store:
        logging.info("Validation request missing file")
        return ErrorResponse(error='MISSING_DATA_FILE', message='HTTP POST missing Missing file')

    # Save the file temporarily
    temp_file_path = f'/tmp/temp-{request_id}.zip'
    try:
        with open(temp_file_path, 'wb') as f:
            f.write(file2store)
    except Exception as e:
        logging.error(f"Error with reading archive {e}", exc_info=True)
        return ErrorResponse(error='FILE_UPLOAD_ERROR', message=f'Problem with the submitted file upload')
    finally:
        file.file.close()

    metadata = {}
    try:
        # validate the dataset
        with DwCAReader(temp_file_path) as dwca:

            # check the core type is supported
            core_type = dwca.descriptor.core.type
            logging.info("Core type: %s", core_type)
            supported_core_types = {qn('Occurrence'), qn('Event')}

            if core_type not in supported_core_types:
                return ErrorResponse(error='UNSUPPORTED_CORE_TYPE', message=f'The core type {core_type} is not supported')

            # check metadata
            if dwca.metadata:
                metadata = extract_metadata(dwca.metadata)

            # Check for mandatory fields
            if 'name' not in metadata or metadata['name'] is None or 'licenceUrl' not in metadata or metadata['licenceUrl'] is None or 'pubDescription' not in metadata or metadata['pubDescription'] is None:
                logging.info("Request missing mandatory fields")
                return ErrorResponse(error='MISSING_REQUIRED_FIELD',
                                     message="Missing required fields. name, licenceUrl and description must be present in EML to pass validation")

            # validate the licence
            licence = get_licence(metadata['licenceUrl'])
            if licence is None:
                return ErrorResponse(error='UNRECOGNISED_LICENCE', message=f"Unrecognised licence {metadata['licenceUrl']}. Check /licences for a list of recognised licences")

            validate_report = validate_archive(dwca)
            if not validate_report.valid:
                os.remove(temp_file_path)
                logging.info("Darwin core archive failed validation.")
                return {
                    'valid': False,
                    'datasetType': validate_report.dataset_type,
                    'breakdowns': validate_report.breakdowns,
                    'fileName': file.filename,
                    'requestID': request_id,
                    'coreValidation': validate_report.core,
                    'extensionValidations': validate_report.extensions
                }

        # check user is authorised to edit this datasets
        if dataResourceUid:

            # user needs to be creator or have ROLE_ADMIN privilege
            data_resource = get_data_resource(dataResourceUid, config)
            if data_resource is None:
                return ErrorResponse(error='NOT_FOUND', message='The data resource UID is not recognised')

            created_by_id = data_resource['createdByID']

            if created_by_id != user.id and not user.is_admin:
                return ErrorResponse(error='NOT_AUTHORIZED_FOR_DATA_RESOURCE', message='You are not authorised to update this resource')

        # validate dwca archive
        data_resource = {
            "name":  metadata['name'],
            "licenseType": licence.value['acronym'],
            "licenseVersion": licence.value['version'],
            "pubDescription": metadata['pubDescription'],
            "citation": metadata['citation'],
            "rights": metadata['rights'],
            "purpose": metadata['purpose'],
            "methodStepDescription": metadata['methodStepDescription'],
            "qualityControlDescription": metadata['qualityControlDescription'],
            "connectionParameters": json.dumps({
                "termsForUniqueKey": ["occurrenceID"],
                "protocol": "DwCA"
            }),
            "createdByID": user.id
        }

        # register in the collectory
        data_resource_uid = create_or_update_data_resource(dataResourceUid, data_resource, user, config)

        if data_resource_uid:
            # upload to s3
            logging.info("Uploading to S3 bucket...")
            s3 = boto3.client('s3')
            s3.upload_file(temp_file_path, config.s3_bucket_name,
                           f"dwca-imports/{data_resource_uid}/{data_resource_uid}.zip")
            os.remove(temp_file_path)  # Remove the temporary file
            logging.info(
                f'File uploaded successfully to S3! Details: Name={data_resource["name"]}')
        else:
            return ErrorResponse(error='REGISTRY_ERROR', message='Problem updating dataset in the registry')

        # Update the connection parameters to include references to S3
        update_conn_params(data_resource_uid, config)
        return start_ingest_dag(metadata['name'], data_resource_uid, request_id, user, config)

    except botocore.exceptions.ClientError as ce:
        if temp_file_path and Path(temp_file_path).is_file():
            os.remove(temp_file_path)  # Remove the temporary file in case of upload failure
        logging.error("AWS credentials not available or expired", ce, exc_info=True)
        return ErrorResponse(error='AWS_CRED_EXPIRED', message='AWS credentials not available or expired')
    except NoCredentialsError as ne:
        if temp_file_path and Path(temp_file_path).is_file():
            os.remove(temp_file_path)  # Remove the temporary file in case of upload failure
        logging.error("AWS credentials not available", ne, exc_info=True)
        return ErrorResponse(error='AWS_NOT_AVAILABLE', message='AWS credentials not available')
    except Exception as e:
        if temp_file_path and Path(temp_file_path).is_file():
            os.remove(temp_file_path)  # Remove the temporary file in case of upload failure
        logging.error("Exception", e, exc_info=True)
        return ErrorResponse(error='SYSTEM_ERROR', message=f'Error: {str(e)}')
