CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    region_id INTEGER NOT NULL REFERENCES regions(id),
    metric TEXT NOT NULL,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (region_id, metric, date_start, date_end)
);

CREATE INDEX IF NOT EXISTS idx_alerts_region_date
ON alerts (region_id, date_start, date_end);
