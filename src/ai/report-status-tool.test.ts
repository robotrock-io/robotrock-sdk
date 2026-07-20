import { describe, expect, it } from "vitest";
import {
  buildReportStatusToolDefinition,
  executeReportStatusTool,
  isReportStatusToolPart,
  normalizeReportStatusToolInput,
  REPORT_STATUS_TOOL_NAME,
  reportStatusToolInputSchema,
} from "./report-status-tool-core.js";

describe("reportStatusTool", () => {
  it("defaults phase to running", async () => {
    const result = await executeReportStatusTool({
      message: "Researching topic…",
    });

    expect(result).toEqual({
      message: "Researching topic…",
      phase: "running",
    });
  });

  it("trims message whitespace", () => {
    const normalized = normalizeReportStatusToolInput({
      message: "  Drafting outline…  ",
      phase: "succeeded",
    });

    expect(normalized.message).toBe("Drafting outline…");
    expect(normalized.phase).toBe("succeeded");
  });

  it("parses input schema", () => {
    const parsed = reportStatusToolInputSchema.parse({
      message: "Waiting on image generation…",
      phase: "waiting",
    });

    expect(parsed.phase).toBe("waiting");
  });

  it("detects report status tool parts", () => {
    expect(
      isReportStatusToolPart({ type: `tool-${REPORT_STATUS_TOOL_NAME}` })
    ).toBe(true);
    expect(isReportStatusToolPart({ type: "tool-generateImage" })).toBe(false);
  });

  it("builds a definition with execute", async () => {
    const definition = buildReportStatusToolDefinition();
    const result = await definition.execute({ message: "Outlining post…" });

    expect(result.phase).toBe("running");
    expect(definition.description).toContain("progress update");
  });
});
