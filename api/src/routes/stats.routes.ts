import { Router } from "express";
import {
  clearLstStats,
  clearNdviStats,
  clearNdwiStats,
  getHealthMap,
  getLstStats,
  getNdviStats,
  getNdwiStats
} from "../controllers/stats.controller.js";

const statsRouter = Router();

statsRouter.get("/stats/ndvi", getNdviStats);
statsRouter.get("/health-map", getHealthMap);
statsRouter.get("/stats/ndwi", getNdwiStats);
statsRouter.get("/stats/lst", getLstStats);

statsRouter.delete("/stats/ndvi", clearNdviStats);
statsRouter.delete("/stats/ndwi", clearNdwiStats);
statsRouter.delete("/stats/lst", clearLstStats);

export default statsRouter;
