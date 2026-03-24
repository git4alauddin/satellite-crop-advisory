import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js";

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;
const processorBaseUrl = process.env.PROCESSOR_BASE_URL || "http://localhost:8000";

app.use(cors());
app.use(express.json());

type ProcessorProxyOptions = {
  method?: "GET" | "POST";
  body?: unknown;
};

async function callProcessor(path: string, options: ProcessorProxyOptions = {}) {
  const method = options.method ?? "GET";
  const response = await fetch(`${processorBaseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

app.get("/health", (_req, res) => {
  res.json({
    service: "sca-api",
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.get("/regions", async (_req, res) => {
  try {
    const query = `
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geom)::jsonb,
            'properties', jsonb_build_object(
              'id', id,
              'name', name
            )
          )
        ), '[]'::jsonb)
      ) AS geojson
      FROM regions;
    `;

    const result = await pool.query(query);
    res.json(result.rows[0].geojson);
  } catch (error) {
    console.error("Failed to fetch regions:", error);
    res.status(500).json({
      error: "Failed to fetch regions"
    });
  }
});

app.get("/trends/ndvi", async (req, res) => {
  try {
    const regionId = Number(req.query.regionId);
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");

    if (!regionId || !from || !to) {
      return res.status(400).json({
        error: "regionId, from, and to are required"
      });
    }

    const query = `
      SELECT
        region_id,
        date_start,
        date_end,
        source_image_count,
        mean_ndvi,
        created_at
      FROM index_stats
      WHERE region_id = $1
        AND date_start >= $2::date
        AND date_end <= $3::date
      ORDER BY date_start ASC;
    `;

    const result = await pool.query(query, [regionId, from, to]);

    return res.json({
      regionId,
      from,
      to,
      count: result.rows.length,
      items: result.rows
    });
  } catch (error) {
    console.error("Failed to fetch NDVI trends:", error);
    return res.status(500).json({
      error: "Failed to fetch NDVI trends"
    });
  }
});

app.get("/trends", async (req, res) => {
  try {
    const regionId = Number(req.query.regionId);
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");

    if (!regionId || !from || !to) {
      return res.status(400).json({
        error: "regionId, from, and to are required"
      });
    }

    const query = `
      SELECT
        region_id,
        date_start,
        date_end,
        created_at,
        ndvi_image_count,
        mean_ndvi,
        ndvi_anomaly,
        ndvi_severity,
        ndwi_image_count,
        mean_ndwi,
        ndwi_anomaly,
        ndwi_severity,
        lst_image_count,
        mean_lst_c,
        lst_anomaly_c,
        lst_severity
      FROM index_stats
      WHERE region_id = $1
        AND date_start >= $2::date
        AND date_end <= $3::date
        AND (
          mean_ndvi IS NOT NULL
          OR mean_ndwi IS NOT NULL
          OR mean_lst_c IS NOT NULL
        )
      ORDER BY date_start ASC, created_at ASC;
    `;

    const result = await pool.query(query, [regionId, from, to]);

    return res.json({
      regionId,
      from,
      to,
      count: result.rows.length,
      items: result.rows
    });
  } catch (error) {
    console.error("Failed to fetch consolidated trends:", error);
    return res.status(500).json({
      error: "Failed to fetch consolidated trends"
    });
  }
});

app.get("/stats/ndvi", async (req, res) => {
  try {
    const regionId = Number(req.query.regionId);
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");

    if (!regionId || !from || !to) {
      return res.status(400).json({
        error: "regionId, from, and to are required"
      });
    }

    const query = `
      SELECT
        region_id,
        date_start,
        date_end,
        ndvi_image_count,
        mean_ndvi,
        ndvi_anomaly,
        ndvi_severity,
        created_at
      FROM index_stats
      WHERE region_id = $1
        AND mean_ndvi IS NOT NULL
        AND date_start >= $2::date
        AND date_end <= $3::date
      ORDER BY date_start ASC;
    `;

    const result = await pool.query(query, [regionId, from, to]);

    return res.json({
      regionId,
      from,
      to,
      count: result.rows.length,
      items: result.rows
    });
  } catch (error) {
    console.error("Failed to fetch NDVI stats:", error);
    return res.status(500).json({
      error: "Failed to fetch NDVI stats"
    });
  }
});

app.get("/health-map", async (req, res) => {
  try {
    const regionId = Number(req.query.regionId);
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");
    const metric = String(req.query.metric || "").toLowerCase();
    const allowedMetrics = new Set(["ndvi", "ndwi", "lst"]);

    if (!regionId || !from || !to || !allowedMetrics.has(metric)) {
      return res.status(400).json({
        error: "regionId, from, to, and metric(ndvi|ndwi|lst) are required"
      });
    }

    const query = `
      WITH latest_stats AS (
        SELECT
          region_id,
          date_start,
          date_end,
          created_at,
          mean_ndvi,
          ndvi_severity,
          ndvi_image_count,
          mean_ndwi,
          ndwi_severity,
          ndwi_image_count,
          mean_lst_c,
          lst_severity,
          lst_image_count
        FROM index_stats
        WHERE region_id = $1
          AND date_start >= $2::date
          AND date_end <= $3::date
          AND (
            ($4::text = 'ndvi' AND mean_ndvi IS NOT NULL)
            OR ($4::text = 'ndwi' AND mean_ndwi IS NOT NULL)
            OR ($4::text = 'lst' AND mean_lst_c IS NOT NULL)
          )
        ORDER BY created_at DESC
        LIMIT 1
      )
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(r.geom)::jsonb,
            'properties', jsonb_build_object(
              'id', r.id,
              'name', r.name,
              'metric', $4::text,
              'value', CASE
                WHEN $4::text = 'ndvi' THEN ls.mean_ndvi
                WHEN $4::text = 'ndwi' THEN ls.mean_ndwi
                WHEN $4::text = 'lst' THEN ls.mean_lst_c
                ELSE NULL
              END,
              'severity', CASE
                WHEN $4::text = 'ndvi' THEN ls.ndvi_severity
                WHEN $4::text = 'ndwi' THEN ls.ndwi_severity
                WHEN $4::text = 'lst' THEN ls.lst_severity
                ELSE NULL
              END,
              'image_count', CASE
                WHEN $4::text = 'ndvi' THEN ls.ndvi_image_count
                WHEN $4::text = 'ndwi' THEN ls.ndwi_image_count
                WHEN $4::text = 'lst' THEN ls.lst_image_count
                ELSE NULL
              END,
              'date_start', ls.date_start,
              'date_end', ls.date_end,
              'created_at', ls.created_at
            )
          )
        ), '[]'::jsonb)
      ) AS geojson
      FROM regions r
      LEFT JOIN latest_stats ls ON ls.region_id = r.id
      WHERE r.id = $1;
    `;

    const result = await pool.query(query, [regionId, from, to, metric]);
    return res.json({
      regionId,
      from,
      to,
      metric,
      data: result.rows[0].geojson
    });
  } catch (error) {
    console.error("Failed to fetch health map data:", error);
    return res.status(500).json({
      error: "Failed to fetch health map data"
    });
  }
});

app.get("/stats/ndwi", async (req, res) => {
  try {
    const regionId = Number(req.query.regionId);
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");

    if (!regionId || !from || !to) {
      return res.status(400).json({
        error: "regionId, from, and to are required"
      });
    }

    const query = `
      SELECT
        region_id,
        date_start,
        date_end,
        ndwi_image_count,
        mean_ndwi,
        ndwi_anomaly,
        ndwi_severity,
        created_at
      FROM index_stats
      WHERE region_id = $1
        AND mean_ndwi IS NOT NULL
        AND date_start >= $2::date
        AND date_end <= $3::date
      ORDER BY date_start ASC;
    `;

    const result = await pool.query(query, [regionId, from, to]);

    return res.json({
      regionId,
      from,
      to,
      count: result.rows.length,
      items: result.rows
    });
  } catch (error) {
    console.error("Failed to fetch NDWI stats:", error);
    return res.status(500).json({
      error: "Failed to fetch NDWI stats"
    });
  }
});

app.get("/stats/lst", async (req, res) => {
  try {
    const regionId = Number(req.query.regionId);
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");

    if (!regionId || !from || !to) {
      return res.status(400).json({
        error: "regionId, from, and to are required"
      });
    }

    const query = `
      SELECT
        region_id,
        date_start,
        date_end,
        lst_image_count,
        mean_lst_c,
        lst_anomaly_c,
        lst_severity,
        created_at
      FROM index_stats
      WHERE region_id = $1
        AND mean_lst_c IS NOT NULL
        AND date_start >= $2::date
        AND date_end <= $3::date
      ORDER BY date_start ASC;
    `;

    const result = await pool.query(query, [regionId, from, to]);

    return res.json({
      regionId,
      from,
      to,
      count: result.rows.length,
      items: result.rows
    });
  } catch (error) {
    console.error("Failed to fetch LST stats:", error);
    return res.status(500).json({
      error: "Failed to fetch LST stats"
    });
  }
});

app.get("/alerts", async (req, res) => {
  try {
    const regionId = Number(req.query.regionId);
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");

    if (!regionId || !from || !to) {
      return res.status(400).json({
        error: "regionId, from, and to are required"
      });
    }

    const query = `
      SELECT
        id,
        region_id,
        metric,
        severity,
        message,
        date_start,
        date_end,
        meta,
        created_at
      FROM alerts
      WHERE region_id = $1
        AND date_start >= $2::date
        AND date_end <= $3::date
      ORDER BY created_at DESC;
    `;

    const result = await pool.query(query, [regionId, from, to]);

    return res.json({
      regionId,
      from,
      to,
      count: result.rows.length,
      items: result.rows
    });
  } catch (error) {
    console.error("Failed to fetch alerts:", error);
    return res.status(500).json({
      error: "Failed to fetch alerts"
    });
  }
});

app.get("/impact-metrics", async (req, res) => {
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
});

app.get("/advisory", async (req, res) => {
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
});

app.delete("/stats/ndvi", async (req, res) => {
  try {
    const regionId = Number(req.query.regionId);
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");

    if (!regionId || !from || !to) {
      return res.status(400).json({
        error: "regionId, from, and to are required"
      });
    }

    const query = `
      WITH updated AS (
        UPDATE index_stats
        SET
          mean_ndvi = NULL,
          ndvi_anomaly = NULL,
          ndvi_severity = NULL,
          ndvi_image_count = NULL
        WHERE region_id = $1
          AND date_start >= $2::date
          AND date_end <= $3::date
          AND mean_ndvi IS NOT NULL
        RETURNING 1
      )
      SELECT COUNT(*)::int AS affected FROM updated;
    `;

    const result = await pool.query(query, [regionId, from, to]);
    return res.json({ regionId, from, to, deleted: result.rows[0].affected });
  } catch (error) {
    console.error("Failed to clear NDVI stats:", error);
    return res.status(500).json({
      error: "Failed to clear NDVI stats"
    });
  }
});

app.delete("/stats/ndwi", async (req, res) => {
  try {
    const regionId = Number(req.query.regionId);
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");

    if (!regionId || !from || !to) {
      return res.status(400).json({
        error: "regionId, from, and to are required"
      });
    }

    const query = `
      WITH updated AS (
        UPDATE index_stats
        SET
          mean_ndwi = NULL,
          ndwi_anomaly = NULL,
          ndwi_severity = NULL,
          ndwi_image_count = NULL
        WHERE region_id = $1
          AND date_start >= $2::date
          AND date_end <= $3::date
          AND mean_ndwi IS NOT NULL
        RETURNING 1
      )
      SELECT COUNT(*)::int AS affected FROM updated;
    `;

    const result = await pool.query(query, [regionId, from, to]);
    return res.json({ regionId, from, to, deleted: result.rows[0].affected });
  } catch (error) {
    console.error("Failed to clear NDWI stats:", error);
    return res.status(500).json({
      error: "Failed to clear NDWI stats"
    });
  }
});

app.delete("/stats/lst", async (req, res) => {
  try {
    const regionId = Number(req.query.regionId);
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");

    if (!regionId || !from || !to) {
      return res.status(400).json({
        error: "regionId, from, and to are required"
      });
    }

    const query = `
      WITH updated AS (
        UPDATE index_stats
        SET
          mean_lst_c = NULL,
          lst_anomaly_c = NULL,
          lst_severity = NULL,
          lst_image_count = NULL
        WHERE region_id = $1
          AND date_start >= $2::date
          AND date_end <= $3::date
          AND mean_lst_c IS NOT NULL
        RETURNING 1
      )
      SELECT COUNT(*)::int AS affected FROM updated;
    `;

    const result = await pool.query(query, [regionId, from, to]);
    return res.json({ regionId, from, to, deleted: result.rows[0].affected });
  } catch (error) {
    console.error("Failed to clear LST stats:", error);
    return res.status(500).json({
      error: "Failed to clear LST stats"
    });
  }
});

app.delete("/alerts", async (req, res) => {
  try {
    const regionId = Number(req.query.regionId);
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");

    if (!regionId || !from || !to) {
      return res.status(400).json({
        error: "regionId, from, and to are required"
      });
    }

    const query = `
      WITH deleted AS (
        DELETE FROM alerts
        WHERE region_id = $1
          AND date_start >= $2::date
          AND date_end <= $3::date
        RETURNING 1
      )
      SELECT COUNT(*)::int AS affected FROM deleted;
    `;

    const result = await pool.query(query, [regionId, from, to]);
    return res.json({ regionId, from, to, deleted: result.rows[0].affected });
  } catch (error) {
    console.error("Failed to clear alerts:", error);
    return res.status(500).json({
      error: "Failed to clear alerts"
    });
  }
});

app.post("/jobs/ndvi", async (req, res) => {
  try {
    const { region_id, start_date, end_date } = req.body ?? {};
    if (!region_id || !start_date || !end_date) {
      return res.status(400).json({
        error: "region_id, start_date, and end_date are required"
      });
    }

    const upstream = await callProcessor("/jobs/ndvi", {
      method: "POST",
      body: { region_id, start_date, end_date }
    });

    return res.status(upstream.status).json(upstream.payload);
  } catch (error) {
    console.error("Failed to submit NDVI job:", error);
    return res.status(500).json({
      error: "Failed to submit NDVI job"
    });
  }
});

app.post("/jobs/ndwi", async (req, res) => {
  try {
    const { region_id, start_date, end_date } = req.body ?? {};
    if (!region_id || !start_date || !end_date) {
      return res.status(400).json({
        error: "region_id, start_date, and end_date are required"
      });
    }

    const upstream = await callProcessor("/jobs/ndwi", {
      method: "POST",
      body: { region_id, start_date, end_date }
    });

    return res.status(upstream.status).json(upstream.payload);
  } catch (error) {
    console.error("Failed to submit NDWI job:", error);
    return res.status(500).json({
      error: "Failed to submit NDWI job"
    });
  }
});

app.post("/jobs/lst", async (req, res) => {
  try {
    const { region_id, start_date, end_date } = req.body ?? {};
    if (!region_id || !start_date || !end_date) {
      return res.status(400).json({
        error: "region_id, start_date, and end_date are required"
      });
    }

    const upstream = await callProcessor("/jobs/lst", {
      method: "POST",
      body: { region_id, start_date, end_date }
    });

    return res.status(upstream.status).json(upstream.payload);
  } catch (error) {
    console.error("Failed to submit LST job:", error);
    return res.status(500).json({
      error: "Failed to submit LST job"
    });
  }
});

app.get("/jobs/:type/:jobId", async (req, res) => {
  try {
    const type = String(req.params.type || "").toLowerCase();
    const jobId = String(req.params.jobId || "");
    const allowedTypes = new Set(["ndvi", "ndwi", "lst"]);

    if (!allowedTypes.has(type)) {
      return res.status(400).json({
        error: "Invalid job type. Allowed: ndvi, ndwi, lst"
      });
    }

    if (!jobId) {
      return res.status(400).json({
        error: "jobId is required"
      });
    }

    const upstream = await callProcessor(`/jobs/${type}/${jobId}`);
    return res.status(upstream.status).json(upstream.payload);
  } catch (error) {
    console.error("Failed to fetch job status:", error);
    return res.status(500).json({
      error: "Failed to fetch job status"
    });
  }
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
