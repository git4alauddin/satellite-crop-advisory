import type { Request, Response } from "express";
import pool from "../db.js";

export async function getNdviTrends(req: Request, res: Response) {
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
}

export async function getConsolidatedTrends(req: Request, res: Response) {
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
}
