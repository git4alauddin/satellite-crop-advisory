import type { Request, Response } from "express";
import pool from "../db.js";

export async function getAdvisory(req: Request, res: Response) {
  try {
    const regionId = Number(req.query.regionId);
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");

    if (!regionId || !from || !to) {
      return res.status(400).json({
        error: "regionId, from, and to are required"
      });
    }

    const regionQuery = `
      SELECT id, name
      FROM regions
      WHERE id = $1;
    `;

    const latestStatsQuery = `
      SELECT
        date_start,
        date_end,
        mean_ndvi,
        ndvi_anomaly,
        ndvi_severity,
        mean_ndwi,
        ndwi_anomaly,
        ndwi_severity,
        mean_lst_c,
        lst_anomaly_c,
        lst_severity,
        created_at
      FROM index_stats
      WHERE region_id = $1
        AND date_start >= $2::date
        AND date_end <= $3::date
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    const alertsSummaryQuery = `
      SELECT
        COUNT(*)::int AS total_alerts,
        COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical_alerts,
        COUNT(*) FILTER (WHERE severity = 'stressed')::int AS stressed_alerts,
        MAX(created_at) AS latest_alert_at
      FROM alerts
      WHERE region_id = $1
        AND date_start >= $2::date
        AND date_end <= $3::date;
    `;

    const [regionResult, statsResult, alertsResult] = await Promise.all([
      pool.query(regionQuery, [regionId]),
      pool.query(latestStatsQuery, [regionId, from, to]),
      pool.query(alertsSummaryQuery, [regionId, from, to])
    ]);

    if (regionResult.rows.length === 0) {
      return res.status(404).json({
        error: `Region ${regionId} not found`
      });
    }

    const region = regionResult.rows[0];
    const latest = statsResult.rows[0] || null;
    const alerts = alertsResult.rows[0];

    const messages: string[] = [];

    if (!latest) {
      messages.push("No computed index data is available in the selected window.");
      messages.push("Run NDVI, NDWI, and LST jobs for this window to generate advisory output.");
    } else {
      const ndviSeverity = latest.ndvi_severity as string | null;
      const ndwiSeverity = latest.ndwi_severity as string | null;
      const lstSeverity = latest.lst_severity as string | null;

      if (ndviSeverity === "critical") {
        messages.push("Vegetation stress is critical. Prioritize immediate field inspection and irrigation planning.");
      } else if (ndviSeverity === "stressed") {
        messages.push("Vegetation appears stressed. Monitor crop vigor and review irrigation frequency.");
      } else if (ndviSeverity === "healthy") {
        messages.push("Vegetation condition is healthy in the latest observation window.");
      }

      if (ndwiSeverity === "critical") {
        messages.push("Water stress is critical. Check soil moisture urgently and plan supplemental watering.");
      } else if (ndwiSeverity === "stressed") {
        messages.push("Water availability looks stressed. Consider short-interval moisture checks.");
      }

      if (lstSeverity === "critical") {
        messages.push("Surface temperature stress is critical. Heat mitigation actions should be prioritized.");
      } else if (lstSeverity === "stressed") {
        messages.push("Temperature stress is elevated. Track short-term heat changes closely.");
      }

      if (latest.ndvi_anomaly !== null && Number(latest.ndvi_anomaly) <= -0.2) {
        messages.push("NDVI anomaly indicates a notable drop from baseline (>20%).");
      }

      if (messages.length === 0) {
        messages.push("No critical stress signal detected. Continue regular monitoring for this window.");
      }
    }

    if (alerts.total_alerts > 0) {
      messages.push(
        `Alert summary: ${alerts.total_alerts} total (${alerts.critical_alerts} critical, ${alerts.stressed_alerts} stressed).`
      );
    } else {
      messages.push("No alerts were generated in the selected window.");
    }

    return res.json({
      regionId,
      from,
      to,
      region: {
        id: region.id,
        name: region.name
      },
      latest_observation: latest
        ? {
            date_start: latest.date_start,
            date_end: latest.date_end,
            created_at: latest.created_at,
            mean_ndvi: latest.mean_ndvi,
            ndvi_anomaly: latest.ndvi_anomaly,
            ndvi_severity: latest.ndvi_severity,
            mean_ndwi: latest.mean_ndwi,
            ndwi_anomaly: latest.ndwi_anomaly,
            ndwi_severity: latest.ndwi_severity,
            mean_lst_c: latest.mean_lst_c,
            lst_anomaly_c: latest.lst_anomaly_c,
            lst_severity: latest.lst_severity
          }
        : null,
      alerts: {
        total: alerts.total_alerts,
        critical: alerts.critical_alerts,
        stressed: alerts.stressed_alerts,
        latest_alert_at: alerts.latest_alert_at
      },
      advisory_messages: messages
    });
  } catch (error) {
    console.error("Failed to generate advisory:", error);
    return res.status(500).json({
      error: "Failed to generate advisory"
    });
  }
}
