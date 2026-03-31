const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "KrishiDrishti API",
    version: "0.1.0",
    description: "Application API for trends, map health, alerts, impact metrics, advisory, and job proxying."
  },
  servers: [
    { url: "http://localhost:4000", description: "Local API server" }
  ],
  tags: [
    { name: "Health" },
    { name: "Regions" },
    { name: "Jobs" },
    { name: "Stats" },
    { name: "Trends" },
    { name: "Alerts" },
    { name: "Impact" },
    { name: "Advisory" }
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": {
            description: "Service health response",
            content: { "application/json": { schema: { type: "object" } } }
          }
        }
      }
    },
    "/regions": {
      get: {
        tags: ["Regions"],
        summary: "Get regions as GeoJSON",
        responses: {
          "200": {
            description: "FeatureCollection of regions",
            content: { "application/json": { schema: { type: "object" } } }
          }
        }
      }
    },
    "/jobs/ndvi": {
      post: {
        tags: ["Jobs"],
        summary: "Submit NDVI job",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MetricJobRequest" }
            }
          }
        },
        responses: {
          "200": { description: "Job accepted", content: { "application/json": { schema: { type: "object" } } } }
        }
      }
    },
    "/jobs/ndwi": {
      post: {
        tags: ["Jobs"],
        summary: "Submit NDWI job",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MetricJobRequest" }
            }
          }
        },
        responses: {
          "200": { description: "Job accepted", content: { "application/json": { schema: { type: "object" } } } }
        }
      }
    },
    "/jobs/lst": {
      post: {
        tags: ["Jobs"],
        summary: "Submit LST job",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MetricJobRequest" }
            }
          }
        },
        responses: {
          "200": { description: "Job accepted", content: { "application/json": { schema: { type: "object" } } } }
        }
      }
    },
    "/jobs/{type}/{jobId}": {
      get: {
        tags: ["Jobs"],
        summary: "Get job status",
        parameters: [
          { name: "type", in: "path", required: true, schema: { type: "string", enum: ["ndvi", "ndwi", "lst"] } },
          { name: "jobId", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Job status", content: { "application/json": { schema: { type: "object" } } } },
          "404": { description: "Job not found" }
        }
      }
    },
    "/stats/ndvi": {
      get: {
        tags: ["Stats"],
        summary: "Get NDVI stats",
        parameters: [{ $ref: "#/components/parameters/RegionId" }, { $ref: "#/components/parameters/From" }, { $ref: "#/components/parameters/To" }],
        responses: { "200": { description: "NDVI stats", content: { "application/json": { schema: { type: "object" } } } } }
      },
      delete: {
        tags: ["Stats"],
        summary: "Clear NDVI stats in date window",
        parameters: [{ $ref: "#/components/parameters/RegionId" }, { $ref: "#/components/parameters/From" }, { $ref: "#/components/parameters/To" }],
        responses: { "200": { description: "Delete summary", content: { "application/json": { schema: { type: "object" } } } } }
      }
    },
    "/stats/ndwi": {
      get: {
        tags: ["Stats"],
        summary: "Get NDWI stats",
        parameters: [{ $ref: "#/components/parameters/RegionId" }, { $ref: "#/components/parameters/From" }, { $ref: "#/components/parameters/To" }],
        responses: { "200": { description: "NDWI stats", content: { "application/json": { schema: { type: "object" } } } } }
      },
      delete: {
        tags: ["Stats"],
        summary: "Clear NDWI stats in date window",
        parameters: [{ $ref: "#/components/parameters/RegionId" }, { $ref: "#/components/parameters/From" }, { $ref: "#/components/parameters/To" }],
        responses: { "200": { description: "Delete summary", content: { "application/json": { schema: { type: "object" } } } } }
      }
    },
    "/stats/lst": {
      get: {
        tags: ["Stats"],
        summary: "Get LST stats",
        parameters: [{ $ref: "#/components/parameters/RegionId" }, { $ref: "#/components/parameters/From" }, { $ref: "#/components/parameters/To" }],
        responses: { "200": { description: "LST stats", content: { "application/json": { schema: { type: "object" } } } } }
      },
      delete: {
        tags: ["Stats"],
        summary: "Clear LST stats in date window",
        parameters: [{ $ref: "#/components/parameters/RegionId" }, { $ref: "#/components/parameters/From" }, { $ref: "#/components/parameters/To" }],
        responses: { "200": { description: "Delete summary", content: { "application/json": { schema: { type: "object" } } } } }
      }
    },
    "/health-map": {
      get: {
        tags: ["Stats"],
        summary: "Get health map layer data",
        parameters: [
          { $ref: "#/components/parameters/RegionId" },
          { $ref: "#/components/parameters/From" },
          { $ref: "#/components/parameters/To" },
          {
            name: "metric",
            in: "query",
            required: true,
            schema: { type: "string", enum: ["ndvi", "ndwi", "lst"] }
          }
        ],
        responses: { "200": { description: "GeoJSON map payload", content: { "application/json": { schema: { type: "object" } } } } }
      }
    },
    "/trends": {
      get: {
        tags: ["Trends"],
        summary: "Get consolidated trends",
        parameters: [{ $ref: "#/components/parameters/RegionId" }, { $ref: "#/components/parameters/From" }, { $ref: "#/components/parameters/To" }],
        responses: { "200": { description: "Consolidated trends", content: { "application/json": { schema: { type: "object" } } } } }
      }
    },
    "/trends/ndvi": {
      get: {
        tags: ["Trends"],
        summary: "Get NDVI trend series",
        parameters: [{ $ref: "#/components/parameters/RegionId" }, { $ref: "#/components/parameters/From" }, { $ref: "#/components/parameters/To" }],
        responses: { "200": { description: "NDVI trends", content: { "application/json": { schema: { type: "object" } } } } }
      }
    },
    "/alerts": {
      get: {
        tags: ["Alerts"],
        summary: "Get alerts",
        parameters: [{ $ref: "#/components/parameters/RegionId" }, { $ref: "#/components/parameters/From" }, { $ref: "#/components/parameters/To" }],
        responses: { "200": { description: "Alerts list", content: { "application/json": { schema: { type: "object" } } } } }
      },
      delete: {
        tags: ["Alerts"],
        summary: "Clear alerts in date window",
        parameters: [{ $ref: "#/components/parameters/RegionId" }, { $ref: "#/components/parameters/From" }, { $ref: "#/components/parameters/To" }],
        responses: { "200": { description: "Delete summary", content: { "application/json": { schema: { type: "object" } } } } }
      }
    },
    "/impact-metrics": {
      get: {
        tags: ["Impact"],
        summary: "Get impact metrics",
        parameters: [{ $ref: "#/components/parameters/RegionId" }, { $ref: "#/components/parameters/From" }, { $ref: "#/components/parameters/To" }],
        responses: { "200": { description: "Impact metrics payload", content: { "application/json": { schema: { type: "object" } } } } }
      }
    },
    "/advisory": {
      get: {
        tags: ["Advisory"],
        summary: "Get advisory summary for selected region and window",
        parameters: [{ $ref: "#/components/parameters/RegionId" }, { $ref: "#/components/parameters/From" }, { $ref: "#/components/parameters/To" }],
        responses: { "200": { description: "Advisory payload", content: { "application/json": { schema: { type: "object" } } } } }
      }
    }
  },
  components: {
    parameters: {
      RegionId: { name: "regionId", in: "query", required: true, schema: { type: "integer", minimum: 1 } },
      From: { name: "from", in: "query", required: true, schema: { type: "string", format: "date" } },
      To: { name: "to", in: "query", required: true, schema: { type: "string", format: "date" } }
    },
    schemas: {
      MetricJobRequest: {
        type: "object",
        required: ["region_id", "start_date", "end_date"],
        properties: {
          region_id: { type: "integer", example: 1 },
          start_date: { type: "string", format: "date", example: "2025-01-01" },
          end_date: { type: "string", format: "date", example: "2025-02-15" }
        }
      }
    }
  }
} as const;

export default openApiSpec;
