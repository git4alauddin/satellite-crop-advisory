import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import { useMap } from "react-leaflet";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { LatLngExpression } from "leaflet";
import {
  getAdvisory,
  getAlerts,
  getHealthMap,
  getImpactMetrics,
  getTrends,
  type AdvisoryResponse,
  type AlertItem,
  type ConsolidatedTrendItem,
  type ImpactMetricsResponse,
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
  const [from, setFrom] = useState("2025-02-15");
  const [to, setTo] = useState("2025-05-16");
  const [metric, setMetric] = useState<MapMetric>("ndvi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [regions, setRegions] = useState<RegionFeatureCollection | null>(null);
  const [trends, setTrends] = useState<ConsolidatedTrendItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [impact, setImpact] = useState<ImpactMetricsResponse | null>(null);
  const [advisory, setAdvisory] = useState<AdvisoryResponse | null>(null);
  const requestSeqRef = useRef(0);

  async function loadAll(metricOverride?: MapMetric) {
    const requestId = ++requestSeqRef.current;
    const effectiveMetric = metricOverride ?? metric;
    if (from > to) {
      setError("From date must be before or equal to To date.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [mapRes, trendRes, alertRes, impactRes, advisoryRes] = await Promise.all([
        getHealthMap(1, from, to, effectiveMetric),
        getTrends(1, from, to),
        getAlerts(1, from, to),
        getImpactMetrics(1, from, to),
        getAdvisory(1, from, to)
      ]);

      if (requestId !== requestSeqRef.current) return;

      setRegions(mapRes.data);
      setTrends(trendRes.items);
      setAlerts(alertRes.items);
      setImpact(impactRes);
      setAdvisory(advisoryRes);
    } catch (e) {
      if (requestId !== requestSeqRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to load dashboard data");
    } finally {
      if (requestId !== requestSeqRef.current) return;
      setLoading(false);
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

  function statusTone(status?: string | null) {
    if (status === "critical") return "critical";
    if (status === "stressed") return "stressed";
    if (status === "healthy") return "healthy";
    if (status === "none") return "none";
    return "neutral";
  }

  function advisoryTone(message: string): "critical" | "stressed" | "healthy" | "neutral" {
    const msg = message.toLowerCase();
    if (
      msg.includes("critical")
      || msg.includes("urgently")
      || msg.includes("prioritize")
      || msg.includes("immediate")
      || msg.includes("heat stress")
    ) {
      return "critical";
    }
    if (
      msg.includes("stressed")
      || msg.includes("monitor")
      || msg.includes("elevated")
      || msg.includes("below")
      || msg.includes("review")
    ) {
      return "stressed";
    }
    if (
      msg.includes("healthy")
      || msg.includes("no critical stress")
      || msg.includes("regular monitoring")
      || msg.includes("no alerts")
    ) {
      return "healthy";
    }
    return "neutral";
  }

  const latest = trends.length > 0 ? trends[trends.length - 1] : null;
  const latestSeverity = latest
    ? [latest.ndvi_severity, latest.ndwi_severity, latest.lst_severity].includes("critical")
      ? "critical"
      : [latest.ndvi_severity, latest.ndwi_severity, latest.lst_severity].includes("stressed")
        ? "stressed"
        : "healthy"
    : "unknown";
  const topAlertSeverity = alerts.some((a) => a.severity === "critical")
    ? "critical"
    : alerts.some((a) => a.severity === "stressed")
      ? "stressed"
      : "none";
  const lastUpdate = latest?.created_at ?? impact?.alerts.latest_alert_at ?? null;
  const totalImagesUsed = trends.reduce((acc, item) => {
    return (
      acc
      + (item.ndvi_image_count ?? 0)
      + (item.ndwi_image_count ?? 0)
      + (item.lst_image_count ?? 0)
    );
  }, 0);
  const trendChartData = trends
    .map((item) => {
      const value = metric === "ndvi" ? item.mean_ndvi : metric === "ndwi" ? item.mean_ndwi : item.mean_lst_c;
      return {
        date: new Date(item.date_end).toLocaleDateString(),
        value
      };
    })
    .filter((item) => item.value !== null);
  const trendColor = metric === "ndvi" ? "#22c55e" : metric === "ndwi" ? "#0ea5e9" : "#f97316";
  const currentMetricValue =
    metric === "ndvi" ? latest?.mean_ndvi : metric === "ndwi" ? latest?.mean_ndwi : latest?.mean_lst_c;
  const mapFeature = regions?.features?.[0]?.properties;
  const mapLayerKey = [
    metric,
    from,
    to,
    mapFeature?.metric ?? "none",
    mapFeature?.date_start ?? "none",
    mapFeature?.date_end ?? "none",
    mapFeature?.created_at ?? "none",
    mapFeature?.severity ?? "none"
  ].join("|");

  return (
    <div className="page">
      {error && <p className="error">{error}</p>}

      <div className="dashboardTop">
        <div className="topStatusGrid">
          <section className="card miniIndexCard">
            <h3>NDVI Status</h3>
            <p className="meta">
              <span className={`statusChip ${statusTone(latest?.ndvi_severity)}`}>{latest?.ndvi_severity ?? "N/A"}</span>
            </p>
            <p className="meta">Value: <strong>{latest?.mean_ndvi ?? "N/A"}</strong></p>
          </section>
          <section className="card miniIndexCard">
            <h3>NDWI Status</h3>
            <p className="meta">
              <span className={`statusChip ${statusTone(latest?.ndwi_severity)}`}>{latest?.ndwi_severity ?? "N/A"}</span>
            </p>
            <p className="meta">Value: <strong>{latest?.mean_ndwi ?? "N/A"}</strong></p>
          </section>
          <section className="card miniIndexCard">
            <h3>LST Status</h3>
            <p className="meta">
              <span className={`statusChip ${statusTone(latest?.lst_severity)}`}>{latest?.lst_severity ?? "N/A"}</span>
            </p>
            <p className="meta">Value: <strong>{latest?.mean_lst_c ?? "N/A"}</strong></p>
          </section>

          <section className="card miniIndexCard">
            <h3>Overall Health</h3>
            <p className="meta">
              <span className={`statusChip ${statusTone(latestSeverity)}`}>{latestSeverity.toUpperCase()}</span>
            </p>
          </section>
          <section className="card miniIndexCard">
            <h3>Active Alerts</h3>
            <p className="meta">
              <strong>{alerts.length}</strong>{" "}
              <span className={`statusChip ${statusTone(topAlertSeverity)}`}>{topAlertSeverity}</span>
            </p>
          </section>
          <section className="card miniIndexCard">
            <h3>Last Update</h3>
            <p className="meta">
              <span className="statusChip neutral">{lastUpdate ? "updated" : "N/A"}</span>
            </p>
            <p className="meta"><strong>{lastUpdate ? new Date(lastUpdate).toLocaleString() : "N/A"}</strong></p>
          </section>
        </div>

        <section className="card topAdvisoryCard">
          <h3>What To Do Now</h3>
          <div className="listBlock">
            {advisory?.advisory_messages?.length ? (
              <ul>
                {advisory.advisory_messages.slice(0, 3).map((msg, idx) => (
                  <li key={idx}>
                    <span className={`bulletDot ${advisoryTone(msg)}`} aria-hidden="true" />
                    <span className="advisoryText">{msg}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="meta">No advisory messages loaded.</p>
            )}
          </div>
          <p className="meta">Window: <strong>{from}</strong> to <strong>{to}</strong></p>
        </section>
      </div>

      <div className="dashboardMain">
        <section className="card mapCard">
          <h3>Map</h3>
          <div className="buttonGroup">
            <button
              type="button"
              className={metric === "ndvi" ? "active" : ""}
              onClick={() => {
                const next: MapMetric = "ndvi";
                setMetric(next);
                void loadAll(next);
              }}
            >
              NDVI
            </button>
            <button
              type="button"
              className={metric === "ndwi" ? "active" : ""}
              onClick={() => {
                const next: MapMetric = "ndwi";
                setMetric(next);
                void loadAll(next);
              }}
            >
              NDWI
            </button>
            <button
              type="button"
              className={metric === "lst" ? "active" : ""}
              onClick={() => {
                const next: MapMetric = "lst";
                setMetric(next);
                void loadAll(next);
              }}
            >
              LST
            </button>
          </div>
          <div className="mapWrap">
            <MapContainer center={defaultCenter} zoom={10} className="map">
              <FitToRegions data={regions} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {regions && (
                <GeoJSON
                  key={mapLayerKey}
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
          <div className="mapLegend">
            <span><i style={{ background: "#22c55e" }} /> Healthy</span>
            <span><i style={{ background: "#f59e0b" }} /> Stressed</span>
            <span><i style={{ background: "#ef4444" }} /> Critical</span>
          </div>
        </section>

        <section className="card">
          <h3>Trend ({metric.toUpperCase()}: {currentMetricValue ?? "N/A"})</h3>
          <div className="chartSimple">
            {loading ? (
              <p className="meta">Loading trend...</p>
            ) : trendChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={trendColor}
                    dot={false}
                    isAnimationActive
                    animationDuration={700}
                    animationEasing="ease-in-out"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="meta">No trend data available for selected window.</p>
            )}
          </div>
          <h3>Data Confidence</h3>
          <div className="summaryRow">
            <div><span>Area (km2)</span><strong>{impact?.region.area_km2?.toFixed(2) ?? "N/A"}</strong></div>
            <div><span>Total Windows</span><strong>{impact?.windows.total ?? 0}</strong></div>
            <div><span>Images Used</span><strong>{totalImagesUsed}</strong></div>
            <div><span>Coverage End</span><strong>{impact?.temporal_coverage.last_observation_date ? new Date(impact.temporal_coverage.last_observation_date).toLocaleDateString() : "N/A"}</strong></div>
          </div>
          <h3>Trend Snapshot</h3>
          <div className="summaryRow">
            <div><span>Rows</span><strong>{trends.length}</strong></div>
            <div><span>Latest NDVI</span><strong>{latest?.mean_ndvi ?? "N/A"}</strong></div>
            <div><span>Latest NDWI</span><strong>{latest?.mean_ndwi ?? "N/A"}</strong></div>
            <div><span>Latest LST</span><strong>{latest?.mean_lst_c ?? "N/A"}</strong></div>
          </div>
        </section>
      </div>
    </div>
  );
}
