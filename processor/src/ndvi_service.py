from __future__ import annotations

import ee


def init_ee(project_id: str) -> None:
    ee.Initialize(project=project_id)


def get_sentinel2_collection(start_date: str, end_date: str, region: ee.Geometry) -> ee.ImageCollection:
    return (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterDate(start_date, end_date)
        .filterBounds(region)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 40))
    )


def mask_s2_clouds(image: ee.Image) -> ee.Image:
    scl = image.select("SCL")
    cloud_shadow = scl.eq(3)
    cloud_medium = scl.eq(8)
    cloud_high = scl.eq(9)
    cirrus = scl.eq(10)
    snow = scl.eq(11)
    clear_mask = cloud_shadow.Or(cloud_medium).Or(cloud_high).Or(cirrus).Or(snow).Not()
    return image.updateMask(clear_mask)


def compute_ndvi(image: ee.Image) -> ee.Image:
    return image.normalizedDifference(["B8", "B4"]).rename("ndvi")


def build_ndvi_composite(start_date: str, end_date: str, region: ee.Geometry) -> tuple[ee.Image, int]:
    collection = get_sentinel2_collection(start_date, end_date, region).map(mask_s2_clouds)
    image_count = int(collection.size().getInfo())
    if image_count == 0:
        raise ValueError(
            "No Sentinel-2 images found for the selected region/date range. "
            "Try a wider date window."
        )
    composite = collection.median()
    ndvi = compute_ndvi(composite).clip(region)
    return ndvi, image_count


def compute_mean_ndvi(ndvi_image: ee.Image, region: ee.Geometry) -> float | None:
    stats = ndvi_image.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=region,
        scale=10,
        maxPixels=1_000_000_000,
    )
    value = stats.get("ndvi").getInfo()
    if value is None:
        return None
    return float(value)
