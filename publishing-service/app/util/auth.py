import logging
import jwt
from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials


class User:
    def __init__(self, id, email, name, is_admin, is_publisher):
        self.id = id
        self.name = name
        self.email = email
        self.is_admin = is_admin
        self.is_publisher = is_publisher


def get_user(request: Request) -> User:
    """
    Check the request for a valid JWT token
    :param request:
    :return:
    """
    def get_any(dic, keys, default=""):
        for k in keys:
            if k in dic:
                return dic[k]
        return default

    auth_header = request.headers.get("Authorization")

    if not auth_header:
        credentials_exception = HTTPException(
            status_code=401,
            detail="Could not validate credentials",
            headers={"Authorization": "Bearer"},
        )
        raise credentials_exception
    try:
        jwt_token = auth_header.split(' ')[1]
        decoded_token = jwt.decode(jwt=jwt_token,
                                   verify=False,
                                   algorithms=None,
                                   verify_signature=False,
                                   options={'verify_signature': False})

        userid = get_any(decoded_token, ['userid', 'custom:userid'])
        user_email = get_any(decoded_token, ['email'])
        user_name = [get_any(decoded_token, ['name', 'given_name']), get_any(decoded_token, ['family_name'])]
        user_display_name = " ".join(x for x in user_name if x)
        roles = get_any(decoded_token, ['role', 'ala:role'])
        is_admin = 'ROLE_ADMIN' in roles
        is_publisher = 'ROLE_DATA_PUBLISHER' in roles
        return User(userid, user_email, user_display_name, is_admin, is_publisher)
    except Exception as e:
        logging.error("Authentication error", exc_info=True)
        credentials_exception = HTTPException(
            status_code=401,
            detail="Could not validate credentials",
            headers={"Authorization": "Bearer"},
        )
        raise credentials_exception


class JWTBearer(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTBearer, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request):
        credentials: HTTPAuthorizationCredentials = await super(JWTBearer, self).__call__(request)
        if credentials:
            if not credentials.scheme == "Bearer":
                raise HTTPException(status_code=403, detail="Invalid authentication scheme.")
            if not self.verify_jwt(credentials.credentials):
                raise HTTPException(status_code=403, detail="Invalid token or expired token.")
            return credentials.credentials
        else:
            raise HTTPException(status_code=403, detail="Invalid authorization code.")

    def verify_jwt(self, token: str) -> bool:
        is_valid: bool = False

        try:
            payload = jwt.decode(jwt=token,
                                   verify=False,
                                   algorithms=None,
                                   verify_signature=False,
                                   options={'verify_signature': False})

            # payload = decodeJWT(jwtoken)
        except:
            payload = None
        if payload:
            is_valid = True
        return is_valid