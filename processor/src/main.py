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

load_dotenv()


app = FastAPI(title="sca-processor", version="0.1.0")
ndvi_jobs: dict[str, dict] = {}


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
) -> None:
    query = """
        INSERT INTO index_stats (region_id, date_start, date_end, source_image_count, mean_ndvi)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (region_id, date_start, date_end)
        DO UPDATE SET
            source_image_count = EXCLUDED.source_image_count,
            mean_ndvi = EXCLUDED.mean_ndvi
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                query,
                (region_id, date_start, date_end, source_image_count, mean_ndvi),
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
        SELECT region_id, date_start, date_end, source_image_count, mean_ndvi, created_at
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
                "mean_ndvi": row[4],
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
