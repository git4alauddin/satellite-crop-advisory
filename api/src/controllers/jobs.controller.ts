import type { Request, Response } from "express";
import { fetchJobStatus, isJobType, submitJob } from "../services/jobs.service.js";

function getJobPayload(body: unknown) {
  const parsed = body as { region_id?: number; start_date?: string; end_date?: string } | undefined;
  return {
    region_id: parsed?.region_id,
    start_date: parsed?.start_date,
    end_date: parsed?.end_date
  };
}

export function createSubmitJobHandler(type: "ndvi" | "ndwi" | "lst") {
  return async (req: Request, res: Response) => {
    try {
      const { region_id, start_date, end_date } = getJobPayload(req.body);
      if (!region_id || !start_date || !end_date) {
        return res.status(400).json({
          error: "region_id, start_date, and end_date are required"
        });
      }

      const upstream = await submitJob(type, { region_id, start_date, end_date });
      return res.status(upstream.status).json(upstream.payload);
    } catch (error) {
      console.error(`Failed to submit ${type.toUpperCase()} job:`, error);
      return res.status(500).json({
        error: `Failed to submit ${type.toUpperCase()} job`
      });
    }
  };
}

export async function getJobStatus(req: Request, res: Response) {
  try {
    const type = String(req.params.type || "").toLowerCase();
    const jobId = String(req.params.jobId || "");

    if (!isJobType(type)) {
      return res.status(400).json({
        error: "Invalid job type. Allowed: ndvi, ndwi, lst"
      });
    }

    if (!jobId) {
      return res.status(400).json({
        error: "jobId is required"
      });
    }

    const upstream = await fetchJobStatus(type, jobId);
    return res.status(upstream.status).json(upstream.payload);
  } catch (error) {
    console.error("Failed to fetch job status:", error);
    return res.status(500).json({
      error: "Failed to fetch job status"
    });
  }
}
