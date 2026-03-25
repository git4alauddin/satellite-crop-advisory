from fastapi import APIRouter

from src.services.stats_service import get_metric_stats_payload

router = APIRouter()


@router.get("/stats/ndvi")
def get_ndvi_stats(region_id: int, from_date: str | None = None, to_date: str | None = None):
    return get_metric_stats_payload("ndvi", region_id, from_date, to_date)


@router.get("/stats/ndwi")
def get_ndwi_stats(region_id: int, from_date: str | None = None, to_date: str | None = None):
    return get_metric_stats_payload("ndwi", region_id, from_date, to_date)


@router.get("/stats/lst")
def get_lst_stats(region_id: int, from_date: str | None = None, to_date: str | None = None):
    return get_metric_stats_payload("lst", region_id, from_date, to_date)
