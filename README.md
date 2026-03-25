<h1 align="center">
  <span style="color:#14532d; font-size:56px; font-weight:900; letter-spacing:0.4px; font-family:'Georgia', 'Times New Roman', serif;">
    Krishi Drishti
  </span>
</h1>

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
```text
satellite-crop-advisory/
├── api/                                  # Express + TypeScript API (client-facing backend contract)
│   ├── src/
│   │   ├── server.ts                     # API process entrypoint (loads env and starts server)
│   │   ├── app.ts                        # Express app + middleware + route registration
│   │   ├── db.ts                         # PostgreSQL connection pool
│   │   ├── routes/                       # URL route mapping layer
│   │   ├── controllers/                  # Request validation + response shaping
│   │   ├── services/                     # Integration/business helpers (processor proxy, jobs, health, regions)
│   │   └── repositories/                 # SQL access modules (currently regions)
│   └── scripts/
│       └── smoke-test.mjs                # API smoke-check script
├── processor/                            # FastAPI compute service (satellite jobs + rule engine)
│   └── src/
│       ├── main.py                       # Processor app entrypoint + router wiring
│       ├── ndvi_service.py               # Sentinel-2 NDVI compute helpers
│       ├── ndwi_service.py               # Sentinel-2 NDWI compute helpers
│       ├── lst_service.py                # MODIS LST compute helpers
│       ├── core/
│       │   ├── config.py                 # Env/config constants (CORS, GEE project)
│       │   └── db.py                     # Postgres connection helper
│       ├── schemas/
│       │   └── jobs.py                   # Pydantic request schema(s)
│       ├── repositories/                 # DB read/write functions (regions, index_stats, alerts)
│       ├── services/                     # Rules, job workers, job stores, stats payload shaping
│       └── routers/                      # Processor endpoints (/health, /jobs/*, /stats/*, /alerts)
├── frontend/                             # React + Vite playground and dashboard UI
│   └── src/
│       ├── main.tsx                      # Frontend bootstrap
│       ├── App.tsx                       # Route shell and page switching
│       ├── api.ts                        # Typed API client contracts
│       ├── styles.css                    # Shared frontend styles
│       ├── components/
│       │   └── PlaceholderPage.tsx       # Generic placeholder component
│       ├── lib/
│       │   └── navigation.ts             # Route constants + navigation helper
│       └── features/                     # Feature-wise playground pages
│           ├── hub/                      # Component hub landing page
│           ├── map/                      # Health map and boundaries
│           ├── jobs/                     # Run NDVI/NDWI/LST jobs
│           ├── trends/                   # Trends visualization
│           ├── alerts/                   # Alerts table/controls
│           ├── impact/                   # Impact metrics view
│           ├── advisory/                 # Advisory messages view
│           └── dashboard/                # Combined dashboard draft
├── db/
│   ├── init/                             # Ordered schema/migration SQL files (001..010)
│   └── tools/                            # GeoJSON import and official boundary helper scripts
├── docker-compose.yml                    # Local PostGIS + MongoDB services
└── README.md                             # Project overview, progress, and runbook
```

## Milestone Breakdown
| Milestone Area | Scope | Status |
|---|---|---|
| Data Ingestion & Preprocessing | Sentinel-2 + MODIS fetch, cloud filtering, region clipping | ![done](https://img.shields.io/badge/done-22c55e) |
| Core Index Engine | NDVI, NDWI, LST computation and persistence | ![done](https://img.shields.io/badge/done-22c55e) |
| Context Layer | Baseline lookup, anomaly calculation, severity classification | ![done](https://img.shields.io/badge/done-22c55e) |
| Temporal Intelligence | Multi-window comparison and seasonal trend enhancement | ![done](https://img.shields.io/badge/done-22c55e) |
| Advisory & Alerts | Alert rules, alert storage, alert API, alert UI panel | ![done](https://img.shields.io/badge/done-22c55e) |
| Dashboard Experience | Consistent NDVI/NDWI/LST rendering and UX polish | ![in-progress](https://img.shields.io/badge/in--progress-f59e0b) |
| Validation & Reliability | Field validation narrative, tests, CI/deployment hardening | ![in-progress](https://img.shields.io/badge/in--progress-f59e0b) |

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

### 4) Start Processor (Google Earth Engine Prerequisite)
Before starting the processor, make sure Earth Engine is configured:

1. Create/select a GCP project.
2. Enable required APIs in that project:
   - `Earth Engine API`
   - `IAM Service Account Credentials API` (if using service account auth)
3. Ensure your Earth Engine account/project access is approved.
4. Set project ID in `processor/.env`:
   ```env
   GEE_PROJECT_ID=your-gcp-project-id
   ```
5. Authenticate Earth Engine on your machine:
   ```bash
   earthengine authenticate
   ```

Then start processor:
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

Quick verify:
- `http://localhost:8000/health` should return `status: ok`
- If GEE is not configured, job endpoints fail with:
  - `GEE_PROJECT_ID is not configured`

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
- Final UI polish and presentation-quality dashboard refinement
- Integrate realistic region boundaries (official shapefiles/GeoJSON)
- Add deeper automated tests (integration + negative-path + performance)
- Add CI pipeline for automated build/test checks on PRs
- Add deployment hardening and production runbook
