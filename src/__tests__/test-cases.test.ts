import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckmateClient } from "../checkmate-client.js";
import { baseTestCase, errorResponse, jsonResponse } from "./helpers.js";

describe("CheckmateClient – listTestCases", () => {
  afterEach(() => vi.restoreAllMocks());

  it("parses JSON string fields into arrays", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse([
        {
          ...baseTestCase,
          steps: '[{"action":"goto","target":"/checkout","value":null}]',
          tags: '["smoke","critical"]',
          fixture_ids: "[2,3]",
        },
      ])
    );

    const client = new CheckmateClient("http://example.test");
    const [tc] = await client.listTestCases(7);

    expect(tc.steps).toEqual([{ action: "goto", target: "/checkout", value: null }]);
    expect(tc.tags).toEqual(["smoke", "critical"]);
    expect(tc.fixture_ids).toEqual([2, 3]);
  });

  it("defaults steps, tags, and fixture_ids to empty arrays when empty or null", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse([{ ...baseTestCase, steps: "", tags: null, fixture_ids: null }])
    );

    const client = new CheckmateClient("http://example.test");
    const [tc] = await client.listTestCases(7);

    expect(tc.steps).toEqual([]);
    expect(tc.tags).toEqual([]);
    expect(tc.fixture_ids).toEqual([]);
  });

  it("throws on HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(errorResponse("Forbidden", 403));

    const client = new CheckmateClient("http://example.test");
    await expect(client.listTestCases(1)).rejects.toThrow(
      "Failed to list test cases: Forbidden"
    );
  });
});

describe("CheckmateClient – getTestCase", () => {
  afterEach(() => vi.restoreAllMocks());

  it("parses JSON string fields into arrays", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse(baseTestCase));

    const client = new CheckmateClient("http://example.test");
    const tc = await client.getTestCase(10);

    expect(tc.steps).toEqual([{ action: "goto", target: "/", value: null }]);
    expect(tc.tags).toEqual(["a"]);
    expect(tc.fixture_ids).toEqual([5]);
  });

  it("defaults steps, tags, and fixture_ids to empty arrays when null", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ ...baseTestCase, steps: null, tags: null, fixture_ids: null })
    );

    const client = new CheckmateClient("http://example.test");
    const tc = await client.getTestCase(10);

    expect(tc.steps).toEqual([]);
    expect(tc.tags).toEqual([]);
    expect(tc.fixture_ids).toEqual([]);
  });

  it("throws with test case id in message on HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(errorResponse("Not Found", 404));

    const client = new CheckmateClient("http://example.test");
    await expect(client.getTestCase(99)).rejects.toThrow(
      "Failed to get test case 99: Not Found"
    );
  });
});
