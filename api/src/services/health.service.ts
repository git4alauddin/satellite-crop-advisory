export function getHealthPayload() {
  return {
    service: "sca-api",
    status: "ok",
    timestamp: new Date().toISOString()
  };
}
