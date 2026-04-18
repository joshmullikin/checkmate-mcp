import express from "express";
import { z } from "zod";
import type { CheckmateClient } from "./checkmate-client.js";
import { apiLogger } from "./logger.js";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

export const browserSchema = z
  .enum([
    "chromium",
    "chromium-headless",
    "firefox",
    "firefox-headless",
    "webkit",
    "webkit-headless",
  ])
  .optional();

export const testCaseRunSchema = z.object({
  browser: browserSchema,
});

export const executeStepsSchema = z.object({
  project_id: z.number().int().positive(),
  steps: z.array(z.string()).min(1),
  browser: browserSchema,
  fixture_ids: z.array(z.number().int().positive()).optional(),
});

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createApp(
  client: CheckmateClient,
  checkmateUrl: string,
  fetcher: typeof fetch = fetch
): express.Application {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json());

  // -------------------------------------------------------------------------
  // Health check
  // -------------------------------------------------------------------------

  app.get("/health", async (_req, res) => {
    const checkmateHealthy = await client.healthCheck();
    res.json({
      status: "ok",
      name: "checkmate-mcp",
      checkmate: checkmateHealthy ? "connected" : "unavailable",
      checkmateUrl,
    });
  });

  // -------------------------------------------------------------------------
  // SSE proxy: execute test case
  // -------------------------------------------------------------------------

  app.post("/proxy/test-cases/:testCaseId/runs/stream", async (req, res) => {
    const testCaseId = parseInt(req.params.testCaseId, 10);
    if (isNaN(testCaseId) || testCaseId <= 0) {
      res.status(400).json({ error: "Invalid testCaseId: must be a positive integer" });
      return;
    }

    const bodyResult = testCaseRunSchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ error: "Invalid request body", details: bodyResult.error.issues });
      return;
    }
    const { browser } = bodyResult.data;

    apiLogger.info({ endpoint: "proxy/test-cases/stream", testCaseId, browser }, "SSE proxy request");

    try {
      const response = await fetcher(
        `${checkmateUrl}/api/test-cases/${testCaseId}/runs/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          body: JSON.stringify({ browser: browser || "chromium-headless" }),
        }
      );

      if (!response.ok) {
        res.status(response.status).json({ error: `Checkmate API error: ${response.statusText}` });
        return;
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const reader = response.body?.getReader();
      if (!reader) { res.end(); return; }

      req.on("close", () => reader.cancel());

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } catch (error) {
      apiLogger.error({ endpoint: "proxy/test-cases/stream", testCaseId, error }, "SSE proxy error");
      res.status(500).json({ error: error instanceof Error ? error.message : "Proxy error" });
    }
  });

  // -------------------------------------------------------------------------
  // SSE proxy: execute steps (natural language)
  // -------------------------------------------------------------------------

  app.post("/proxy/test-runs/execute/stream", async (req, res) => {
    const bodyResult = executeStepsSchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ error: "Invalid request body", details: bodyResult.error.issues });
      return;
    }
    const { project_id, steps, browser, fixture_ids } = bodyResult.data;

    apiLogger.info(
      { endpoint: "proxy/test-runs/stream", projectId: project_id, stepCount: steps.length },
      "SSE proxy request"
    );

    try {
      const response = await fetcher(`${checkmateUrl}/api/test-runs/execute/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ project_id, steps, browser, fixture_ids }),
      });

      if (!response.ok) {
        res.status(response.status).json({ error: `Checkmate API error: ${response.statusText}` });
        return;
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const reader = response.body?.getReader();
      if (!reader) { res.end(); return; }

      req.on("close", () => reader.cancel());

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } catch (error) {
      apiLogger.error({ endpoint: "proxy/test-runs/stream", projectId: project_id, error }, "SSE proxy error");
      res.status(500).json({ error: error instanceof Error ? error.message : "Proxy error" });
    }
  });

  return app;
}
