import { Router } from "express";
import { getRegions } from "../controllers/regions.controller.js";

const regionsRouter = Router();

regionsRouter.get("/regions", getRegions);

export default regionsRouter;
