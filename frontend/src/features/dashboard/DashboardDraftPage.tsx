import { useEffect, useState } from "react";
import L from "leaflet";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import { useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import {
  getAdvisory,
  getAlerts,
  getHealthMap,
  getImpactMetrics,
  getJobStatus,
  getTrends,
  submitJob,
  type AdvisoryResponse,
  type AlertItem,
  type ConsolidatedTrendItem,
  type ImpactMetricsResponse,
  type JobType,
  type MapMetric,
  type RegionFeatureCollection
} from "../../api";

const defaultCenter: LatLngExpression = [30.9, 75.85];

function FitToRegions({ data }: { data: RegionFeatureCollection | null }) {
  const map = useMap();

  useEffect(() => {
    if (!data || !data.features?.length) return;
    const layer = L.geoJSON(data as unknown as GeoJSON.GeoJsonObject);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24] });
    }
  }, [data, map]);

  return null;
}

export default function DashboardDraftPage() {
  const [from, setFrom] = useState("2025-01-01");
  const [to, setTo] = useState("2025-02-15");
  const [metric, setMetric] = useState<MapMetric>("ndvi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobMsg, setJobMsg] = useState<string | null>(null);
  const [jobRunning, setJobRunning] = useState<JobType | null>(null);

  const [regions, setRegions] = useState<RegionFeatureCollection | null>(null);
  const [trends, setTrends] = useState<ConsolidatedTrendItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [impact, setImpact] = useState<ImpactMetricsResponse | null>(null);
  const [advisory, setAdvisory] = useState<AdvisoryResponse | null>(null);

  async function loadAll() {
    if (from > to) {
      setError("From date must be before or equal to To date.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [mapRes, trendRes, alertRes, impactRes, advisoryRes] = await Promise.all([
        getHealthMap(1, from, to, metric),
        getTrends(1, from, to),
        getAlerts(1, from, to),
        getImpactMetrics(1, from, to),
        getAdvisory(1, from, to)
      ]);

      setRegions(mapRes.data);
      setTrends(trendRes.items);
      setAlerts(alertRes.items);
      setImpact(impactRes);
      setAdvisory(advisoryRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  async function runJob(jobType: JobType) {
    if (from > to) {
      setError("From date must be before or equal to To date.");
      return;
    }

    setError(null);
    setJobRunning(jobType);
    setJobMsg(`Submitting ${jobType.toUpperCase()}...`);
    try {
      const submitted = await submitJob(jobType, {
        region_id: 1,
        start_date: from,
        end_date: to
      });
      setJobMsg(`${jobType.toUpperCase()} submitted: ${submitted.job_id}`);

      for (let attempt = 0; attempt < 60; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const status = await getJobStatus(jobType, submitted.job_id);
        setJobMsg(`${status.job_type.toUpperCase()} status: ${status.status}`);
        if (status.status === "completed") {
          setJobMsg(`${status.job_type.toUpperCase()} completed.`);
          await loadAll();
          setJobRunning(null);
          return;
        }
        if (status.status === "failed") {
          setError(status.error || `${status.job_type.toUpperCase()} failed.`);
          setJobRunning(null);
          return;
        }
      }

      setError(`${jobType.toUpperCase()} polling timed out.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to run job");
    } finally {
      setJobRunning(null);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  function fillColor(severity?: string | null) {
    if (severity === "critical") return "#ef4444";
    if (severity === "stressed") return "#f59e0b";
    if (severity === "healthy") return "#22c55e";
    return "#94a3b8";
  }

  const latest = trends.length > 0 ? trends[trends.length - 1] : null;

  return (
    <div className="page">
      <h2>Final Dashboard Draft (Minimal)</h2>
      <p>Integrated view using completed component logic with shared controls.</p>

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
        <button type="button" onClick={() => void loadAll()}>{loading ? "Loading..." : "Refresh"}</button>
      </div>

      <div className="buttonGroup">
        <button type="button" onClick={() => void runJob("ndvi")} disabled={jobRunning !== null}>
          {jobRunning === "ndvi" ? "Running NDVI..." : "Run NDVI"}
        </button>
        <button type="button" onClick={() => void runJob("ndwi")} disabled={jobRunning !== null}>
          {jobRunning === "ndwi" ? "Running NDWI..." : "Run NDWI"}
        </button>
        <button type="button" onClick={() => void runJob("lst")} disabled={jobRunning !== null}>
          {jobRunning === "lst" ? "Running LST..." : "Run LST"}
        </button>
      </div>

      {jobMsg && <p className="meta">{jobMsg}</p>}
      {error && <p className="error">{error}</p>}

      <div className="dashboardGrid">
        <section className="card">
          <h3>Map</h3>
          <div className="mapWrap">
            <MapContainer center={defaultCenter} zoom={10} className="map">
              <FitToRegions data={regions} />
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
        </section>

        <section className="card">
          <h3>Quick Summary</h3>
          <div className="summaryRow">
            <div><span>Trend Rows</span><strong>{trends.length}</strong></div>
            <div><span>Alert Count</span><strong>{alerts.length}</strong></div>
            <div><span>Latest NDVI</span><strong>{latest?.mean_ndvi ?? "N/A"}</strong></div>
            <div><span>Area km2</span><strong>{impact?.region.area_km2?.toFixed(2) ?? "N/A"}</strong></div>
          </div>
          <div className="listBlock">
            <h3>Advisory</h3>
            {advisory?.advisory_messages?.length ? (
              <ul>
                {advisory.advisory_messages.slice(0, 3).map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            ) : (
              <p className="meta">No advisory messages loaded.</p>
            )}
          </div>
        </section>

        <section className="card">
          <h3>Trends</h3>
          <div className="tableWrap">
            <table className="simpleTable">
              <thead>
                <tr>
                  <th>Date End</th>
                  <th>NDVI</th>
                  <th>NDWI</th>
                  <th>LST</th>
                </tr>
              </thead>
              <tbody>
                {trends.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="emptyCell">
                      {loading
                        ? "Loading trends..."
                        : error
                          ? "Unable to load trends. Check API/processor services."
                          : "No trend rows found for this date window."}
                    </td>
                  </tr>
                ) : (
                  trends.slice(-10).map((item, i) => (
                    <tr key={`${item.date_end}-${i}`}>
                      <td>{new Date(item.date_end).toLocaleDateString()}</td>
                      <td>{item.mean_ndvi ?? "N/A"}</td>
                      <td>{item.mean_ndwi ?? "N/A"}</td>
                      <td>{item.mean_lst_c ?? "N/A"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h3>Alerts</h3>
          <div className="tableWrap">
            <table className="simpleTable">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Severity</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="emptyCell">
                      {loading
                        ? "Loading alerts..."
                        : error
                          ? "Unable to load alerts. Check API/processor services."
                          : "No alerts found for this date window."}
                    </td>
                  </tr>
                ) : (
                  alerts.slice(0, 10).map((item) => (
                    <tr key={item.id}>
                      <td>{item.metric.toUpperCase()}</td>
                      <td>{item.severity}</td>
                      <td>{item.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
