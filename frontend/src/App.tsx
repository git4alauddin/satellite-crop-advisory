import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
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

const defaultCenter: LatLngExpression = [28.61, 77.16];
const DEFAULT_RANGE_FROM = "2025-01-01";
const DEFAULT_RANGE_TO = "2025-02-15";

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

      <main className="main">
        {mapMessage ? (
          <div className="status">{mapMessage}</div>
        ) : (
          <>
            <div className="mapControls">
              <span className="label">Map Layer</span>
              <div className="layerButtons">
                <button
                  type="button"
                  className={mapMetric === "ndvi" ? "active" : ""}
                  onClick={() => setMapMetric("ndvi")}
                >
                  NDVI
                </button>
                <button
                  type="button"
                  className={mapMetric === "ndwi" ? "active" : ""}
                  onClick={() => setMapMetric("ndwi")}
                >
                  NDWI
                </button>
                <button
                  type="button"
                  className={mapMetric === "lst" ? "active" : ""}
                  onClick={() => setMapMetric("lst")}
                >
                  LST
                </button>
              </div>
            </div>
            <MapContainer center={defaultCenter} zoom={10} className="map">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
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
                />
              )}
            </MapContainer>
          </>
        )}

        <section className="trendCard">
          <h2>Impact Metrics (Region 1)</h2>
          <p className="metaLine">
            {impactLoading
              ? "Refreshing..."
              : `Data updated at: ${impact?.alerts.latest_alert_at ? new Date(impact.alerts.latest_alert_at).toLocaleString() : "N/A"}`}
          </p>
          {impactError && <p className="error">Failed to load impact metrics: {impactError}</p>}
          {!impactLoading && !impactError && impact && (
            <div className="impactGrid">
              <div className="impactItem">
                <span className="label">Area Monitored</span>
                <strong>{impact.region.area_km2.toFixed(2)} km2</strong>
              </div>
              <div className="impactItem">
                <span className="label">Total Windows</span>
                <strong>{impact.windows.total}</strong>
              </div>
              <div className="impactItem">
                <span className="label">NDVI/NDWI/LST Windows</span>
                <strong>{impact.windows.ndvi}/{impact.windows.ndwi}/{impact.windows.lst}</strong>
              </div>
              <div className="impactItem">
                <span className="label">Alerts (Total)</span>
                <strong>{impact.alerts.total}</strong>
              </div>
              <div className="impactItem">
                <span className="label">Critical Alerts</span>
                <strong>{impact.alerts.critical}</strong>
              </div>
              <div className="impactItem">
                <span className="label">Stressed Alerts</span>
                <strong>{impact.alerts.stressed}</strong>
              </div>
            </div>
          )}
        </section>

        <section className="trendCard">
          <h2>Advisory (Region 1)</h2>
          <p className="metaLine">
            {advisoryLoading
              ? "Refreshing..."
              : `Data updated at: ${advisory?.latest_observation?.created_at ? new Date(advisory.latest_observation.created_at).toLocaleString() : "N/A"}`}
          </p>
          {advisoryError && <p className="error">Failed to load advisory: {advisoryError}</p>}
          {!advisoryLoading && !advisoryError && advisory && (
            <div className="advisoryBox">
              {advisory.advisory_messages.length === 0 ? (
                <p className="muted">No advisory messages available for this window.</p>
              ) : (
                <ul className="advisoryList">
                  {advisory.advisory_messages.map((message, index) => (
                    <li key={index}>{message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <section className="trendCard">
          <h2>Combined Trends (NDVI + NDWI + LST)</h2>
          <p className="metaLine">
            {trendLoading
              ? "Refreshing..."
              : `Rows: ${consolidatedTrendData.length}`}
          </p>
          {trendError && <p className="error">Failed to load combined trends: {trendError}</p>}

          {!trendLoading && !trendError && (
            <div className="trendTableWrap">
              <table className="trendTable">
                <thead>
                  <tr>
                    <th>Date Start</th>
                    <th>Date End</th>
                    <th>NDVI</th>
                    <th>NDWI</th>
                    <th>LST (C)</th>
                    <th>NDVI Sev</th>
                    <th>NDWI Sev</th>
                    <th>LST Sev</th>
                    <th>Updated At</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidatedTrendData.map((item, index) => (
                    <tr key={`${item.date_start}-${item.created_at}-${index}`}>
                      <td>{new Date(item.date_start).toLocaleDateString()}</td>
                      <td>{new Date(item.date_end).toLocaleDateString()}</td>
                      <td>{item.mean_ndvi ?? "N/A"}</td>
                      <td>{item.mean_ndwi ?? "N/A"}</td>
                      <td>{item.mean_lst_c ?? "N/A"}</td>
                      <td className={item.ndvi_severity ? `sev-${item.ndvi_severity}` : ""}>{item.ndvi_severity ?? "N/A"}</td>
                      <td className={item.ndwi_severity ? `sev-${item.ndwi_severity}` : ""}>{item.ndwi_severity ?? "N/A"}</td>
                      <td className={item.lst_severity ? `sev-${item.lst_severity}` : ""}>{item.lst_severity ?? "N/A"}</td>
                      <td>{new Date(item.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="trendCard">
          <h2>Date Window</h2>
          <div className="dateControls">
            <label>
              From
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </label>
            <button type="button" onClick={() => void refreshStatsAndAlerts()}>
              Refresh Window
            </button>
          </div>
          {rangeError && <p className="error">{rangeError}</p>}
        </section>

        <section className="trendCard">
          <h2>Run Index Jobs (Region 1)</h2>
          <div className="jobActions">
            <button
              type="button"
              onClick={() => void runJob("ndvi")}
              disabled={jobRunning !== null || !!rangeError}
            >
              Run NDVI
            </button>
            <button
              type="button"
              onClick={() => void runJob("ndwi")}
              disabled={jobRunning !== null || !!rangeError}
            >
              Run NDWI
            </button>
            <button
              type="button"
              onClick={() => void runJob("lst")}
              disabled={jobRunning !== null || !!rangeError}
            >
              Run LST
            </button>
          </div>
          {jobMessage && <p className="muted">{jobMessage}</p>}
          {jobError && <p className="error">Job error: {jobError}</p>}
        </section>

        <section className="trendCard">
          <div className="cardHeader">
            <h2>NDVI Trend (Region 1)</h2>
            <button
              type="button"
              className="clearBtn"
              onClick={() => void clearCardData("ndvi")}
              disabled={clearingCard !== null || jobRunning !== null}
            >
              {clearingCard === "ndvi" ? "Clearing..." : "Clear"}
            </button>
          </div>
          <p className="metaLine">
            {trendLoading
              ? "Refreshing..."
              : `Data updated at: ${latestTrend?.created_at ? new Date(latestTrend.created_at).toLocaleString() : "N/A"}`}
          </p>

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
                  <strong>{latestTrend?.ndvi_image_count ?? "N/A"}</strong>
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
                        <td>{item.ndvi_image_count ?? "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="trendCard">
          <div className="cardHeader">
            <h2>NDWI Stats (Region 1)</h2>
            <button
              type="button"
              className="clearBtn"
              onClick={() => void clearCardData("ndwi")}
              disabled={clearingCard !== null || jobRunning !== null}
            >
              {clearingCard === "ndwi" ? "Clearing..." : "Clear"}
            </button>
          </div>
          <p className="metaLine">
            {ndwiLoading
              ? "Refreshing..."
              : `Data updated at: ${latestNdwi?.created_at ? new Date(latestNdwi.created_at).toLocaleString() : "N/A"}`}
          </p>

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
          <div className="cardHeader">
            <h2>LST Stats (Region 1)</h2>
            <button
              type="button"
              className="clearBtn"
              onClick={() => void clearCardData("lst")}
              disabled={clearingCard !== null || jobRunning !== null}
            >
              {clearingCard === "lst" ? "Clearing..." : "Clear"}
            </button>
          </div>
          <p className="metaLine">
            {lstLoading
              ? "Refreshing..."
              : `Data updated at: ${latestLst?.created_at ? new Date(latestLst.created_at).toLocaleString() : "N/A"}`}
          </p>

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
          <div className="cardHeader">
            <h2>Active Alerts (Region 1)</h2>
            <button
              type="button"
              className="clearBtn"
              onClick={() => void clearCardData("alerts")}
              disabled={clearingCard !== null || jobRunning !== null}
            >
              {clearingCard === "alerts" ? "Clearing..." : "Clear"}
            </button>
          </div>
          <p className="metaLine">
            {alertsLoading
              ? "Refreshing..."
              : `Data updated at: ${alerts[0]?.created_at ? new Date(alerts[0].created_at).toLocaleString() : "N/A"}`}
          </p>

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
