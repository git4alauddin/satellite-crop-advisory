CREATE TABLE IF NOT EXISTS index_stats (
    id BIGSERIAL PRIMARY KEY,
    region_id INTEGER NOT NULL REFERENCES regions(id),
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    source_image_count INTEGER NOT NULL,
    mean_ndvi DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (region_id, date_start, date_end)
);
