from __future__ import annotations

import ee

from src.ndvi_service import get_sentinel2_collection, mask_s2_clouds


def compute_ndwi(image: ee.Image) -> ee.Image:
    return image.normalizedDifference(["B3", "B8"]).rename("ndwi")


def build_ndwi_composite(start_date: str, end_date: str, region: ee.Geometry) -> tuple[ee.Image, int]:
    collection = get_sentinel2_collection(start_date, end_date, region).map(mask_s2_clouds)
    image_count = int(collection.size().getInfo())
    if image_count == 0:
        raise ValueError(
            "No Sentinel-2 images found for the selected region/date range. "
            "Try a wider date window."
        )
    composite = collection.median()
    ndwi = compute_ndwi(composite).clip(region)
    return ndwi, image_count


def compute_mean_ndwi(ndwi_image: ee.Image, region: ee.Geometry) -> float | None:
    stats = ndwi_image.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=region,
        scale=10,
        maxPixels=1_000_000_000,
    )
    value = stats.get("ndwi").getInfo()
    if value is None:
        return None
    return float(value)
