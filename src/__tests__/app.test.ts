import { createServer } from "http";
import type { AddressInfo } from "net";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import type { CheckmateClient } from "../checkmate-client.js";

// ---------------------------------------------------------------------------
// Minimal client stub
// ---------------------------------------------------------------------------

const mockClient = {
  healthCheck: vi.fn(),
} as unknown as CheckmateClient;

// ---------------------------------------------------------------------------
// Injectable mock fetcher
// ---------------------------------------------------------------------------

const mockFetcher = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>();

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

const app = createApp(mockClient, "http://checkmate.test", mockFetcher);
const httpServer = createServer(app);
let baseUrl: string;

beforeAll(
  () =>
    new Promise<void>((resolve) => {
      httpServer.listen(0, "127.0.0.1", () => {
        const { port } = httpServer.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    })
);

afterAll(
  () =>
    new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    })
);

afterEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------

describe("GET /health", () => {
  it("returns status ok with checkmate connected when healthCheck resolves true", async () => {
    vi.mocked(mockClient.healthCheck).mockResolvedValueOnce(true);

    const res = await fetch(`${baseUrl}/health`);
    const body = await res.json() as Record<string, string>;

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.name).toBe("checkmate-mcp");
    expect(body.checkmate).toBe("connected");
    expect(body.checkmateUrl).toBe("http://checkmate.test");
  });

  it("returns checkmate unavailable when healthCheck resolves false", async () => {
    vi.mocked(mockClient.healthCheck).mockResolvedValueOnce(false);

    const res = await fetch(`${baseUrl}/health`);
    const body = await res.json() as Record<string, string>;

    expect(body.checkmate).toBe("unavailable");
  });
});

// ---------------------------------------------------------------------------
// POST /proxy/test-cases/:testCaseId/runs/stream
// ---------------------------------------------------------------------------

describe("POST /proxy/test-cases/:testCaseId/runs/stream", () => {
  it("returns 400 when testCaseId is not a number", async () => {
    const res = await fetch(`${baseUrl}/proxy/test-cases/abc/runs/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toMatch(/Invalid testCaseId/);
  });

  it("returns 400 when testCaseId is zero", async () => {
    const res = await fetch(`${baseUrl}/proxy/test-cases/0/runs/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when browser value is not in the allowed enum", async () => {
    const res = await fetch(`${baseUrl}/proxy/test-cases/1/runs/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ browser: "internet-explorer" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/Invalid request body/);
  });

  it("proxies upstream error status when Checkmate API returns non-ok", async () => {
    mockFetcher.mockResolvedValueOnce(
      new Response(null, { status: 503, statusText: "Service Unavailable" })
    );

    const res = await fetch(`${baseUrl}/proxy/test-cases/5/runs/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(503);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toContain("Checkmate API error");
  });

  it("returns SSE headers and streams data when upstream succeeds", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(encoder.encode('data: {"type":"run_started"}\n'));
        c.close();
      },
    });
    mockFetcher.mockResolvedValueOnce(
      new Response(stream, { status: 200 })
    );

    const res = await fetch(`${baseUrl}/proxy/test-cases/5/runs/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ browser: "chromium" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const text = await res.text();
    expect(text).toContain("run_started");
  });

  it("returns 500 when the upstream fetch throws", async () => {
    mockFetcher.mockRejectedValueOnce(new Error("connection refused"));

    const res = await fetch(`${baseUrl}/proxy/test-cases/1/runs/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe("connection refused");
  });

  it("returns 500 with fallback message when a non-Error is thrown", async () => {
    mockFetcher.mockRejectedValueOnce("oops");

    const res = await fetch(`${baseUrl}/proxy/test-cases/1/runs/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe("Proxy error");
  });

  it("ends the response cleanly when upstream response body is null", async () => {
    const responseWithNullBody = new Response("", { status: 200 });
    Object.defineProperty(responseWithNullBody, "body", { value: null });
    mockFetcher.mockResolvedValueOnce(responseWithNullBody);

    const res = await fetch(`${baseUrl}/proxy/test-cases/1/runs/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("");
  });
});

// ---------------------------------------------------------------------------
// POST /proxy/test-runs/execute/stream
// ---------------------------------------------------------------------------

describe("POST /proxy/test-runs/execute/stream", () => {
  it("returns 400 when project_id is missing", async () => {
    const res = await fetch(`${baseUrl}/proxy/test-runs/execute/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steps: ["goto /"] }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when steps is an empty array", async () => {
    const res = await fetch(`${baseUrl}/proxy/test-runs/execute/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: 1, steps: [] }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when browser value is invalid", async () => {
    const res = await fetch(`${baseUrl}/proxy/test-runs/execute/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: 1, steps: ["goto /"], browser: "ie11" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns SSE headers and streams data when upstream succeeds", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(encoder.encode('data: {"type":"run_completed"}\n'));
        c.close();
      },
    });
    mockFetcher.mockResolvedValueOnce(
      new Response(stream, { status: 200 })
    );

    const res = await fetch(`${baseUrl}/proxy/test-runs/execute/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: 2, steps: ["goto /dashboard"] }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const text = await res.text();
    expect(text).toContain("run_completed");
  });

  it("proxies upstream error status when Checkmate API returns non-ok", async () => {
    mockFetcher.mockResolvedValueOnce(
      new Response(null, { status: 422, statusText: "Unprocessable Entity" })
    );

    const res = await fetch(`${baseUrl}/proxy/test-runs/execute/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: 1, steps: ["goto /"] }),
    });

    expect(res.status).toBe(422);
  });

  it("returns 500 when the upstream fetch throws", async () => {
    mockFetcher.mockRejectedValueOnce(new Error("timeout"));

    const res = await fetch(`${baseUrl}/proxy/test-runs/execute/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: 1, steps: ["goto /"] }),
    });

    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe("timeout");
  });

  it("returns 500 with fallback message when a non-Error is thrown", async () => {
    mockFetcher.mockRejectedValueOnce("oops");

    const res = await fetch(`${baseUrl}/proxy/test-runs/execute/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: 1, steps: ["goto /"] }),
    });

    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe("Proxy error");
  });

  it("ends the response cleanly when upstream response body is null", async () => {
    const responseWithNullBody = new Response("", { status: 200 });
    Object.defineProperty(responseWithNullBody, "body", { value: null });
    mockFetcher.mockResolvedValueOnce(responseWithNullBody);

    const res = await fetch(`${baseUrl}/proxy/test-runs/execute/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: 1, steps: ["goto /"] }),
    });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("");
  });
});
