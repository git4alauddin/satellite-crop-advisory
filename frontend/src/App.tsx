import { useEffect, useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import {
  getHealthMap,
  type MapMetric,
  type RegionFeatureCollection
} from "./api";

const defaultCenter: LatLngExpression = [30.9, 75.85];
const DEFAULT_FROM = "2025-01-01";
const DEFAULT_TO = "2025-02-15";

type RouteKey =
  | "/"
  | "/playground/map"
  | "/playground/jobs"
  | "/playground/trends"
  | "/playground/alerts"
  | "/playground/impact"
  | "/playground/advisory"
  | "/dashboard";

const ROUTES: { path: RouteKey; label: string; description: string }[] = [
  { path: "/playground/map", label: "Map", description: "Boundary + metric coloring + source label" },
  { path: "/playground/jobs", label: "Jobs", description: "Run NDVI/NDWI/LST jobs and poll status" },
  { path: "/playground/trends", label: "Trends", description: "NDVI/NDWI/LST trend tables and chart" },
  { path: "/playground/alerts", label: "Alerts", description: "Alert list, severity view, clear workflow" },
  { path: "/playground/impact", label: "Impact", description: "Impact metrics cards and coverage summary" },
  { path: "/playground/advisory", label: "Advisory", description: "Human-readable advisory text module" },
  { path: "/dashboard", label: "Final Dashboard Draft", description: "Integrate all components in one layout" }
];

function navigate(path: RouteKey) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

function getRouteFromPath(pathname: string): RouteKey {
  const allowed = new Set<RouteKey>(ROUTES.map((r) => r.path).concat("/" as RouteKey));
  if (allowed.has(pathname as RouteKey)) return pathname as RouteKey;
  return "/";
}

function HubPage() {
  return (
    <div className="page">
      <h2>Frontend Component Hub</h2>
      <p>Start each module independently, verify, then compose into final dashboard.</p>
      <div className="hubGrid">
        {ROUTES.map((route) => (
          <button key={route.path} type="button" className="hubCard" onClick={() => navigate(route.path)}>
            <strong>{route.label}</strong>
            <span>{route.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MapPlaygroundPage() {
  const [metric, setMetric] = useState<MapMetric>("ndvi");
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [regions, setRegions] = useState<RegionFeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const boundarySource = regions?.features?.[0]?.properties?.source ?? "N/A";
  const boundaryCode = regions?.features?.[0]?.properties?.region_code ?? "N/A";

  async function loadMap() {
    if (from > to) {
      setError("From date must be before or equal to To date.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await getHealthMap(1, from, to, metric);
      setRegions(response.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load map data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMap();
  }, []);

  function fillColor(severity?: string | null) {
    if (severity === "critical") return "#ef4444";
    if (severity === "stressed") return "#f59e0b";
    if (severity === "healthy") return "#22c55e";
    return "#94a3b8";
  }

  return (
    <div className="page">
      <h2>Map Playground</h2>
      <p>Test actual boundary rendering, metric switch, and source visibility.</p>

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
        <button type="button" onClick={() => void loadMap()}>{loading ? "Loading..." : "Load Map"}</button>
      </div>

      <p className="meta">Boundary Source: <strong>{boundarySource}</strong> | Code: <strong>{boundaryCode}</strong></p>
      {error && <p className="error">{error}</p>}

      <div className="mapWrap">
        <MapContainer center={defaultCenter} zoom={10} className="map">
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
    </div>
  );
}

function PlaceholderPage({ title, summary }: { title: string; summary: string }) {
  return (
    <div className="page">
      <h2>{title}</h2>
      <p>{summary}</p>
      <div className="placeholderBox">
        <p>This component is intentionally reset and ready for fresh implementation.</p>
      </div>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState<RouteKey>(() => getRouteFromPath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setRoute(getRouteFromPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>KrishiDrishti Frontend Rebuild</h1>
        <button type="button" onClick={() => navigate("/")}>Component Hub</button>
      </header>

      {route === "/" && <HubPage />}
      {route === "/playground/map" && <MapPlaygroundPage />}
      {route === "/playground/jobs" && (
        <PlaceholderPage title="Jobs Playground" summary="Build and verify NDVI/NDWI/LST run-flow in isolation." />
      )}
      {route === "/playground/trends" && (
        <PlaceholderPage title="Trends Playground" summary="Build trend chart/table in isolation with focused API calls." />
      )}
      {route === "/playground/alerts" && (
        <PlaceholderPage title="Alerts Playground" summary="Build alert list and clear behavior with severity context." />
      )}
      {route === "/playground/impact" && (
        <PlaceholderPage title="Impact Playground" summary="Build impact cards and temporal coverage module." />
      )}
      {route === "/playground/advisory" && (
        <PlaceholderPage title="Advisory Playground" summary="Build advisory panel and interpretation blocks." />
      )}
      {route === "/dashboard" && (
        <PlaceholderPage title="Final Dashboard Draft" summary="Compose finished components into final UX layout." />
      )}
    </div>
  );
}
