import os

import psycopg


def get_db_connection():
    return psycopg.connect(
        host=os.getenv("PGHOST", "localhost"),
        port=int(os.getenv("PGPORT", "5432")),
        user=os.getenv("PGUSER", "sca_user"),
        password=os.getenv("PGPASSWORD", "sca_pass"),
        dbname=os.getenv("PGDATABASE", "sca_geo"),
    )
