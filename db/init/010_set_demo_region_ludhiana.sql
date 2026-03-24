DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM regions WHERE id = 1) THEN
        UPDATE regions
        SET
            name = 'Ludhiana Demo Region',
            region_code = 'IN-PB-LDH',
            source = 'demo_ludhiana',
            geom = ST_Multi(
                ST_GeomFromText(
                    'POLYGON((75.58 31.08,75.70 31.14,75.86 31.15,76.00 31.09,76.06 30.99,76.08 30.88,76.02 30.79,75.90 30.73,75.74 30.72,75.62 30.77,75.56 30.86,75.55 30.97,75.58 31.08))',
                    4326
                )
            )
        WHERE id = 1;
    ELSE
        INSERT INTO regions (id, name, region_code, source, geom)
        VALUES (
            1,
            'Ludhiana Demo Region',
            'IN-PB-LDH',
            'demo_ludhiana',
            ST_Multi(
                ST_GeomFromText(
                    'POLYGON((75.58 31.08,75.70 31.14,75.86 31.15,76.00 31.09,76.06 30.99,76.08 30.88,76.02 30.79,75.90 30.73,75.74 30.72,75.62 30.77,75.56 30.86,75.55 30.97,75.58 31.08))',
                    4326
                )
            )
        )
        ON CONFLICT (id) DO UPDATE
        SET
            name = EXCLUDED.name,
            region_code = EXCLUDED.region_code,
            source = EXCLUDED.source,
            geom = EXCLUDED.geom;
    END IF;
END $$;
