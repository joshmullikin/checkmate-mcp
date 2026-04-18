import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckmateClient } from "../checkmate-client.js";
import { baseProject, errorResponse, jsonResponse } from "./helpers.js";

describe("CheckmateClient – listProjects", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns project list from API", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse([baseProject])
    );

    const client = new CheckmateClient("http://example.test");
    const projects = await client.listProjects();

    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe("P1");
  });

  it("throws with status text on HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      errorResponse("Internal Server Error", 500)
    );

    const client = new CheckmateClient("http://example.test");
    await expect(client.listProjects()).rejects.toThrow(
      "Failed to list projects: Internal Server Error"
    );
  });
});

describe("CheckmateClient – getProject", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns the requested project", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse(baseProject));

    const client = new CheckmateClient("http://example.test");
    const project = await client.getProject(1);

    expect(project.id).toBe(1);
    expect(project.name).toBe("P1");
  });

  it("throws with project id in message on HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(errorResponse("Not Found", 404));

    const client = new CheckmateClient("http://example.test");
    await expect(client.getProject(42)).rejects.toThrow(
      "Failed to get project 42: Not Found"
    );
  });
});
