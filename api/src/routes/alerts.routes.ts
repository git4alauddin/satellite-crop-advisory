import { Router } from "express";
import { clearAlerts, getAlerts } from "../controllers/alerts.controller.js";

const alertsRouter = Router();

alertsRouter.get("/alerts", getAlerts);
alertsRouter.delete("/alerts", clearAlerts);

export default alertsRouter;
