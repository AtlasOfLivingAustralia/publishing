import logging
import uuid
import os
import boto3
from pathlib import Path
from dwca.darwincore.utils import qualname as qn
from fastapi import Request, Depends
from dwc_validator.exceptions import CoordinatesException
from dwca.exceptions import BadlyFormedMetaXml
from fastapi import APIRouter, File, UploadFile
from util.auth import check_auth
from dwca.read import DwCAReader
from dwc_validator.validate_dwca import validate_archive
from util.config import AppConfig, get_app_config
from util.eml import extract_metadata
from util.responses import ErrorResponse, ValidationResponse
from util.map import generate_preview_map

router = APIRouter()


@router.post("/validate",
             tags=["validate"],
             name="Validate a dataset",
             description="Validate a dataset using the supplied darwin core archive",
             summary="Validate a dataset")
async def validate(request: Request, file: UploadFile = File(...), config: AppConfig = Depends(get_app_config)):
    """
    Validate a dataset using the supplied darwin core archive
    :param config:
    :param request:
    :param file:
    :return:
    """
    logging.info("Validation request received")
    user = check_auth(request)
    if not user:
        return ErrorResponse(error='NOT_AUTHORISED', message='Please provide authentication details')

    request_id = str(uuid.uuid4())
    file2store = await file.read()

    # Check if the post request has the file part
    if not file2store:
        logging.info("Validation request missing file")
        return ErrorResponse(error='MISSING_DATA_FILE', message='Missing file in HTTP POST')

    # file = request.files['file']
    temp_file_path = f'/tmp/temp-{request_id}.zip'
    try:
        with open(temp_file_path, 'wb') as f:
            f.write(file2store)
    except Exception as e:
        logging.error(f"Error with reading archive {e}", exc_info=True)
        return ErrorResponse(error='FILE_UPLOAD_ERROR', message='Error with reading archive {e}')
    finally:
        file.file.close()

    try:
        with DwCAReader(temp_file_path) as dwca:

            # check the core type is supported
            core_file_location = dwca.descriptor.core.file_location
            core_df = dwca.pd_read(core_file_location, parse_dates=False)
            core_type = dwca.descriptor.core.type
            logging.info("Core type: %s", core_type)
            supported_core_types = {qn('Occurrence'), qn('Event')}

            if core_type not in supported_core_types:
                return ErrorResponse(error='UNSUPPORTED_CORE_TYPE', message=f'The core type {core_type} is not supported')

            validate_report = validate_archive(dwca)

            # generate a preview map
            map_img = generate_preview_map(core_df, config)

            if not validate_report.valid:
                os.remove(temp_file_path)
                logging.info("Darwin core archive failed validation.")
                return ValidationResponse(
                    valid=False,
                    datasetType=validate_report.dataset_type,
                    breakdowns=validate_report.breakdowns,
                    fileName=file.filename,
                    requestID=request_id,
                    coreValidation=validate_report.core,
                    extensionValidations=validate_report.extensions,
                    mapImage=map_img
                )

            metadata = {}
            has_eml = False
            if dwca.metadata:
                has_eml = True
                metadata = extract_metadata(dwca.metadata)

            # save to s3
            logging.info("Uploading to S3 bucket...")
            s3 = boto3.client('s3')
            s3_temp_path = f'{user.id}/{request_id}.zip'
            s3.upload_file(temp_file_path, config.s3_bucket_name, f"file-uploads/{user.id}/{request_id}.zip")
            os.remove(temp_file_path)  # Remove the temporary file
            logging.info("Uploaded to S3 bucket.")

            return ValidationResponse(
                valid=True,
                datasetType=validate_report.dataset_type,
                breakdowns=validate_report.breakdowns,
                fileName=file.filename,
                requestID=request_id,
                tempPath=s3_temp_path,
                metadata=metadata,
                hasEml=has_eml,
                coreValidation=validate_report.core,
                extensionValidations=validate_report.extensions,
                mapImage=map_img
            )

    except boto3.exceptions.S3UploadFailedError as s3e:
        logging.error(f"Authentication error with S3 {s3e}")
        logging.error(s3e, exc_info=True)
        if temp_file_path and Path(temp_file_path).is_file():
            os.remove(temp_file_path)
        return ErrorResponse(error='S3_ERROR', message=f'Problem uploading file to temporary storage')
    except CoordinatesException as e:
        logging.error(f"Problem generating map preview {e}", exc_info=True)
        logging.error(e, exc_info=True)
        if temp_file_path and Path(temp_file_path).is_file():
            os.remove(temp_file_path)
        return ErrorResponse(error='BADLY_FORMED_COORDINATES', message= e.args[0])
    except ValueError as e:
        logging.error(f"Error with reading archive {e}", exc_info=True)
        logging.error(e, exc_info=True)
        if temp_file_path and Path(temp_file_path).is_file():
            os.remove(temp_file_path)
        return ErrorResponse(error='BADLY_FORMED_META_XML', message= e.args[0])
    except AttributeError as e:
        logging.error(f"Error with reading archive {e}", exc_info=True)
        logging.error(e, exc_info=True)
        if temp_file_path and Path(temp_file_path).is_file():
            os.remove(temp_file_path)
        return ErrorResponse(error='BADLY_FORMED_META_XML', message= e.args[0])
    except BadlyFormedMetaXml as e:
        logging.error(f"Error with validate {e}", exc_info=True)
        logging.error(e, exc_info=True)
        if temp_file_path and Path(temp_file_path).is_file():
            os.remove(temp_file_path)
        return ErrorResponse(error='BADLY_FORMED_META_XML', message= e.args[0])
    except Exception as e:
        logging.error(f"Error with validate {e}", exc_info=True)
        logging.error(e, exc_info=True)
        if temp_file_path and Path(temp_file_path).is_file():
            os.remove(temp_file_path)
        return ErrorResponse(error='INVALID_ARCHIVE', message= e.args[0])
