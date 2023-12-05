from pydantic_settings import BaseSettings, SettingsConfigDict


class AppConfig(BaseSettings):
    airflow_api_base_url: str
    collectory_lookup_url: str
    s3_bucket_name: str
    ala_api_key: str
    airflow_username: str
    airflow_password: str
    ingest_dag: str = 'Ingest_small_datasets'
    delete_dag: str = 'Delete_dataset_dag'
    geopandas_dataset: str = 'naturalearth_lowres'
    default_min_latitude: float = -48
    default_max_latitude: float = -5
    default_min_longitude: float = 109
    default_max_longitude: float = 158
    remove_records_in_solr: bool = True
    remove_records_in_es: bool = False
    delete_avro_files: bool = True

    model_config = SettingsConfigDict(env_file="/data/publishing-service/config/.env")


# Create an instance of the AppConfig
app_config = AppConfig()


def get_app_config():
    """
    Get the application config
    :return:
    """
    return app_config
