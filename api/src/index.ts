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

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
