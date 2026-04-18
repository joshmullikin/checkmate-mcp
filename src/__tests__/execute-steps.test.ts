import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckmateClient } from "../checkmate-client.js";
import { RUN_COMPLETED_EVENT, sampleSteps, sseStream, textResponse } from "./helpers.js";

describe("CheckmateClient – executeSteps", () => {
  afterEach(() => vi.restoreAllMocks());

  it("yields SSE events from the stream", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(sseStream(`data: ${RUN_COMPLETED_EVENT}\n`), { status: 200 })
    );

    const client = new CheckmateClient("http://example.test");
    const events: Array<{ type: string }> = [];
    for await (const e of client.executeSteps(1, sampleSteps)) {
      events.push(e as { type: string });
    }

    expect(events[0].type).toBe("run_completed");
  });

  it("includes optional browser and fixtureIds in POST body", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(new ReadableStream({ start: (c) => c.close() }), { status: 200 })
      );

    const client = new CheckmateClient("http://example.test");
    for await (const _ of client.executeSteps(7, sampleSteps, {
      browser: "firefox",
      fixtureIds: [3, 4],
    })) { /* drain */ }

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.browser).toBe("firefox");
    expect(body.fixture_ids).toEqual([3, 4]);
  });

  it("throws including error text on HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(textResponse("bad request", 400));

    const client = new CheckmateClient("http://example.test");
    await expect(client.executeSteps(1, sampleSteps).next()).rejects.toThrow(
      "Failed to execute steps: bad request"
    );
  });
});
