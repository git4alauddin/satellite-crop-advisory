import json
import os
from pydantic import BaseModel
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import psycopg
import ee

from src.ndvi_service import build_ndvi_composite, compute_mean_ndvi, init_ee
from src.ndwi_service import build_ndwi_composite, compute_mean_ndwi
from src.lst_service import build_lst_composite, compute_mean_lst

load_dotenv()


app = FastAPI(title="sca-processor", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ndvi_jobs: dict[str, dict] = {}
ndwi_jobs: dict[str, dict] = {}
lst_jobs: dict[str, dict] = {}


class NDVIJobRequest(BaseModel):
    region_id: int
    start_date: str
    end_date: str


def get_db_connection():
    return psycopg.connect(
        host=os.getenv("PGHOST", "localhost"),
        port=int(os.getenv("PGPORT", "5432")),
        user=os.getenv("PGUSER", "sca_user"),
        password=os.getenv("PGPASSWORD", "sca_pass"),
        dbname=os.getenv("PGDATABASE", "sca_geo"),
    )


def get_region_geojson(region_id: int) -> dict:
    query = """
        SELECT ST_AsGeoJSON(geom)::json AS geom
        FROM regions
        WHERE id = %s
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (region_id,))
            row = cur.fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail=f"Region {region_id} not found")
            return row[0] if isinstance(row[0], dict) else json.loads(row[0])


def get_historical_baseline(region_id: int, metric_column: str, start_date: str) -> float | None:
    allowed_columns = {"mean_ndvi", "mean_ndwi", "mean_lst_c"}
    if metric_column not in allowed_columns:
        raise ValueError(f"Unsupported metric column: {metric_column}")

    query = f"""
        SELECT AVG({metric_column})::double precision AS baseline
        FROM index_stats
        WHERE region_id = %s
          AND {metric_column} IS NOT NULL
          AND date_start < %s::date
          AND EXTRACT(MONTH FROM date_start) = EXTRACT(MONTH FROM %s::date)
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (region_id, start_date, start_date))
            row = cur.fetchone()

    if not row or row[0] is None:
        return None
    return float(row[0])


def compute_anomaly(current_value: float | None, baseline_value: float | None) -> float | None:
    if current_value is None or baseline_value is None:
        return None
    return float(current_value - baseline_value)


def classify_ndvi_severity(mean_ndvi: float | None, ndvi_anomaly: float | None) -> str | None:
    if mean_ndvi is None:
        return None
    if ndvi_anomaly is not None:
        if ndvi_anomaly <= -0.20:
            return "critical"
        if ndvi_anomaly <= -0.10:
            return "stressed"
        return "healthy"
    if mean_ndvi < 0.20:
        return "critical"
    if mean_ndvi < 0.40:
        return "stressed"
    return "healthy"


def classify_ndwi_severity(mean_ndwi: float | None, ndwi_anomaly: float | None) -> str | None:
    if mean_ndwi is None:
        return None
    if ndwi_anomaly is not None:
        if ndwi_anomaly <= -0.15:
            return "critical"
        if ndwi_anomaly <= -0.07:
            return "stressed"
        return "healthy"
    if mean_ndwi < 0.00:
        return "critical"
    if mean_ndwi < 0.20:
        return "stressed"
    return "healthy"


def classify_lst_severity(mean_lst_c: float | None, lst_anomaly_c: float | None) -> str | None:
    if mean_lst_c is None:
        return None
    if lst_anomaly_c is not None:
        if lst_anomaly_c >= 4.0:
            return "critical"
        if lst_anomaly_c >= 2.0:
            return "stressed"
        return "healthy"
    if mean_lst_c >= 35.0:
        return "critical"
    if mean_lst_c >= 30.0:
        return "stressed"
    return "healthy"


def upsert_index_stats(
    region_id: int,
    date_start: str,
    date_end: str,
    source_image_count: int,
    mean_ndvi: float | None,
    mean_ndwi: float | None,
    mean_lst_c: float | None,
    ndvi_image_count: int | None,
    ndwi_image_count: int | None,
    lst_image_count: int | None,
    ndvi_anomaly: float | None,
    ndwi_anomaly: float | None,
    lst_anomaly_c: float | None,
    ndvi_severity: str | None,
    ndwi_severity: str | None,
    lst_severity: str | None,
) -> None:
    query = """
        INSERT INTO index_stats (
            region_id, date_start, date_end, source_image_count, mean_ndvi, mean_ndwi, mean_lst_c,
            ndvi_image_count, ndwi_image_count, lst_image_count,
            ndvi_anomaly, ndwi_anomaly, lst_anomaly_c,
            ndvi_severity, ndwi_severity, lst_severity
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (region_id, date_start, date_end)
        DO UPDATE SET
            source_image_count = EXCLUDED.source_image_count,
            mean_ndvi = COALESCE(EXCLUDED.mean_ndvi, index_stats.mean_ndvi),
            mean_ndwi = COALESCE(EXCLUDED.mean_ndwi, index_stats.mean_ndwi),
            mean_lst_c = COALESCE(EXCLUDED.mean_lst_c, index_stats.mean_lst_c),
            ndvi_image_count = COALESCE(EXCLUDED.ndvi_image_count, index_stats.ndvi_image_count),
            ndwi_image_count = COALESCE(EXCLUDED.ndwi_image_count, index_stats.ndwi_image_count),
            lst_image_count = COALESCE(EXCLUDED.lst_image_count, index_stats.lst_image_count),
            ndvi_anomaly = COALESCE(EXCLUDED.ndvi_anomaly, index_stats.ndvi_anomaly),
            ndwi_anomaly = COALESCE(EXCLUDED.ndwi_anomaly, index_stats.ndwi_anomaly),
            lst_anomaly_c = COALESCE(EXCLUDED.lst_anomaly_c, index_stats.lst_anomaly_c),
            ndvi_severity = COALESCE(EXCLUDED.ndvi_severity, index_stats.ndvi_severity),
            ndwi_severity = COALESCE(EXCLUDED.ndwi_severity, index_stats.ndwi_severity),
            lst_severity = COALESCE(EXCLUDED.lst_severity, index_stats.lst_severity)
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                query,
                (
                    region_id,
                    date_start,
                    date_end,
                    source_image_count,
                    mean_ndvi,
                    mean_ndwi,
                    mean_lst_c,
                    ndvi_image_count,
                    ndwi_image_count,
                    lst_image_count,
                    ndvi_anomaly,
                    ndwi_anomaly,
                    lst_anomaly_c,
                    ndvi_severity,
                    ndwi_severity,
                    lst_severity,
                ),
            )
        conn.commit()


@app.get("/health")
def health():
    return {
        "service": "sca-processor",
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get("/stats/ndvi")
def get_ndvi_stats(region_id: int, from_date: str | None = None, to_date: str | None = None):
    query = """
        SELECT
            region_id,
            date_start,
            date_end,
            COALESCE(ndvi_image_count, source_image_count) AS image_count,
            mean_ndvi,
            ndvi_anomaly,
            ndvi_severity,
            created_at
        FROM index_stats
        WHERE region_id = %s
          AND (%s::date IS NULL OR date_start >= %s::date)
          AND (%s::date IS NULL OR date_end <= %s::date)
        ORDER BY date_start DESC
        LIMIT 50
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (region_id, from_date, from_date, to_date, to_date))
            rows = cur.fetchall()

    records = []
    for row in rows:
        records.append(
            {
                "region_id": row[0],
                "date_start": row[1].isoformat(),
                "date_end": row[2].isoformat(),
                "source_image_count": row[3],
                "ndvi_image_count": row[3],
                "mean_ndvi": row[4],
                "ndvi_anomaly": row[5],
                "ndvi_severity": row[6],
                "created_at": row[7].isoformat(),
            }
        )

    return {"count": len(records), "items": records}


@app.get("/stats/ndwi")
def get_ndwi_stats(region_id: int, from_date: str | None = None, to_date: str | None = None):
    query = """
        SELECT
            region_id,
            date_start,
            date_end,
            COALESCE(ndwi_image_count, source_image_count) AS image_count,
            mean_ndwi,
            ndwi_anomaly,
            ndwi_severity,
            created_at
        FROM index_stats
        WHERE region_id = %s
          AND (%s::date IS NULL OR date_start >= %s::date)
          AND (%s::date IS NULL OR date_end <= %s::date)
        ORDER BY date_start DESC
        LIMIT 50
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (region_id, from_date, from_date, to_date, to_date))
            rows = cur.fetchall()

    records = []
    for row in rows:
        records.append(
            {
                "region_id": row[0],
                "date_start": row[1].isoformat(),
                "date_end": row[2].isoformat(),
                "source_image_count": row[3],
                "ndwi_image_count": row[3],
                "mean_ndwi": row[4],
                "ndwi_anomaly": row[5],
                "ndwi_severity": row[6],
                "created_at": row[7].isoformat(),
            }
        )

    return {"count": len(records), "items": records}


@app.get("/stats/lst")
def get_lst_stats(region_id: int, from_date: str | None = None, to_date: str | None = None):
    query = """
        SELECT
            region_id,
            date_start,
            date_end,
            COALESCE(lst_image_count, source_image_count) AS image_count,
            mean_lst_c,
            lst_anomaly_c,
            lst_severity,
            created_at
        FROM index_stats
        WHERE region_id = %s
          AND (%s::date IS NULL OR date_start >= %s::date)
          AND (%s::date IS NULL OR date_end <= %s::date)
        ORDER BY date_start DESC
        LIMIT 50
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (region_id, from_date, from_date, to_date, to_date))
            rows = cur.fetchall()

    records = []
    for row in rows:
        records.append(
            {
                "region_id": row[0],
                "date_start": row[1].isoformat(),
                "date_end": row[2].isoformat(),
                "source_image_count": row[3],
                "lst_image_count": row[3],
                "mean_lst_c": row[4],
                "lst_anomaly_c": row[5],
                "lst_severity": row[6],
                "created_at": row[7].isoformat(),
            }
        )

    return {"count": len(records), "items": records}


def run_ndvi_job_worker(job_id: str, payload: NDVIJobRequest) -> None:
    project_id = os.getenv("GEE_PROJECT_ID")
    if not project_id:
        ndvi_jobs[job_id]["status"] = "failed"
        ndvi_jobs[job_id]["error"] = "GEE_PROJECT_ID is not configured"
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

        ndvi_jobs[job_id]["status"] = "completed"
        ndvi_jobs[job_id]["result"] = {
            "region_id": payload.region_id,
            "start_date": payload.start_date,
            "end_date": payload.end_date,
            "source_image_count": image_count,
            "mean_ndvi": mean_ndvi,
            "ndvi_baseline": ndvi_baseline,
            "ndvi_anomaly": ndvi_anomaly,
            "ndvi_severity": ndvi_severity,
        }
    except Exception as error:
        ndvi_jobs[job_id]["status"] = "failed"
        ndvi_jobs[job_id]["error"] = str(error)


@app.post("/jobs/ndvi")
def run_ndvi_job(payload: NDVIJobRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid4())
    ndvi_jobs[job_id] = {
        "job_id": job_id,
        "job_type": "ndvi",
        "status": "queued",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "input": payload.model_dump(),
        "result": None,
        "error": None,
    }

    ndvi_jobs[job_id]["status"] = "running"
    background_tasks.add_task(run_ndvi_job_worker, job_id, payload)

    return {
        "job_id": job_id,
        "job_type": "ndvi",
        "status": "running",
        "message": "NDVI job accepted. Check status endpoint for result.",
    }


@app.get("/jobs/ndvi/{job_id}")
def get_ndvi_job_status(job_id: str):
    job = ndvi_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job


def run_ndwi_job_worker(job_id: str, payload: NDVIJobRequest) -> None:
    project_id = os.getenv("GEE_PROJECT_ID")
    if not project_id:
        ndwi_jobs[job_id]["status"] = "failed"
        ndwi_jobs[job_id]["error"] = "GEE_PROJECT_ID is not configured"
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

        ndwi_jobs[job_id]["status"] = "completed"
        ndwi_jobs[job_id]["result"] = {
            "region_id": payload.region_id,
            "start_date": payload.start_date,
            "end_date": payload.end_date,
            "source_image_count": image_count,
            "mean_ndwi": mean_ndwi,
            "ndwi_baseline": ndwi_baseline,
            "ndwi_anomaly": ndwi_anomaly,
            "ndwi_severity": ndwi_severity,
        }
    except Exception as error:
        ndwi_jobs[job_id]["status"] = "failed"
        ndwi_jobs[job_id]["error"] = str(error)


@app.post("/jobs/ndwi")
def run_ndwi_job(payload: NDVIJobRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid4())
    ndwi_jobs[job_id] = {
        "job_id": job_id,
        "job_type": "ndwi",
        "status": "queued",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "input": payload.model_dump(),
        "result": None,
        "error": None,
    }

    ndwi_jobs[job_id]["status"] = "running"
    background_tasks.add_task(run_ndwi_job_worker, job_id, payload)

    return {
        "job_id": job_id,
        "job_type": "ndwi",
        "status": "running",
        "message": "NDWI job accepted. Check status endpoint for result.",
    }


@app.get("/jobs/ndwi/{job_id}")
def get_ndwi_job_status(job_id: str):
    job = ndwi_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job


def run_lst_job_worker(job_id: str, payload: NDVIJobRequest) -> None:
    project_id = os.getenv("GEE_PROJECT_ID")
    if not project_id:
        lst_jobs[job_id]["status"] = "failed"
        lst_jobs[job_id]["error"] = "GEE_PROJECT_ID is not configured"
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

        lst_jobs[job_id]["status"] = "completed"
        lst_jobs[job_id]["result"] = {
            "region_id": payload.region_id,
            "start_date": payload.start_date,
            "end_date": payload.end_date,
            "source_image_count": image_count,
            "mean_lst_c": mean_lst_c,
            "lst_baseline": lst_baseline,
            "lst_anomaly_c": lst_anomaly_c,
            "lst_severity": lst_severity,
        }
    except Exception as error:
        lst_jobs[job_id]["status"] = "failed"
        lst_jobs[job_id]["error"] = str(error)


@app.post("/jobs/lst")
def run_lst_job(payload: NDVIJobRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid4())
    lst_jobs[job_id] = {
        "job_id": job_id,
        "job_type": "lst",
        "status": "queued",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "input": payload.model_dump(),
        "result": None,
        "error": None,
    }

    lst_jobs[job_id]["status"] = "running"
    background_tasks.add_task(run_lst_job_worker, job_id, payload)

    return {
        "job_id": job_id,
        "job_type": "lst",
        "status": "running",
        "message": "LST job accepted. Check status endpoint for result.",
    }


@app.get("/jobs/lst/{job_id}")
def get_lst_job_status(job_id: str):
    job = lst_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job
