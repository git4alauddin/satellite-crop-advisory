import os

from dotenv import load_dotenv
load_dotenv()

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]

GEE_PROJECT_ID = os.getenv("GEE_PROJECT_ID")
