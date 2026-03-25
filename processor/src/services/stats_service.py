from src.repositories.alerts_repository import fetch_alerts
from src.repositories.index_stats_repository import fetch_metric_stats


def get_metric_stats_payload(metric: str, region_id: int, from_date: str | None = None, to_date: str | None = None) -> dict:
    rows = fetch_metric_stats(metric, region_id, from_date, to_date)
    records: list[dict] = []

    for row in rows:
        records.append(
            {
                "region_id": row[0],
                "date_start": row[1].isoformat(),
                "date_end": row[2].isoformat(),
                "source_image_count": row[3],
                f"{metric}_image_count": row[3],
                f"mean_{'lst_c' if metric == 'lst' else metric}": row[4],
                f"{'lst_anomaly_c' if metric == 'lst' else metric + '_anomaly'}": row[5],
                f"{metric}_severity": row[6],
                "created_at": row[7].isoformat(),
            }
        )

    return {"count": len(records), "items": records}


def get_alerts_payload(region_id: int, from_date: str | None = None, to_date: str | None = None) -> dict:
    rows = fetch_alerts(region_id, from_date, to_date)
    items: list[dict] = []

    for row in rows:
        items.append(
            {
                "id": row[0],
                "region_id": row[1],
                "metric": row[2],
                "severity": row[3],
                "message": row[4],
                "date_start": row[5].isoformat(),
                "date_end": row[6].isoformat(),
                "meta": row[7],
                "created_at": row[8].isoformat(),
            }
        )

    return {"count": len(items), "items": items}
