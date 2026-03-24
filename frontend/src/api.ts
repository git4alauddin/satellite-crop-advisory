export type RegionFeature = {
  type: "Feature";
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  properties: {
    id: number;
    name: string;
    metric?: "ndvi" | "ndwi" | "lst";
    value?: number | null;
    severity?: "healthy" | "stressed" | "critical" | null;
    image_count?: number | null;
    date_start?: string | null;
    date_end?: string | null;
    created_at?: string | null;
  };
};

export type RegionFeatureCollection = {
  type: "FeatureCollection";
  features: RegionFeature[];
};

export type MapMetric = "ndvi" | "ndwi" | "lst";

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

export type ConsolidatedTrendItem = {
  region_id: number;
  date_start: string;
  date_end: string;
  created_at: string;
  ndvi_image_count: number | null;
  mean_ndvi: number | null;
  ndvi_anomaly: number | null;
  ndvi_severity: string | null;
  ndwi_image_count: number | null;
  mean_ndwi: number | null;
  ndwi_anomaly: number | null;
  ndwi_severity: string | null;
  lst_image_count: number | null;
  mean_lst_c: number | null;
  lst_anomaly_c: number | null;
  lst_severity: string | null;
};

export type ConsolidatedTrendsResponse = {
  regionId: number;
  from: string;
  to: string;
  count: number;
  items: ConsolidatedTrendItem[];
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

export type ImpactMetricsResponse = {
  regionId: number;
  from: string;
  to: string;
  region: {
    id: number;
    name: string;
    area_km2: number;
  };
  temporal_coverage: {
    requested_from: string;
    requested_to: string;
    first_observation_date: string | null;
    last_observation_date: string | null;
  };
  windows: {
    total: number;
    ndvi: number;
    ndwi: number;
    lst: number;
  };
  stress_summary: {
    ndvi: { stressed: number; critical: number };
    ndwi: { stressed: number; critical: number };
    lst: { stressed: number; critical: number };
  };
  alerts: {
    total: number;
    critical: number;
    stressed: number;
    latest_alert_at: string | null;
  };
};

export type AdvisoryResponse = {
  regionId: number;
  from: string;
  to: string;
  region: {
    id: number;
    name: string;
  };
  latest_observation: {
    date_start: string;
    date_end: string;
    created_at: string;
    mean_ndvi: number | null;
    ndvi_anomaly: number | null;
    ndvi_severity: string | null;
    mean_ndwi: number | null;
    ndwi_anomaly: number | null;
    ndwi_severity: string | null;
    mean_lst_c: number | null;
    lst_anomaly_c: number | null;
    lst_severity: string | null;
  } | null;
  alerts: {
    total: number;
    critical: number;
    stressed: number;
    latest_alert_at: string | null;
  };
  advisory_messages: string[];
};

export type HealthMapResponse = {
  regionId: number;
  from: string;
  to: string;
  metric: MapMetric;
  data: RegionFeatureCollection;
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

export async function getTrends(
  regionId: number,
  from: string,
  to: string
): Promise<ConsolidatedTrendsResponse> {
  const params = new URLSearchParams({
    regionId: String(regionId),
    from,
    to
  });

  const response = await fetch(`${API_BASE_URL}/trends?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch consolidated trends: ${response.status}`);
  }
  return response.json() as Promise<ConsolidatedTrendsResponse>;
}

export async function getHealthMap(
  regionId: number,
  from: string,
  to: string,
  metric: MapMetric
): Promise<HealthMapResponse> {
  const params = new URLSearchParams({
    regionId: String(regionId),
    from,
    to,
    metric
  });

  const response = await fetch(`${API_BASE_URL}/health-map?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch health map: ${response.status}`);
  }
  return response.json() as Promise<HealthMapResponse>;
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

export async function getImpactMetrics(
  regionId: number,
  from: string,
  to: string
): Promise<ImpactMetricsResponse> {
  const params = new URLSearchParams({
    regionId: String(regionId),
    from,
    to
  });

  const response = await fetch(`${API_BASE_URL}/impact-metrics?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch impact metrics: ${response.status}`);
  }
  return response.json() as Promise<ImpactMetricsResponse>;
}

export async function getAdvisory(
  regionId: number,
  from: string,
  to: string
): Promise<AdvisoryResponse> {
  const params = new URLSearchParams({
    regionId: String(regionId),
    from,
    to
  });

  const response = await fetch(`${API_BASE_URL}/advisory?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch advisory: ${response.status}`);
  }
  return response.json() as Promise<AdvisoryResponse>;
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
