import { useEffect, useState } from "react";
import {
  getAlerts,
  getImpactMetrics,
  getRegions,
  getTrends,
  type AlertItem,
  type ConsolidatedTrendItem,
  type ImpactMetricsResponse,
  type RegionFeatureCollection
} from "../../api";

const DEFAULT_FROM = "2025-01-01";
const DEFAULT_TO = "2025-12-31";

export default function DatabasePlaygroundPage() {
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [regions, setRegions] = useState<RegionFeatureCollection | null>(null);
  const [trends, setTrends] = useState<ConsolidatedTrendItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [impact, setImpact] = useState<ImpactMetricsResponse | null>(null);

  async function loadAll() {
    if (from > to) {
      setError("From date must be before or equal to To date.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [regionsRes, trendsRes, alertsRes, impactRes] = await Promise.all([
        getRegions(),
        getTrends(1, from, to),
        getAlerts(1, from, to),
        getImpactMetrics(1, from, to)
      ]);
      setRegions(regionsRes);
      setTrends(trendsRes.items);
      setAlerts(alertsRes.items);
      setImpact(impactRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load database view");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const latestWindows = trends.slice(-5).reverse();
  const latestAlerts = alerts.slice(0, 5);

  return (
    <div className="page">
      <h2>Database View</h2>
      <p>Quick visibility of core tables and latest records for UI/debug verification.</p>

      <div className="controlsRow">
        <label>
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="button" onClick={() => void loadAll()} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="summaryRow">
        <div>
          <span>regions</span>
          <strong>{regions?.features.length ?? 0}</strong>
        </div>
        <div>
          <span>index_stats</span>
          <strong>{trends.length}</strong>
        </div>
        <div>
          <span>alerts</span>
          <strong>{alerts.length}</strong>
        </div>
        <div>
          <span>area (km2)</span>
          <strong>{impact?.region.area_km2?.toFixed(2) ?? "N/A"}</strong>
        </div>
      </div>

      <div className="dashboardGrid">
        <section className="card">
          <h3>Table Summary</h3>
          <div className="tableWrap">
            <table className="simpleTable">
              <thead>
                <tr>
                  <th>Table</th>
                  <th>Rows (current window)</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>regions</td>
                  <td>{regions?.features.length ?? 0}</td>
                  <td>Region geometry and metadata</td>
                </tr>
                <tr>
                  <td>index_stats</td>
                  <td>{trends.length}</td>
                  <td>NDVI/NDWI/LST values, anomalies, severities</td>
                </tr>
                <tr>
                  <td>alerts</td>
                  <td>{alerts.length}</td>
                  <td>Rule-based stress alerts by metric</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h3>Latest Index Windows</h3>
          <div className="tableWrap">
            <table className="simpleTable">
              <thead>
                <tr>
                  <th>Window</th>
                  <th>NDVI</th>
                  <th>NDWI</th>
                  <th>LST</th>
                </tr>
              </thead>
              <tbody>
                {latestWindows.length === 0 ? (
                  <tr>
                    <td className="emptyCell" colSpan={4}>No index_stats rows for this window</td>
                  </tr>
                ) : (
                  latestWindows.map((row) => (
                    <tr key={`${row.date_start}-${row.date_end}`}>
                      <td>{new Date(row.date_start).toLocaleDateString()} - {new Date(row.date_end).toLocaleDateString()}</td>
                      <td>{row.ndvi_severity ?? "N/A"}</td>
                      <td>{row.ndwi_severity ?? "N/A"}</td>
                      <td>{row.lst_severity ?? "N/A"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="card">
        <h3>Latest Alerts</h3>
        <div className="tableWrap">
          <table className="simpleTable">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Severity</th>
                <th>Window</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {latestAlerts.length === 0 ? (
                <tr>
                  <td className="emptyCell" colSpan={4}>No alerts in this window</td>
                </tr>
              ) : (
                latestAlerts.map((row) => (
                  <tr key={row.id}>
                    <td>{row.metric.toUpperCase()}</td>
                    <td>{row.severity}</td>
                    <td>{new Date(row.date_start).toLocaleDateString()} - {new Date(row.date_end).toLocaleDateString()}</td>
                    <td>{row.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

