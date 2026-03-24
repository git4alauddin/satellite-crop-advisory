import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import {
  getAlerts,
  getLSTStats,
  getNDVIStats,
  getNDWIStats,
  getRegions,
  type AlertItem,
  type LSTStatItem,
  type NDVITrendItem,
  type NDWIStatItem,
  type RegionFeatureCollection
} from "./api";

const defaultCenter: LatLngExpression = [28.61, 77.16];
const RANGE_FROM = "2025-01-01";
const RANGE_TO = "2025-12-31";

export default function App() {
  const [regions, setRegions] = useState<RegionFeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<NDVITrendItem[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [ndwiData, setNdwiData] = useState<NDWIStatItem[]>([]);
  const [ndwiLoading, setNdwiLoading] = useState(true);
  const [ndwiError, setNdwiError] = useState<string | null>(null);
  const [lstData, setLstData] = useState<LSTStatItem[]>([]);
  const [lstLoading, setLstLoading] = useState(true);
  const [lstError, setLstError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState<string | null>(null);

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
        const data = await getNDVIStats(1, RANGE_FROM, RANGE_TO);
        setTrendData(data.items);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setTrendError(message);
      } finally {
        setTrendLoading(false);
      }
    }

    async function loadNdwi() {
      try {
        const data = await getNDWIStats(1, RANGE_FROM, RANGE_TO);
        setNdwiData(data.items);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setNdwiError(message);
      } finally {
        setNdwiLoading(false);
      }
    }

    async function loadLst() {
      try {
        const data = await getLSTStats(1, RANGE_FROM, RANGE_TO);
        setLstData(data.items);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setLstError(message);
      } finally {
        setLstLoading(false);
      }
    }

    async function loadAlerts() {
      try {
        const data = await getAlerts(1, RANGE_FROM, RANGE_TO);
        setAlerts(data.items);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setAlertsError(message);
      } finally {
        setAlertsLoading(false);
      }
    }

    void loadRegions();
    void loadTrends();
    void loadNdwi();
    void loadLst();
    void loadAlerts();
  }, []);

  const mapMessage = useMemo(() => {
    if (loading) return "Loading regions...";
    if (error) return `Failed to load regions: ${error}`;
    if (!regions || regions.features.length === 0) return "No regions found.";
    return null;
  }, [loading, error, regions]);

  const latestTrend = trendData.length > 0 ? trendData[trendData.length - 1] : null;
  const latestNdwi = ndwiData.length > 0 ? ndwiData[ndwiData.length - 1] : null;
  const latestLst = lstData.length > 0 ? lstData[lstData.length - 1] : null;

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

        <section className="trendCard">
          <h2>NDWI Stats (Region 1)</h2>

          {ndwiLoading && <p className="muted">Loading NDWI stats...</p>}
          {ndwiError && <p className="error">Failed to load NDWI stats: {ndwiError}</p>}

          {!ndwiLoading && !ndwiError && (
            <>
              <div className="trendSummary">
                <div>
                  <span className="label">Records</span>
                  <strong>{ndwiData.length}</strong>
                </div>
                <div>
                  <span className="label">Latest NDWI</span>
                  <strong>{latestNdwi?.mean_ndwi ?? "N/A"}</strong>
                </div>
                <div>
                  <span className="label">Images Used</span>
                  <strong>{latestNdwi?.ndwi_image_count ?? latestNdwi?.source_image_count ?? "N/A"}</strong>
                </div>
              </div>

              <div className="trendTableWrap">
                <table className="trendTable">
                  <thead>
                    <tr>
                      <th>Date Start</th>
                      <th>Date End</th>
                      <th>Mean NDWI</th>
                      <th>Images</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ndwiData.map((item, index) => (
                      <tr key={`${item.date_start}-${index}`}>
                        <td>{new Date(item.date_start).toLocaleDateString()}</td>
                        <td>{new Date(item.date_end).toLocaleDateString()}</td>
                        <td>{item.mean_ndwi ?? "N/A"}</td>
                        <td>{item.ndwi_image_count ?? item.source_image_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="trendCard">
          <h2>LST Stats (Region 1)</h2>

          {lstLoading && <p className="muted">Loading LST stats...</p>}
          {lstError && <p className="error">Failed to load LST stats: {lstError}</p>}

          {!lstLoading && !lstError && (
            <>
              <div className="trendSummary">
                <div>
                  <span className="label">Records</span>
                  <strong>{lstData.length}</strong>
                </div>
                <div>
                  <span className="label">Latest LST (C)</span>
                  <strong>{latestLst?.mean_lst_c ?? "N/A"}</strong>
                </div>
                <div>
                  <span className="label">Images Used</span>
                  <strong>{latestLst?.lst_image_count ?? latestLst?.source_image_count ?? "N/A"}</strong>
                </div>
              </div>

              <div className="trendTableWrap">
                <table className="trendTable">
                  <thead>
                    <tr>
                      <th>Date Start</th>
                      <th>Date End</th>
                      <th>Mean LST (C)</th>
                      <th>Images</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lstData.map((item, index) => (
                      <tr key={`${item.date_start}-${index}`}>
                        <td>{new Date(item.date_start).toLocaleDateString()}</td>
                        <td>{new Date(item.date_end).toLocaleDateString()}</td>
                        <td>{item.mean_lst_c ?? "N/A"}</td>
                        <td>{item.lst_image_count ?? item.source_image_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="trendCard">
          <h2>Active Alerts (Region 1)</h2>

          {alertsLoading && <p className="muted">Loading alerts...</p>}
          {alertsError && <p className="error">Failed to load alerts: {alertsError}</p>}

          {!alertsLoading && !alertsError && (
            <>
              <div className="trendSummary">
                <div>
                  <span className="label">Alert Count</span>
                  <strong>{alerts.length}</strong>
                </div>
                <div>
                  <span className="label">Latest Metric</span>
                  <strong>{alerts[0]?.metric?.toUpperCase() ?? "N/A"}</strong>
                </div>
                <div>
                  <span className="label">Latest Severity</span>
                  <strong className={`sev-${alerts[0]?.severity ?? "healthy"}`}>
                    {alerts[0]?.severity ?? "N/A"}
                  </strong>
                </div>
              </div>

              <div className="trendTableWrap">
                <table className="trendTable">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Severity</th>
                      <th>Date Start</th>
                      <th>Date End</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((item) => (
                      <tr key={item.id}>
                        <td>{item.metric.toUpperCase()}</td>
                        <td className={`sev-${item.severity}`}>{item.severity}</td>
                        <td>{new Date(item.date_start).toLocaleDateString()}</td>
                        <td>{new Date(item.date_end).toLocaleDateString()}</td>
                        <td>{item.message}</td>
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
