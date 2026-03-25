import { fetchRegionsGeoJson } from "../repositories/regions.repository.js";

export async function getRegionsGeoJson() {
  return fetchRegionsGeoJson();
}
