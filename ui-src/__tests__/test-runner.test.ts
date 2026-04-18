// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@modelcontextprotocol/ext-apps", () => ({
  App: vi.fn(function(this: Record<string, unknown>) {
    this.sendMessage = vi.fn();
    this.connect = vi.fn().mockResolvedValue(undefined);
  }),
}));

// Import fresh each describe block is not possible with ESM caching, so
// we reset DOM state manually and clear the module-level `steps` Map via
// processEvent calls only (no private access needed).
const { renderStep, processEvent, showSummary, processToolResult } = await import(
  "../test-runner.js"
);

// ─── helpers ─────────────────────────────────────────────────────────────────

function resetDOM() {
  document.body.innerHTML = `
    <span id="loading">Loading...</span>
    <div id="steps"></div>
    <div id="error" style="display:none"></div>
    <div id="testName"></div>
    <div id="testDescription"></div>
    <div id="summary" style="display:none"></div>
    <span id="summaryIcon"></span>
    <span id="summaryTitle"></span>
    <span id="passedCount"></span>
    <span id="failedCount"></span>
    <span id="totalDuration"></span>
  `;
}

function makeStep(overrides: Partial<{
  number: number;
  action: string;
  target: string | null;
  value: string | null;
  status: string;
  duration: number;
  error?: string;
  screenshot?: string;
  retried?: boolean;
}> = {}) {
  return {
    number: 1,
    action: "goto",
    target: "/home",
    value: null,
    status: "passed",
    duration: 500,
    ...overrides,
  };
}

// ─── renderStep ───────────────────────────────────────────────────────────────

describe("renderStep", () => {
  it("renders the step number and action", () => {
    const html = renderStep(makeStep({ number: 3, action: "click <button>" }));
    expect(html).toContain("3");
    expect(html).toContain("click &lt;button&gt;");
  });

  it("includes the target when present", () => {
    const html = renderStep(makeStep({ target: "#submit", value: null }));
    expect(html).toContain("#submit");
  });

  it("uses value as fallback when target is null", () => {
    const html = renderStep(makeStep({ target: null, value: "hello world" }));
    expect(html).toContain("hello world");
  });

  it("shows duration badge when duration > 0", () => {
    const html = renderStep(makeStep({ duration: 1500 }));
    expect(html).toContain("1.5s");
  });

  it("omits duration badge when duration is 0", () => {
    const html = renderStep(makeStep({ duration: 0 }));
    expect(html).not.toContain("step-duration");
  });

  it("shows the error message when step has an error", () => {
    const html = renderStep(makeStep({ status: "failed", error: "Element not found" }));
    expect(html).toContain("Element not found");
    expect(html).toContain("step-error");
  });

  it("shows a retried badge when retried is true", () => {
    const html = renderStep(makeStep({ retried: true }));
    expect(html).toContain("badge-retried");
  });

  it("shows screenshot img tag when screenshot is provided", () => {
    const html = renderStep(makeStep({ screenshot: "base64data==" }));
    expect(html).toContain("<img");
    expect(html).toContain("data:image/png;base64,base64data==");
  });

  it("uses data: URI directly when screenshot already has data: prefix", () => {
    const dataUri = "data:image/png;base64,abc123";
    const html = renderStep(makeStep({ screenshot: dataUri }));
    expect(html).toContain(`src="${dataUri}"`);
    expect(html).not.toContain("data:image/png;base64,data:");
  });
});

// ─── processEvent ─────────────────────────────────────────────────────────────

describe("processEvent", () => {
  beforeEach(resetDOM);

  it("adds a running step when step_started event is received", () => {
    processEvent({ type: "step_started", step_number: 1, action: "goto", target: "/home" });
    const steps = document.getElementById("steps") as HTMLElement;
    expect(steps.innerHTML).toContain("goto");
    expect(steps.innerHTML).toContain("running");
  });

  it("updates step to passed on step_completed", () => {
    processEvent({ type: "step_started", step_number: 2, action: "click", target: "#btn" });
    processEvent({ type: "step_completed", step_number: 2, status: "passed", duration: 200 });
    const steps = document.getElementById("steps") as HTMLElement;
    expect(steps.innerHTML).toContain("passed");
  });

  it("calls showSummary on run_completed", () => {
    const summaryEl = document.getElementById("summary") as HTMLElement;
    processEvent({ type: "run_completed" });
    expect(summaryEl.style.display).toBe("block");
  });
});

// ─── showSummary ──────────────────────────────────────────────────────────────

describe("showSummary", () => {
  beforeEach(resetDOM);

  it("shows passed summary when no failed steps", () => {
    // Clear steps by rerunning a new test with only passing steps
    processEvent({ type: "step_started", step_number: 10, action: "goto", target: "/" });
    processEvent({ type: "step_completed", step_number: 10, status: "passed", duration: 100 });
    showSummary();

    const summary = document.getElementById("summary") as HTMLElement;
    expect(summary.className).toContain("passed");
    expect(document.getElementById("summaryTitle")!.textContent).toBe("Test Passed");
  });
});

// ─── processToolResult ────────────────────────────────────────────────────────

describe("processToolResult", () => {
  beforeEach(resetDOM);

  it("hides loading and shows error when data.error is set", () => {
    processToolResult({ error: "Upstream error" });
    expect((document.getElementById("loading") as HTMLElement).style.display).toBe("none");
    const errorDiv = document.getElementById("error") as HTMLElement;
    expect(errorDiv.style.display).toBe("block");
    expect(errorDiv.textContent).toContain("Upstream error");
  });

  it("renders test name and description when test case is provided", () => {
    processToolResult({
      testCase: { id: 1, name: "My Test", description: "Does something" },
      events: [],
    });
    expect(document.getElementById("testName")!.textContent).toBe("My Test");
    expect(document.getElementById("testDescription")!.textContent).toBe("Does something");
  });

  it("replays events and renders steps list", () => {
    processToolResult({
      testCase: { id: 1, name: "T" },
      events: [
        { type: "step_started", step_number: 20, action: "fill", target: "#field", value: "hello" },
        { type: "step_completed", step_number: 20, status: "passed", duration: 300 },
        { type: "run_completed" },
      ],
    });

    const steps = document.getElementById("steps") as HTMLElement;
    expect(steps.innerHTML).toContain("fill");
    expect(document.getElementById("summary")!.style.display).toBe("block");
  });
});
