import { ROUTES, navigate } from "../../lib/navigation";

export default function HubPage() {
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
