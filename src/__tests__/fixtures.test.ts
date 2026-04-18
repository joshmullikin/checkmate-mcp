import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckmateClient } from "../checkmate-client.js";
import { baseFixture, errorResponse, jsonResponse } from "./helpers.js";

describe("CheckmateClient – listFixtures", () => {
  afterEach(() => vi.restoreAllMocks());

  it("parses setup_steps JSON string into an array", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse([
        {
          ...baseFixture,
          setup_steps:
            '[{"action":"goto","target":"/login","value":null},{"action":"fill","target":"#username","value":"demo"}]',
        },
      ])
    );

    const client = new CheckmateClient("http://example.test");
    const [fixture] = await client.listFixtures(5);

    expect(fixture.setup_steps).toEqual([
      { action: "goto", target: "/login", value: null },
      { action: "fill", target: "#username", value: "demo" },
    ]);
  });

  it("throws on HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(errorResponse("Unauthorized", 401));

    const client = new CheckmateClient("http://example.test");
    await expect(client.listFixtures(3)).rejects.toThrow(
      "Failed to list fixtures: Unauthorized"
    );
  });
});

describe("CheckmateClient – getFixture", () => {
  afterEach(() => vi.restoreAllMocks());

  it("parses setup_steps JSON string into an array", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse(baseFixture));

    const client = new CheckmateClient("http://example.test");
    const fixture = await client.getFixture(11);

    expect(fixture.setup_steps).toEqual([
      { action: "goto", target: "/login", value: null },
    ]);
  });

  it("defaults setup_steps to empty array when null", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ ...baseFixture, setup_steps: null })
    );

    const client = new CheckmateClient("http://example.test");
    const fixture = await client.getFixture(11);

    expect(fixture.setup_steps).toEqual([]);
  });

  it("throws with fixture id in message on HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(errorResponse("Not Found", 404));

    const client = new CheckmateClient("http://example.test");
    await expect(client.getFixture(77)).rejects.toThrow(
      "Failed to get fixture 77: Not Found"
    );
  });
});
