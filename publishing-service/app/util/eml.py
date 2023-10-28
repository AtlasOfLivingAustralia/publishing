from typing import Dict


def extract_metadata(eml) -> Dict:
    """
    Extract required elements from the EML
    :param eml:
    :return:
    """

    metadata = {}
    # Define a list of paths to elements
    element_paths = [
        './/dataset/title',
        './/dataset/abstract/para',
        './/dataset/intellectualRights/para/ulink',
        './/additionalMetadata/metadata/gbif/citation/text',
        './/dataset/intellectualRights/para',
        './/dataset/purpose/para',
        './/dataset/methods/methodStep/description/para',
        './/dataset/methods/qualityControl/description/para'
    ]

    # Define keys for the metadata dictionary
    metadata_keys = [
        'name',
        'pubDescription',
        'licenceUrl',
        'citation',
        'rights',
        'purpose',
        'methodStepDescription',
        'qualityControlDescription'
    ]

    # Iterate through the paths and populate the metadata dictionary
    for key, path in zip(metadata_keys, element_paths):
        element = eml.find(path)
        if key == 'licenceUrl':
            url = element.get('url') if element is not None and 'url' in element.attrib else None
            if url:
                # look up the legal code version of the url, and return the full URL
                metadata[key] = url
        else:
            metadata[key] = element.text if element is not None else None

    return metadata


def find_partial_match(dictionary, search_string):
    for key in dictionary.keys():
        if search_string in key:
            return key
    return None
