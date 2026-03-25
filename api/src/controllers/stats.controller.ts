import type { Request, Response } from "express";
import pool from "../db.js";

export async function getNdviStats(req: Request, res: Response) {
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
}

export async function getHealthMap(req: Request, res: Response) {
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
              'region_code', r.region_code,
              'source', r.source,
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
}

export async function getNdwiStats(req: Request, res: Response) {
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
}

export async function getLstStats(req: Request, res: Response) {
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
}

export async function clearNdviStats(req: Request, res: Response) {
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
}

export async function clearNdwiStats(req: Request, res: Response) {
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
}

export async function clearLstStats(req: Request, res: Response) {
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
}
