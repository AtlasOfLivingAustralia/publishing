import logging
from typing import Union

import requests
from requests.auth import HTTPBasicAuth

from util.config import AppConfig
from util.responses import PublishResponse, ErrorResponse


def start_ingest_dag(data_resource_name, data_resource_uid, request_id, user, config: AppConfig) -> Union[ErrorResponse, PublishResponse]:
    """
    Start the ingest DAG for the supplied data resource
    :param data_resource_name:
    :param data_resource_uid:
    :param request_id:
    :param user:
    :param config:
    :return:
    """

    # start the data resource loading
    endpoint = f'{config.airflow_api_base_url}/dags/{config.ingest_dag}/dagRuns'
    headers = {'Content-Type': 'application/json'}

    dag_run_data = {
        "dag_run_id": request_id,
        "note": f"Ingest from API call - {data_resource_name}",
        "conf": {
            "userid": user.id,
            "userEmail": user.email,
            "userDisplayName": user.name,
            "dataset_name": data_resource_name,
            "datasetIds": data_resource_uid,
            "load_images": "false",
            "run_indexing": "true",
            "skip_dwca_to_verbatim": "false",
            "override_uuid_percentage_check": "false"
        }
    }

    airflow_response = requests.post(endpoint, json=dag_run_data, headers=headers,
                                     auth=HTTPBasicAuth(config.airflow_username, config.airflow_password))

    if airflow_response.status_code == 200:
        # start the publishing
        return PublishResponse(
            requestID=request_id,
            dataResourceUid=data_resource_uid,
            message="Dataset created",
            statusUrl=f"/status/{request_id}",
            metadataUrl=f"{config.collectory_lookup_url}/dataResource/{data_resource_uid}",
            metadataWsUrl=f"{config.collectory_lookup_url}/ws/dataResource/{data_resource_uid}"
        )
    else:
        logging.info(f"Failed to start DAG. Status code: {airflow_response.status_code}")
        return ErrorResponse(error='AIRFLOW_ERROR', message=f'Unable to access airflow: {airflow_response.status_code}')

