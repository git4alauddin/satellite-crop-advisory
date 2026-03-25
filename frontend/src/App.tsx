import { useEffect, useState } from "react";
import HubPage from "./features/hub/HubPage";
import MapPlaygroundPage from "./features/map/MapPlaygroundPage";
import JobsPlaygroundPage from "./features/jobs/JobsPlaygroundPage";
import TrendsPlaygroundPage from "./features/trends/TrendsPlaygroundPage";
import AlertsPlaygroundPage from "./features/alerts/AlertsPlaygroundPage";
import ImpactPlaygroundPage from "./features/impact/ImpactPlaygroundPage";
import AdvisoryPlaygroundPage from "./features/advisory/AdvisoryPlaygroundPage";
import DashboardDraftPage from "./features/dashboard/DashboardDraftPage";
import { getRouteFromPath, navigate, type RouteKey } from "./lib/navigation";

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
        <h1>KrishiDrishti Frontend Building</h1>
        <button type="button" onClick={() => navigate("/")}>Component Hub</button>
      </header>

      {route === "/" && <HubPage />}
      {route === "/playground/map" && <MapPlaygroundPage />}
      {route === "/playground/jobs" && <JobsPlaygroundPage />}
      {route === "/playground/trends" && <TrendsPlaygroundPage />}
      {route === "/playground/alerts" && <AlertsPlaygroundPage />}
      {route === "/playground/impact" && <ImpactPlaygroundPage />}
      {route === "/playground/advisory" && <AdvisoryPlaygroundPage />}
      {route === "/dashboard" && <DashboardDraftPage />}
    </div>
  );
}
