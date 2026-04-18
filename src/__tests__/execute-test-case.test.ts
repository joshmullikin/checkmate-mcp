import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckmateClient } from "../checkmate-client.js";
import { RUN_COMPLETED_EVENT, RUN_STARTED_EVENT, sseStream, textResponse } from "./helpers.js";

describe("CheckmateClient – executeTestCase", () => {
  afterEach(() => vi.restoreAllMocks());

  it("yields SSE events from the stream", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        sseStream(
          `data: ${RUN_STARTED_EVENT}\n`,
          `data: ${RUN_COMPLETED_EVENT}\n`
        ),
        { status: 200 }
      )
    );

    const client = new CheckmateClient("http://example.test");
    const events: Array<{ type: string }> = [];
    for await (const e of client.executeTestCase(2, { browser: "chromium", maxRetries: 1, retryMode: "smart" })) {
      events.push(e as { type: string });
    }

    expect(events.map((e) => e.type)).toEqual(["run_started", "run_completed"]);
  });

  it("sends an empty body when called with no options", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(new ReadableStream({ start: (c) => c.close() }), { status: 200 })
      );

    const client = new CheckmateClient("http://example.test");
    for await (const _ of client.executeTestCase(3)) { /* drain */ }

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({});
  });

  it("includes retry object when maxRetries is set", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(new ReadableStream({ start: (c) => c.close() }), { status: 200 })
      );

    const client = new CheckmateClient("http://example.test");
    for await (const _ of client.executeTestCase(3, { maxRetries: 3, retryMode: "smart" })) { /* drain */ }

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).retry).toEqual({
      max_retries: 3,
      retry_mode: "smart",
    });
  });

  it("defaults retryMode to 'simple' when not specified", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(new ReadableStream({ start: (c) => c.close() }), { status: 200 })
      );

    const client = new CheckmateClient("http://example.test");
    for await (const _ of client.executeTestCase(3, { maxRetries: 2 })) { /* drain */ }

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).retry.retry_mode).toBe("simple");
  });

  it("throws including error text on HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      textResponse("stream unavailable", 503)
    );

    const client = new CheckmateClient("http://example.test");
    await expect(client.executeTestCase(5).next()).rejects.toThrow(
      "Failed to execute test case: stream unavailable"
    );
  });
});
