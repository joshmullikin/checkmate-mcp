import { afterEach, describe, expect, it, vi } from "vitest";

// Use dynamic import so we can re-import under different env vars per test.
async function importLogger() {
  return import("../logger.js");
}

describe("createRequestLogger", () => {
  it("returns a child logger with requestId bound in its bindings", async () => {
    const { createRequestLogger } = await importLogger();
    const reqLogger = createRequestLogger("abc-123");
    expect((reqLogger.bindings() as Record<string, unknown>).requestId).toBe("abc-123");
  });

  it("returns a different child instance for each requestId", async () => {
    const { createRequestLogger } = await importLogger();
    const a = createRequestLogger("req-1");
    const b = createRequestLogger("req-2");
    expect((a.bindings() as Record<string, unknown>).requestId).toBe("req-1");
    expect((b.bindings() as Record<string, unknown>).requestId).toBe("req-2");
  });
});

describe("logToolCall", () => {
  afterEach(() => vi.restoreAllMocks());

  it("calls toolLogger.info with tool name, params, and message", async () => {
    const { toolLogger, logToolCall } = await importLogger();
    const spy = vi.spyOn(toolLogger, "info");

    logToolCall("list_projects", { page: 1 });

    expect(spy).toHaveBeenCalledOnce();
    const [obj, msg] = spy.mock.calls[0] as [Record<string, unknown>, string];
    expect(obj.tool).toBe("list_projects");
    expect(obj.params).toEqual({ page: 1 });
    expect(msg).toBe("Tool called: list_projects");
  });

  it("merges extra fields into the log object", async () => {
    const { toolLogger, logToolCall } = await importLogger();
    const spy = vi.spyOn(toolLogger, "info");

    logToolCall("run_test", { id: 5 }, { projectId: 3 });

    const [obj] = spy.mock.calls[0] as [Record<string, unknown>, string];
    expect(obj.projectId).toBe(3);
  });
});

describe("logToolResult", () => {
  afterEach(() => vi.restoreAllMocks());

  it("calls toolLogger.info on success with correct fields", async () => {
    const { toolLogger, logToolResult } = await importLogger();
    const infoSpy = vi.spyOn(toolLogger, "info");

    logToolResult("list_projects", true, 42);

    expect(infoSpy).toHaveBeenCalledOnce();
    const [obj, msg] = infoSpy.mock.calls[0] as [Record<string, unknown>, string];
    expect(obj.tool).toBe("list_projects");
    expect(obj.success).toBe(true);
    expect(obj.durationMs).toBe(42);
    expect(msg).toBe("Tool completed: list_projects");
  });

  it("calls toolLogger.error on failure with correct fields", async () => {
    const { toolLogger, logToolResult } = await importLogger();
    const errorSpy = vi.spyOn(toolLogger, "error");

    logToolResult("run_test", false, 99);

    expect(errorSpy).toHaveBeenCalledOnce();
    const [obj, msg] = errorSpy.mock.calls[0] as [Record<string, unknown>, string];
    expect(obj.tool).toBe("run_test");
    expect(obj.success).toBe(false);
    expect(obj.durationMs).toBe(99);
    expect(msg).toBe("Tool failed: run_test");
  });

  it("merges extra fields into the log object", async () => {
    const { toolLogger, logToolResult } = await importLogger();
    const infoSpy = vi.spyOn(toolLogger, "info");

    logToolResult("list_projects", true, undefined, { projectId: 7 });

    const [obj] = infoSpy.mock.calls[0] as [Record<string, unknown>, string];
    expect(obj.projectId).toBe(7);
  });
});
