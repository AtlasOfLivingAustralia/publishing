from dataclasses import dataclass
from typing import Dict, Union

from fastapi import File, UploadFile
from pydantic import BaseModel, ConfigDict

from util.error_codes import ErrorCode


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
    extensionValidations: Union[any, None]
    mapImage: Union[str, None]


class PublishStatus(BaseModel):
    id: str
    dataset_name: str
    datasets: str
    state: str
    start_date: str
    end_date: Union[str, None]
