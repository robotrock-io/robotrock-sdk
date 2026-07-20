import { z } from "zod";

export const REPORT_STATUS_TOOL_NAME = "reportStatus" as const;

export const reportStatusPhaseSchema = z.enum([
  "info",
  "running",
  "waiting",
  "succeeded",
  "failed",
]);

export type ReportStatusPhase = z.infer<typeof reportStatusPhaseSchema>;

export const reportStatusToolInputSchema = z.object({
  message: z
    .string()
    .min(1)
    .describe(
      "Short progress update shown in chat (1-2 sentences). Use while researching, drafting, or waiting on external work."
    ),
  phase: reportStatusPhaseSchema
    .optional()
    .describe(
      "Lifecycle phase for the status marker. Defaults to running. Use succeeded or failed when a step finishes."
    ),
});

export const reportStatusToolOutputSchema = z.object({
  message: z.string().min(1),
  phase: reportStatusPhaseSchema,
});

export type ReportStatusToolInput = z.infer<typeof reportStatusToolInputSchema>;
export type ReportStatusToolOutput = z.infer<typeof reportStatusToolOutputSchema>;

export type ReportStatusToolOptions = {
  description?: string;
  toolName?: string;
};

export type ReportStatusToolDefinition = {
  description: string;
  inputSchema: typeof reportStatusToolInputSchema;
  outputSchema: typeof reportStatusToolOutputSchema;
  execute: (input: ReportStatusToolInput) => Promise<ReportStatusToolOutput>;
};

export function normalizeReportStatusToolInput(
  input: z.input<typeof reportStatusToolInputSchema>
): ReportStatusToolInput {
  const parsed = reportStatusToolInputSchema.parse(input);
  return {
    message: parsed.message.trim(),
    phase: parsed.phase,
  };
}

export async function executeReportStatusTool(
  input: ReportStatusToolInput
): Promise<ReportStatusToolOutput> {
  const normalized = normalizeReportStatusToolInput(input);
  return {
    message: normalized.message,
    phase: normalized.phase ?? "running",
  };
}

export function buildReportStatusToolDefinition(
  options: ReportStatusToolOptions = {}
): ReportStatusToolDefinition {
  const description =
    options.description ??
    "Post a short progress update to the chat UI while you work. Call this before and during long steps (research, drafting, tool runs) so the user sees what is happening. Use phase \"running\" while in progress, \"succeeded\" or \"failed\" when a step completes, and \"waiting\" when blocked on external input.";

  return {
    description,
    inputSchema: reportStatusToolInputSchema,
    outputSchema: reportStatusToolOutputSchema,
    execute: executeReportStatusTool,
  };
}

export function isReportStatusToolPart(
  part: { type?: string },
  toolName: string = REPORT_STATUS_TOOL_NAME
): boolean {
  return part.type === `tool-${toolName}`;
}
