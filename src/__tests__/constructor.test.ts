import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckmateClient } from "../checkmate-client.js";
import { jsonResponse } from "./helpers.js";

describe("CheckmateClient – constructor", () => {
  afterEach(() => vi.restoreAllMocks());

  it("strips trailing slash from base URL", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([]));

    const client = new CheckmateClient("http://example.test/");
    await client.listProjects();

    expect(fetchMock).toHaveBeenCalledWith("http://example.test/api/projects");
  });

  it("preserves base URL without trailing slash", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([]));

    const client = new CheckmateClient("http://example.test");
    await client.listProjects();

    expect(fetchMock).toHaveBeenCalledWith("http://example.test/api/projects");
  });
});
