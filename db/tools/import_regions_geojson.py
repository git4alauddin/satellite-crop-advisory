import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

import psycopg


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import region boundaries from a GeoJSON FeatureCollection into PostGIS regions table."
    )
    parser.add_argument("--file", required=True, help="Path to GeoJSON file.")
    parser.add_argument(
        "--db-url",
        default=os.getenv("DATABASE_URL", "postgresql://sca_user:sca_pass@localhost:5432/sca_geo"),
        help="PostgreSQL connection URL. Defaults to DATABASE_URL env var.",
    )
    parser.add_argument(
        "--source",
        default="geojson_import",
        help="Source label stored in regions.source (default: geojson_import).",
    )
    parser.add_argument(
        "--name-prop",
        default="name",
        help="Feature property key to use as region name (default: name).",
    )
    parser.add_argument(
        "--code-prop",
        default="code",
        help="Feature property key to use as region_code (default: code).",
    )
    parser.add_argument(
        "--replace-source",
        action="store_true",
        help="Delete existing rows for --source before import.",
    )
    return parser.parse_args()


def load_geojson(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as f:
        payload = json.load(f)

    if payload.get("type") != "FeatureCollection":
        raise ValueError("GeoJSON must be a FeatureCollection.")

    features = payload.get("features", [])
    if not isinstance(features, list) or not features:
        raise ValueError("GeoJSON FeatureCollection has no features.")

    return features


def feature_geometry_json(feature: dict[str, Any]) -> str:
    geometry = feature.get("geometry")
    if not geometry:
        raise ValueError("Feature missing geometry.")
    geom_type = geometry.get("type")
    if geom_type not in {"Polygon", "MultiPolygon"}:
        raise ValueError(f"Unsupported geometry type: {geom_type}")
    return json.dumps(geometry)


def upsert_region(
    cur: psycopg.Cursor[Any],
    *,
    name: str,
    code: str | None,
    source: str,
    geom_json: str,
) -> None:
    if code:
        cur.execute(
            """
            INSERT INTO regions (name, region_code, source, geom)
            VALUES (
              %s,
              %s,
              %s,
              ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)))
            )
            ON CONFLICT (region_code) WHERE region_code IS NOT NULL
            DO UPDATE SET
              name = EXCLUDED.name,
              source = EXCLUDED.source,
              geom = EXCLUDED.geom
            """,
            (name, code, source, geom_json),
        )
        return

    cur.execute(
        """
        UPDATE regions
        SET geom = ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)))
        WHERE name = %s AND source = %s
        """,
        (geom_json, name, source),
    )
    if cur.rowcount == 0:
        cur.execute(
            """
            INSERT INTO regions (name, source, geom)
            VALUES (
              %s,
              %s,
              ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)))
            )
            """,
            (name, source, geom_json),
        )


def main() -> int:
    args = parse_args()
    geojson_path = Path(args.file)
    if not geojson_path.exists():
        print(f"GeoJSON file not found: {geojson_path}", file=sys.stderr)
        return 1

    try:
        features = load_geojson(geojson_path)
    except Exception as exc:
        print(f"Invalid GeoJSON: {exc}", file=sys.stderr)
        return 1

    inserted_or_updated = 0
    skipped = 0

    try:
        with psycopg.connect(args.db_url) as conn:
            with conn.cursor() as cur:
                if args.replace_source:
                    cur.execute("DELETE FROM regions WHERE source = %s", (args.source,))

                for idx, feature in enumerate(features, start=1):
                    props = feature.get("properties") or {}
                    raw_name = props.get(args.name_prop)
                    if raw_name is None:
                        raw_name = f"Region {idx}"
                    name = str(raw_name).strip()
                    if not name:
                        name = f"Region {idx}"

                    raw_code = props.get(args.code_prop)
                    code = str(raw_code).strip() if raw_code is not None and str(raw_code).strip() else None

                    try:
                        geom_json = feature_geometry_json(feature)
                        upsert_region(
                            cur,
                            name=name,
                            code=code,
                            source=args.source,
                            geom_json=geom_json,
                        )
                        inserted_or_updated += 1
                    except Exception as exc:
                        skipped += 1
                        print(f"Skipping feature #{idx}: {exc}", file=sys.stderr)

            conn.commit()
    except Exception as exc:
        print(f"Import failed: {exc}", file=sys.stderr)
        return 1

    print(
        f"Import complete. Upserted: {inserted_or_updated}, Skipped: {skipped}, Source: {args.source}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
