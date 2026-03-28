import { useEffect, useState } from "react";
import HubPage from "./features/hub/HubPage";
import MapPlaygroundPage from "./features/map/MapPlaygroundPage";
import JobsPlaygroundPage from "./features/jobs/JobsPlaygroundPage";
import TrendsPlaygroundPage from "./features/trends/TrendsPlaygroundPage";
import AlertsPlaygroundPage from "./features/alerts/AlertsPlaygroundPage";
import ImpactPlaygroundPage from "./features/impact/ImpactPlaygroundPage";
import AdvisoryPlaygroundPage from "./features/advisory/AdvisoryPlaygroundPage";
import DatabasePlaygroundPage from "./features/database/DatabasePlaygroundPage";
import DashboardDraftPage from "./features/dashboard/DashboardDraftPage";
import { getRouteFromPath, navigate, type RouteKey } from "./lib/navigation";

const NAV_ITEMS: { path: RouteKey; label: string }[] = [
  { path: "/", label: "Hub" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/playground/database", label: "Database" }
];

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
        <div className="headerBrand">
          <h1>KrishiDrishti</h1>
          <span className="headerState">
            <i />
            Demo Data
          </span>
        </div>

        <nav className="headerNav" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              type="button"
              className={`navPill ${route === item.path ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="headerContext">
          {route === "/dashboard" ? "Window: 2025-02-15 -> 2025-05-16" : "Playground Mode"}
        </div>
      </header>

      {route === "/" && <HubPage />}
      {route === "/playground/map" && <MapPlaygroundPage />}
      {route === "/playground/jobs" && <JobsPlaygroundPage />}
      {route === "/playground/trends" && <TrendsPlaygroundPage />}
      {route === "/playground/database" && <DatabasePlaygroundPage />}
      {route === "/playground/alerts" && <AlertsPlaygroundPage />}
      {route === "/playground/impact" && <ImpactPlaygroundPage />}
      {route === "/playground/advisory" && <AdvisoryPlaygroundPage />}
      {route === "/dashboard" && <DashboardDraftPage />}
    </div>
  );
}
