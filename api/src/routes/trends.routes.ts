import { Router } from "express";
import { getConsolidatedTrends, getNdviTrends } from "../controllers/trends.controller.js";

const trendsRouter = Router();

trendsRouter.get("/trends/ndvi", getNdviTrends);
trendsRouter.get("/trends", getConsolidatedTrends);

export default trendsRouter;
