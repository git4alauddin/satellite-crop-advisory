type ProcessorProxyOptions = {
  method?: "GET" | "POST";
  body?: unknown;
};

const processorBaseUrl = process.env.PROCESSOR_BASE_URL || "http://localhost:8000";

export async function callProcessor(path: string, options: ProcessorProxyOptions = {}) {
  const method = options.method ?? "GET";
  const response = await fetch(`${processorBaseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}
