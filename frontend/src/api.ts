export type RegionFeature = {
  type: "Feature";
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  properties: {
    id: number;
    name: string;
  };
};

export type RegionFeatureCollection = {
  type: "FeatureCollection";
  features: RegionFeature[];
};

export type NDVITrendItem = {
  region_id: number;
  date_start: string;
  date_end: string;
  source_image_count: number;
  ndvi_image_count?: number;
  mean_ndvi: number | null;
  ndvi_anomaly?: number | null;
  ndvi_severity?: string | null;
  created_at: string;
};

export type NDVIStatResponse = {
  count: number;
  items: NDVITrendItem[];
};

export type NDWIStatItem = {
  region_id: number;
  date_start: string;
  date_end: string;
  source_image_count: number;
  ndwi_image_count?: number;
  mean_ndwi: number | null;
  created_at: string;
};

export type NDWIStatResponse = {
  count: number;
  items: NDWIStatItem[];
};

export type LSTStatItem = {
  region_id: number;
  date_start: string;
  date_end: string;
  source_image_count: number;
  lst_image_count?: number;
  mean_lst_c: number | null;
  created_at: string;
};

export type LSTStatResponse = {
  count: number;
  items: LSTStatItem[];
};

export type AlertItem = {
  id: number;
  region_id: number;
  metric: string;
  severity: "healthy" | "stressed" | "critical" | string;
  message: string;
  date_start: string;
  date_end: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};

export type AlertResponse = {
  count: number;
  items: AlertItem[];
};

export type JobType = "ndvi" | "ndwi" | "lst";

export type JobSubmitResponse = {
  job_id: string;
  job_type: JobType;
  status: string;
  message?: string;
};

export type JobStatusResponse = {
  job_id: string;
  job_type: JobType;
  status: "running" | "completed" | "failed" | string;
  created_at: string;
  input: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
};

type ClearResponse = {
  regionId: number;
  from: string;
  to: string;
  deleted: number;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export async function getRegions(): Promise<RegionFeatureCollection> {
  const response = await fetch(`${API_BASE_URL}/regions`);
  if (!response.ok) {
    throw new Error(`Failed to fetch regions: ${response.status}`);
  }
  return response.json() as Promise<RegionFeatureCollection>;
}

export async function getNDVITrends(
  regionId: number,
  from: string,
  to: string
): Promise<NDVIStatResponse> {
  return getNDVIStats(regionId, from, to);
}

export async function getNDVIStats(
  regionId: number,
  from: string,
  to: string
): Promise<NDVIStatResponse> {
  const params = new URLSearchParams({
    regionId: String(regionId),
    from,
    to
  });

  const response = await fetch(`${API_BASE_URL}/stats/ndvi?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch NDVI stats: ${response.status}`);
  }
  return response.json() as Promise<NDVIStatResponse>;
}

export async function getNDWIStats(
  regionId: number,
  from?: string,
  to?: string
): Promise<NDWIStatResponse> {
  const params = new URLSearchParams({ regionId: String(regionId) });
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const response = await fetch(`${API_BASE_URL}/stats/ndwi?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch NDWI stats: ${response.status}`);
  }
  return response.json() as Promise<NDWIStatResponse>;
}

export async function getLSTStats(
  regionId: number,
  from?: string,
  to?: string
): Promise<LSTStatResponse> {
  const params = new URLSearchParams({ regionId: String(regionId) });
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const response = await fetch(`${API_BASE_URL}/stats/lst?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch LST stats: ${response.status}`);
  }
  return response.json() as Promise<LSTStatResponse>;
}

export async function getAlerts(
  regionId: number,
  from?: string,
  to?: string
): Promise<AlertResponse> {
  const params = new URLSearchParams({ regionId: String(regionId) });
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const response = await fetch(`${API_BASE_URL}/alerts?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch alerts: ${response.status}`);
  }
  return response.json() as Promise<AlertResponse>;
}

export async function submitJob(
  jobType: JobType,
  payload: { region_id: number; start_date: string; end_date: string }
): Promise<JobSubmitResponse> {
  const response = await fetch(`${API_BASE_URL}/jobs/${jobType}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Failed to submit ${jobType.toUpperCase()} job: ${response.status}`);
  }
  return response.json() as Promise<JobSubmitResponse>;
}

export async function getJobStatus(jobType: JobType, jobId: string): Promise<JobStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/jobs/${jobType}/${jobId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${jobType.toUpperCase()} job status: ${response.status}`);
  }
  return response.json() as Promise<JobStatusResponse>;
}

async function clearByPath(path: string, regionId: number, from: string, to: string): Promise<ClearResponse> {
  const params = new URLSearchParams({
    regionId: String(regionId),
    from,
    to
  });
  const response = await fetch(`${API_BASE_URL}${path}?${params.toString()}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Failed to clear data: ${response.status}`);
  }
  return response.json() as Promise<ClearResponse>;
}

export async function clearNDVIStats(regionId: number, from: string, to: string): Promise<ClearResponse> {
  return clearByPath("/stats/ndvi", regionId, from, to);
}

export async function clearNDWIStats(regionId: number, from: string, to: string): Promise<ClearResponse> {
  return clearByPath("/stats/ndwi", regionId, from, to);
}

export async function clearLSTStats(regionId: number, from: string, to: string): Promise<ClearResponse> {
  return clearByPath("/stats/lst", regionId, from, to);
}

export async function clearAlerts(regionId: number, from: string, to: string): Promise<ClearResponse> {
  return clearByPath("/alerts", regionId, from, to);
}
