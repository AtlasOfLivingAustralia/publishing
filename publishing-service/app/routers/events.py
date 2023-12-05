import json
import logging
import requests
from fastapi import APIRouter, Depends
from requests.auth import HTTPBasicAuth
from util.config import AppConfig, get_app_config
from util.error_codes import ErrorCode
from util.responses import ErrorResponse

router = APIRouter()


@router.get("/events", tags=["publish"], description="Get the status of a dataset publishing events", summary="Get the status of a dataset publishing events")
async def events(config: AppConfig = Depends(get_app_config)):
    """
    Get the status of a dataset publishing events
    :param config:
    :return:
    """

    endpoint = f'{config.airflow_api_base_url}/dags/Ingest_small_datasets/dagRuns?order_by=-start_date&limit=10'
    headers = {'Content-Type': 'application/json'}
    response = requests.get(endpoint, headers=headers,
                            auth=HTTPBasicAuth(config.airflow_username, config.airflow_password))

    if response.status_code == 200:

        json_str = response.content
        dag_list = json.loads(json_str)

        mapped_data = []

        for item in dag_list['dag_runs']:

            conf = item.get('conf')
            if conf is not None:
                dataset_ids = conf.get('datasetIds', "").strip().split(" ")
            else:
                dataset_ids = []

            dataset_ids = list(filter(None, dataset_ids))
            datasets = []

            for dataset_id in dataset_ids:

                # Call the collectory lookup service
                response = requests.get(f'{config.collectory_lookup_url}/{dataset_id}')
                if response.status_code == 200:
                    json_str = response.content
                    dataset = json.loads(json_str)
                    # Create a new dictionary with mapped keys and values
                    mapped_item = {"datasetId": dataset_id, "datasetName": dataset['name']}
                    # Add the mapped dictionary to the new array
                    datasets.append(mapped_item)
                else:
                    mapped_item = {"datasetId": dataset_id}
                    datasets.append(mapped_item)

            conf = item['conf']
            user_display_name = ""

            if conf.get('userDisplayName') is not None:
                user_display_name = conf.get('userDisplayName')

            # Add the mapped dictionary to the new array
            mapped_data.append(
                {
                    "id": item['dag_run_id'],
                    "user": user_display_name,
                    "datasets": datasets,
                    "state": item['state'],
                    "start_date": item['start_date'],
                    "end_date": item['end_date']
                }
            )
        return mapped_data
    else:
        logging.info(f"Failed to retrieve DAGs. Status code: {response.status_code}")
        return ErrorResponse(error=ErrorCode.AIRFLOW_ERROR, message=f'Unable to access airflow {response.status_code}')
