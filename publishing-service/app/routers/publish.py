import json
import uuid
import logging
from typing import Union, Optional
import boto3
import botocore
import requests
from botocore.exceptions import NoCredentialsError
from dwca.read import DwCAReader
from fastapi import APIRouter, Request, Depends, Form
from requests.auth import HTTPBasicAuth
from routers.licences import get_licence
from util.airflow import start_ingest_dag
from util.collectory import get_data_resource, update_conn_params, create_or_update_data_resource
from util.config import get_app_config, AppConfig
from util.auth import check_auth
from util.responses import ErrorResponse, PublishResponse

router = APIRouter()


@router.post(
    "/publish",
    tags=["publish"],
    name="Publish a dataset",
    description="Publish a pre-validated dataset. To use this service, users must first use the validate service and use the supplied requestID",
    summary="Publish a dataset",
)
@router.post(
    "/publish/{dataResourceUid}",
    name="Re-publish a dataset",
    description="Re-publish a pre-validated dataset. To use this service, users must first use the validate service and use the supplied requestID",
    tags=["publish"])
async def publish(
        request: Request,
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
        config: AppConfig = Depends(get_app_config)):
    """
    Publish a dataset using the supplied darwin core archive
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
    :param request:
    :param dataResourceUid:
    :param config:
    :return:
    """
    # check user is authenticated
    user = check_auth(request)
    if not user:
        return ErrorResponse(error='NOT_AUTHORIZED', message="Please provide authentication details")

    if user.is_publisher is False and user.is_admin is False:
        return ErrorResponse(error='NOT_AUTHORIZED', message="You are not authorised to publish datasets")

    # Check if the post request has the file part
    if tempPath is None:
        logging.info("Request missing tempPath.")
        return ErrorResponse(error='DATA_FILE_MISSING_FOUND', message="Missing the tempPath file reference")

    # check user is authorised to edit this datasets
    if dataResourceUid:
        # user needs to be creator or have ROLE_ADMIN privilege
        data_resource = get_data_resource(dataResourceUid, config)
        if data_resource is None:
            return ErrorResponse(error='NOT_FOUND', message="The data resource UID is not recognised")

        created_by_id = data_resource['createdByID']

        if created_by_id != user.id and not user.is_admin:
            return ErrorResponse(error='NOT_AUTHORIZED_FOR_DATA_RESOURCE', message="You are not authorised to update this resource")

    request_id = None

    # Check if the form fields are present in the request
    if name is None or licenceUrl is None or pubDescription is None:
        return ErrorResponse(error='MISSING_REQUIRED_FIELD', message="Missing required fields")

    # check form submission fields
    licence = get_licence(licenceUrl)
    if licence is None:
        return ErrorResponse(error='UNRECOGNISED_LICENCE', message="Unrecognised licence. Check /licences for a list of recognised licences")

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
        return ErrorResponse(error='AWS_CRED_EXPIRED', message='AWS credentials not available or expired')
    except NoCredentialsError as ne:
        logging.error("AWS credentials not available", ne, exc_info=True)
        return ErrorResponse(error='AWS_NOT_AVAILABLE', message='AWS credentials not available')
    except Exception as e:
        logging.error("Exception", e, exc_info=True)
        return ErrorResponse(error='SYSTEM_ERROR', message=f'Error: {str(e)}')


def _find_partial_match(dictionary, search_string):
    for key in dictionary.keys():
        if search_string in key:
            return key
    return None


@router.delete("/publish/{dataResourceUid}",
               name="Un-publish a dataset",
               description="Un-publish a  dataset",
               tags=["publish"])
async def un_publish(request: Request, dataResourceUid: str, config: AppConfig = Depends(get_app_config)):
    # check user is authenticated
    user = check_auth(request)
    if not user:
        return ErrorResponse(error='NOT_AUTHORIZED', message='Please provide authentication details')

    # check user is authorised to edit this datasets
    if dataResourceUid:

        # user needs to be creator or have ROLE_ADMIN privilege
        data_resource = get_data_resource(dataResourceUid)
        if data_resource is None:
            return ErrorResponse(error='NOT_FOUND', message='The data resource UID is not recognised')

        created_by_id = data_resource['createdByID']

        if created_by_id != user.id and not user.is_admin:
            return ErrorResponse(error='NOT_AUTHORIZED_FOR_DATA_RESOURCE', message='You are not authorised to update this resource')

        endpoint = f'{config.airflow_api_base_url}/dags/Delete_dataset_dag/dagRuns'
        headers = {
            'Content-Type': 'application/json'
        }

        request_id = str(uuid.uuid4())

        dag_run_data = {
            "dag_run_id": request_id,
            "note": f"Delete - {data_resource['name']}",
            "conf": {
                "userid": user.id,
                "userEmail": user.email,
                "userDisplayName": user.name,
                "dataset_name": data_resource['name'],
                "datasetIds": dataResourceUid,
                "remove_records_in_solr": "true",
                "remove_records_in_es": "false",
                "delete_avro_files": "true",
                "retain_dwca": "true",
                "retain_uuid": "true"
            }
        }

        airflow_response = requests.post(endpoint, json=dag_run_data, headers=headers,
                                         auth=HTTPBasicAuth(config.airflow_username, config.airflow_password))

        if airflow_response.status_code == 200:
            # start the publishing
            return PublishResponse(
                requestID=request_id,
                dataResourceUid=dataResourceUid,
                message="Dataset delete request started",
                statusUrl=f"/status/{request_id}",
                metadataUrl=f"{config.collectory_lookup_url}/dataResource/{dataResourceUid}",
                metadataWsUrl=f"{config.collectory_lookup_url}/ws/dataResource/{dataResourceUid}"
            )
        else:
            logging.info(f"Failed to start DAG. Status code: {airflow_response.status_code}")
            return ErrorResponse(error='AIRFLOW_ERROR', message=f'Unable to access airflow. Response code {airflow_response.status_code}')

    else:
        return ErrorResponse(error='INVALID_DATA_RESOURCE_UID', message='Invalid or empty data resource')


def is_valid_dwca(zip_file_path):
    try:
        reader = DwCAReader(zip_file_path)
    except Exception as e:
        logging.error(f"Error with reading archive {e}", exc_info=True)
        return False
    return True
