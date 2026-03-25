import { ROUTES, navigate } from "../../lib/navigation";

export default function HubPage() {
  const dashboardRoute = ROUTES.find((route) => route.path === "/dashboard");
  const moduleRoutes = ROUTES.filter((route) => route.path !== "/dashboard");

  return (
    <div className="page">
      <h2>Frontend Component Hub</h2>
      <p>Start each module independently, verify, then compose into final dashboard.</p>
      {dashboardRoute && (
        <div className="hubTop">
          <button type="button" className="hubCard hubCardTop" onClick={() => navigate(dashboardRoute.path)}>
            <strong>{dashboardRoute.label}</strong>
            <span>{dashboardRoute.description}</span>
          </button>
        </div>
      )}
      <div className="hubGrid hubGridThree">
        {moduleRoutes.map((route) => (
          <button key={route.path} type="button" className="hubCard" onClick={() => navigate(route.path)}>
            <strong>{route.label}</strong>
            <span>{route.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
