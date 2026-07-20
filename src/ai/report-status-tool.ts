import { tool, type Tool } from "ai";
import type { z } from "zod";
import {
  buildReportStatusToolDefinition,
  reportStatusToolInputSchema,
  type ReportStatusToolOptions,
  type ReportStatusToolOutput,
} from "./report-status-tool-core.js";

/**
 * AI SDK tool that posts ephemeral progress updates to the agent chat UI.
 *
 * Fire-and-forget: executes immediately and renders as a status marker in chat.
 *
 * @example
 * ```ts
 * tools: {
 *   reportStatus: reportStatusTool(),
 * }
 * ```
 */
export function reportStatusTool(
  options: ReportStatusToolOptions = {}
): Tool<
  z.infer<typeof reportStatusToolInputSchema>,
  ReportStatusToolOutput
> {
  return tool(buildReportStatusToolDefinition(options));
}

export {
  buildReportStatusToolDefinition,
  executeReportStatusTool,
  isReportStatusToolPart,
  normalizeReportStatusToolInput,
  REPORT_STATUS_TOOL_NAME,
  reportStatusPhaseSchema,
  reportStatusToolInputSchema,
  reportStatusToolOutputSchema,
} from "./report-status-tool-core.js";
export type {
  ReportStatusPhase,
  ReportStatusToolDefinition,
  ReportStatusToolInput,
  ReportStatusToolOptions,
  ReportStatusToolOutput,
} from "./report-status-tool-core.js";
