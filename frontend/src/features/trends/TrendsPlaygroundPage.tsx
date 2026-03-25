import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  getTrends,
  type ConsolidatedTrendItem
} from "../../api";

export default function TrendsPlaygroundPage() {
  const [from, setFrom] = useState("2025-01-01");
  const [to, setTo] = useState("2025-02-15");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ConsolidatedTrendItem[]>([]);

  async function loadTrends() {
    if (from > to) {
      setError("From date must be before or equal to To date.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const data = await getTrends(1, from, to);
      setRows(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load trends");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const latest = rows.length > 0 ? rows[rows.length - 1] : null;
  const chartData = useMemo(
    () =>
      rows
        .filter((item) => item.mean_ndvi !== null)
        .map((item) => ({
          date: new Date(item.date_end).toLocaleDateString(),
          ndvi: item.mean_ndvi
        })),
    [rows]
  );

  return (
    <div className="page">
      <h2>Trends Playground</h2>
      <p>Fetch and inspect consolidated trend windows.</p>

      <div className="controlsRow">
        <label>
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="button" onClick={() => void loadTrends()}>{loading ? "Loading..." : "Load Trends"}</button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="summaryRow">
        <div><span>Rows</span><strong>{rows.length}</strong></div>
        <div><span>Latest NDVI</span><strong>{latest?.mean_ndvi ?? "N/A"}</strong></div>
        <div><span>Latest NDWI</span><strong>{latest?.mean_ndwi ?? "N/A"}</strong></div>
        <div><span>Latest LST</span><strong>{latest?.mean_lst_c ?? "N/A"}</strong></div>
      </div>

      {chartData.length > 0 && (
        <div className="chartSimple">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[-1, 1]} />
              <Tooltip />
              <Line type="monotone" dataKey="ndvi" stroke="#22c55e" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="tableWrap">
        <table className="simpleTable">
          <thead>
            <tr>
              <th>Date Start</th>
              <th>Date End</th>
              <th>NDVI</th>
              <th>NDWI</th>
              <th>LST</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, index) => (
              <tr key={`${item.date_start}-${item.created_at}-${index}`}>
                <td>{new Date(item.date_start).toLocaleDateString()}</td>
                <td>{new Date(item.date_end).toLocaleDateString()}</td>
                <td>{item.mean_ndvi ?? "N/A"}</td>
                <td>{item.mean_ndwi ?? "N/A"}</td>
                <td>{item.mean_lst_c ?? "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
