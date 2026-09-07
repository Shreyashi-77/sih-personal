import os
import glob
import rasterio


class Bathymetry:

    def __init__(self, raster_file=None):

        if raster_file is None:

            tif_files = glob.glob("*.tif") + glob.glob("*.tiff")

            etopo_files = [
                f for f in tif_files
                if "etopo" in os.path.basename(f).lower()
            ]

            if len(etopo_files) == 0:

                raise FileNotFoundError(
                    "\nNo ETOPO GeoTIFF was found.\n\n"
                    "Put your downloaded ETOPO .tif file "
                    "in the same folder as bathymetry.py.\n"
                )

            if len(etopo_files) > 1:

                print(
                    "Multiple ETOPO files found:"
                )

                for f in etopo_files:
                    print("  -", f)

                print(
                    "\nUsing:",
                    etopo_files[0]
                )

            raster_file = etopo_files[0]

        if not os.path.isfile(raster_file):

            raise FileNotFoundError(
                f"\nBathymetry file not found:\n"
                f"{os.path.abspath(raster_file)}\n\n"
                f"Put the ETOPO .tif file in the ORCA "
                f"project folder."
            )

        self.raster_file = raster_file

        self.dataset = rasterio.open(
            raster_file
        )

        print("\n==============================================")
        print("             ETOPO BATHYMETRY")
        print("==============================================")

        print(
            "File:",
            os.path.basename(raster_file)
        )

        print(
            "CRS:",
            self.dataset.crs
        )

        print(
            "Bounds:",
            self.dataset.bounds
        )

        print(
            "Resolution:",
            self.dataset.res
        )

        print(
            "Width:",
            self.dataset.width
        )

        print(
            "Height:",
            self.dataset.height
        )

        print(
            "NoData:",
            self.dataset.nodata
        )

        print(
            "=============================================="
        )

    def get_depth(
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

        bounds = self.dataset.bounds

        if not (
            bounds.left <= longitude <= bounds.right
            and
            bounds.bottom <= latitude <= bounds.top
        ):

            return {
                "available": False,
                "is_land": None,
                "depth_m": None,
                "elevation_m": None
            }

        try:

            value = next(
                self.dataset.sample(
                    [(longitude, latitude)]
                )
            )[0]

        except Exception:

            return {
                "available": False,
                "is_land": None,
                "depth_m": None,
                "elevation_m": None
            }

        if self.dataset.nodata is not None:

            if value == self.dataset.nodata:

                return {
                    "available": False,
                    "is_land": None,
                    "depth_m": None,
                    "elevation_m": None
                }

        elevation = float(value)

        if elevation >= 0:

            return {
                "available": True,
                "is_land": True,
                "depth_m": 0.0,
                "elevation_m": round(
                    elevation,
                    2
                )
            }

        depth = abs(elevation)

        return {
            "available": True,
            "is_land": False,
            "depth_m": round(
                depth,
                2
            ),
            "elevation_m": round(
                elevation,
                2
            )
        }

    def close(self):

        if self.dataset:

            self.dataset.close()


if __name__ == "__main__":

    print(
        "\nSearching for ETOPO GeoTIFF..."
    )

    bathymetry = Bathymetry()

    latitude = 17.5
    longitude = 83.5

    result = bathymetry.get_depth(
        latitude,
        longitude
    )

    print("\n==============================================")
    print("              BATHYMETRY TEST")
    print("==============================================")

    print(
        "Latitude:",
        latitude
    )

    print(
        "Longitude:",
        longitude
    )

    print(
        "Available:",
        result["available"]
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
        "=============================================="
    )

    bathymetry.close()
