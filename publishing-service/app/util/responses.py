from dataclasses import dataclass
from typing import Dict, Union, Optional, Annotated

from fastapi import File, UploadFile, Form
from pydantic import BaseModel, ConfigDict, GetJsonSchemaHandler
from dwc_validator.model import DFValidationReport
from pydantic.json_schema import JsonSchemaValue

from util.error_codes import ErrorCode


class ValidationRequest(BaseModel):
    file: Annotated[UploadFile, File(description="A file read as UploadFile")]


class ProcessRequest(BaseModel):
    file: UploadFile = File(...)
    dataResourceUid: str = None


@dataclass
class PublishRequest:
    name: str
    licenceUrl: str
    pubDescription: str
    citation: Union[str, None]
    rights: Union[str, None]
    purpose: Union[str, None]
    methodStepDescription:  Union[str, None]
    qualityControlDescription: Union[str, None]
    tempPath: str
    requestID: str
    dataResourceUid: Union[str, None]


class ErrorResponse(BaseModel):
    valid: bool = False
    error: ErrorCode
    message: str


class PublishResponse(BaseModel):
    requestID: str = ""
    dataResourceUid: str = ""
    message: str = ""
    statusUrl: str = ""
    metadataUrl: str = ""
    metadataWsUrl: str = ""


class ValidationResponse(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True, extra="allow")
    valid: bool = False
    datasetType: str = ""
    breakdowns: Dict = []
    fileName: str = ""
    requestID: str = ""
    tempPath: Union[str, None] = None
    metadata: Dict = {}
    hasEml: bool = False
    coreValidation: Union[any, None]
    extensionValidations: Union[list[any], None]
    mapImage: Union[str, None]


class PublishStatus(BaseModel):
    id: str
    dataset_name: str
    datasets: str
    state: str
    start_date: str
    end_date: Union[str, None]
