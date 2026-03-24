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
  mean_ndvi: number | null;
  created_at: string;
};

export type NDVITrendResponse = {
  regionId: number;
  from: string;
  to: string;
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const PROCESSOR_BASE_URL = import.meta.env.VITE_PROCESSOR_BASE_URL || "http://localhost:8000";

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
): Promise<NDVITrendResponse> {
  const params = new URLSearchParams({
    regionId: String(regionId),
    from,
    to
  });

  const response = await fetch(`${API_BASE_URL}/trends/ndvi?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch NDVI trends: ${response.status}`);
  }
  return response.json() as Promise<NDVITrendResponse>;
}

export async function getNDWIStats(
  regionId: number,
  from?: string,
  to?: string
): Promise<NDWIStatResponse> {
  const params = new URLSearchParams({ region_id: String(regionId) });
  if (from) params.set("from_date", from);
  if (to) params.set("to_date", to);

  const response = await fetch(`${PROCESSOR_BASE_URL}/stats/ndwi?${params.toString()}`);
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
  const params = new URLSearchParams({ region_id: String(regionId) });
  if (from) params.set("from_date", from);
  if (to) params.set("to_date", to);

  const response = await fetch(`${PROCESSOR_BASE_URL}/stats/lst?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch LST stats: ${response.status}`);
  }
  return response.json() as Promise<LSTStatResponse>;
}
