import { useState } from "react";
import { getImpactMetrics, type ImpactMetricsResponse } from "../../api";

export default function ImpactPlaygroundPage() {
  const [from, setFrom] = useState("2025-01-01");
  const [to, setTo] = useState("2025-02-15");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ImpactMetricsResponse | null>(null);

  async function loadImpact() {
    if (from > to) {
      setError("From date must be before or equal to To date.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await getImpactMetrics(1, from, to);
      setData(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load impact metrics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h2>Impact Playground</h2>
      <p>Load impact metrics and validate region coverage/stress/alerts summaries.</p>

      <div className="controlsRow">
        <label>
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="button" onClick={() => void loadImpact()}>{loading ? "Loading..." : "Load Impact"}</button>
      </div>

      {error && <p className="error">{error}</p>}
      {!loading && !error && !data && (
        <p className="meta">No impact payload loaded yet. Click "Load Impact".</p>
      )}

      {data && (
        <>
          <div className="summaryRow">
            <div><span>Area (km2)</span><strong>{data.region.area_km2.toFixed(2)}</strong></div>
            <div><span>Total Windows</span><strong>{data.windows.total}</strong></div>
            <div><span>Total Alerts</span><strong>{data.alerts.total}</strong></div>
            <div><span>Critical Alerts</span><strong>{data.alerts.critical}</strong></div>
          </div>

          <div className="tableWrap">
            <table className="simpleTable">
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Region</td><td>{data.region.name} (ID: {data.region.id})</td></tr>
                <tr><td>Requested Window</td><td>{data.from} to {data.to}</td></tr>
                <tr><td>Observed Coverage</td><td>{data.temporal_coverage.first_observation_date ?? "N/A"} to {data.temporal_coverage.last_observation_date ?? "N/A"}</td></tr>
                <tr><td>NDVI/NDWI/LST Windows</td><td>{data.windows.ndvi} / {data.windows.ndwi} / {data.windows.lst}</td></tr>
                <tr><td>NDVI Stress (stressed/critical)</td><td>{data.stress_summary.ndvi.stressed} / {data.stress_summary.ndvi.critical}</td></tr>
                <tr><td>NDWI Stress (stressed/critical)</td><td>{data.stress_summary.ndwi.stressed} / {data.stress_summary.ndwi.critical}</td></tr>
                <tr><td>LST Stress (stressed/critical)</td><td>{data.stress_summary.lst.stressed} / {data.stress_summary.lst.critical}</td></tr>
                <tr><td>Latest Alert At</td><td>{data.alerts.latest_alert_at ?? "N/A"}</td></tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
