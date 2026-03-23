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
