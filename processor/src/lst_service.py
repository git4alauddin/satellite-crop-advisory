from __future__ import annotations
import ee

def get_modis_lst_collection(start_date: str, end_date: str, region: ee.Geometry) -> ee.ImageCollection:
    return (
        ee.ImageCollection("MODIS/061/MOD11A2")
        .filterDate(start_date, end_date)
        .filterBounds(region)
    )


def compute_lst_celsius(image: ee.Image) -> ee.Image:
    # MOD11A2 LST_Day_1km scale factor is 0.02 Kelvin.
    # Convert to Celsius: (Kelvin * 0.02) - 273.15
    return image.select("LST_Day_1km").multiply(0.02).subtract(273.15).rename("lst_c")


def build_lst_composite(start_date: str, end_date: str, region: ee.Geometry) -> tuple[ee.Image, int]:
    collection = get_modis_lst_collection(start_date, end_date, region)
    image_count = int(collection.size().getInfo())
    if image_count == 0:
        raise ValueError(
            "No MODIS LST images found for the selected region/date range. "
            "Try a wider date window."
        )

    lst_collection = collection.map(compute_lst_celsius)
    composite = lst_collection.median().clip(region)
    return composite, image_count


def compute_mean_lst(lst_image: ee.Image, region: ee.Geometry) -> float | None:
    stats = lst_image.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=region,
        scale=1000,
        maxPixels=1_000_000_000,
    )
    value = stats.get("lst_c").getInfo()
    if value is None:
        return None
    return float(value)
