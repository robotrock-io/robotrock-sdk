import { tool, type Tool } from "ai";
import type { z } from "zod";
import {
  buildRequestActionInputToolDefinition,
  requestActionInputToolInputSchema,
  type RequestActionInputToolOptions,
  type RequestActionInputToolOutput,
} from "./request-action-input-tool-core.js";

/**
 * Client-side AI SDK tool that renders a RobotRock action widget in chat.
 *
 * Has no `execute` — the chat UI collects input and calls `addToolOutput`.
 *
 * @example
 * ```ts
 * tools: {
 *   requestActionInput: requestActionInputTool(),
 * }
 * ```
 */
export function requestActionInputTool(
  options: RequestActionInputToolOptions = {}
): Tool<
  z.infer<typeof requestActionInputToolInputSchema>,
  RequestActionInputToolOutput
> {
  const definition = buildRequestActionInputToolDefinition(options);
  return tool(definition);
}

export {
  buildRequestActionInputToolDefinition,
  isRequestActionInputToolPart,
  REQUEST_ACTION_INPUT_TOOL_NAME,
  requestActionInputToolInputSchema,
  requestActionInputToolOutputSchema,
  defaultRequestActionInputActionId,
  normalizeRequestActionInputToolInput,
} from "./request-action-input-tool-core.js";
export type {
  RequestActionInputToolDefinition,
  RequestActionInputToolInput,
  RequestActionInputToolOptions,
  RequestActionInputToolOutput,
} from "./request-action-input-tool-core.js";
