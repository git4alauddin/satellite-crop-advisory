export type RouteKey =
  | "/"
  | "/playground/map"
  | "/playground/jobs"
  | "/playground/trends"
  | "/playground/alerts"
  | "/playground/impact"
  | "/playground/advisory"
  | "/playground/database"
  | "/dashboard";

export const ROUTES: { path: RouteKey; label: string; description: string }[] = [
  { path: "/playground/map", label: "Map", description: "Boundary + metric coloring + source label" },
  { path: "/playground/jobs", label: "Jobs", description: "Run NDVI/NDWI/LST jobs and poll status" },
  { path: "/playground/trends", label: "Trends", description: "NDVI/NDWI/LST trend tables and chart" },
  { path: "/playground/database", label: "Database", description: "Tables, row counts, and latest records" },
  { path: "/playground/alerts", label: "Alerts", description: "Alert list, severity view, clear workflow" },
  { path: "/playground/impact", label: "Impact", description: "Impact metrics cards and coverage summary" },
  { path: "/playground/advisory", label: "Advisory", description: "Human-readable advisory text module" },
  { path: "/dashboard", label: "Final Dashboard Draft", description: "Integrate all components in one layout" }
];

export function navigate(path: RouteKey) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

export function getRouteFromPath(pathname: string): RouteKey {
  const allowed = new Set<RouteKey>(ROUTES.map((r) => r.path).concat("/" as RouteKey));
  if (allowed.has(pathname as RouteKey)) return pathname as RouteKey;
  return "/";
}
