import os
import geopandas as gpd
from shapely.geometry import Point

from bathymetry import Bathymetry


class BoundaryChecker:

    # This is NOT a legal maritime boundary buffer.just for safety warning i used it
    IMBL_WARNING_DISTANCE_M = 500

    def __init__(
        self,
        mpa_file,
        eez_file,
        imbl_file,
        bathymetry_file=None
    ):

        print("\n==============================================")
        print("           ORCA GEO SAFETY ENGINE")
        print("==============================================")
 # vectorfiles

        self._check_file(mpa_file)
        self._check_file(eez_file)
        self._check_file(imbl_file)

        print("\nLoading MPA data...")

        self.mpas = gpd.read_file(mpa_file)

        print("Loading EEZ data...")

        self.eez = gpd.read_file(eez_file)

        print("Loading maritime boundary data...")

        self.imbl = gpd.read_file(imbl_file)

        #print("Loading ETOPO bathymetry...")

        #self.bathymetry = Bathymetry(
        #    bathymetry_file
        #)
        #changed these lines as it was not giving any output to the api
        print("Loading ETOPO bathymetry...")
        try:
            self.bathymetry = Bathymetry(bathymetry_file)
        except Exception as e:
            print(f"Bathymetry disabled (no .tif file): {e}")
            self.bathymetry = None

        #upto here

        self._validate_crs(
            self.mpas,
            "MPA"
        )

        self._validate_crs(
            self.eez,
            "EEZ"
        )

        self._validate_crs(
            self.imbl,
            "Maritime boundary"
        )

        self.mpas = self.mpas.to_crs(
            "EPSG:4326"
        )

        self.eez = self.eez.to_crs(
            "EPSG:4326"
        )

        self.imbl = self.imbl.to_crs(
            "EPSG:4326"
        )

        self.mpas = self.mpas[
            self.mpas.geometry.notna()
            &
            ~self.mpas.geometry.is_empty
        ]

        self.eez = self.eez[
            self.eez.geometry.notna()
            &
            ~self.eez.geometry.is_empty
        ]

        self.imbl = self.imbl[
            self.imbl.geometry.notna()
            &
            ~self.imbl.geometry.is_empty
        ]

        print("\n==============================================")
        print("             DATASET SUMMARY")
        print("==============================================")

        print(
            "MPA features:",
            len(self.mpas)
        )

        print(
            "EEZ features:",
            len(self.eez)
        )

        print(
            "Boundary features:",
            len(self.imbl)
        )

        print(
            "MPA geometry:",
            self.mpas.geom_type.value_counts().to_dict()
        )

        print(
            "EEZ geometry:",
            self.eez.geom_type.value_counts().to_dict()
        )

        print(
            "Boundary geometry:",
            self.imbl.geom_type.value_counts().to_dict()
        )

        print(
            "=============================================="
        )

    @staticmethod
    def _check_file(file_path):

        if file_path is None:
            return

        if not os.path.isfile(file_path):

            raise FileNotFoundError(
                f"\nFile not found:\n{os.path.abspath(file_path)}"
            )

    @staticmethod
    def _validate_crs(
        dataframe,
        layer_name
    ):

        if dataframe.crs is None:

            raise ValueError(
                f"{layer_name} layer has no CRS information."
            )

    @staticmethod
    def _get_utm_crs(
        latitude,
        longitude
    ):

        zone = int(
            (longitude + 180) / 6
        ) + 1

        if latitude >= 0:

            epsg = 32600 + zone

        else:

            epsg = 32700 + zone

        return f"EPSG:{epsg}"

    def check_point(
        self,
        latitude,
        longitude
    ):

        if not -90 <= latitude <= 90:

            raise ValueError(
                "Latitude must be between -90 and 90."
            )

        if not -180 <= longitude <= 180:

            raise ValueError(
                "Longitude must be between -180 and 180."
            )

        point = Point(
            longitude,
            latitude
        )

        mpa_matches = self.mpas[
            self.mpas.geometry.intersects(point)
        ]

        inside_mpa = not mpa_matches.empty

        mpa_areas = []

        if inside_mpa:

            for _, row in mpa_matches.iterrows():

                name = self._get_attribute(
                    row,
                    [
                        "name",
                        "NAME",
                        "Name",
                        "site_name",
                        "SITE_NAME",
                        "SITE"
                    ]
                )

                designation = self._get_attribute(
                    row,
                    [
                        "designation",
                        "DESIGNATION",
                        "Designation",
                        "type",
                        "TYPE",
                        "category"
                    ]
                )

                mpa_areas.append({
                    "name": name,
                    "type": designation
                })

        eez_matches = self.eez[
            self.eez.geometry.intersects(point)
        ]

        inside_eez = not eez_matches.empty

        #depth_result = self.bathymetry.get_depth(
        #    latitude,
        #    longitude
        #)

        #same as line 47
        if self.bathymetry:
            depth_result = self.bathymetry.get_depth(latitude, longitude)
        else:
            depth_result = {"available": False, "is_land": None, "depth_m": None, "elevation_m": None}
        #upto here

        bathymetry_available = (
            depth_result.get(
                "available",
                False
            )
        )

        is_land = (
            depth_result.get(
                "is_land"
            )
        )

        depth = (
            depth_result.get(
                "depth_m"
            )
        )

        elevation = (
            depth_result.get(
                "elevation_m"
            )
        )

        depth_status = "UNKNOWN"

        if bathymetry_available:

            if is_land:

                depth_status = "LAND"

            elif depth is None:

                depth_status = "UNKNOWN"

            elif depth < 5:

                depth_status = "VERY_SHALLOW"

            elif depth < 10:

                depth_status = "SHALLOW"

            elif depth < 20:

                depth_status = "MODERATE"

            else:

                depth_status = "DEEP"

        distance_to_boundary_m = None

        if not self.imbl.empty:

            local_crs = self._get_utm_crs(
                latitude,
                longitude
            )

            point_gdf = gpd.GeoDataFrame(
                {"id": [1]},
                geometry=[point],
                crs="EPSG:4326"
            )

            point_metric = (
                point_gdf
                .to_crs(local_crs)
                .geometry
                .iloc[0]
            )

            boundary_metric = (
                self.imbl
                .to_crs(local_crs)
            )

            distances = (
                boundary_metric
                .geometry
                .distance(point_metric)
            )

            if not distances.empty:

                distance_to_boundary_m = round(
                    float(
                        distances.min()
                    ),
                    2
                )

        border_alert = False

        if distance_to_boundary_m is not None:

            if (
                distance_to_boundary_m
                <= self.IMBL_WARNING_DISTANCE_M
            ):

                border_alert = True

        if is_land is True:

            status = "LAND"

        elif inside_mpa:

            status = "RESTRICTED"

        elif depth_status == "VERY_SHALLOW":

            status = "SHALLOW_WATER"

        elif border_alert:

            status = "BORDER_ALERT"

        elif depth_status == "SHALLOW":

            status = "CAUTION"

        elif not bathymetry_available:

            status = "DATA_UNAVAILABLE"

        else:

            status = "SAFE"

        warnings = []

        if is_land is True:

            warnings.append(
                "The supplied bathymetry dataset "
                "indicates land at this location."
            )

        if inside_mpa:

            warnings.append(
                "The location intersects a mapped "
                "Marine Protected Area."
            )

        if depth_status == "VERY_SHALLOW":

            warnings.append(
                "Very shallow water detected."
            )

        elif depth_status == "SHALLOW":

            warnings.append(
                "Shallow water detected."
            )

        if border_alert:

            warnings.append(
                "Location is within "
                f"{self.IMBL_WARNING_DISTANCE_M} m "
                "of the supplied maritime-boundary layer."
            )

        if not inside_eez:

            warnings.append(
                "Location is outside the supplied "
                "India EEZ dataset."
            )

        if not bathymetry_available:

            warnings.append(
                "Bathymetry data is unavailable "
                "for this location."
            )

        data_sources_available = 0

        if bathymetry_available:
            data_sources_available += 1

        if len(self.mpas) > 0:
            data_sources_available += 1

        if len(self.eez) > 0:
            data_sources_available += 1

        if len(self.imbl) > 0:
            data_sources_available += 1

        if data_sources_available == 4:

            data_confidence = "HIGH"

        elif data_sources_available >= 2:

            data_confidence = "MEDIUM"

        else:

            data_confidence = "LOW"

        return {

            "latitude":
                latitude,

            "longitude":
                longitude,

            "status":
                status,

            "data_confidence":
                data_confidence,

            # mpa,imbl,eez

            "inside_mpa":
                inside_mpa,

            "mpa_areas":
                mpa_areas,

            "inside_india_eez":
                inside_eez,


            "distance_to_imbl_m":
                distance_to_boundary_m,

            "imbl_alert":
                border_alert,

                # bathymetry

            "bathymetry_available":
                bathymetry_available,

            "is_land":
                is_land,

            "elevation_m":
                elevation,

            "depth_m":
                depth,

            "depth_status":
                depth_status,


            "warnings":
                warnings
        }

    @staticmethod
    def _get_attribute(
        row,
        possible_fields
    ):

        for field in possible_fields:

            if field in row.index:

                value = row.get(
                    field
                )

                if value is not None:

                    try:

                        if str(value).strip() not in [
                            "",
                            "nan",
                            "None"
                        ]:

                            return str(value)

                    except Exception:

                        pass

        return "Unknown"


if __name__ == "__main__":

    checker = BoundaryChecker(

        "india-mpas.geojson",

        "india-eez.geojson",

        "imbl.geojson",

        None
    )

    latitude = 17.5
    longitude = 83.5

    result = checker.check_point(
        latitude=latitude,
        longitude=longitude
    )

    # this will be displayed in terminal

    print("\n==============================================")
    print("              ORCA SAFETY CHECK")
    print("==============================================")

    print("\nGPS")
    print("----------------------------------------------")

    print(
        "Latitude:",
        result["latitude"]
    )

    print(
        "Longitude:",
        result["longitude"]
    )

    print("\nOVERALL")
    print("----------------------------------------------")

    print(
        "Status:",
        result["status"]
    )

    print(
        "Confidence:",
        result["data_confidence"]
    )

    print("\nMPA")
    print("----------------------------------------------")

    print(
        "Inside MPA:",
        result["inside_mpa"]
    )

    print(
        "Areas:",
        result["mpa_areas"]
    )

    print("\nEEZ")
    print("----------------------------------------------")

    print(
        "Inside India EEZ:",
        result["inside_india_eez"]
    )

    print("\nMARITIME BOUNDARY")
    print("----------------------------------------------")

    print(
        "Distance:",
        result["distance_to_imbl_m"],
        "m"
    )

    print(
        "Border Alert:",
        result["imbl_alert"]
    )

    print("\nBATHYMETRY")
    print("----------------------------------------------")

    print(
        "Available:",
        result["bathymetry_available"]
    )

    print(
        "Land:",
        result["is_land"]
    )

    print(
        "Elevation:",
        result["elevation_m"],
        "m"
    )

    print(
        "Depth:",
        result["depth_m"],
        "m"
    )

    print(
        "Depth Status:",
        result["depth_status"]
    )

    print("\nWARNINGS")
    print("----------------------------------------------")

    if result["warnings"]:

        for warning in result["warnings"]:

            print(
                "⚠",
                warning
            )

    else:

        print(
            "No immediate geographic warnings."
        )

    print(
        "\n=============================================="
    )
