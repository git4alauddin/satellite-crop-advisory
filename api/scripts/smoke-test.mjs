/* eslint-disable no-console */
import assert from "node:assert/strict";

const API_BASE_URL = process.env.SMOKE_API_BASE_URL || "http://localhost:4000";
const REGION_ID = Number(process.env.SMOKE_REGION_ID || 1);
const FROM = process.env.SMOKE_FROM || "2025-01-01";
const TO = process.env.SMOKE_TO || "2025-12-31";
const RUN_JOB_FLOW = process.env.SMOKE_RUN_JOB === "1";
const JOB_TYPE = process.env.SMOKE_JOB_TYPE || "ndvi";
const JOB_TIMEOUT_MS = Number(process.env.SMOKE_JOB_TIMEOUT_MS || 180000);
const JOB_POLL_INTERVAL_MS = Number(process.env.SMOKE_JOB_POLL_INTERVAL_MS || 3000);

async function fetchJson(path, init) {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Request failed ${response.status} ${url}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

function logStep(message) {
  console.log(`\n[smoke] ${message}`);
}

async function runReadChecks() {
  logStep("Checking /health");
  const health = await fetchJson("/health");
  assert.equal(health.status, "ok");

  logStep("Checking /health-map for ndvi/ndwi/lst");
  for (const metric of ["ndvi", "ndwi", "lst"]) {
    const payload = await fetchJson(
      `/health-map?regionId=${REGION_ID}&from=${FROM}&to=${TO}&metric=${metric}`
    );
    assert.equal(payload.metric, metric);
    assert.equal(payload.regionId, REGION_ID);
    assert.equal(payload.data.type, "FeatureCollection");
    assert.ok(Array.isArray(payload.data.features));
  }

  logStep("Checking /trends");
  const trends = await fetchJson(`/trends?regionId=${REGION_ID}&from=${FROM}&to=${TO}`);
  assert.equal(trends.regionId, REGION_ID);
  assert.ok(Array.isArray(trends.items));

  logStep("Checking /impact-metrics");
  const impact = await fetchJson(`/impact-metrics?regionId=${REGION_ID}&from=${FROM}&to=${TO}`);
  assert.equal(impact.region.id, REGION_ID);
  assert.ok(typeof impact.region.area_km2 === "number");

  logStep("Checking /advisory");
  const advisory = await fetchJson(`/advisory?regionId=${REGION_ID}&from=${FROM}&to=${TO}`);
  assert.equal(advisory.region.id, REGION_ID);
  assert.ok(Array.isArray(advisory.advisory_messages));

  logStep("Checking /alerts");
  const alerts = await fetchJson(`/alerts?regionId=${REGION_ID}&from=${FROM}&to=${TO}`);
  assert.equal(alerts.regionId, REGION_ID);
  assert.ok(Array.isArray(alerts.items));
}

async function runJobFlowCheck() {
  logStep(`Submitting ${JOB_TYPE.toUpperCase()} job`);
  const submit = await fetchJson(`/jobs/${JOB_TYPE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      region_id: REGION_ID,
      start_date: FROM,
      end_date: TO
    })
  });
  assert.ok(submit.job_id);

  const startedAt = Date.now();
  while (Date.now() - startedAt < JOB_TIMEOUT_MS) {
    await new Promise((resolve) => setTimeout(resolve, JOB_POLL_INTERVAL_MS));
    const status = await fetchJson(`/jobs/${JOB_TYPE}/${submit.job_id}`);
    assert.equal(status.job_type, JOB_TYPE);
    if (status.status === "completed") {
      logStep(`${JOB_TYPE.toUpperCase()} job completed`);
      return;
    }
    if (status.status === "failed") {
      throw new Error(`${JOB_TYPE.toUpperCase()} job failed: ${status.error || "unknown error"}`);
    }
  }

  throw new Error(`${JOB_TYPE.toUpperCase()} job timed out after ${JOB_TIMEOUT_MS} ms`);
}

async function main() {
  console.log(`[smoke] API base: ${API_BASE_URL}`);
  console.log(`[smoke] Region/date window: regionId=${REGION_ID}, from=${FROM}, to=${TO}`);
  console.log(`[smoke] Job flow check: ${RUN_JOB_FLOW ? "enabled" : "disabled"}`);

  await runReadChecks();

  if (RUN_JOB_FLOW) {
    await runJobFlowCheck();
  }

  console.log("\n[smoke] PASS");
}

main().catch((error) => {
  console.error("\n[smoke] FAIL");
  console.error(error);
  process.exit(1);
});
