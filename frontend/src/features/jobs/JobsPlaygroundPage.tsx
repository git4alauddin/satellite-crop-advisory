import { useState } from "react";
import {
  getAlerts,
  getJobStatus,
  getTrends,
  submitJob,
  type JobType
} from "../../api";
import { navigate } from "../../lib/navigation";

type DbSnapshot = {
  trendsCount: number;
  alertsCount: number;
  latestRow: {
    date_start: string;
    date_end: string;
    ndvi_severity: string | null;
    ndwi_severity: string | null;
    lst_severity: string | null;
    mean_ndvi: number | null;
    mean_ndwi: number | null;
    mean_lst_c: number | null;
    created_at: string;
  } | null;
};

export default function JobsPlaygroundPage() {
  const [from, setFrom] = useState("2025-01-01");
  const [to, setTo] = useState("2025-02-15");
  const [runningJob, setRunningJob] = useState<JobType | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [executionDetails, setExecutionDetails] = useState<{
    jobType: JobType;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    status: string;
  } | null>(null);
  const [dbChange, setDbChange] = useState<{
    before: DbSnapshot;
    after: DbSnapshot;
  } | null>(null);

  async function getDbSnapshot(): Promise<DbSnapshot> {
    const [trendsRes, alertsRes] = await Promise.all([
      getTrends(1, from, to),
      getAlerts(1, from, to)
    ]);
    const latest = trendsRes.items.length > 0 ? trendsRes.items[trendsRes.items.length - 1] : null;
    return {
      trendsCount: trendsRes.count,
      alertsCount: alertsRes.count,
      latestRow: latest
        ? {
            date_start: latest.date_start,
            date_end: latest.date_end,
            ndvi_severity: latest.ndvi_severity,
            ndwi_severity: latest.ndwi_severity,
            lst_severity: latest.lst_severity,
            mean_ndvi: latest.mean_ndvi,
            mean_ndwi: latest.mean_ndwi,
            mean_lst_c: latest.mean_lst_c,
            created_at: latest.created_at
          }
        : null
    };
  }

  async function runJob(jobType: JobType) {
    if (from > to) {
      setError("From date must be before or equal to To date.");
      return;
    }

    setError(null);
    setExecutionDetails(null);
    setDbChange(null);
    setRunningJob(jobType);
    setMessage(`Submitting ${jobType.toUpperCase()} job...`);

    try {
      const startedAtDate = new Date();
      const startedAtMs = Date.now();
      const beforeSnapshot = await getDbSnapshot();
      const submitted = await submitJob(jobType, {
        region_id: 1,
        start_date: from,
        end_date: to
      });

      setLastJobId(submitted.job_id);
      setMessage(`${jobType.toUpperCase()} job submitted: ${submitted.job_id}`);

      for (let attempt = 0; attempt < 60; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const status = await getJobStatus(jobType, submitted.job_id);
        setMessage(`${status.job_type.toUpperCase()} status: ${status.status}`);

        if (status.status === "completed") {
          const finishedAtDate = new Date();
          const afterSnapshot = await getDbSnapshot();
          setDbChange({
            before: beforeSnapshot,
            after: afterSnapshot
          });
          setExecutionDetails({
            jobType,
            startedAt: startedAtDate.toISOString(),
            finishedAt: finishedAtDate.toISOString(),
            durationMs: Date.now() - startedAtMs,
            status: "completed"
          });
          setMessage(`${status.job_type.toUpperCase()} job completed.`);
          setRunningJob(null);
          return;
        }

        if (status.status === "failed") {
          const finishedAtDate = new Date();
          setExecutionDetails({
            jobType,
            startedAt: startedAtDate.toISOString(),
            finishedAt: finishedAtDate.toISOString(),
            durationMs: Date.now() - startedAtMs,
            status: "failed"
          });
          setError(status.error || `${status.job_type.toUpperCase()} job failed.`);
          setRunningJob(null);
          return;
        }
      }

      setError(`${jobType.toUpperCase()} polling timed out.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to run job");
    } finally {
      setRunningJob(null);
    }
  }

  return (
    <div className="page">
      <h2>Jobs Playground</h2>
      <p>Run NDVI/NDWI/LST jobs and verify status polling flow in isolation.</p>

      <div className="controlsRow">
        <label>
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      <div className="buttonGroup">
        <button type="button" onClick={() => void runJob("ndvi")} disabled={runningJob !== null}>
          {runningJob === "ndvi" ? "Running NDVI..." : "Run NDVI"}
        </button>
        <button type="button" onClick={() => void runJob("ndwi")} disabled={runningJob !== null}>
          {runningJob === "ndwi" ? "Running NDWI..." : "Run NDWI"}
        </button>
        <button type="button" onClick={() => void runJob("lst")} disabled={runningJob !== null}>
          {runningJob === "lst" ? "Running LST..." : "Run LST"}
        </button>
      </div>

      {message && <p className="meta">Status: {message}</p>}
      {lastJobId && <p className="meta">Last Job ID: <strong>{lastJobId}</strong></p>}
      {error && <p className="error">{error}</p>}

      {executionDetails && (
        <section className="card">
          <h3>Execution Details</h3>
          <div className="summaryRow">
            <div><span>Job Type</span><strong>{executionDetails.jobType.toUpperCase()}</strong></div>
            <div><span>Status</span><strong>{executionDetails.status}</strong></div>
            <div><span>Started</span><strong>{new Date(executionDetails.startedAt).toLocaleString()}</strong></div>
            <div><span>Finished</span><strong>{new Date(executionDetails.finishedAt).toLocaleString()}</strong></div>
          </div>
          <p className="meta">Duration: <strong>{(executionDetails.durationMs / 1000).toFixed(2)}s</strong></p>
          <p className="meta">Window: <strong>{from}</strong> to <strong>{to}</strong>, Region: <strong>1</strong></p>
        </section>
      )}

      {dbChange && (
        <section className="card">
          <h3>Database Changes</h3>
          <div className="summaryRow">
            <div>
              <span>index_stats rows</span>
              <strong>{dbChange.before.trendsCount} {"->"} {dbChange.after.trendsCount}</strong>
            </div>
            <div>
              <span>alerts rows</span>
              <strong>{dbChange.before.alertsCount} {"->"} {dbChange.after.alertsCount}</strong>
            </div>
            <div>
              <span>Latest row window</span>
              <strong>{dbChange.after.latestRow ? `${dbChange.after.latestRow.date_start} -> ${dbChange.after.latestRow.date_end}` : "N/A"}</strong>
            </div>
            <div>
              <span>Latest updated at</span>
              <strong>{dbChange.after.latestRow?.created_at ? new Date(dbChange.after.latestRow.created_at).toLocaleString() : "N/A"}</strong>
            </div>
          </div>

          <div className="summaryRow">
            <div><span>NDVI</span><strong>{dbChange.after.latestRow?.mean_ndvi ?? "N/A"} ({dbChange.after.latestRow?.ndvi_severity ?? "N/A"})</strong></div>
            <div><span>NDWI</span><strong>{dbChange.after.latestRow?.mean_ndwi ?? "N/A"} ({dbChange.after.latestRow?.ndwi_severity ?? "N/A"})</strong></div>
            <div><span>LST</span><strong>{dbChange.after.latestRow?.mean_lst_c ?? "N/A"} ({dbChange.after.latestRow?.lst_severity ?? "N/A"})</strong></div>
            <div>
              <span>Open Data View</span>
              <button type="button" onClick={() => navigate("/playground/database")} style={{ padding: "6px 10px" }}>
                View in Database
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
