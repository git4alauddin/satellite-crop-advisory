ALTER TABLE regions
ADD COLUMN IF NOT EXISTS region_code TEXT;

ALTER TABLE regions
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

CREATE UNIQUE INDEX IF NOT EXISTS regions_region_code_unique_idx
ON regions (region_code)
WHERE region_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS regions_geom_gist_idx
ON regions
USING GIST (geom);
