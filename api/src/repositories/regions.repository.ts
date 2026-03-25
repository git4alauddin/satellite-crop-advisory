import pool from "../db.js";

export async function fetchRegionsGeoJson() {
  const query = `
    SELECT jsonb_build_object(
      'type', 'FeatureCollection',
      'features', COALESCE(jsonb_agg(
        jsonb_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(geom)::jsonb,
          'properties', jsonb_build_object(
            'id', id,
            'name', name,
            'region_code', region_code,
            'source', source
          )
        )
      ), '[]'::jsonb)
    ) AS geojson
    FROM regions;
  `;

  const result = await pool.query(query);
  return result.rows[0].geojson;
}
