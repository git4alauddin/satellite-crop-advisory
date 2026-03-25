from datetime import datetime, timezone

JobStore = dict[str, dict]

ndvi_jobs: JobStore = {}
ndwi_jobs: JobStore = {}
lst_jobs: JobStore = {}


METRIC_JOB_STORES: dict[str, JobStore] = {
    "ndvi": ndvi_jobs,
    "ndwi": ndwi_jobs,
    "lst": lst_jobs,
}


def create_job_record(store: JobStore, job_id: str, job_type: str, payload: dict) -> None:
    store[job_id] = {
        "job_id": job_id,
        "job_type": job_type,
        "status": "queued",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "input": payload,
        "result": None,
        "error": None,
    }
