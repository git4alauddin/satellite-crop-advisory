import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    service: "sca-api",
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
