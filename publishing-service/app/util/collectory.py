import json
import logging
import requests
from util.auth import User
from util.config import AppConfig


def create_or_update_data_resource(data_resource_uid, data_resource, user:User, config: AppConfig):
    collectory_headers = {"apikey": config.ala_api_key}

    if data_resource_uid:
        logging.info("Updating existing data resource")
        collectory_response = requests.post(f'{config.collectory_lookup_url}/{data_resource_uid}',
                                            data=json.dumps(data_resource),
                                            headers=collectory_headers)
    else:
        logging.info("Checking to see if data resource already exists")
        # check of a data resource exists for this name, created by this user
        search_response = requests.get(f"{config.collectory_lookup_url}?createdByID={user.id}&name={data_resource['name']}")
        matches = json.loads(search_response.content)
        if matches and len(matches) > 0:
            logging.info(f"Existing data resource found for {data_resource['name']}")
            data_resource_uid = matches[0]['uid']
            collectory_response = requests.post(f'{config.collectory_lookup_url}/{data_resource_uid}',
                                                data=json.dumps(data_resource),
                                                headers=collectory_headers)
        else:
            logging.info(f"Creating new  data resource for {data_resource['name']}")
            collectory_response = requests.post(f'{config.collectory_lookup_url}/',
                                                data=json.dumps(data_resource),
                                                headers=collectory_headers)

    logging.info(collectory_response.status_code)

    if collectory_response.status_code == 201:
        logging.info("Collectory resource created")
        url = collectory_response.headers['location']
        segments = url.split('/')
        # get the UID from the response
        data_resource_uid = segments[-1] if segments[-1] else segments[-2]
        return data_resource_uid
    elif collectory_response.status_code == 200:
        logging.info("Collectory resource updated")
        return data_resource_uid
    else:
        logging.info(f"Failed to create data resource. Status code: {collectory_response.status_code}")
        return None


def get_data_resource(data_resource_uid:str, config: AppConfig):

    collectory_headers = {"apikey": config.ala_api_key}

    # update the collectory entry with archive location
    logging.info(f"Getting to {config.collectory_lookup_url}/{data_resource_uid}")
    try:
        response = requests.get(f'{config.collectory_lookup_url}/{data_resource_uid}', headers=collectory_headers)
        if response.status_code == 200:
            return json.loads(response.content)
        return None
    except Exception as e:
        logging.info(str(e))


def update_conn_params(data_resource_uid: str, config: AppConfig):

    collectory_headers = { "apikey": config.ala_api_key}

    data_resource_connection_parameters = {
        "connectionParameters": json.dumps({
            "termsForUniqueKey": ["occurrenceID"],
            "protocol": "DwCA",
            "url": f"s3://{config.s3_bucket_name}/dwca-imports/{data_resource_uid}/{data_resource_uid}.zip",
        }),
    }
    # update the collectory entry with archive location
    logging.info(f"Posting to {config.collectory_lookup_url}/{data_resource_uid}")
    try:
        requests.post(f'{config.collectory_lookup_url}/{data_resource_uid}',
                      data=json.dumps(data_resource_connection_parameters),
                      headers=collectory_headers)
    except Exception as e:
        logging.info(str(e))
