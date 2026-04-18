// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@modelcontextprotocol/ext-apps", () => ({
  App: vi.fn(function(this: Record<string, unknown>) {
    this.sendMessage = vi.fn();
    this.connect = vi.fn().mockResolvedValue(undefined);
  }),
}));

const { renderTestCases } = await import("../test-cases.js");

function setupDOM() {
  document.body.innerHTML = `
    <span id="loading">Loading...</span>
    <div id="testCases"></div>
    <div id="error" style="display:none"></div>
    <span id="count"></span>
    <div id="projectName"></div>
  `;
}

describe("renderTestCases", () => {
  beforeEach(setupDOM);
  afterEach(() => vi.restoreAllMocks());

  it("hides the loading indicator on call", () => {
    renderTestCases({});
    expect((document.getElementById("loading") as HTMLElement).style.display).toBe("none");
  });

  it("shows error div when data contains an error", () => {
    renderTestCases({ error: "Not found" });
    const errorDiv = document.getElementById("error") as HTMLElement;
    expect(errorDiv.style.display).toBe("block");
    expect(errorDiv.textContent).toContain("Not found");
  });

  it("shows empty state when test cases array is empty", () => {
    renderTestCases({ testCases: [], project: { id: 1, name: "MyProject" } });
    expect(document.getElementById("testCases")!.innerHTML).toContain("No test cases found");
    expect(document.getElementById("projectName")!.textContent).toContain("MyProject");
  });

  it("renders test case cards with status/priority badges", () => {
    renderTestCases({
      project: { id: 1, name: "Proj" },
      testCases: [
        {
          id: 10,
          name: "Login <test>",
          description: "Verify login",
          status: "active",
          priority: "high",
          steps_count: 5,
          updated_at: "2024-06-01T00:00:00Z",
        },
      ],
    });

    const grid = document.getElementById("testCases") as HTMLElement;
    expect(grid.innerHTML).toContain("Login &lt;test&gt;");
    expect(grid.innerHTML).toContain("Verify login");
    expect(grid.innerHTML).toContain("badge-status active");
    expect(grid.innerHTML).toContain("badge-priority high");
    expect(grid.innerHTML).toContain("5 steps");
    expect(document.getElementById("count")!.textContent).toBe("1 test");
  });

  it("uses plural 'tests' when count is not 1", () => {
    renderTestCases({
      testCases: [
        {
          id: 1,
          name: "A",
          description: "",
          status: "active",
          priority: "low",
          steps_count: 0,
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: 2,
          name: "B",
          description: "",
          status: "active",
          priority: "low",
          steps_count: 0,
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
    });
    expect(document.getElementById("count")!.textContent).toBe("2 tests");
  });
});
