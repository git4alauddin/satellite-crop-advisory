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

## Verify (Phase 1)
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
- NDWI and LST job execution added (`POST /jobs/ndwi`, `POST /jobs/lst`) with polling endpoints
- NDVI/NDWI/LST outputs persisted in `index_stats` table
- Metric-specific image count support added (`ndvi_image_count`, `ndwi_image_count`, `lst_image_count`)
- Processor stats endpoint added (`GET /stats/ndvi?region_id=...`)
- Additional processor stats endpoints added (`GET /stats/ndwi?region_id=...`, `GET /stats/lst?region_id=...`)
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
4. Submit NDWI/LST jobs:
   - `POST http://localhost:8000/jobs/ndwi`
   - `POST http://localhost:8000/jobs/lst`
5. Poll status:
   - `GET http://localhost:8000/jobs/ndvi/{job_id}`
   - `GET http://localhost:8000/jobs/ndwi/{job_id}`
   - `GET http://localhost:8000/jobs/lst/{job_id}`
6. Check persisted stats:
   - `GET http://localhost:8000/stats/ndvi?region_id=1`
   - `GET http://localhost:8000/stats/ndwi?region_id=1`
   - `GET http://localhost:8000/stats/lst?region_id=1`
7. Start API:
   - `cd api`
   - `npm install`
   - `npm run dev`
8. Check trends API:
   - `GET http://localhost:4000/trends/ndvi?regionId=1&from=2025-01-01&to=2025-12-31`
9. Start frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## Verify (Phase 2)
- NDVI job returns `job_id` and reaches `completed`
- NDWI/LST jobs return `job_id` and reach `completed`
- `index_stats` table contains NDVI/NDWI/LST row values for selected region/date window
- `/trends/ndvi` returns ordered NDVI time-series
- Frontend dashboard shows NDVI summary + trend table

## Index Ranges (Quick Reference)
- `NDVI` theoretical range: `-1` to `+1`
- `NDWI` theoretical range: `-1` to `+1`
- Negative NDVI/NDWI values are possible (for built-up/bare soil/water-like responses depending on index and surface).
- `LST` here is in `degree C` (`mean_lst_c`), not a normalized index.
- `LST` can be greater than `10` very normally (for example `18 C`, `30 C`, etc.).

## Phase 3 Progress
- [x] Task 1: NDWI computation pipeline (`processor/src/ndwi_service.py`)
- [x] Task 2: LST computation pipeline using MODIS (`processor/src/lst_service.py`)
- [x] Task 3: persist NDWI/LST in DB (`index_stats` updates + migrations)
- [x] Task 4: NDWI/LST job + stats endpoints in processor
- [x] Task 5: metric-specific image counts (`ndvi_image_count`, `ndwi_image_count`, `lst_image_count`)
- [ ] Task 6: anomaly computation (current vs baseline)
- [ ] Task 7: severity buckets (`healthy` / `stressed` / `critical`)
- [ ] Task 8: alert rules (NDVI drop threshold)
- [ ] Task 9: alerts persistence (`alerts` table)

## Phase 3 Outcome (Current)
- NDWI and LST are computed from Earth Engine datasets and returned via async jobs.
- NDWI and LST values are stored in PostGIS-backed `index_stats`.
- Processor endpoints now expose NDWI/LST stats for dashboard/API usage.
- Image counts are tracked per metric to avoid mixed-count confusion.

## Run (Phase 3)
1. Start infra:
   - `docker compose up -d`
2. Ensure schema is updated (existing DB volumes):
   - `Get-Content db/init/003_index_stats_schema.sql -Raw | docker exec -i sca_postgis psql -U sca_user -d sca_geo`
   - `Get-Content db/init/004_index_stats_lst.sql -Raw | docker exec -i sca_postgis psql -U sca_user -d sca_geo`
   - `Get-Content db/init/005_index_stats_metric_counts.sql -Raw | docker exec -i sca_postgis psql -U sca_user -d sca_geo`
3. Start processor:
   - `cd processor`
   - `uvicorn src.main:app --reload --port 8000`
4. Submit jobs:
   - `POST http://localhost:8000/jobs/ndwi`
   - `POST http://localhost:8000/jobs/lst`
5. Poll status:
   - `GET http://localhost:8000/jobs/ndwi/{job_id}`
   - `GET http://localhost:8000/jobs/lst/{job_id}`
6. Verify stats:
   - `GET http://localhost:8000/stats/ndwi?region_id=1`
   - `GET http://localhost:8000/stats/lst?region_id=1`

## Verify (Phase 3)
- NDWI and LST job endpoints return `completed` with valid mean values.
- `index_stats` contains `mean_ndwi` and `mean_lst_c` for selected region/date range.
- Stats endpoints return values and metric-specific image counts.
