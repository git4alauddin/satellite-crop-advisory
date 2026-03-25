import type { Request, Response } from "express";
import { getRegionsGeoJson } from "../services/regions.service.js";

export async function getRegions(_req: Request, res: Response) {
  try {
    const geojson = await getRegionsGeoJson();
    res.json(geojson);
  } catch (error) {
    console.error("Failed to fetch regions:", error);
    res.status(500).json({
      error: "Failed to fetch regions"
    });
  }
}
