import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js";

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

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

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
