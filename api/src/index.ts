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
