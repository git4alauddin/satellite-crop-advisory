INSERT INTO regions (name, geom)
VALUES (
    'Demo District',
    ST_Multi(
        ST_GeomFromText(
            'POLYGON((77.05 28.73,77.27 28.73,77.27 28.53,77.05 28.53,77.05 28.73))',
            4326
        )
    )
);

