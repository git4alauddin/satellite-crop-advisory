from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import CORS_ORIGINS
from src.routers.alerts_router import router as alerts_router
from src.routers.health_router import router as health_router
from src.routers.jobs_router import router as jobs_router
from src.routers.stats_router import router as stats_router

app = FastAPI(title="sca-processor", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(jobs_router)
app.include_router(stats_router)
app.include_router(alerts_router)
