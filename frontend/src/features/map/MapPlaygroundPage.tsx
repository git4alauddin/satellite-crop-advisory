import { useEffect, useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import {
  getHealthMap,
  type MapMetric,
  type RegionFeatureCollection
} from "../../api";

const defaultCenter: LatLngExpression = [30.9, 75.85];
const DEFAULT_FROM = "2025-01-01";
const DEFAULT_TO = "2025-02-15";

export default function MapPlaygroundPage() {
  const [metric, setMetric] = useState<MapMetric>("ndvi");
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [regions, setRegions] = useState<RegionFeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const boundarySource = regions?.features?.[0]?.properties?.source ?? "N/A";
  const boundaryCode = regions?.features?.[0]?.properties?.region_code ?? "N/A";

  async function loadMap() {
    if (from > to) {
      setError("From date must be before or equal to To date.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await getHealthMap(1, from, to, metric);
      setRegions(response.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load map data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMap();
  }, []);

  function fillColor(severity?: string | null) {
    if (severity === "critical") return "#ef4444";
    if (severity === "stressed") return "#f59e0b";
    if (severity === "healthy") return "#22c55e";
    return "#94a3b8";
  }

  return (
    <div className="page">
      <h2>Map Playground</h2>
      <p>Test actual boundary rendering, metric switch, and source visibility.</p>

      <div className="controlsRow">
        <label>
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <div className="buttonGroup">
          <button type="button" className={metric === "ndvi" ? "active" : ""} onClick={() => setMetric("ndvi")}>NDVI</button>
          <button type="button" className={metric === "ndwi" ? "active" : ""} onClick={() => setMetric("ndwi")}>NDWI</button>
          <button type="button" className={metric === "lst" ? "active" : ""} onClick={() => setMetric("lst")}>LST</button>
        </div>
        <button type="button" onClick={() => void loadMap()}>{loading ? "Loading..." : "Load Map"}</button>
      </div>

      <p className="meta">Boundary Source: <strong>{boundarySource}</strong> | Code: <strong>{boundaryCode}</strong></p>
      {error && <p className="error">{error}</p>}
      {!loading && !error && !regions && (
        <p className="meta">No map data loaded yet. Click "Load Map".</p>
      )}

      <div className="mapWrap">
        <MapContainer center={defaultCenter} zoom={10} className="map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {regions && (
            <GeoJSON
              data={regions as unknown as GeoJSON.GeoJsonObject}
              style={(feature: any) => ({
                color: "#0f172a",
                weight: 2,
                fillColor: fillColor(feature?.properties?.severity),
                fillOpacity: 0.35
              })}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
