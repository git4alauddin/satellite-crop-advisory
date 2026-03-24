DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM regions WHERE id = 1) THEN
        UPDATE regions
        SET
            name = 'Delhi Sample Region',
            geom = ST_Multi(
                ST_GeomFromText(
                    'POLYGON((77.060 28.720,77.110 28.735,77.170 28.740,77.225 28.725,77.255 28.695,77.270 28.650,77.262 28.605,77.238 28.570,77.190 28.548,77.130 28.540,77.085 28.555,77.055 28.590,77.045 28.640,77.050 28.690,77.060 28.720))',
                    4326
                )
            )
        WHERE id = 1;
    ELSE
        INSERT INTO regions (name, geom)
        VALUES (
            'Delhi Sample Region',
            ST_Multi(
                ST_GeomFromText(
                    'POLYGON((77.060 28.720,77.110 28.735,77.170 28.740,77.225 28.725,77.255 28.695,77.270 28.650,77.262 28.605,77.238 28.570,77.190 28.548,77.130 28.540,77.085 28.555,77.055 28.590,77.045 28.640,77.050 28.690,77.060 28.720))',
                    4326
                )
            )
        );
    END IF;
END $$;
