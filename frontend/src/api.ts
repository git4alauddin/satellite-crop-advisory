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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export async function getRegions(): Promise<RegionFeatureCollection> {
  const response = await fetch(`${API_BASE_URL}/regions`);
  if (!response.ok) {
    throw new Error(`Failed to fetch regions: ${response.status}`);
  }
  return response.json() as Promise<RegionFeatureCollection>;
}
