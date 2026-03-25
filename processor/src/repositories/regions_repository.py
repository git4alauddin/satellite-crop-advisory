import json

from fastapi import HTTPException

from src.core.db import get_db_connection


def get_region_geojson(region_id: int) -> dict:
    query = """
        SELECT ST_AsGeoJSON(geom)::json AS geom
        FROM regions
        WHERE id = %s
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (region_id,))
            row = cur.fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail=f"Region {region_id} not found")
            return row[0] if isinstance(row[0], dict) else json.loads(row[0])
