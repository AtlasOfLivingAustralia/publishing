

class ErrorResponse:

    def __init__(self, valid=False, error="", message=""):
        self.valid = valid
        self.error = error
        self.message = message


class PublishResponse:

    def __init__(self, requestID: str, dataResourceUid: str, message: str, statusUrl: str, metadataUrl: str, metadataWsUrl: str):
        self.requestID = requestID
        self.dataResourceUid = dataResourceUid
        self.message = message
        self.statusUrl = statusUrl
        self.metadataUrl = metadataUrl
        self.metadataWsUrl = metadataWsUrl


class ValidationResponse:

    def __init__(self, valid=False, datasetType="", breakdowns=None, fileName="", requestID="", tempPath="", metadata=None, hasEml=False, coreValidation=None, extensionValidations=None, mapImage=None):
        self.valid = valid
        self.datasetType = datasetType
        self.breakdowns = breakdowns
        self.fileName = fileName
        self.requestID = requestID
        self.tempPath = tempPath
        self.metadata = metadata
        self.hasEml = hasEml
        self.coreValidation = coreValidation
        self.extensionValidations = extensionValidations
        self.mapImage = mapImage
