import type { Request, Response } from "express";
import { getHealthPayload } from "../services/health.service.js";

export function getHealth(_req: Request, res: Response) {
  res.json(getHealthPayload());
}
