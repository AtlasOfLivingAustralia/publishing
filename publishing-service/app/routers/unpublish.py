import uuid
import logging
from typing import Union
import requests
from fastapi import APIRouter, Depends
from requests.auth import HTTPBasicAuth
from util.collectory import get_data_resource
from util.config import get_app_config, AppConfig
from util.auth import get_user, JWTBearer, User
from util.error_codes import ErrorCode
from util.responses import ErrorResponse, PublishResponse

router = APIRouter()


@router.delete("/publish/{dataResourceUid}",
               name="Un-publish a dataset",
               description="Un-publish a  dataset",
               tags=["publish"],
               dependencies=[Depends(JWTBearer())],
               response_model=Union[PublishResponse, ErrorResponse])
async def un_publish(dataResourceUid: str,
                     user: User = Depends(get_user),
                     config: AppConfig = Depends(get_app_config)) -> [PublishResponse, ErrorResponse]:
    """
    Un-publish a dataset
    :param user:
    :param dataResourceUid:
    :param config:
    :return:
    """
    # check user is authenticated
    if not user:
        return ErrorResponse(error=ErrorCode.NOT_AUTHORIZED, message='Please provide authentication details')

    # check user is authorised to edit this datasets
    if dataResourceUid:

        # user needs to be creator or have ROLE_ADMIN privilege
        data_resource = get_data_resource(dataResourceUid, config)
        if data_resource is None:
            return ErrorResponse(error=ErrorCode.INVALID_DATA_RESOURCE_UID, message='The data resource UID is not recognised')

        created_by_id = data_resource['createdByID']

        if created_by_id != user.id and not user.is_admin:
            return ErrorResponse(error=ErrorCode.NOT_AUTHORIZED_FOR_DATA_RESOURCE,
                                 message='You are not authorised to update this resource')

        endpoint = f'{config.airflow_api_base_url}/dags/{config.delete_dag}/dagRuns'
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
                "remove_records_in_solr": f"{config.remove_records_in_solr}",
                "remove_records_in_es": f"{config.remove_records_in_es}",
                "delete_avro_files": f"{config.delete_avro_files}",
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
            return ErrorResponse(error=ErrorCode.AIRFLOW_ERROR,
                                 message=f'Unable to access airflow. Response code {airflow_response.status_code}')

    else:
        return ErrorResponse(error=ErrorCode.INVALID_DATA_RESOURCE_UID, message='Invalid or empty data resource')