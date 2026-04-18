// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@modelcontextprotocol/ext-apps", () => ({
  App: vi.fn(function(this: Record<string, unknown>) {
    this.sendMessage = vi.fn();
    this.connect = vi.fn().mockResolvedValue(undefined);
  }),
}));

// Dynamic import after mock is registered
const { renderProjects } = await import("../projects.js");

function setupDOM() {
  document.body.innerHTML = `
    <span id="loading">Loading...</span>
    <div id="projects"></div>
    <div id="error" style="display:none"></div>
    <span id="count"></span>
  `;
}

describe("renderProjects", () => {
  beforeEach(setupDOM);
  afterEach(() => vi.restoreAllMocks());

  it("hides the loading indicator on call", () => {
    renderProjects({});
    const loading = document.getElementById("loading") as HTMLElement;
    expect(loading.style.display).toBe("none");
  });

  it("shows the error div when data contains an error", () => {
    renderProjects({ error: "Something went wrong" });
    const errorDiv = document.getElementById("error") as HTMLElement;
    expect(errorDiv.style.display).toBe("block");
    expect(errorDiv.textContent).toContain("Something went wrong");
  });

  it("shows an empty state when projects array is empty", () => {
    renderProjects({ projects: [] });
    const grid = document.getElementById("projects") as HTMLElement;
    expect(grid.innerHTML).toContain("No projects found");
    expect(document.getElementById("count")!.textContent).toBe("0 projects");
  });

  it("renders a project card for each project and updates count", () => {
    renderProjects({
      projects: [
        {
          id: 1,
          name: "Alpha <Project>",
          base_url: "https://alpha.test",
          test_case_count: 3,
          active_count: 2,
          updated_at: "2024-01-15T00:00:00Z",
        },
      ],
    });

    const grid = document.getElementById("projects") as HTMLElement;
    expect(grid.innerHTML).toContain("Alpha &lt;Project&gt;");
    expect(grid.innerHTML).toContain("https://alpha.test");
    expect(grid.innerHTML).toContain("3 tests");
    expect(document.getElementById("count")!.textContent).toBe("1 project");
  });

  it("uses singular 'project' when count is 1", () => {
    renderProjects({
      projects: [
        {
          id: 2,
          name: "Beta",
          base_url: "https://beta.test",
          test_case_count: 0,
          active_count: 0,
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
    });
    expect(document.getElementById("count")!.textContent).toBe("1 project");
  });
});
