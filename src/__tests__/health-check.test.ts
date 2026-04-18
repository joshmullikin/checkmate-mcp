import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckmateClient } from "../checkmate-client.js";

describe("CheckmateClient – healthCheck", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns true when the backend responds with 200", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 200 }));

    const client = new CheckmateClient("http://example.test");
    await expect(client.healthCheck()).resolves.toBe(true);
  });

  it("returns false when fetch throws (backend unreachable)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network down"));

    const client = new CheckmateClient("http://example.test");
    await expect(client.healthCheck()).resolves.toBe(false);
  });

  it("returns false when the backend responds with a non-ok status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 503 }));

    const client = new CheckmateClient("http://example.test");
    await expect(client.healthCheck()).resolves.toBe(false);
  });
});
