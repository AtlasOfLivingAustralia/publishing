import logging
import warnings

from dwc_validator.exceptions import CoordinatesException
import geopandas as gpd
import matplotlib.pyplot as plt
import base64
from io import BytesIO
from shapely.errors import ShapelyDeprecationWarning

from util.config import AppConfig

warnings.filterwarnings("ignore", category=ShapelyDeprecationWarning)


def generate_preview_map(dataframe, config: AppConfig, latitude_col='decimalLatitude', longitude_col='decimalLongitude') -> str:
    """
    Generate a map preview of the supplied dataframe
    :param config:
    :param dataframe: Pandas DataFrame containing geographical data
    :param latitude_col: Name of the latitude column
    :param longitude_col: Name of the longitude column
    :return: base64 encoded map image
    """

    try:
        if latitude_col not in dataframe.columns or longitude_col not in dataframe.columns:
            # Plot a world map
            world_data = gpd.read_file(gpd.datasets.get_path(config.geopandas_dataset))
            world_data = world_data.to_crs(epsg=4326)

            plot_map(world_data, config)
        else:
            # Plot the world map with data points
            df_geo = gpd.GeoDataFrame(dataframe, geometry=gpd.points_from_xy(dataframe[longitude_col], dataframe[latitude_col]))

            world_data = gpd.read_file(gpd.datasets.get_path(config.geopandas_dataset))
            world_data = world_data.to_crs(epsg=4326)

            plot_map(world_data, config)
            df_geo.plot(ax=plt.gca(), markersize=20, color='#c44d34', marker='o', label='Occurrence')

        # Save the plot to a BytesIO buffer and encode as base64
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=100, transparent=True, bbox_inches='tight', pad_inches=0)
        buffer.seek(0)
        return base64.b64encode(buffer.read()).decode()

    except ValueError as e:
        logging.error(f"Error generating map: {e}")
        raise CoordinatesException("Invalid coordinates supplied. Please check the values in the provided latitude and longitude columns.")
    except Exception as e:
        logging.error(f"Error generating map: {e}")
        raise CoordinatesException("An error occurred while generating the map.")


def plot_map(world_data, config: AppConfig):
    # Plot the world map
    axis = world_data.plot(figsize=(15, 15), color='white', edgecolor='black')

    # Set axis limits and turn off axis
    axis.set_ylim(config.default_min_latitude, config.default_max_latitude)
    axis.set_xlim(config.default_min_longitude, config.default_max_longitude)
    axis.set_axis_off()
