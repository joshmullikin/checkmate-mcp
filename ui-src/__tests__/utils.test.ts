// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { escapeHtml, formatDuration } from "../utils.js";

describe("escapeHtml", () => {
  it("escapes < and > characters", () => {
    expect(escapeHtml("<b>bold</b>")).toBe("&lt;b&gt;bold&lt;/b&gt;");
  });

  it("escapes & character", () => {
    expect(escapeHtml("foo & bar")).toBe("foo &amp; bar");
  });

  it("returns plain text unchanged", () => {
    expect(escapeHtml("safe text")).toBe("safe text");
  });

  it("returns empty string unchanged", () => {
    expect(escapeHtml("")).toBe("");
  });
});

describe("formatDuration", () => {
  it("returns milliseconds for values under 1000ms", () => {
    expect(formatDuration(0)).toBe("0ms");
    expect(formatDuration(250)).toBe("250ms");
    expect(formatDuration(999)).toBe("999ms");
  });

  it("returns seconds with one decimal place for 1000ms and above", () => {
    expect(formatDuration(1000)).toBe("1.0s");
    expect(formatDuration(1500)).toBe("1.5s");
    expect(formatDuration(2750)).toBe("2.8s");
  });
});
