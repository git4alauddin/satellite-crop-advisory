import { useState } from "react";
import { getAdvisory, type AdvisoryResponse } from "../../api";

export default function AdvisoryPlaygroundPage() {
  const [from, setFrom] = useState("2025-01-01");
  const [to, setTo] = useState("2025-02-15");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdvisoryResponse | null>(null);

  async function loadAdvisory() {
    if (from > to) {
      setError("From date must be before or equal to To date.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await getAdvisory(1, from, to);
      setData(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load advisory");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h2>Advisory Playground</h2>
      <p>Load advisory response and review interpretation output for selected window.</p>

      <div className="controlsRow">
        <label>
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="button" onClick={() => void loadAdvisory()}>{loading ? "Loading..." : "Load Advisory"}</button>
      </div>

      {error && <p className="error">{error}</p>}

      {data && (
        <>
          <div className="summaryRow">
            <div><span>Region</span><strong>{data.region.name}</strong></div>
            <div><span>Alerts</span><strong>{data.alerts.total}</strong></div>
            <div><span>Critical</span><strong>{data.alerts.critical}</strong></div>
            <div><span>Stressed</span><strong>{data.alerts.stressed}</strong></div>
          </div>

          <div className="tableWrap">
            <table className="simpleTable">
              <thead>
                <tr>
                  <th>Latest Observation Field</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Date Start</td><td>{data.latest_observation?.date_start ?? "N/A"}</td></tr>
                <tr><td>Date End</td><td>{data.latest_observation?.date_end ?? "N/A"}</td></tr>
                <tr><td>Mean NDVI / NDWI / LST</td><td>{data.latest_observation?.mean_ndvi ?? "N/A"} / {data.latest_observation?.mean_ndwi ?? "N/A"} / {data.latest_observation?.mean_lst_c ?? "N/A"}</td></tr>
                <tr><td>Severity NDVI / NDWI / LST</td><td>{data.latest_observation?.ndvi_severity ?? "N/A"} / {data.latest_observation?.ndwi_severity ?? "N/A"} / {data.latest_observation?.lst_severity ?? "N/A"}</td></tr>
                <tr><td>Latest Alert At</td><td>{data.alerts.latest_alert_at ?? "N/A"}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="listBlock">
            <h3>Advisory Messages</h3>
            {data.advisory_messages.length === 0 ? (
              <p className="meta">No advisory messages returned for this window.</p>
            ) : (
              <ul>
                {data.advisory_messages.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
