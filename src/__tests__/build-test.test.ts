import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckmateClient } from "../checkmate-client.js";
import { BUILD_RESPONSE, jsonResponse, textResponse } from "./helpers.js";

describe("CheckmateClient – buildTest", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends correct POST URL, headers, and body", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(BUILD_RESPONSE));

    const client = new CheckmateClient("http://example.test");
    await client.buildTest(12, "verify checkout");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://example.test/api/agent/projects/12/build");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body as string)).toEqual({
      message: "verify checkout",
      fixture_ids: [],
    });
  });

  it("passes explicit fixtureIds in request body", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(BUILD_RESPONSE));

    const client = new CheckmateClient("http://example.test");
    await client.buildTest(3, "run login", [9, 14]);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).fixture_ids).toEqual([9, 14]);
  });

  it("throws including backend error text on HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      textResponse("validation failed", 400)
    );

    const client = new CheckmateClient("http://example.test");
    await expect(client.buildTest(3, "broken input")).rejects.toThrow(
      "Failed to build test: validation failed"
    );
  });
});
