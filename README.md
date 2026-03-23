# Group Name: MASY Crops 
Team Members:
- Yazdan Irfan
- Syeda Saniya Sadaf Syed Ishaque
- Md Alauddin Ansari
- Mainak Mondal

## Problem Statement
Satellite-Based Crop Health and Resource Advisory System

## Overview
The project develops a Satellite-Based Crop Health and Resource Advisory System that converts raw earth observation imagery into farmer-friendly insights. It integrates satellite preprocessing, vegetation and water/heat stress indices (NDVI, NDWI, LST), and temporal trend analysis to detect emerging crop stress early. The platform then presents region-level health status, alerts, and recommendations through an interpretable dashboard, enabling faster and more informed agricultural decisions.

## Planned Approach
- Process satellite data (Sentinel, Landsat, MODIS)
- Compute vegetation indices (NDVI, NDWI, LST)
- Analyze weekly/monthly temporal trends
- Provide interpretable advisories and alerts

## Services (Architecture)
- `frontend`: dashboard UI (map, trends, alerts)
- `api`: backend endpoints for data access
- `processor`: satellite processing and index computation jobs
- `data`: PostGIS (spatial analytics) + MongoDB (job/metadata logs)

## Phase 1 Progress
- [x] Task 1: repo skeleton + base docs
- [x] Task 2: local infra (PostGIS + Mongo)
- [x] Task 3: spatial schema + region seed
- [x] Task 4: API health endpoint
- [x] Task 5: regions endpoint
- [x] Task 6: frontend map integration

## Phase 1 Outcome
- Local infrastructure is running with Docker (`PostGIS`, `MongoDB`)
- Reproducible spatial DB schema and seed scripts are added
- API endpoints are working: `/health` and `/regions`
- Frontend map renders region geometry from backend GeoJSON

## Why PostGIS + Mongo
- `PostGIS`: stores region geometries and supports spatial queries
- `MongoDB`: stores flexible job metadata and pipeline logs

## Run (Phase 1)
1. Start local infrastructure:
   - `docker compose up -d`
   - `docker compose ps`
2. Initialize spatial database:
   - `Get-Content -Raw .\db\init\001_regions_schema.sql | docker exec -i sca_postgis psql -U sca_user -d sca_geo`
   - `Get-Content -Raw .\db\init\002_regions_seed.sql | docker exec -i sca_postgis psql -U sca_user -d sca_geo`
3. Start API:
   - `cd api`
   - `npm install`
   - `npm run dev`
4. Start frontend (new terminal):
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## Verify
- API health: `http://localhost:4000/health`
- Regions GeoJSON: `http://localhost:4000/regions`
- Frontend UI: `http://localhost:5173`


## Phase 2 Progress
- [x] Task 1: processor bootstrap (`/health`, `/jobs/ndvi` stub)
- [x] Task 2: GEE authentication setup
- [ ] Task 3: Sentinel-2 fetch + cloud mask + NDVI compute
- [ ] Task 4: store NDVI outputs in DB
- [ ] Task 5: NDVI trends API endpoint
- [ ] Task 6: frontend NDVI trend visualization

## Processor Service (Bootstrap)
Run processor locally:

```bash
cd processor
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

Quick checks:
- `GET http://localhost:8000/health`
- `POST http://localhost:8000/jobs/ndvi` (stub)

## Next Step (Phase 2)
Implement GEE-based ingestion and NDVI weekly processing pipeline into the existing data model.
