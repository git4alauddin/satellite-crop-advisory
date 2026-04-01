from src.services.stats_service import get_alerts_payload

from fastapi import APIRouter
router = APIRouter()

@router.get("/alerts")
def get_alerts(region_id: int, from_date: str | None = None, to_date: str | None = None):
    return get_alerts_payload(region_id, from_date, to_date)
