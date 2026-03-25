import json

from src.core.db import get_db_connection


def upsert_alert(
    region_id: int,
    metric: str,
    severity: str,
    message: str,
    date_start: str,
    date_end: str,
    meta: dict | None = None,
) -> None:
    query = """
        INSERT INTO alerts (region_id, metric, severity, message, date_start, date_end, meta)
        VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
        ON CONFLICT (region_id, metric, date_start, date_end)
        DO UPDATE SET
            severity = EXCLUDED.severity,
            message = EXCLUDED.message,
            meta = EXCLUDED.meta,
            created_at = NOW()
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                query,
                (
                    region_id,
                    metric,
                    severity,
                    message,
                    date_start,
                    date_end,
                    json.dumps(meta or {}),
                ),
            )
        conn.commit()


def fetch_alerts(region_id: int, from_date: str | None = None, to_date: str | None = None):
    query = """
        SELECT id, region_id, metric, severity, message, date_start, date_end, meta, created_at
        FROM alerts
        WHERE region_id = %s
          AND (%s::date IS NULL OR date_start >= %s::date)
          AND (%s::date IS NULL OR date_end <= %s::date)
        ORDER BY created_at DESC
        LIMIT 100
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (region_id, from_date, from_date, to_date, to_date))
            return cur.fetchall()
