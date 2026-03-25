import type { Request, Response } from "express";
import pool from "../db.js";

export async function getAlerts(req: Request, res: Response) {
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
}

export async function clearAlerts(req: Request, res: Response) {
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
}
