import { z } from "zod";

export const REQUEST_ACTION_INPUT_TOOL_NAME = "requestActionInput" as const;

/** Stable slug when the model omits `action.id` (common LLM mistake). */
export function defaultRequestActionInputActionId(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.length > 0 ? slug : "submit";
}

/** Action shape for tool input — uses records so AI SDK can emit JSON Schema for the model. */
const requestActionInputActionSchema = z.object({
  id: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Stable action identifier echoed in tool output (e.g. pick-blog-topic). Strongly recommended — auto-derived from title when omitted."
    ),
  title: z.string().min(1),
  description: z.string().optional(),
  schema: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("JSON Schema object for the human feedback form"),
  ui: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      "RJSF ui schema overrides (ui:widget, ui:enumNames, etc.). Use ui:widget \"radio\" for 2–6 discrete choices rendered as tappable cards."
    ),
  data: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Optional default form field values"),
});

export function normalizeRequestActionInputToolInput(
  input: z.input<typeof requestActionInputToolInputSchema>
): RequestActionInputToolInput {
  const parsed = requestActionInputToolInputSchema.parse(input);
  return {
    ...parsed,
    action: {
      ...parsed.action,
      id:
        parsed.action.id?.trim() ||
        defaultRequestActionInputActionId(parsed.action.title),
    },
  };
}

export const requestActionInputToolOutputSchema = z.object({
  actionId: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
});

export type RequestActionInputToolOutput = z.infer<
  typeof requestActionInputToolOutputSchema
>;

export const requestActionInputToolInputSchema = z.object({
  prompt: z
    .string()
    .optional()
    .describe("Optional heading shown above the action widget in chat"),
  action: requestActionInputActionSchema.describe(
    "Action widget config: JSON Schema form fields and optional RJSF ui overrides (same shape as RobotRock inbox actions)"
  ),
});

export type RequestActionInputToolInput = z.infer<
  typeof requestActionInputToolInputSchema
>;

export type RequestActionInputToolOptions = {
  description?: string;
  toolName?: string;
};

export type RequestActionInputToolDefinition = {
  description: string;
  inputSchema: typeof requestActionInputToolInputSchema;
  outputSchema: typeof requestActionInputToolOutputSchema;
};

export function buildRequestActionInputToolDefinition(
  options: RequestActionInputToolOptions = {}
): RequestActionInputToolDefinition {
  const description =
    options.description ??
    "Ask the user for structured input via a RobotRock action widget in chat. Always set action.id (e.g. \"pick-blog-topic\") and action.title. Provide action.schema and optional action.ui using the same JSON Schema and RJSF ui shape as inbox action widgets. Put every field you need in a single call — never invoke this tool more than once per turn. For 2–6 discrete options, use a string enum with ui:widget \"radio\" and ui:enumNames — never markdown bullet lists. After the tool returns, act on the user's data immediately; do not ask them to confirm choices they already submitted.";

  return {
    description,
    inputSchema: requestActionInputToolInputSchema,
    outputSchema: requestActionInputToolOutputSchema,
  };
}

export function isRequestActionInputToolPart(
  part: { type?: string },
  toolName: string = REQUEST_ACTION_INPUT_TOOL_NAME
): boolean {
  return part.type === `tool-${toolName}`;
}
