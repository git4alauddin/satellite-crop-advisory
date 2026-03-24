import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  clearAlerts,
  clearLSTStats,
  clearNDVIStats,
  clearNDWIStats,
  getHealthMap,
  getJobStatus,
  getAdvisory,
  getAlerts,
  getImpactMetrics,
  getTrends,
  submitJob,
  type AdvisoryResponse,
  type AlertItem,
  type ConsolidatedTrendItem,
  type ImpactMetricsResponse,
  type JobType,
  type LSTStatItem,
  type MapMetric,
  type NDVITrendItem,
  type NDWIStatItem,
  type RegionFeatureCollection
} from "./api";

const defaultCenter: LatLngExpression = [30.9, 75.85];
const DEFAULT_RANGE_FROM = "2025-01-01";
const DEFAULT_RANGE_TO = "2025-02-15";
type DetailsTab = "combined" | "ndvi" | "ndwi" | "lst" | "alerts";

function FitToRegions({ regions }: { regions: RegionFeatureCollection | null }) {
  const map = useMap();

  useEffect(() => {
    if (!regions || regions.features.length === 0) return;

    const layer = L.geoJSON(regions as unknown as GeoJSON.GeoJsonObject);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 11 });
    }
  }, [map, regions]);

  return null;
}

export default function App() {
  const [regions, setRegions] = useState<RegionFeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<NDVITrendItem[]>([]);
  const [consolidatedTrendData, setConsolidatedTrendData] = useState<ConsolidatedTrendItem[]>([]);
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
  const [impact, setImpact] = useState<ImpactMetricsResponse | null>(null);
  const [impactLoading, setImpactLoading] = useState(true);
  const [impactError, setImpactError] = useState<string | null>(null);
  const [advisory, setAdvisory] = useState<AdvisoryResponse | null>(null);
  const [advisoryLoading, setAdvisoryLoading] = useState(true);
  const [advisoryError, setAdvisoryError] = useState<string | null>(null);
  const [mapMetric, setMapMetric] = useState<MapMetric>("ndvi");
  const [dateFrom, setDateFrom] = useState(DEFAULT_RANGE_FROM);
  const [dateTo, setDateTo] = useState(DEFAULT_RANGE_TO);
  const [jobRunning, setJobRunning] = useState<JobType | null>(null);
  const [jobMessage, setJobMessage] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [clearingCard, setClearingCard] = useState<"ndvi" | "ndwi" | "lst" | "alerts" | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [detailsTab, setDetailsTab] = useState<DetailsTab>("combined");

  async function loadMapData() {
    try {
      const data = await getHealthMap(1, dateFrom, dateTo, mapMetric);
      setRegions(data.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function loadConsolidatedTrends() {
    try {
      const data = await getTrends(1, dateFrom, dateTo);
      const items = data.items as ConsolidatedTrendItem[];

      const ndviItems: NDVITrendItem[] = items
        .filter((item) => item.mean_ndvi !== null)
        .map((item) => ({
          region_id: item.region_id,
          date_start: item.date_start,
          date_end: item.date_end,
          source_image_count: item.ndvi_image_count ?? 0,
          ndvi_image_count: item.ndvi_image_count ?? undefined,
          mean_ndvi: item.mean_ndvi,
          ndvi_anomaly: item.ndvi_anomaly,
          ndvi_severity: item.ndvi_severity,
          created_at: item.created_at
        }));

      const ndwiItems: NDWIStatItem[] = items
        .filter((item) => item.mean_ndwi !== null)
        .map((item) => ({
          region_id: item.region_id,
          date_start: item.date_start,
          date_end: item.date_end,
          source_image_count: item.ndwi_image_count ?? 0,
          ndwi_image_count: item.ndwi_image_count ?? undefined,
          mean_ndwi: item.mean_ndwi,
          created_at: item.created_at
        }));

      const lstItems: LSTStatItem[] = items
        .filter((item) => item.mean_lst_c !== null)
        .map((item) => ({
          region_id: item.region_id,
          date_start: item.date_start,
          date_end: item.date_end,
          source_image_count: item.lst_image_count ?? 0,
          lst_image_count: item.lst_image_count ?? undefined,
          mean_lst_c: item.mean_lst_c,
          created_at: item.created_at
        }));

      setTrendData(ndviItems);
      setConsolidatedTrendData(items);
      setNdwiData(ndwiItems);
      setLstData(lstItems);
      setTrendError(null);
      setNdwiError(null);
      setLstError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setTrendError(message);
      setNdwiError(message);
      setLstError(message);
      setTrendData([]);
      setConsolidatedTrendData([]);
      setNdwiData([]);
      setLstData([]);
    } finally {
      setTrendLoading(false);
      setNdwiLoading(false);
      setLstLoading(false);
    }
  }

  async function loadAlerts() {
    try {
      const data = await getAlerts(1, dateFrom, dateTo);
      setAlerts(data.items);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setAlertsError(message);
    } finally {
      setAlertsLoading(false);
    }
  }

  async function loadImpactMetrics() {
    try {
      const data = await getImpactMetrics(1, dateFrom, dateTo);
      setImpact(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setImpactError(message);
    } finally {
      setImpactLoading(false);
    }
  }

  async function loadAdvisory() {
    try {
      const data = await getAdvisory(1, dateFrom, dateTo);
      setAdvisory(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setAdvisoryError(message);
    } finally {
      setAdvisoryLoading(false);
    }
  }

  async function refreshStatsAndAlerts() {
    if (dateFrom > dateTo) {
      setRangeError("From date must be before or equal to To date.");
      return;
    }
    setRangeError(null);
    setRefreshingAll(true);
    setTrendLoading(true);
    setTrendError(null);
    setNdwiLoading(true);
    setNdwiError(null);
    setLstLoading(true);
    setLstError(null);
    setAlertsLoading(true);
    setAlertsError(null);
    setImpactLoading(true);
    setImpactError(null);
    setAdvisoryLoading(true);
    setAdvisoryError(null);
    setLoading(true);
    setError(null);

    await Promise.all([
      loadMapData(),
      loadConsolidatedTrends(),
      loadAlerts(),
      loadImpactMetrics(),
      loadAdvisory()
    ]);
    setRefreshingAll(false);
  }

  async function runJob(jobType: JobType) {
    if (dateFrom > dateTo) {
      setRangeError("From date must be before or equal to To date.");
      return;
    }
    setRangeError(null);
    setJobRunning(jobType);
    setJobError(null);
    setJobMessage(`Submitting ${jobType.toUpperCase()} job...`);

    try {
      const submitted = await submitJob(jobType, {
        region_id: 1,
        start_date: dateFrom,
        end_date: dateTo
      });

      setJobMessage(`${submitted.job_type.toUpperCase()} job submitted: ${submitted.job_id}`);

      for (let attempt = 0; attempt < 60; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const status = await getJobStatus(jobType, submitted.job_id);
        setJobMessage(`${status.job_type.toUpperCase()} job status: ${status.status}`);

        if (status.status === "completed") {
          await refreshStatsAndAlerts();
          setJobMessage(`${status.job_type.toUpperCase()} job completed and dashboard refreshed.`);
          setJobRunning(null);
          return;
        }

        if (status.status === "failed") {
          setJobError(status.error || `${status.job_type.toUpperCase()} job failed.`);
          setJobRunning(null);
          return;
        }
      }

      setJobError(`${jobType.toUpperCase()} job polling timed out.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setJobError(message);
    } finally {
      setJobRunning(null);
    }
  }

  async function clearCardData(target: "ndvi" | "ndwi" | "lst" | "alerts") {
    if (dateFrom > dateTo) {
      setRangeError("From date must be before or equal to To date.");
      return;
    }

    setClearingCard(target);

    try {
      if (target === "ndvi") {
        await clearNDVIStats(1, dateFrom, dateTo);
        await loadConsolidatedTrends();
      } else if (target === "ndwi") {
        await clearNDWIStats(1, dateFrom, dateTo);
        await loadConsolidatedTrends();
      } else if (target === "lst") {
        await clearLSTStats(1, dateFrom, dateTo);
        await loadConsolidatedTrends();
      } else {
        await clearAlerts(1, dateFrom, dateTo);
        await loadAlerts();
      }
    } catch {
      // Intentionally silent for experimental UI.
    } finally {
      setClearingCard(null);
    }
  }

  useEffect(() => {
    void loadMapData();
  }, [dateFrom, dateTo, mapMetric]);

  useEffect(() => {
    void loadConsolidatedTrends();
    void loadAlerts();
    void loadImpactMetrics();
    void loadAdvisory();
  }, [dateFrom, dateTo]);

  const mapMessage = useMemo(() => {
    if (loading) return "Loading regions...";
    if (error) return `Failed to load regions: ${error}`;
    if (!regions || regions.features.length === 0) return "No regions found.";
    return null;
  }, [loading, error, regions]);

  const latestTrend = trendData.length > 0 ? trendData[trendData.length - 1] : null;
  const latestNdwi = ndwiData.length > 0 ? ndwiData[ndwiData.length - 1] : null;
  const latestLst = lstData.length > 0 ? lstData[lstData.length - 1] : null;
  const boundarySource = regions?.features?.[0]?.properties?.source ?? "N/A";
  const boundaryCode = regions?.features?.[0]?.properties?.region_code ?? "N/A";

  const chartData = useMemo(() => {
    const end = new Date(dateTo);
    if (Number.isNaN(end.getTime())) return [];

    const start = new Date(end);
    start.setDate(start.getDate() - 90);

    return consolidatedTrendData
      .filter((item) => {
        const d = new Date(item.date_end);
        return d >= start && d <= end;
      })
      .map((item) => ({
        date: new Date(item.date_end).toLocaleDateString(),
        ndvi: item.mean_ndvi,
        ndwi: item.mean_ndwi,
        lst: item.mean_lst_c
      }));
  }, [consolidatedTrendData, dateTo]);

  function severityFillColor(severity?: string | null): string {
    if (severity === "critical") return "#ef4444";
    if (severity === "stressed") return "#f59e0b";
    if (severity === "healthy") return "#22c55e";
    return "#94a3b8";
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Satellite Crop Health Advisory</h1>
        <p>Live district-level crop region view</p>
      </header>

      <main className="main dashboardMain">
        <section className="trendCard controlBar">
          <div className="controlsGrid">
            <div className="controlBlock">
              <span className="label">Date Window</span>
              <div className="dateControls">
                <label>
                  From
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </label>
                <label>
                  To
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </label>
                <button type="button" onClick={() => void refreshStatsAndAlerts()} disabled={refreshingAll}>
                  {refreshingAll ? "Refreshing..." : "Refresh Window"}
                </button>
              </div>
            </div>

            <div className="controlBlock">
              <span className="label">Run Jobs</span>
              <div className="jobActions">
                <button
                  type="button"
                  onClick={() => void runJob("ndvi")}
                  disabled={jobRunning !== null || !!rangeError || refreshingAll}
                >
                  Run NDVI
                </button>
                <button
                  type="button"
                  onClick={() => void runJob("ndwi")}
                  disabled={jobRunning !== null || !!rangeError || refreshingAll}
                >
                  Run NDWI
                </button>
                <button
                  type="button"
                  onClick={() => void runJob("lst")}
                  disabled={jobRunning !== null || !!rangeError || refreshingAll}
                >
                  Run LST
                </button>
              </div>
            </div>

            <div className="controlBlock">
              <span className="label">Map Layer</span>
              <div className="layerButtons">
                <button
                  type="button"
                  className={mapMetric === "ndvi" ? "active" : ""}
                  onClick={() => setMapMetric("ndvi")}
                  disabled={refreshingAll}
                >
                  NDVI
                </button>
                <button
                  type="button"
                  className={mapMetric === "ndwi" ? "active" : ""}
                  onClick={() => setMapMetric("ndwi")}
                  disabled={refreshingAll}
                >
                  NDWI
                </button>
                <button
                  type="button"
                  className={mapMetric === "lst" ? "active" : ""}
                  onClick={() => setMapMetric("lst")}
                  disabled={refreshingAll}
                >
                  LST
                </button>
              </div>
            </div>
          </div>
          {rangeError && <p className="error">{rangeError}</p>}
          {jobMessage && <p className="muted">{jobMessage}</p>}
          {jobError && <p className="error">Job error: {jobError}</p>}
        </section>

        <section className="dashboardTop">
          <div className="trendCard mapPanel">
            <p className="boundaryMeta">
              Boundary Source: <strong>{boundarySource}</strong> | Code: <strong>{boundaryCode}</strong>
            </p>
            <div className="mapLegend">
              <span><i className="legendDot healthy" />Healthy</span>
              <span><i className="legendDot stressed" />Stressed</span>
              <span><i className="legendDot critical" />Critical</span>
              <span><i className="legendDot nodata" />No data</span>
            </div>
            {mapMessage ? (
              <div className="status">{mapMessage}</div>
            ) : (
              <MapContainer center={defaultCenter} zoom={10} className="map">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitToRegions regions={regions} />
                {regions && (
                  <GeoJSON
                    key={`${mapMetric}-${dateFrom}-${dateTo}-${regions.features[0]?.properties?.created_at ?? "na"}`}
                    data={regions as unknown as GeoJSON.GeoJsonObject}
                    style={(feature: any) => ({
                      color: "#0f172a",
                      weight: 2,
                      fillColor: severityFillColor(feature?.properties?.severity),
                      fillOpacity: 0.35
                    })}
                    onEachFeature={(feature: any, layer: any) => {
                      const p = feature?.properties || {};
                      const metric = String(p.metric || mapMetric).toUpperCase();
                      const value = p.value ?? "N/A";
                      const severity = p.severity ?? "N/A";
                      const imageCount = p.image_count ?? "N/A";
                      const updatedAt = p.created_at ? new Date(p.created_at).toLocaleString() : "N/A";
                      layer.bindPopup(`
                        <div style="min-width: 190px;">
                          <strong>${p.name ?? "Region"}</strong><br/>
                          Metric: ${metric}<br/>
                          Value: ${value}<br/>
                          Severity: ${severity}<br/>
                          Images: ${imageCount}<br/>
                          Updated: ${updatedAt}
                        </div>
                      `);
                    }}
                  />
                )}
              </MapContainer>
            )}
          </div>

          <aside className="trendCard insightsPanel">
            <h2>Quick Snapshot</h2>
            <div className="impactGrid compactGrid">
              <div className="impactItem"><span className="label">Latest NDVI</span><strong>{latestTrend?.mean_ndvi ?? "N/A"}</strong></div>
              <div className="impactItem"><span className="label">Latest NDWI</span><strong>{latestNdwi?.mean_ndwi ?? "N/A"}</strong></div>
              <div className="impactItem"><span className="label">Latest LST (C)</span><strong>{latestLst?.mean_lst_c ?? "N/A"}</strong></div>
              <div className="impactItem"><span className="label">Active Alerts</span><strong>{alerts.length}</strong></div>
            </div>

            <h3>Impact Metrics</h3>
            {impactLoading && <p className="muted">Loading impact metrics...</p>}
            {impactError && <p className="error">Failed to load impact metrics: {impactError}</p>}
            {!impactLoading && !impactError && impact && (
              <div className="impactGrid compactGrid">
                <div className="impactItem"><span className="label">Area Monitored</span><strong>{impact.region.area_km2.toFixed(2)} km2</strong></div>
                <div className="impactItem"><span className="label">Total Windows</span><strong>{impact.windows.total}</strong></div>
                <div className="impactItem"><span className="label">Critical Alerts</span><strong>{impact.alerts.critical}</strong></div>
              </div>
            )}

            <h3>Advisory</h3>
            {advisoryLoading && <p className="muted">Loading advisory...</p>}
            {advisoryError && <p className="error">Failed to load advisory: {advisoryError}</p>}
            {!advisoryLoading && !advisoryError && advisory && (
              <div className="advisoryBox">
                {advisory.advisory_messages.length === 0 ? (
                  <p className="muted">No advisory messages available for this window.</p>
                ) : (
                  <ul className="advisoryList">
                    {advisory.advisory_messages.slice(0, 3).map((message, index) => (
                      <li key={index}>{message}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </aside>
        </section>

        <section className="trendCard chartSection">
          <h2>90-Day Trend Chart</h2>
          {trendError && <p className="error">Failed to load chart data: {trendError}</p>}
          {!trendLoading && !trendError && chartData.length === 0 && (
            <p className="muted">No data available in the last 90 days of selected window.</p>
          )}
          {!trendLoading && !trendError && chartData.length > 0 && (
            <div className="chartWrap">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="idx" domain={[-1, 1]} />
                  <YAxis yAxisId="lst" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="idx" type="monotone" dataKey="ndvi" name="NDVI" stroke="#16a34a" dot={false} />
                  <Line yAxisId="idx" type="monotone" dataKey="ndwi" name="NDWI" stroke="#0284c7" dot={false} />
                  <Line yAxisId="lst" type="monotone" dataKey="lst" name="LST (C)" stroke="#dc2626" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="trendCard">
          <div className="detailsTabs">
            <button type="button" className={detailsTab === "combined" ? "active" : ""} onClick={() => setDetailsTab("combined")}>Combined</button>
            <button type="button" className={detailsTab === "ndvi" ? "active" : ""} onClick={() => setDetailsTab("ndvi")}>NDVI</button>
            <button type="button" className={detailsTab === "ndwi" ? "active" : ""} onClick={() => setDetailsTab("ndwi")}>NDWI</button>
            <button type="button" className={detailsTab === "lst" ? "active" : ""} onClick={() => setDetailsTab("lst")}>LST</button>
            <button type="button" className={detailsTab === "alerts" ? "active" : ""} onClick={() => setDetailsTab("alerts")}>Alerts</button>
          </div>

          {detailsTab === "combined" && (
            <>
              <h2>Combined Trends</h2>
              <p className="metaLine">{trendLoading ? "Refreshing..." : `Rows: ${consolidatedTrendData.length}`}</p>
              {trendError && <p className="error">Failed to load combined trends: {trendError}</p>}
              {!trendLoading && !trendError && (
                <div className="trendTableWrap">
                  <table className="trendTable">
                    <thead>
                      <tr>
                        <th>Date Start</th>
                        <th>Date End</th>
                        <th className="num">NDVI</th>
                        <th className="num">NDWI</th>
                        <th className="num">LST (C)</th>
                        <th>NDVI Sev</th>
                        <th>NDWI Sev</th>
                        <th>LST Sev</th>
                        <th className="nowrap">Updated At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consolidatedTrendData.map((item, index) => (
                        <tr key={`${item.date_start}-${item.created_at}-${index}`}>
                          <td>{new Date(item.date_start).toLocaleDateString()}</td>
                          <td>{new Date(item.date_end).toLocaleDateString()}</td>
                          <td className="num">{item.mean_ndvi ?? "N/A"}</td>
                          <td className="num">{item.mean_ndwi ?? "N/A"}</td>
                          <td className="num">{item.mean_lst_c ?? "N/A"}</td>
                          <td className={item.ndvi_severity ? `sev-${item.ndvi_severity}` : ""}>{item.ndvi_severity ?? "N/A"}</td>
                          <td className={item.ndwi_severity ? `sev-${item.ndwi_severity}` : ""}>{item.ndwi_severity ?? "N/A"}</td>
                          <td className={item.lst_severity ? `sev-${item.lst_severity}` : ""}>{item.lst_severity ?? "N/A"}</td>
                          <td className="nowrap">{new Date(item.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {detailsTab === "ndvi" && (
            <>
              <div className="cardHeader">
                <h2>NDVI Details</h2>
                <button
                  type="button"
                  className="clearBtn"
                  onClick={() => void clearCardData("ndvi")}
                  disabled={clearingCard !== null || jobRunning !== null}
                >
                  {clearingCard === "ndvi" ? "Clearing..." : "Clear"}
                </button>
              </div>
              <div className="trendSummary">
                <div><span className="label">Records</span><strong>{trendData.length}</strong></div>
                <div><span className="label">Latest NDVI</span><strong>{latestTrend?.mean_ndvi ?? "N/A"}</strong></div>
                <div><span className="label">Images Used</span><strong>{latestTrend?.ndvi_image_count ?? "N/A"}</strong></div>
              </div>
              <div className="trendTableWrap">
                <table className="trendTable">
                  <thead>
                    <tr><th>Date Start</th><th>Date End</th><th className="num">Mean NDVI</th><th className="num">Images</th></tr>
                  </thead>
                  <tbody>
                    {trendData.map((item, index) => (
                      <tr key={`${item.date_start}-${index}`}>
                        <td>{new Date(item.date_start).toLocaleDateString()}</td>
                        <td>{new Date(item.date_end).toLocaleDateString()}</td>
                        <td className="num">{item.mean_ndvi ?? "N/A"}</td>
                        <td className="num">{item.ndvi_image_count ?? "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {detailsTab === "ndwi" && (
            <>
              <div className="cardHeader">
                <h2>NDWI Details</h2>
                <button
                  type="button"
                  className="clearBtn"
                  onClick={() => void clearCardData("ndwi")}
                  disabled={clearingCard !== null || jobRunning !== null}
                >
                  {clearingCard === "ndwi" ? "Clearing..." : "Clear"}
                </button>
              </div>
              <div className="trendSummary">
                <div><span className="label">Records</span><strong>{ndwiData.length}</strong></div>
                <div><span className="label">Latest NDWI</span><strong>{latestNdwi?.mean_ndwi ?? "N/A"}</strong></div>
                <div><span className="label">Images Used</span><strong>{latestNdwi?.ndwi_image_count ?? latestNdwi?.source_image_count ?? "N/A"}</strong></div>
              </div>
              <div className="trendTableWrap">
                <table className="trendTable">
                  <thead>
                    <tr><th>Date Start</th><th>Date End</th><th className="num">Mean NDWI</th><th className="num">Images</th></tr>
                  </thead>
                  <tbody>
                    {ndwiData.map((item, index) => (
                      <tr key={`${item.date_start}-${index}`}>
                        <td>{new Date(item.date_start).toLocaleDateString()}</td>
                        <td>{new Date(item.date_end).toLocaleDateString()}</td>
                        <td className="num">{item.mean_ndwi ?? "N/A"}</td>
                        <td className="num">{item.ndwi_image_count ?? item.source_image_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {detailsTab === "lst" && (
            <>
              <div className="cardHeader">
                <h2>LST Details</h2>
                <button
                  type="button"
                  className="clearBtn"
                  onClick={() => void clearCardData("lst")}
                  disabled={clearingCard !== null || jobRunning !== null}
                >
                  {clearingCard === "lst" ? "Clearing..." : "Clear"}
                </button>
              </div>
              <div className="trendSummary">
                <div><span className="label">Records</span><strong>{lstData.length}</strong></div>
                <div><span className="label">Latest LST (C)</span><strong>{latestLst?.mean_lst_c ?? "N/A"}</strong></div>
                <div><span className="label">Images Used</span><strong>{latestLst?.lst_image_count ?? latestLst?.source_image_count ?? "N/A"}</strong></div>
              </div>
              <div className="trendTableWrap">
                <table className="trendTable">
                  <thead>
                    <tr><th>Date Start</th><th>Date End</th><th className="num">Mean LST (C)</th><th className="num">Images</th></tr>
                  </thead>
                  <tbody>
                    {lstData.map((item, index) => (
                      <tr key={`${item.date_start}-${index}`}>
                        <td>{new Date(item.date_start).toLocaleDateString()}</td>
                        <td>{new Date(item.date_end).toLocaleDateString()}</td>
                        <td className="num">{item.mean_lst_c ?? "N/A"}</td>
                        <td className="num">{item.lst_image_count ?? item.source_image_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {detailsTab === "alerts" && (
            <>
              <div className="cardHeader">
                <h2>Active Alerts</h2>
                <button
                  type="button"
                  className="clearBtn"
                  onClick={() => void clearCardData("alerts")}
                  disabled={clearingCard !== null || jobRunning !== null}
                >
                  {clearingCard === "alerts" ? "Clearing..." : "Clear"}
                </button>
              </div>
              <div className="trendSummary">
                <div><span className="label">Alert Count</span><strong>{alerts.length}</strong></div>
                <div><span className="label">Latest Metric</span><strong>{alerts[0]?.metric?.toUpperCase() ?? "N/A"}</strong></div>
                <div>
                  <span className="label">Latest Severity</span>
                  <strong className={alerts[0]?.severity ? `sev-${alerts[0].severity}` : ""}>{alerts[0]?.severity ?? "N/A"}</strong>
                </div>
              </div>
              <div className="trendTableWrap">
                <table className="trendTable">
                  <thead>
                    <tr><th>Metric</th><th>Severity</th><th>Date Start</th><th>Date End</th><th>Message</th></tr>
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
