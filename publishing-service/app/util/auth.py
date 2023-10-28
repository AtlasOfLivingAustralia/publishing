import logging
from typing import Union
import jwt
from fastapi import Request


class User:
    def __init__(self, id, email, name, is_admin, is_publisher):
        self.id = id
        self.name = name
        self.email = email
        self.is_admin = is_admin
        self.is_publisher = is_publisher


def check_auth(request: Request) -> Union[None, User]:
    """
    Check the request for a valid JWT token
    :param request:
    :return:
    """

    authorisation_header = request.headers.get('Authorization')
    if not authorisation_header:
        return None
    try:
        jwt_token = authorisation_header.split(' ')[1]
        decoded_token = jwt.decode(jwt=jwt_token,
                                   verify=False,
                                   algorithms=None,
                                   verify_signature=False,
                                   options={'verify_signature': False})

        userid = decoded_token['userid']
        user_email = decoded_token['email']
        user_display_name = decoded_token['name']
        roles = decoded_token['role']
        is_admin = 'ROLE_ADMIN' in roles
        is_publisher = 'ROLE_DATA_PUBLISHER' in roles
        return User(userid, user_email, user_display_name, is_admin, is_publisher)
    except Exception as e:
        logging.error("Authentication error", exc_info=True)
        return None