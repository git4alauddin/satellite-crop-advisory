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
- [x] Task 3: Sentinel-2 fetch + cloud mask + NDVI compute
- [x] Task 4: store NDVI outputs in DB
- [x] Task 5: NDVI trends API endpoint
- [x] Task 6: frontend NDVI trend visualization

## Phase 2 Outcome
- Earth Engine authentication configured with project context
- Sentinel-2 NDVI pipeline implemented (date + region filters, cloud masking, NDVI compute)
- Async NDVI job execution added (`POST /jobs/ndvi`) with polling (`GET /jobs/ndvi/{job_id}`)
- NDVI outputs persisted in `index_stats` table
- Processor stats endpoint added (`GET /stats/ndvi?region_id=...`)
- API trends endpoint added (`GET /trends/ndvi`)
- Frontend NDVI trend visualization integrated (summary + table)

## Run (Phase 2)
1. Start PostGIS:
   - `docker compose up -d postgis`
2. Start processor:
   - `cd processor`
   - `pip install -r requirements.txt`
   - `uvicorn src.main:app --reload --port 8000`
3. Submit NDVI job:
   - `POST http://localhost:8000/jobs/ndvi`
4. Poll status:
   - `GET http://localhost:8000/jobs/ndvi/{job_id}`
5. Check persisted stats:
   - `GET http://localhost:8000/stats/ndvi?region_id=1`
6. Start API:
   - `cd api`
   - `npm install`
   - `npm run dev`
7. Check trends API:
   - `GET http://localhost:4000/trends/ndvi?regionId=1&from=2025-01-01&to=2025-12-31`
8. Start frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## Verify (Phase 2)
- NDVI job returns `job_id` and reaches `completed`
- `index_stats` table contains NDVI row(s) for selected region/date window
- `/trends/ndvi` returns ordered NDVI time-series
- Frontend dashboard shows NDVI summary + trend table

## Next Step (Phase 3)
Phase 2 complete. Next: extend pipeline for NDWI/LST and anomaly-based alerts.
