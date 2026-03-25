import { useState } from "react";
import {
  getJobStatus,
  submitJob,
  type JobType
} from "../../api";

export default function JobsPlaygroundPage() {
  const [from, setFrom] = useState("2025-01-01");
  const [to, setTo] = useState("2025-02-15");
  const [runningJob, setRunningJob] = useState<JobType | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);

  async function runJob(jobType: JobType) {
    if (from > to) {
      setError("From date must be before or equal to To date.");
      return;
    }

    setError(null);
    setRunningJob(jobType);
    setMessage(`Submitting ${jobType.toUpperCase()} job...`);

    try {
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
          setMessage(`${status.job_type.toUpperCase()} job completed.`);
          setRunningJob(null);
          return;
        }

        if (status.status === "failed") {
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
    </div>
  );
}
