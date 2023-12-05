import json
import logging
from typing import Union, Optional
import boto3
import botocore
from botocore.exceptions import NoCredentialsError
from dwca.read import DwCAReader
from fastapi import APIRouter, Depends, Form
from routers.licences import get_licence
from util.airflow import start_ingest_dag
from util.collectory import get_data_resource, update_conn_params, create_or_update_data_resource
from util.config import get_app_config, AppConfig
from util.auth import get_user, JWTBearer, User
from util.error_codes import ErrorCode
from util.responses import ErrorResponse, PublishResponse

router = APIRouter()


@router.post(
    "/validate/publish",
    tags=["publish"],
    name="Publish a pre-validated dataset",
    description="Publish a pre-validated dataset. To use this service, users must first use the validate service and use the supplied requestID",
    summary="Publish a pre-validated dataset",
    dependencies=[Depends(JWTBearer())],
    response_model=Union[PublishResponse, ErrorResponse]
)
async def publish_validated(
        name: Optional[str] = Form(None),
        licenceUrl: Optional[str] = Form(None),
        pubDescription: Optional[str] = Form(None),
        citation: Optional[str] = Form(None),
        rights: Optional[str] = Form(None),
        purpose: Optional[str] = Form(None),
        methodStepDescription: Optional[str] = Form(None),
        qualityControlDescription: Optional[str] = Form(None),
        tempPath: str = Form(),
        requestID: str = Form(),
        user: User = Depends(get_user),
        config: AppConfig = Depends(get_app_config)):
    return await republish_validated(name, licenceUrl, pubDescription, citation, rights, purpose,
                                     methodStepDescription, qualityControlDescription,
                                     tempPath, requestID, None, user, config)


@router.post(
    "/validate/publish/{dataResourceUid}",
    name="Re-publish a pre-validated dataset",
    description="Re-publish a pre-validated dataset. To use this service, users must first use the validate service and use the supplied requestID",
    tags=["publish"],
    dependencies=[Depends(JWTBearer())],
    response_model=Union[PublishResponse, ErrorResponse]
)
async def republish_validated(
        name: Optional[str] = Form(None),
        licenceUrl: Optional[str] = Form(None),
        pubDescription: Optional[str] = Form(None),
        citation: Optional[str] = Form(None),
        rights: Optional[str] = Form(None),
        purpose: Optional[str] = Form(None),
        methodStepDescription: Optional[str] = Form(None),
        qualityControlDescription: Optional[str] = Form(None),
        tempPath: str = Form(),
        requestID: str = Form(),
        dataResourceUid: Union[str, None] = None,
        user: User = Depends(get_user),
        config: AppConfig = Depends(get_app_config)):
    """
    Publish a dataset using the supplied darwin core archive
    :param user:
    :param requestID:
    :param tempPath:
    :param qualityControlDescription:
    :param methodStepDescription:
    :param purpose:
    :param rights:
    :param citation:
    :param pubDescription:
    :param licenceUrl:
    :param name:
    :param dataResourceUid:
    :param config:
    :return:
    """
    # check user is authenticated
    if user and user.is_publisher is False and user.is_admin is False:
        return ErrorResponse(error=ErrorCode.NOT_AUTHORIZED, message="You are not authorised to publish datasets")

    # Check if the post request has the file part
    if tempPath is None:
        logging.info("Request missing tempPath.")
        return ErrorResponse(error=ErrorCode.DATA_FILE_MISSING_FOUND, message="Missing the tempPath file reference")

    # check user is authorised to edit this datasets
    if dataResourceUid:
        # user needs to be creator or have ROLE_ADMIN privilege
        data_resource = get_data_resource(dataResourceUid, config)
        if data_resource is None:
            return ErrorResponse(error=ErrorCode.INVALID_DATA_RESOURCE_UID, message="The data resource UID is not recognised")

        created_by_id = data_resource['createdByID']

        if created_by_id != user.id and not user.is_admin:
            return ErrorResponse(error=ErrorCode.NOT_AUTHORIZED_FOR_DATA_RESOURCE,
                                 message="You are not authorised to update this resource")

    request_id = None

    # Check if the form fields are present in the request
    if name is None or licenceUrl is None or pubDescription is None:
        return ErrorResponse(error=ErrorCode.MISSING_REQUIRED_FIELD, message="Missing required fields")

    # check form submission fields
    licence = get_licence(licenceUrl)
    if licence is None:
        return ErrorResponse(error=ErrorCode.UNRECOGNISED_LICENCE,
                             message="Unrecognised licence. Check /licences for a list of recognised licences")

    # validate dwca archive
    data_resource = {
        "name": name,
        "licenseType": licence.value['acronym'],
        "licenseVersion": licence.value['version'],
        "pubDescription": pubDescription,
        "citation": citation,
        "rights": rights,
        "purpose": purpose,
        "methodStepDescription": methodStepDescription,
        "qualityControlDescription": qualityControlDescription,
        "connectionParameters": json.dumps({
            "termsForUniqueKey": ["occurrenceID"],
            "protocol": "DwCA"
        }),
        "createdByID": user.id
    }

    try:
        # update the registry
        data_resource_uid = create_or_update_data_resource(dataResourceUid, data_resource, user, config)

        if data_resource_uid:
            logging.info("Copy from temp location to dwca-imports")
            request_id = requestID
            s3 = boto3.client('s3')
            # Copy the object
            s3.copy_object(
                Bucket=config.s3_bucket_name,
                CopySource={'Bucket': config.s3_bucket_name, 'Key': f'file-uploads/{tempPath}'},
                Key=f"dwca-imports/{data_resource_uid}/{data_resource_uid}.zip"
            )

        # Update the connection parameters to include references to S3
        update_conn_params(data_resource_uid, config)
        return start_ingest_dag(name, data_resource_uid, request_id, user, config)

    except botocore.exceptions.ClientError as ce:
        logging.error("AWS credentials not available or expired", ce, exc_info=True)
        return ErrorResponse(error=ErrorCode.AWS_CRED_EXPIRED, message='AWS credentials not available or expired')
    except NoCredentialsError as ne:
        logging.error("AWS credentials not available", ne, exc_info=True)
        return ErrorResponse(error=ErrorCode.AWS_NOT_AVAILABLE, message='AWS credentials not available')
    except Exception as e:
        logging.error("Exception", e, exc_info=True)
        return ErrorResponse(error=ErrorCode.SYSTEM_ERROR, message=f'Error: {str(e)}')


def _find_partial_match(dictionary, search_string):
    for key in dictionary.keys():
        if search_string in key:
            return key
    return None





def is_valid_dwca(zip_file_path):
    try:
        reader = DwCAReader(zip_file_path)
    except Exception as e:
        logging.error(f"Error with reading archive {e}", exc_info=True)
        return False
    return True
