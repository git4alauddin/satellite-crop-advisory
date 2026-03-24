<h1 align="center">KrishiDrishti</h1>

<p align="center">
  <img src="https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostGIS-2F5D50?logo=postgresql&logoColor=white" alt="PostGIS" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white" alt="Docker" />
</p>

<p align="center"><em>Satellite-Based Crop Health & Resource Advisory System</em></p>

## Team
**Team Name:** MASY Crops  
**Members:**
- Yazdan Irfan
- Syeda Saniya Sadaf Syed Ishaque
- Md Alauddin Ansari
- Mainak Mondal

## Problem Statement
Build a system that converts raw satellite imagery into simple, actionable crop-health advisories through geospatial processing, temporal analysis, and dashboard insights.

## Approach
- Ingest and preprocess satellite data at region level
- Compute NDVI, NDWI, and LST indicators
- Compare current period against historical baseline (anomaly)
- Classify stress severity (`healthy`, `stressed`, `critical`)
- Expose insights through APIs and visualize in a farmer-friendly UI

## Repository Structure
- `frontend/` - React dashboard for map and index visualization
- `api/` - Node.js/TypeScript service for application APIs
- `processor/` - FastAPI service for geospatial/index processing jobs
- `db/init/` - SQL schema and migration scripts
- `docker-compose.yml` - local PostGIS + MongoDB services
- `README.md` - project overview and setup guide

## Milestone Breakdown

Legend:
- ![done](https://img.shields.io/badge/status-done-22c55e)
- ![in-progress](https://img.shields.io/badge/status-in--progress-f59e0b)
- ![pending](https://img.shields.io/badge/status-pending-6b7280)

| Milestone Area | Scope | Status |
|---|---|---|
| Data Ingestion & Preprocessing | Sentinel-2 + MODIS fetch, cloud filtering, region clipping | ![done](https://img.shields.io/badge/status-done-22c55e) |
| Core Index Engine | NDVI, NDWI, LST computation and persistence | ![done](https://img.shields.io/badge/status-done-22c55e) |
| Context Layer | Baseline lookup, anomaly calculation, severity classification | ![done](https://img.shields.io/badge/status-done-22c55e) |
| Temporal Intelligence | Multi-window comparison and seasonal trend enhancement | ![in-progress](https://img.shields.io/badge/status-in--progress-f59e0b) |
| Advisory & Alerts | Alert rules, alert storage, alert API, alert UI panel | ![pending](https://img.shields.io/badge/status-pending-6b7280) |
| Dashboard Experience | Consistent NDVI/NDWI/LST rendering and UX polish | ![in-progress](https://img.shields.io/badge/status-in--progress-f59e0b) |
| Validation & Reliability | Field validation narrative, tests, CI/deployment hardening | ![pending](https://img.shields.io/badge/status-pending-6b7280) |

## Setup & Run

### Prerequisites
- Docker Desktop
- Node.js + npm
- Python 3.11+
- Git

### 1) Clone
```bash
git clone https://github.com/git4alauddin/satellite-crop-advisory
cd satellite-crop-advisory
```

### 2) Start Infrastructure
```bash
docker compose up -d
```

### 3) Initialize Database Schema

PowerShell (Windows):
```powershell
Get-ChildItem db/init/*.sql | Sort-Object Name | ForEach-Object {
  Get-Content $_.FullName -Raw | docker exec -i sca_postgis psql -U sca_user -d sca_geo
}
```

Bash (Linux/macOS):
```bash
for f in $(ls db/init/*.sql | sort); do
  cat "$f" | docker exec -i sca_postgis psql -U sca_user -d sca_geo
done
```

### 4) Start Processor
```bash
cd processor
python -m venv .venv
# Windows
.\.venv\Scripts\Activate.ps1
# Linux/macOS
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

### 5) Start API
```bash
cd api
npm install
npm run dev
```

### 6) Start Frontend
```bash
cd frontend
npm install
npm run dev
```

### 7) Access
- Frontend: `http://localhost:5173`
- API health: `http://localhost:4000/health`
- Processor health: `http://localhost:8000/health`

## Milestones Ahead
- Implement alert generation rules (NDVI drop threshold)
- Add alert retrieval API and dashboard alert panel
- Add stronger weekly/monthly trend aggregations
- Add validation story for early stress detection vs field reports
- Improve reliability with tests, CI, and deployment pipeline
