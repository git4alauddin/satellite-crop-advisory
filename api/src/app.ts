import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import healthRouter from "./routes/health.routes.js";
import regionsRouter from "./routes/regions.routes.js";
import jobsRouter from "./routes/jobs.routes.js";
import trendsRouter from "./routes/trends.routes.js";
import statsRouter from "./routes/stats.routes.js";
import alertsRouter from "./routes/alerts.routes.js";
import impactRouter from "./routes/impact.routes.js";
import advisoryRouter from "./routes/advisory.routes.js";
import openApiSpec from "./docs/openapi.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/openapi.json", (_req, res) => {
  res.json(openApiSpec);
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use(healthRouter);
app.use(regionsRouter);
app.use(jobsRouter);
app.use(trendsRouter);
app.use(statsRouter);
app.use(alertsRouter);
app.use(impactRouter);
app.use(advisoryRouter);

export default app;
