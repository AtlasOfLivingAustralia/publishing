from fastapi import APIRouter


from util.error_codes import ErrorCode

router = APIRouter()


@router.get("/error_codes", tags=["error_codes"], description="Get a list of error codes", summary="List of error codes")
async def error_codes():
    enum_string_values = [enum_value.value for enum_value in ErrorCode]
    return enum_string_values


