from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime, timezone


app = FastAPI(title="sca-processor", version="0.1.0")


class NDVIJobRequest(BaseModel):
    region_id: int
    start_date: str
    end_date: str


@app.get("/health")
def health():
    return {
        "service": "sca-processor",
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.post("/jobs/ndvi")
def run_ndvi_job(payload: NDVIJobRequest):
    return {
        "job_type": "ndvi",
        "status": "queued_stub",
        "received_payload": payload.model_dump()
    }
