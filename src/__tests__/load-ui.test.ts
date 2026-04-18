import { afterEach, describe, expect, it, vi } from "vitest";
import { loadUI } from "../load-ui.js";

vi.mock("fs");

describe("loadUI", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns HTML content when the file exists", async () => {
    const { readFileSync } = await import("fs");
    vi.mocked(readFileSync).mockReturnValueOnce("<html>projects</html>");

    const result = loadUI("projects.html");

    expect(result).toBe("<html>projects</html>");
    expect(vi.mocked(readFileSync)).toHaveBeenCalledWith("./ui/projects.html", "utf-8");
  });

  it("uses a custom baseDir when provided", async () => {
    const { readFileSync } = await import("fs");
    vi.mocked(readFileSync).mockReturnValueOnce("<html>ok</html>");

    loadUI("test.html", "/custom/ui");

    expect(vi.mocked(readFileSync)).toHaveBeenCalledWith("/custom/ui/test.html", "utf-8");
  });

  it("returns a fallback HTML page containing the filename when the file is missing", async () => {
    const { readFileSync } = await import("fs");
    vi.mocked(readFileSync).mockImplementationOnce(() => {
      throw new Error("ENOENT: no such file");
    });

    const result = loadUI("missing.html");

    expect(result).toContain("missing.html");
    expect(result).toMatch(/^<!DOCTYPE html>/);
  });
});
