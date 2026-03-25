import { Router } from "express";
import { getImpactMetrics } from "../controllers/impact.controller.js";

const impactRouter = Router();

impactRouter.get("/impact-metrics", getImpactMetrics);

export default impactRouter;
