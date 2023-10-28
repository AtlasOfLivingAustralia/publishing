import json
import logging
import requests
from fastapi import APIRouter, Depends
from requests.auth import HTTPBasicAuth
from util.config import AppConfig, get_app_config
from util.responses import ErrorResponse

router = APIRouter()


@router.get("/status/{requestID}", tags=["publish"], description="Get the status of a dataset publishing event",
            summary="Get the status of publishing event")
async def status(requestID: str, config: AppConfig = Depends(get_app_config)):
    """
    Get the status of a dataset publishing event
    :param requestID:
    :param config:
    :return:
    """

    endpoint = f'{config.airflow_api_base_url}/dags/Ingest_small_datasets/dagRuns/{requestID}'
    headers = {'Content-Type': 'application/json'}
    response = requests.get(endpoint, headers=headers,
                            auth=HTTPBasicAuth(config.airflow_username, config.airflow_password))

    if response.status_code == 200:

        json_str = response.content
        dag_details = json.loads(json_str)

        # Check if 'conf' key is present and not None
        conf = dag_details.get('conf')
        if conf is not None:
            dataset_ids = conf.get('datasetIds', [])
        else:
            dataset_ids = []

        mapped_data = {
            "id": dag_details['dag_run_id'],
            "dataset_name": dag_details.get('conf').get('dataset_name') if dag_details.get('conf') else None,
            "datasets": dataset_ids,
            "state": dag_details['state'],
            "start_date": dag_details['start_date'],
            "end_date": dag_details['end_date']
        }
        return mapped_data
    else:
        logging.info(f"Failed to retrieve DAGs. Status code: {response.status_code}")
        return ErrorResponse(error='AIRFLOW_ERROR', message=f'Unable to access airflow {response.status_code}')

