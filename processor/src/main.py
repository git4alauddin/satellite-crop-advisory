import json
import os
from pydantic import BaseModel
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import BackgroundTasks, FastAPI, HTTPException
from dotenv import load_dotenv
import psycopg
import ee

from src.ndvi_service import build_ndvi_composite, compute_mean_ndvi, init_ee
from src.ndwi_service import build_ndwi_composite, compute_mean_ndwi
from src.lst_service import build_lst_composite, compute_mean_lst

load_dotenv()


app = FastAPI(title="sca-processor", version="0.1.0")
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
) -> None:
    query = """
        INSERT INTO index_stats (
            region_id, date_start, date_end, source_image_count, mean_ndvi, mean_ndwi, mean_lst_c,
            ndvi_image_count, ndwi_image_count, lst_image_count
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (region_id, date_start, date_end)
        DO UPDATE SET
            source_image_count = EXCLUDED.source_image_count,
            mean_ndvi = COALESCE(EXCLUDED.mean_ndvi, index_stats.mean_ndvi),
            mean_ndwi = COALESCE(EXCLUDED.mean_ndwi, index_stats.mean_ndwi),
            mean_lst_c = COALESCE(EXCLUDED.mean_lst_c, index_stats.mean_lst_c),
            ndvi_image_count = COALESCE(EXCLUDED.ndvi_image_count, index_stats.ndvi_image_count),
            ndwi_image_count = COALESCE(EXCLUDED.ndwi_image_count, index_stats.ndwi_image_count),
            lst_image_count = COALESCE(EXCLUDED.lst_image_count, index_stats.lst_image_count)
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
def get_ndvi_stats(region_id: int):
    query = """
        SELECT region_id, date_start, date_end, COALESCE(ndvi_image_count, source_image_count) AS image_count, mean_ndvi, created_at
        FROM index_stats
        WHERE region_id = %s
        ORDER BY date_start DESC
        LIMIT 50
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (region_id,))
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
                "created_at": row[5].isoformat(),
            }
        )

    return {"count": len(records), "items": records}


@app.get("/stats/ndwi")
def get_ndwi_stats(region_id: int):
    query = """
        SELECT region_id, date_start, date_end, COALESCE(ndwi_image_count, source_image_count) AS image_count, mean_ndwi, created_at
        FROM index_stats
        WHERE region_id = %s
        ORDER BY date_start DESC
        LIMIT 50
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (region_id,))
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
                "created_at": row[5].isoformat(),
            }
        )

    return {"count": len(records), "items": records}


@app.get("/stats/lst")
def get_lst_stats(region_id: int):
    query = """
        SELECT region_id, date_start, date_end, COALESCE(lst_image_count, source_image_count) AS image_count, mean_lst_c, created_at
        FROM index_stats
        WHERE region_id = %s
        ORDER BY date_start DESC
        LIMIT 50
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (region_id,))
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
                "created_at": row[5].isoformat(),
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
        )

        ndvi_jobs[job_id]["status"] = "completed"
        ndvi_jobs[job_id]["result"] = {
            "region_id": payload.region_id,
            "start_date": payload.start_date,
            "end_date": payload.end_date,
            "source_image_count": image_count,
            "mean_ndvi": mean_ndvi,
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
        )

        ndwi_jobs[job_id]["status"] = "completed"
        ndwi_jobs[job_id]["result"] = {
            "region_id": payload.region_id,
            "start_date": payload.start_date,
            "end_date": payload.end_date,
            "source_image_count": image_count,
            "mean_ndwi": mean_ndwi,
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
        )

        lst_jobs[job_id]["status"] = "completed"
        lst_jobs[job_id]["result"] = {
            "region_id": payload.region_id,
            "start_date": payload.start_date,
            "end_date": payload.end_date,
            "source_image_count": image_count,
            "mean_lst_c": mean_lst_c,
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
