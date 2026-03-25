import { useState } from "react";
import {
  clearAlerts,
  getAlerts,
  type AlertItem
} from "../../api";

export default function AlertsPlaygroundPage() {
  const [from, setFrom] = useState("2025-01-01");
  const [to, setTo] = useState("2025-02-15");
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [items, setItems] = useState<AlertItem[]>([]);

  async function loadAlerts() {
    if (from > to) {
      setError("From date must be before or equal to To date.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const data = await getAlerts(1, from, to);
      setItems(data.items);
      setMessage(`Loaded ${data.items.length} alert(s).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load alerts");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function clearAlertRows() {
    if (from > to) {
      setError("From date must be before or equal to To date.");
      return;
    }
    setClearing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await clearAlerts(1, from, to);
      setMessage(`Cleared ${result.deleted} alert row(s).`);
      const refreshed = await getAlerts(1, from, to);
      setItems(refreshed.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clear alerts");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="page">
      <h2>Alerts Playground</h2>
      <p>Load and clear alerts for the selected window (functional first).</p>

      <div className="controlsRow">
        <label>
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="button" onClick={() => void loadAlerts()} disabled={loading || clearing}>
          {loading ? "Loading..." : "Load Alerts"}
        </button>
        <button type="button" onClick={() => void clearAlertRows()} disabled={loading || clearing}>
          {clearing ? "Clearing..." : "Clear Alerts"}
        </button>
      </div>

      {message && <p className="meta">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="summaryRow">
        <div><span>Alert Count</span><strong>{items.length}</strong></div>
        <div><span>Critical</span><strong>{items.filter((a) => a.severity === "critical").length}</strong></div>
        <div><span>Stressed</span><strong>{items.filter((a) => a.severity === "stressed").length}</strong></div>
        <div><span>Latest Metric</span><strong>{items[0]?.metric?.toUpperCase() ?? "N/A"}</strong></div>
      </div>

      <div className="tableWrap">
        <table className="simpleTable">
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
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="emptyCell">
                  {loading
                    ? "Loading alerts..."
                    : error
                      ? "Unable to load alerts. Check API/processor services."
                      : "No alerts found for this date window."}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>{item.metric.toUpperCase()}</td>
                  <td>{item.severity}</td>
                  <td>{new Date(item.date_start).toLocaleDateString()}</td>
                  <td>{new Date(item.date_end).toLocaleDateString()}</td>
                  <td>{item.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
