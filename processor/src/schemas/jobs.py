from pydantic import BaseModel

class MetricJobRequest(BaseModel):
    region_id: int
    start_date: str
    end_date: str
