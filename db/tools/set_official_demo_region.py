import argparse
import json
import os
import sys
import urllib.request
from typing import Any

import psycopg


def fetch_json(url: str) -> Any:
    with urllib.request.urlopen(url, timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Set region_id=1 to an official boundary from geoBoundaries."
    )
    parser.add_argument("--country", default="IND", help="ISO3 country code. Default: IND")
    parser.add_argument("--adm", default="ADM2", help="Admin level. Default: ADM2")
    parser.add_argument("--district", default="Ludhiana", help="District/region name to select.")
    parser.add_argument(
        "--db-url",
        default=os.getenv("DATABASE_URL", "postgresql://sca_user:sca_pass@localhost:5432/sca_geo"),
        help="PostgreSQL connection URL. Defaults to DATABASE_URL env var.",
    )
    return parser.parse_args()


def find_feature(features: list[dict[str, Any]], district: str) -> dict[str, Any] | None:
    target = district.strip().lower()
    for feature in features:
        props = feature.get("properties") or {}
        if str(props.get("shapeName", "")).strip().lower() == target:
            return feature
    return None


def ensure_region_columns(cur: psycopg.Cursor[Any]) -> None:
    cur.execute("ALTER TABLE regions ADD COLUMN IF NOT EXISTS region_code TEXT")
    cur.execute("ALTER TABLE regions ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'")


def upsert_region_one(
    cur: psycopg.Cursor[Any],
    *,
    name: str,
    region_code: str,
    source: str,
    geom_json: str,
) -> None:
    cur.execute(
        """
        INSERT INTO regions (id, name, region_code, source, geom)
        VALUES (
          1,
          %s,
          %s,
          %s,
          ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)))
        )
        ON CONFLICT (id) DO UPDATE
        SET
          name = EXCLUDED.name,
          region_code = EXCLUDED.region_code,
          source = EXCLUDED.source,
          geom = EXCLUDED.geom
        """,
        (name, region_code, source, geom_json),
    )


def main() -> int:
    args = parse_args()
    country = args.country.upper().strip()
    adm = args.adm.upper().strip()
    district = args.district.strip()

    metadata_url = f"https://www.geoboundaries.org/api/current/gbOpen/{country}/{adm}/"
    try:
        metadata = fetch_json(metadata_url)
    except Exception as exc:
        print(f"Failed to fetch metadata from {metadata_url}: {exc}", file=sys.stderr)
        return 1

    gj_url = metadata.get("gjDownloadURL")
    if not gj_url:
        print("Metadata did not contain gjDownloadURL.", file=sys.stderr)
        return 1

    try:
        collection = fetch_json(gj_url)
    except Exception as exc:
        print(f"Failed to download GeoJSON from {gj_url}: {exc}", file=sys.stderr)
        return 1

    features = collection.get("features") or []
    if not isinstance(features, list) or not features:
        print("Downloaded GeoJSON has no features.", file=sys.stderr)
        return 1

    feature = find_feature(features, district)
    if not feature:
        print(f"District '{district}' not found in {country}-{adm} dataset.", file=sys.stderr)
        return 1

    props = feature.get("properties") or {}
    geom = feature.get("geometry")
    if not geom:
        print("Selected feature has no geometry.", file=sys.stderr)
        return 1

    name = str(props.get("shapeName") or district)
    region_code = str(props.get("shapeID") or f"{country}-{adm}-{district}")
    source = f"geoBoundaries_gbOpen_{country}_{adm}"
    geom_json = json.dumps(geom)

    try:
        with psycopg.connect(args.db_url) as conn:
            with conn.cursor() as cur:
                ensure_region_columns(cur)
                upsert_region_one(
                    cur,
                    name=name,
                    region_code=region_code,
                    source=source,
                    geom_json=geom_json,
                )
            conn.commit()
    except Exception as exc:
        print(f"DB update failed: {exc}", file=sys.stderr)
        return 1

    print(
        f"Updated region_id=1 with official boundary: {name} ({region_code}) from {source}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
