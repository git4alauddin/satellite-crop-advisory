import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import {
  getNDVITrends,
  getRegions,
  type NDVITrendItem,
  type RegionFeatureCollection
} from "./api";

const defaultCenter: LatLngExpression = [28.61, 77.16];

export default function App() {
  const [regions, setRegions] = useState<RegionFeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<NDVITrendItem[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRegions() {
      try {
        const data = await getRegions();
        setRegions(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    async function loadTrends() {
      try {
        const data = await getNDVITrends(1, "2025-01-01", "2025-12-31");
        setTrendData(data.items);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setTrendError(message);
      } finally {
        setTrendLoading(false);
      }
    }

    void loadRegions();
    void loadTrends();
  }, []);

  const mapMessage = useMemo(() => {
    if (loading) return "Loading regions...";
    if (error) return `Failed to load regions: ${error}`;
    if (!regions || regions.features.length === 0) return "No regions found.";
    return null;
  }, [loading, error, regions]);

  const latestTrend = trendData.length > 0 ? trendData[trendData.length - 1] : null;

  return (
    <div className="app">
      <header className="header">
        <h1>Satellite Crop Health Advisory</h1>
        <p>Live district-level crop region view</p>
      </header>

      <main className="main">
        {mapMessage ? (
          <div className="status">{mapMessage}</div>
        ) : (
          <MapContainer center={defaultCenter} zoom={10} className="map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {regions && (
              <GeoJSON
                data={regions as unknown as GeoJSON.GeoJsonObject}
                style={{
                  color: "#0f766e",
                  weight: 2,
                  fillColor: "#14b8a6",
                  fillOpacity: 0.2
                }}
              />
            )}
          </MapContainer>
        )}

        <section className="trendCard">
          <h2>NDVI Trend (Region 1)</h2>

          {trendLoading && <p className="muted">Loading NDVI trends...</p>}
          {trendError && <p className="error">Failed to load NDVI trends: {trendError}</p>}

          {!trendLoading && !trendError && (
            <>
              <div className="trendSummary">
                <div>
                  <span className="label">Records</span>
                  <strong>{trendData.length}</strong>
                </div>
                <div>
                  <span className="label">Latest NDVI</span>
                  <strong>{latestTrend?.mean_ndvi ?? "N/A"}</strong>
                </div>
                <div>
                  <span className="label">Images Used</span>
                  <strong>{latestTrend?.source_image_count ?? "N/A"}</strong>
                </div>
              </div>

              <div className="trendTableWrap">
                <table className="trendTable">
                  <thead>
                    <tr>
                      <th>Date Start</th>
                      <th>Date End</th>
                      <th>Mean NDVI</th>
                      <th>Images</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendData.map((item, index) => (
                      <tr key={`${item.date_start}-${index}`}>
                        <td>{new Date(item.date_start).toLocaleDateString()}</td>
                        <td>{new Date(item.date_end).toLocaleDateString()}</td>
                        <td>{item.mean_ndvi ?? "N/A"}</td>
                        <td>{item.source_image_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
