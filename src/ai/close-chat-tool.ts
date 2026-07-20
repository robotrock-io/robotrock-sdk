import { tool, type Tool } from "ai";
import type { z } from "zod";
import type { RobotRock } from "../client.js";
import {
  buildCloseChatToolDefinition,
  closeChatToolInputSchema,
  type CloseChatToolDurableOptions,
  type CloseChatToolOptions,
  type CloseChatToolResult,
} from "./close-chat-tool-core.js";

/**
 * AI SDK tool that lets a chat agent close its own chat when done.
 *
 * - `closeChatTool(robotrock, { chatId })` — polling client (default).
 * - `closeChatTool({ mode: "trigger", app?, chatId })` — Trigger.dev worker.
 * - `closeChatTool({ mode: "workflow", app?, chatId })` — Vercel Workflow.
 */
export function closeChatTool(
  clientOrOptions: RobotRock | CloseChatToolDurableOptions,
  maybeOptions?: CloseChatToolOptions
): Tool<z.infer<typeof closeChatToolInputSchema>, CloseChatToolResult> {
  return tool(buildCloseChatToolDefinition(clientOrOptions, maybeOptions));
}

export { closeChatToolInputSchema, CLOSE_CHAT_TOOL_NAME } from "./close-chat-tool-core.js";
export type {
  CloseChatToolDefinition,
  CloseChatToolDurableOptions,
  CloseChatToolInput,
  CloseChatToolOptions,
  CloseChatToolResult,
} from "./close-chat-tool-core.js";
