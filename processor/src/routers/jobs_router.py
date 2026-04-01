from uuid import uuid4
from fastapi import APIRouter, BackgroundTasks, HTTPException
from src.schemas.jobs import MetricJobRequest
from src.services.job_store import METRIC_JOB_STORES, create_job_record
from src.services.job_workers import run_lst_job_worker, run_ndvi_job_worker, run_ndwi_job_worker

router = APIRouter()

@router.post("/jobs/ndvi")
def run_ndvi_job(payload: MetricJobRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid4())
    store = METRIC_JOB_STORES["ndvi"]
    create_job_record(store, job_id, "ndvi", payload.model_dump())

    store[job_id]["status"] = "running"
    background_tasks.add_task(run_ndvi_job_worker, job_id, payload, store)

    return {
        "job_id": job_id,
        "job_type": "ndvi",
        "status": "running",
        "message": "NDVI job accepted. Check status endpoint for result.",
    }


@router.get("/jobs/ndvi/{job_id}")
def get_ndvi_job_status(job_id: str):
    job = METRIC_JOB_STORES["ndvi"].get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job


@router.post("/jobs/ndwi")
def run_ndwi_job(payload: MetricJobRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid4())
    store = METRIC_JOB_STORES["ndwi"]
    create_job_record(store, job_id, "ndwi", payload.model_dump())

    store[job_id]["status"] = "running"
    background_tasks.add_task(run_ndwi_job_worker, job_id, payload, store)

    return {
        "job_id": job_id,
        "job_type": "ndwi",
        "status": "running",
        "message": "NDWI job accepted. Check status endpoint for result.",
    }


@router.get("/jobs/ndwi/{job_id}")
def get_ndwi_job_status(job_id: str):
    job = METRIC_JOB_STORES["ndwi"].get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job


@router.post("/jobs/lst")
def run_lst_job(payload: MetricJobRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid4())
    store = METRIC_JOB_STORES["lst"]
    create_job_record(store, job_id, "lst", payload.model_dump())

    store[job_id]["status"] = "running"
    background_tasks.add_task(run_lst_job_worker, job_id, payload, store)

    return {
        "job_id": job_id,
        "job_type": "lst",
        "status": "running",
        "message": "LST job accepted. Check status endpoint for result.",
    }


@router.get("/jobs/lst/{job_id}")
def get_lst_job_status(job_id: str):
    job = METRIC_JOB_STORES["lst"].get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job
