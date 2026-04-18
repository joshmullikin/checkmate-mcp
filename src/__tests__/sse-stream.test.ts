import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckmateClient } from "../checkmate-client.js";
import { RUN_COMPLETED_EVENT, RUN_STARTED_EVENT, sseStream } from "./helpers.js";

// parseSSEStream is private; all tests exercise it via executeTestCase.

describe("CheckmateClient – SSE stream parsing", () => {
  afterEach(() => vi.restoreAllMocks());

  it("throws when the response has no body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 200 })
    );

    const client = new CheckmateClient("http://example.test");
    await expect(client.executeTestCase(1).next()).rejects.toThrow("No response body");
  });

  it("parses multiple newline-delimited events from the stream", async () => {
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
    const types: string[] = [];
    for await (const e of client.executeTestCase(1)) {
      types.push((e as { type: string }).type);
    }

    expect(types).toEqual(["run_started", "run_completed"]);
  });

  it("silently skips malformed JSON events mid-stream", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        sseStream(
          `data: ${RUN_STARTED_EVENT}\n`,
          "data: not-json\n",
          `data: ${RUN_COMPLETED_EVENT}\n`
        ),
        { status: 200 }
      )
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const client = new CheckmateClient("http://example.test");
    const types: string[] = [];
    for await (const e of client.executeTestCase(1)) {
      types.push((e as { type: string }).type);
    }

    expect(types).toEqual(["run_started", "run_completed"]);
  });

  it("emits an event that arrives in the final buffer without a trailing newline", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        sseStream(`data: ${RUN_COMPLETED_EVENT}`), // no trailing \n
        { status: 200 }
      )
    );

    const client = new CheckmateClient("http://example.test");
    const events: Array<{ type: string }> = [];
    for await (const e of client.executeTestCase(1)) {
      events.push(e as { type: string });
    }

    expect(events[0]?.type).toBe("run_completed");
  });

  it("silently skips malformed JSON in the final buffer", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        sseStream("data: not-valid-json"), // no trailing \n, invalid JSON
        { status: 200 }
      )
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const client = new CheckmateClient("http://example.test");
    const events: unknown[] = [];
    for await (const e of client.executeTestCase(1)) {
      events.push(e);
    }

    expect(events).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to parse final SSE event:",
      "not-valid-json",
      expect.any(SyntaxError)
    );
  });
});
