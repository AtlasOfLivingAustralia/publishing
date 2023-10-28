from fastapi import APIRouter
from enum import Enum
from typing import Dict, Union

router = APIRouter()


class LicenseInfo(Enum):
    CC0 = {'url': 'https://creativecommons.org/publicdomain/zero/1.0/legalcode', 'acronym': 'CC0', 'version': '1.0', 'name': 'Creative Commons Zero'}
    CC_BY_4_0 = {'url': 'https://creativecommons.org/licenses/by/4.0/legalcode', 'acronym': 'CC-BY', 'version': '4.0', 'name': 'Creative Commons By Attribution 4.0'}
    CC_BY_NC_4_0 = {'url': 'https://creativecommons.org/licenses/by-nc/4.0/legalcode', 'acronym': 'CC-BY-NC', 'version': '4.0', 'name': 'Creative Commons Attribution-Noncommercial 4.0'}
    CC_BY_NC_SA_4_0 = {'url': 'https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode', 'acronym': 'CC-BY-NC-SA', 'version': '4.0', 'name': 'Creative Commons Attribution-Noncommercial Share Alike 4.0'}
    CC_BY_3_0 = {'url': 'https://creativecommons.org/licenses/by/3.0/legalcode', 'acronym': 'CC-BY', 'version': '3.0', 'name': 'Creative Commons By Attribution 3.0'}
    CC_BY_NC_3_0 = {'url': 'https://creativecommons.org/licenses/by-nc/3.0/legalcode', 'acronym': 'CC-BY-NC', 'version': '3.0', 'name': 'Creative Commons Attribution-Noncommercial 3.0'}
    CC_BY_NC_SA_3_0 = {'url': 'https://creativecommons.org/licenses/by-nc-sa/3.0/legalcode', 'acronym': 'CC-BY-NC-SA', 'version': '3.0', 'name': 'Creative Commons Attribution-Noncommercial Share Alike 3.0'}
    CC_BY_NC_3_0_AU = {'url': 'https://creativecommons.org/licenses/by-nc/3.0/au/legalcode', 'acronym': 'CC-BY-NC', 'version': '3.0', 'name': 'Creative Commons Attribution-Noncommercial 3.0'}
    CC_BY_4_0_AU = {'acronym': 'CC-BY', 'version': '4.0', 'name': 'Creative Commons By Attribution 4.0', 'url': 'https://creativecommons.org/licenses/by/4.0/au/legalcode'}
    CC_BY_NC_4_0_AU = {'acronym': 'CC-BY-NC', 'version': '4.0', 'name': 'Creative Commons Attribution-Noncommercial 4.0', 'url': 'https://creativecommons.org/licenses/by-nc/4.0/au/legalcode'}
    CC_BY_NC_SA_4_0_AU = {'acronym': 'CC-BY-NC-SA', 'version': '4.0', 'name': 'Creative Commons Attribution-Noncommercial Share Alike 4.0', 'url': 'https://creativecommons.org/licenses/by-nc-sa/4.0/au/legalcode'}
    CC_BY_3_0_AU = {'acronym': 'CC-BY', 'version': '3.0', 'name': 'Creative Commons By Attribution 3.0', 'url': 'https://creativecommons.org/licenses/by/3.0/au/legalcode'}
    CC_BY_NC_SA_3_0_AU = {'acronym': 'CC-BY-NC-SA', 'version': '3.0', 'name': 'Creative Commons Attribution-Noncommercial Share Alike 3.0', 'url': 'https://creativecommons.org/licenses/by-nc-sa/3.0/au/legalcode'}


LICENSE_MAP: Dict[str, dict] = {license_url: license_info.value for license_url, license_info in
                                LicenseInfo.__members__.items()}


def get_licence(licenceUrl) -> Union[LicenseInfo, None]:
    for licence in LicenseInfo:
        if licenceUrl in licence.value['url']:
            return licence
    return None


def get_licences() -> Dict[str, dict]:
    return LICENSE_MAP


@router.get("/licences", tags=["licences"], description="Get a list of recognised licences", summary="List of recognised licences")
async def licences():
    return get_licences()


