from src.core.db import get_db_connection


def get_historical_baseline(region_id: int, metric_column: str, start_date: str) -> float | None:
    allowed_columns = {"mean_ndvi", "mean_ndwi", "mean_lst_c"}
    if metric_column not in allowed_columns:
        raise ValueError(f"Unsupported metric column: {metric_column}")

    query = f"""
        SELECT AVG({metric_column})::double precision AS baseline
        FROM index_stats
        WHERE region_id = %s
          AND {metric_column} IS NOT NULL
          AND date_start < %s::date
          AND EXTRACT(MONTH FROM date_start) = EXTRACT(MONTH FROM %s::date)
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (region_id, start_date, start_date))
            row = cur.fetchone()

    if not row or row[0] is None:
        return None
    return float(row[0])


def upsert_index_stats(
    region_id: int,
    date_start: str,
    date_end: str,
    source_image_count: int,
    mean_ndvi: float | None,
    mean_ndwi: float | None,
    mean_lst_c: float | None,
    ndvi_image_count: int | None,
    ndwi_image_count: int | None,
    lst_image_count: int | None,
    ndvi_anomaly: float | None,
    ndwi_anomaly: float | None,
    lst_anomaly_c: float | None,
    ndvi_severity: str | None,
    ndwi_severity: str | None,
    lst_severity: str | None,
) -> None:
    query = """
        INSERT INTO index_stats (
            region_id, date_start, date_end, source_image_count, mean_ndvi, mean_ndwi, mean_lst_c,
            ndvi_image_count, ndwi_image_count, lst_image_count,
            ndvi_anomaly, ndwi_anomaly, lst_anomaly_c,
            ndvi_severity, ndwi_severity, lst_severity
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (region_id, date_start, date_end)
        DO UPDATE SET
            source_image_count = EXCLUDED.source_image_count,
            mean_ndvi = COALESCE(EXCLUDED.mean_ndvi, index_stats.mean_ndvi),
            mean_ndwi = COALESCE(EXCLUDED.mean_ndwi, index_stats.mean_ndwi),
            mean_lst_c = COALESCE(EXCLUDED.mean_lst_c, index_stats.mean_lst_c),
            ndvi_image_count = COALESCE(EXCLUDED.ndvi_image_count, index_stats.ndvi_image_count),
            ndwi_image_count = COALESCE(EXCLUDED.ndwi_image_count, index_stats.ndwi_image_count),
            lst_image_count = COALESCE(EXCLUDED.lst_image_count, index_stats.lst_image_count),
            ndvi_anomaly = COALESCE(EXCLUDED.ndvi_anomaly, index_stats.ndvi_anomaly),
            ndwi_anomaly = COALESCE(EXCLUDED.ndwi_anomaly, index_stats.ndwi_anomaly),
            lst_anomaly_c = COALESCE(EXCLUDED.lst_anomaly_c, index_stats.lst_anomaly_c),
            ndvi_severity = COALESCE(EXCLUDED.ndvi_severity, index_stats.ndvi_severity),
            ndwi_severity = COALESCE(EXCLUDED.ndwi_severity, index_stats.ndwi_severity),
            lst_severity = COALESCE(EXCLUDED.lst_severity, index_stats.lst_severity)
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                query,
                (
                    region_id,
                    date_start,
                    date_end,
                    source_image_count,
                    mean_ndvi,
                    mean_ndwi,
                    mean_lst_c,
                    ndvi_image_count,
                    ndwi_image_count,
                    lst_image_count,
                    ndvi_anomaly,
                    ndwi_anomaly,
                    lst_anomaly_c,
                    ndvi_severity,
                    ndwi_severity,
                    lst_severity,
                ),
            )
        conn.commit()


def fetch_metric_stats(metric: str, region_id: int, from_date: str | None = None, to_date: str | None = None):
    metric_config = {
        "ndvi": {
            "count": "ndvi_image_count",
            "value": "mean_ndvi",
            "anomaly": "ndvi_anomaly",
            "severity": "ndvi_severity",
        },
        "ndwi": {
            "count": "ndwi_image_count",
            "value": "mean_ndwi",
            "anomaly": "ndwi_anomaly",
            "severity": "ndwi_severity",
        },
        "lst": {
            "count": "lst_image_count",
            "value": "mean_lst_c",
            "anomaly": "lst_anomaly_c",
            "severity": "lst_severity",
        },
    }

    if metric not in metric_config:
        raise ValueError(f"Unsupported metric: {metric}")

    config = metric_config[metric]
    query = f"""
        SELECT
            region_id,
            date_start,
            date_end,
            COALESCE({config['count']}, source_image_count) AS image_count,
            {config['value']} AS metric_value,
            {config['anomaly']} AS anomaly_value,
            {config['severity']} AS severity_value,
            created_at
        FROM index_stats
        WHERE region_id = %s
          AND (%s::date IS NULL OR date_start >= %s::date)
          AND (%s::date IS NULL OR date_end <= %s::date)
        ORDER BY date_start DESC
        LIMIT 50
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (region_id, from_date, from_date, to_date, to_date))
            return cur.fetchall()
