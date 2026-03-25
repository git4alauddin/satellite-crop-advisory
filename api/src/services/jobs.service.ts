import { callProcessor } from "./processor.service.js";

export type JobType = "ndvi" | "ndwi" | "lst";

export function isJobType(value: string): value is JobType {
  return value === "ndvi" || value === "ndwi" || value === "lst";
}

export async function submitJob(
  type: JobType,
  payload: { region_id: number; start_date: string; end_date: string }
) {
  return callProcessor(`/jobs/${type}`, {
    method: "POST",
    body: payload
  });
}

export async function fetchJobStatus(type: JobType, jobId: string) {
  return callProcessor(`/jobs/${type}/${jobId}`);
}
