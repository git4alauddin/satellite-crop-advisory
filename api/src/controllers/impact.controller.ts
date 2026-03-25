import type { Request, Response } from "express";
import pool from "../db.js";

export async function getImpactMetrics(req: Request, res: Response) {
  try {
    const regionId = Number(req.query.regionId);
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");

    if (!regionId || !from || !to) {
      return res.status(400).json({
        error: "regionId, from, and to are required"
      });
    }

    const areaQuery = `
      SELECT
        id AS region_id,
        name AS region_name,
        ST_Area(geom::geography) / 1000000.0 AS area_km2
      FROM regions
      WHERE id = $1;
    `;

    const statsQuery = `
      SELECT
        COUNT(*)::int AS total_windows,
        COUNT(*) FILTER (WHERE mean_ndvi IS NOT NULL)::int AS ndvi_windows,
        COUNT(*) FILTER (WHERE mean_ndwi IS NOT NULL)::int AS ndwi_windows,
        COUNT(*) FILTER (WHERE mean_lst_c IS NOT NULL)::int AS lst_windows,
        COUNT(*) FILTER (WHERE ndvi_severity = 'stressed')::int AS ndvi_stressed_windows,
        COUNT(*) FILTER (WHERE ndvi_severity = 'critical')::int AS ndvi_critical_windows,
        COUNT(*) FILTER (WHERE ndwi_severity = 'stressed')::int AS ndwi_stressed_windows,
        COUNT(*) FILTER (WHERE ndwi_severity = 'critical')::int AS ndwi_critical_windows,
        COUNT(*) FILTER (WHERE lst_severity = 'stressed')::int AS lst_stressed_windows,
        COUNT(*) FILTER (WHERE lst_severity = 'critical')::int AS lst_critical_windows,
        MIN(date_start) AS first_observation_date,
        MAX(date_end) AS last_observation_date
      FROM index_stats
      WHERE region_id = $1
        AND date_start >= $2::date
        AND date_end <= $3::date;
    `;

    const alertsQuery = `
      SELECT
        COUNT(*)::int AS alert_count,
        COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical_alert_count,
        COUNT(*) FILTER (WHERE severity = 'stressed')::int AS stressed_alert_count,
        MAX(created_at) AS latest_alert_at
      FROM alerts
      WHERE region_id = $1
        AND date_start >= $2::date
        AND date_end <= $3::date;
    `;

    const [areaResult, statsResult, alertsResult] = await Promise.all([
      pool.query(areaQuery, [regionId]),
      pool.query(statsQuery, [regionId, from, to]),
      pool.query(alertsQuery, [regionId, from, to])
    ]);

    if (areaResult.rows.length === 0) {
      return res.status(404).json({
        error: `Region ${regionId} not found`
      });
    }

    const area = areaResult.rows[0];
    const stats = statsResult.rows[0];
    const alerts = alertsResult.rows[0];

    return res.json({
      regionId,
      from,
      to,
      region: {
        id: area.region_id,
        name: area.region_name,
        area_km2: Number(area.area_km2)
      },
      temporal_coverage: {
        requested_from: from,
        requested_to: to,
        first_observation_date: stats.first_observation_date,
        last_observation_date: stats.last_observation_date
      },
      windows: {
        total: stats.total_windows,
        ndvi: stats.ndvi_windows,
        ndwi: stats.ndwi_windows,
        lst: stats.lst_windows
      },
      stress_summary: {
        ndvi: {
          stressed: stats.ndvi_stressed_windows,
          critical: stats.ndvi_critical_windows
        },
        ndwi: {
          stressed: stats.ndwi_stressed_windows,
          critical: stats.ndwi_critical_windows
        },
        lst: {
          stressed: stats.lst_stressed_windows,
          critical: stats.lst_critical_windows
        }
      },
      alerts: {
        total: alerts.alert_count,
        critical: alerts.critical_alert_count,
        stressed: alerts.stressed_alert_count,
        latest_alert_at: alerts.latest_alert_at
      }
    });
  } catch (error) {
    console.error("Failed to fetch impact metrics:", error);
    return res.status(500).json({
      error: "Failed to fetch impact metrics"
    });
  }
}
