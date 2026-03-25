import os

import ee

from src.core.config import GEE_PROJECT_ID
from src.lst_service import build_lst_composite, compute_mean_lst
from src.ndvi_service import build_ndvi_composite, compute_mean_ndvi, init_ee
from src.ndwi_service import build_ndwi_composite, compute_mean_ndwi
from src.repositories.alerts_repository import upsert_alert
from src.repositories.index_stats_repository import get_historical_baseline, upsert_index_stats
from src.repositories.regions_repository import get_region_geojson
from src.schemas.jobs import MetricJobRequest
from src.services.job_store import JobStore
from src.services.rules import (
    classify_lst_severity,
    classify_ndvi_severity,
    classify_ndwi_severity,
    compute_anomaly,
)


def _ensure_gee_configured(store: JobStore, job_id: str) -> str | None:
    project_id = GEE_PROJECT_ID or os.getenv("GEE_PROJECT_ID")
    if not project_id:
        store[job_id]["status"] = "failed"
        store[job_id]["error"] = "GEE_PROJECT_ID is not configured"
        return None
    return project_id


def run_ndvi_job_worker(job_id: str, payload: MetricJobRequest, store: JobStore) -> None:
    project_id = _ensure_gee_configured(store, job_id)
    if not project_id:
        return

    try:
        init_ee(project_id)
        region_geojson = get_region_geojson(payload.region_id)
        region = ee.Geometry(region_geojson)
        ndvi_image, image_count = build_ndvi_composite(payload.start_date, payload.end_date, region)
        mean_ndvi = compute_mean_ndvi(ndvi_image, region)

        ndvi_baseline = get_historical_baseline(payload.region_id, "mean_ndvi", payload.start_date)
        ndvi_anomaly = compute_anomaly(mean_ndvi, ndvi_baseline)
        ndvi_severity = classify_ndvi_severity(mean_ndvi, ndvi_anomaly)

        upsert_index_stats(
            region_id=payload.region_id,
            date_start=payload.start_date,
            date_end=payload.end_date,
            source_image_count=image_count,
            mean_ndvi=mean_ndvi,
            mean_ndwi=None,
            mean_lst_c=None,
            ndvi_image_count=image_count,
            ndwi_image_count=None,
            lst_image_count=None,
            ndvi_anomaly=ndvi_anomaly,
            ndwi_anomaly=None,
            lst_anomaly_c=None,
            ndvi_severity=ndvi_severity,
            ndwi_severity=None,
            lst_severity=None,
        )

        if ndvi_anomaly is not None and ndvi_anomaly <= -0.20:
            upsert_alert(
                region_id=payload.region_id,
                metric="ndvi",
                severity="critical",
                message="NDVI dropped more than 20% from baseline; vegetation stress likely.",
                date_start=payload.start_date,
                date_end=payload.end_date,
                meta={
                    "mean_ndvi": mean_ndvi,
                    "baseline_ndvi": ndvi_baseline,
                    "ndvi_anomaly": ndvi_anomaly,
                },
            )

        store[job_id]["status"] = "completed"
        store[job_id]["result"] = {
            "region_id": payload.region_id,
            "start_date": payload.start_date,
            "end_date": payload.end_date,
            "source_image_count": image_count,
            "mean_ndvi": mean_ndvi,
            "ndvi_baseline": ndvi_baseline,
            "ndvi_anomaly": ndvi_anomaly,
            "ndvi_severity": ndvi_severity,
        }
    except Exception as error:  # pragma: no cover - operational path
        store[job_id]["status"] = "failed"
        store[job_id]["error"] = str(error)


def run_ndwi_job_worker(job_id: str, payload: MetricJobRequest, store: JobStore) -> None:
    project_id = _ensure_gee_configured(store, job_id)
    if not project_id:
        return

    try:
        init_ee(project_id)
        region_geojson = get_region_geojson(payload.region_id)
        region = ee.Geometry(region_geojson)
        ndwi_image, image_count = build_ndwi_composite(payload.start_date, payload.end_date, region)
        mean_ndwi = compute_mean_ndwi(ndwi_image, region)

        ndwi_baseline = get_historical_baseline(payload.region_id, "mean_ndwi", payload.start_date)
        ndwi_anomaly = compute_anomaly(mean_ndwi, ndwi_baseline)
        ndwi_severity = classify_ndwi_severity(mean_ndwi, ndwi_anomaly)

        upsert_index_stats(
            region_id=payload.region_id,
            date_start=payload.start_date,
            date_end=payload.end_date,
            source_image_count=image_count,
            mean_ndvi=None,
            mean_ndwi=mean_ndwi,
            mean_lst_c=None,
            ndvi_image_count=None,
            ndwi_image_count=image_count,
            lst_image_count=None,
            ndvi_anomaly=None,
            ndwi_anomaly=ndwi_anomaly,
            lst_anomaly_c=None,
            ndvi_severity=None,
            ndwi_severity=ndwi_severity,
            lst_severity=None,
        )

        if ndwi_severity in {"stressed", "critical"}:
            upsert_alert(
                region_id=payload.region_id,
                metric="ndwi",
                severity=ndwi_severity,
                message=f"NDWI indicates {ndwi_severity} water stress conditions.",
                date_start=payload.start_date,
                date_end=payload.end_date,
                meta={
                    "mean_ndwi": mean_ndwi,
                    "baseline_ndwi": ndwi_baseline,
                    "ndwi_anomaly": ndwi_anomaly,
                },
            )

        store[job_id]["status"] = "completed"
        store[job_id]["result"] = {
            "region_id": payload.region_id,
            "start_date": payload.start_date,
            "end_date": payload.end_date,
            "source_image_count": image_count,
            "mean_ndwi": mean_ndwi,
            "ndwi_baseline": ndwi_baseline,
            "ndwi_anomaly": ndwi_anomaly,
            "ndwi_severity": ndwi_severity,
            "alert_generated": ndwi_severity in {"stressed", "critical"},
        }
    except Exception as error:  # pragma: no cover - operational path
        store[job_id]["status"] = "failed"
        store[job_id]["error"] = str(error)


def run_lst_job_worker(job_id: str, payload: MetricJobRequest, store: JobStore) -> None:
    project_id = _ensure_gee_configured(store, job_id)
    if not project_id:
        return

    try:
        init_ee(project_id)
        region_geojson = get_region_geojson(payload.region_id)
        region = ee.Geometry(region_geojson)
        lst_image, image_count = build_lst_composite(payload.start_date, payload.end_date, region)
        mean_lst_c = compute_mean_lst(lst_image, region)

        lst_baseline = get_historical_baseline(payload.region_id, "mean_lst_c", payload.start_date)
        lst_anomaly_c = compute_anomaly(mean_lst_c, lst_baseline)
        lst_severity = classify_lst_severity(mean_lst_c, lst_anomaly_c)

        upsert_index_stats(
            region_id=payload.region_id,
            date_start=payload.start_date,
            date_end=payload.end_date,
            source_image_count=image_count,
            mean_ndvi=None,
            mean_ndwi=None,
            mean_lst_c=mean_lst_c,
            ndvi_image_count=None,
            ndwi_image_count=None,
            lst_image_count=image_count,
            ndvi_anomaly=None,
            ndwi_anomaly=None,
            lst_anomaly_c=lst_anomaly_c,
            ndvi_severity=None,
            ndwi_severity=None,
            lst_severity=lst_severity,
        )

        if lst_severity in {"stressed", "critical"}:
            upsert_alert(
                region_id=payload.region_id,
                metric="lst",
                severity=lst_severity,
                message=f"LST indicates {lst_severity} heat stress conditions.",
                date_start=payload.start_date,
                date_end=payload.end_date,
                meta={
                    "mean_lst_c": mean_lst_c,
                    "baseline_lst_c": lst_baseline,
                    "lst_anomaly_c": lst_anomaly_c,
                },
            )

        store[job_id]["status"] = "completed"
        store[job_id]["result"] = {
            "region_id": payload.region_id,
            "start_date": payload.start_date,
            "end_date": payload.end_date,
            "source_image_count": image_count,
            "mean_lst_c": mean_lst_c,
            "lst_baseline": lst_baseline,
            "lst_anomaly_c": lst_anomaly_c,
            "lst_severity": lst_severity,
            "alert_generated": lst_severity in {"stressed", "critical"},
        }
    except Exception as error:  # pragma: no cover - operational path
        store[job_id]["status"] = "failed"
        store[job_id]["error"] = str(error)
