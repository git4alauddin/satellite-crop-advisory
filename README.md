# Group Name : MASY Crops 🌾
Team Members :
 - Yazdan Irfan
 - Syeda Saniya Sadaf Syed Ishaque
 - Md Alauddin Ansari
 - Mainak Mondal

## Problem Statement : 
Satellite-Based Crop Health & Resource Advisory System

## Overview : 
This project focuses on designing and enhancing an intelligent pipeline that transforms raw satellite imagery into actionable crop health insights. By leveraging advanced image processing and data analysis techniques, the system aims to provide farmers with precise, timely, and field-specific recommendations on crop conditions, resource utilization, and potential risks. The ultimate goal is to enable data-driven decision-making in agriculture, improving productivity, optimizing resource usage, and promoting sustainable farming practices.

## Approach (Planned) : 
- Process satellite data (Sentinel, Landsat, MODIS)
- Compute vegetation indices (NDVI, NDWI, LST)
- Analyze temporal trends
- Provide simple, interpretable advisories

## Progress

## Services (Planned Architecture)
- `frontend`: dashboard UI (map, trends, alerts)
- `api`: backend endpoints for data access
- `processor`: satellite processing and index computation jobs
- `data`: PostGIS (spatial analytics) + MongoDB (job/metadata logs)

## Day 1 Progress
- [x] Task 1: repo skeleton + base docs
- [x] Task 2: local infra (PostGIS + Mongo)
- [x] Task 3: spatial schema + region seed
- [x] Task 4: API health endpoint
- [ ] Task 5: regions endpoint
- [ ] Task 6: frontend map integration

## Why PostGIS + Mongo
- `PostGIS`: stores region boundaries and supports geospatial queries.
- `MongoDB`: stores ingestion job logs, pipeline status, and flexible metadata.

## Local Infrastructure
Use Docker Compose to run databases:

```bash
docker compose up -d
docker compose ps
```

Services:
- PostGIS on `localhost:5432`
- MongoDB on `localhost:27017`

## Initialize Spatial DB (Reproducible)
Run schema and seed scripts from repo root:

```bash
Get-Content -Raw .\db\init\001_regions_schema.sql | docker exec -i sca_postgis psql -U sca_user -d sca_geo
Get-Content -Raw .\db\init\002_regions_seed.sql | docker exec -i sca_postgis psql -U sca_user -d sca_geo
```

Optional verification:

```bash
docker exec -it sca_postgis psql -U sca_user -d sca_geo -c "SELECT id, name, ST_AsText(geom) FROM regions;"
```
