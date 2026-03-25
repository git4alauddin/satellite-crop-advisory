import { Router } from "express";
import { createSubmitJobHandler, getJobStatus } from "../controllers/jobs.controller.js";

const jobsRouter = Router();

jobsRouter.post("/jobs/ndvi", createSubmitJobHandler("ndvi"));
jobsRouter.post("/jobs/ndwi", createSubmitJobHandler("ndwi"));
jobsRouter.post("/jobs/lst", createSubmitJobHandler("lst"));
jobsRouter.get("/jobs/:type/:jobId", getJobStatus);

export default jobsRouter;
