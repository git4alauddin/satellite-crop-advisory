import { Pool } from "pg";

const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  user: process.env.PGUSER || "sca_user",
  password: process.env.PGPASSWORD || "sca_pass",
  database: process.env.PGDATABASE || "sca_geo"
});

export default pool;
