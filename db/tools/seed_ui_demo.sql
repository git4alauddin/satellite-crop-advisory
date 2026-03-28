-- UI demo seed (opt-in)
-- Purpose: deterministic dataset that covers dashboard/advisory/trends/alerts test scenarios.
-- Apply with:
--   npm run seed:ui-demo

BEGIN;

-- Reset region dataset so UI sees a clean, deterministic demo state.
DELETE FROM alerts
WHERE region_id = 1;

DELETE FROM index_stats
WHERE region_id = 1;

-- Scenario matrix for region_id=1
-- S1: healthy baseline window
-- S2: anomaly at stressed edge (NDVI -0.10 / NDWI -0.05 / LST +1.5)
-- S3: stressed mix
-- S4: critical mix + multi-alert window
-- S5: severe critical across all metrics
-- S6: partial metric availability (LST missing)
-- S7: anomaly NULL case (baseline unavailable style)
-- S8: healthy recovery window
-- S9: no-stats window is tested by choosing dates outside these ranges
-- S10: latest window mixed severities (healthy/stressed/critical)
INSERT INTO index_stats (
    region_id,
    date_start,
    date_end,
    source_image_count,
    ndvi_image_count,
    ndwi_image_count,
    lst_image_count,
    mean_ndvi,
    mean_ndwi,
    mean_lst_c,
    ndvi_anomaly,
    ndwi_anomaly,
    lst_anomaly_c,
    ndvi_severity,
    ndwi_severity,
    lst_severity,
    created_at
)
VALUES
    -- S1
    (1, '2025-01-01', '2025-01-15', 12, 12, 12, 6, 0.63, -0.11, 19.1,  0.06,  0.03, -0.9, 'healthy',  'healthy',  'healthy',  NOW() - INTERVAL '9 days'),
    -- S2 (threshold edges)
    (1, '2025-01-16', '2025-01-31', 11, 11, 11, 6, 0.50, -0.17, 21.4, -0.10, -0.05,  1.5, 'stressed', 'stressed', 'stressed', NOW() - INTERVAL '8 days'),
    -- S3
    (1, '2025-02-01', '2025-02-15', 10, 10, 10, 5, 0.42, -0.24, 23.7, -0.14, -0.09,  1.9, 'stressed', 'stressed', 'stressed', NOW() - INTERVAL '7 days'),
    -- S4
    (1, '2025-02-16', '2025-02-28',  9,  9,  9, 5, 0.34, -0.31, 25.4, -0.20, -0.14,  2.3, 'critical', 'critical', 'critical', NOW() - INTERVAL '6 days'),
    -- S5
    (1, '2025-03-01', '2025-03-15',  9,  9,  9, 4, 0.28, -0.39, 27.2, -0.27, -0.22,  3.6, 'critical', 'critical', 'critical', NOW() - INTERVAL '5 days'),
    -- S6 (partial metrics)
    (1, '2025-03-16', '2025-03-31', 10, 10, 10, NULL, 0.45, -0.23, NULL, -0.09, -0.07, NULL, 'stressed', 'stressed', NULL, NOW() - INTERVAL '4 days'),
    -- S7 (anomaly NULL)
    (1, '2025-04-01', '2025-04-15', 11, 11, 11, 5, 0.33, -0.35, 26.0, NULL, NULL, NULL, 'critical', 'critical', 'critical', NOW() - INTERVAL '3 days'),
    -- S8 (recovery)
    (1, '2025-04-16', '2025-04-30', 12, 12, 12, 6, 0.49, -0.21, 22.8, -0.08, -0.04,  1.1, 'stressed', 'stressed', 'stressed', NOW() - INTERVAL '2 days'),
    -- S10 (latest mixed severity)
    (1, '2025-05-01', '2025-05-15', 13, 13, 13, 6, 0.58, -0.22, 26.6,  0.03, -0.07,  2.7, 'healthy',  'stressed', 'critical', NOW() - INTERVAL '1 day')
ON CONFLICT (region_id, date_start, date_end)
DO UPDATE SET
    source_image_count = EXCLUDED.source_image_count,
    ndvi_image_count = EXCLUDED.ndvi_image_count,
    ndwi_image_count = EXCLUDED.ndwi_image_count,
    lst_image_count = EXCLUDED.lst_image_count,
    mean_ndvi = EXCLUDED.mean_ndvi,
    mean_ndwi = EXCLUDED.mean_ndwi,
    mean_lst_c = EXCLUDED.mean_lst_c,
    ndvi_anomaly = EXCLUDED.ndvi_anomaly,
    ndwi_anomaly = EXCLUDED.ndwi_anomaly,
    lst_anomaly_c = EXCLUDED.lst_anomaly_c,
    ndvi_severity = EXCLUDED.ndvi_severity,
    ndwi_severity = EXCLUDED.ndwi_severity,
    lst_severity = EXCLUDED.lst_severity,
    created_at = EXCLUDED.created_at;

-- Alert scenarios:
-- A1: no alert windows (implicitly represented by windows without alert rows)
-- A2: single-alert window
-- A3: multi-alert same window
-- A4: mixed severities
-- A5: latest window has active stressed + critical alerts for UI demo
INSERT INTO alerts (
    region_id,
    metric,
    severity,
    message,
    date_start,
    date_end,
    meta,
    created_at
)
VALUES
    (1, 'ndwi', 'stressed', 'Canopy moisture is below normal for this window.',                 '2025-02-01', '2025-02-15', '{"rule":"ndwi_drop","threshold":-0.05}', NOW() - INTERVAL '7 days'),
    (1, 'ndvi', 'critical', 'Vegetation index crossed critical drop threshold.',                  '2025-02-16', '2025-02-28', '{"rule":"ndvi_drop","threshold":-0.20}', NOW() - INTERVAL '6 days'),
    (1, 'lst',  'critical', 'Surface temperature rose significantly above baseline.',             '2025-02-16', '2025-02-28', '{"rule":"lst_rise","threshold_c":2.0}', NOW() - INTERVAL '6 days'),
    (1, 'ndwi', 'critical', 'Water stress remains severe in this period.',                        '2025-03-01', '2025-03-15', '{"rule":"ndwi_drop","threshold":-0.10}', NOW() - INTERVAL '5 days'),
    (1, 'ndvi', 'stressed', 'Vegetation recovering but still under expected seasonal level.',     '2025-04-16', '2025-04-30', '{"rule":"ndvi_recovery"}', NOW() - INTERVAL '2 days'),
    (1, 'ndwi', 'stressed', 'Moisture is below seasonal expectation in the current window.',      '2025-05-01', '2025-05-15', '{"rule":"ndwi_drop","threshold":-0.05}', NOW() - INTERVAL '1 day'),
    (1, 'lst',  'critical', 'Heat stress is critical in the current window.',                     '2025-05-01', '2025-05-15', '{"rule":"lst_rise","threshold_c":2.0}', NOW() - INTERVAL '1 day')
ON CONFLICT (region_id, metric, date_start, date_end)
DO UPDATE SET
    severity = EXCLUDED.severity,
    message = EXCLUDED.message,
    meta = EXCLUDED.meta,
    created_at = EXCLUDED.created_at;

COMMIT;
