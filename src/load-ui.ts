import { readFileSync } from "fs";
import { serverLogger } from "./logger.js";

export function loadUI(filename: string, baseDir = "./ui"): string {
  try {
    const html = readFileSync(`${baseDir}/${filename}`, "utf-8");
    serverLogger.debug({ filename }, "Loaded UI file");
    return html;
  } catch (e) {
    serverLogger.error({ filename, error: e }, "Failed to load UI file");
    return `<!DOCTYPE html><html><body><h1>UI not found: ${filename}</h1></body></html>`;
  }
}
