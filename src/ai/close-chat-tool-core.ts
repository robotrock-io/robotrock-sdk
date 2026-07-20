import { z } from "zod";
import type { RobotRock } from "../client.js";
import {
  closeChatForAi,
  normalizeRobotRockAiContext,
  type RobotRockAiContext,
} from "./context.js";

export const CLOSE_CHAT_TOOL_NAME = "closeChat";

export const closeChatToolInputSchema = z.object({
  reason: z
    .string()
    .optional()
    .describe(
      "Short reason the conversation is being closed (recorded on the audit trail)."
    ),
});

export type CloseChatToolInput = z.infer<typeof closeChatToolInputSchema>;

export type CloseChatToolResult = { closed: boolean; chatId: string };

export type CloseChatToolOptions = {
  /**
   * Public chatId of the chat the agent is running in. Required — the model
   * does not supply it. The agent runtime passes its own chatId here.
   */
  chatId: string;
  description?: string;
};

export type CloseChatToolDurableOptions = CloseChatToolOptions &
  RobotRockAiContext & { mode: "trigger" | "workflow" };

export type CloseChatToolDefinition = {
  description: string;
  inputSchema: typeof closeChatToolInputSchema;
  execute: (input: CloseChatToolInput) => Promise<CloseChatToolResult>;
};

function resolveCloseChatToolConfig(
  clientOrOptions: RobotRock | CloseChatToolDurableOptions,
  maybeOptions?: CloseChatToolOptions
): { aiContext: RobotRockAiContext; options: CloseChatToolOptions } {
  const isDurable =
    typeof clientOrOptions === "object" &&
    clientOrOptions !== null &&
    "mode" in clientOrOptions &&
    (clientOrOptions.mode === "trigger" || clientOrOptions.mode === "workflow");

  const aiContext = normalizeRobotRockAiContext(
    isDurable
      ? {
          mode: (clientOrOptions as CloseChatToolDurableOptions).mode,
          app: (clientOrOptions as CloseChatToolDurableOptions).app,
        }
      : (clientOrOptions as RobotRock)
  );
  const options = isDurable
    ? (clientOrOptions as CloseChatToolDurableOptions)
    : maybeOptions;

  if (!options?.chatId) {
    throw new Error(
      "closeChatTool: `chatId` is required. Pass the chatId of the chat the agent is running in."
    );
  }

  return { aiContext, options };
}

/**
 * Plain tool definition for Vercel Workflow and DurableAgent (no `tool()` wrapper).
 */
export function buildCloseChatToolDefinition(
  clientOrOptions: RobotRock | CloseChatToolDurableOptions,
  maybeOptions?: CloseChatToolOptions
): CloseChatToolDefinition {
  const { aiContext, options } = resolveCloseChatToolConfig(
    clientOrOptions,
    maybeOptions
  );
  const description =
    options.description ??
    "Close the current chat when the conversation is complete and no further human input is needed. Records the close on the audit trail.";

  return {
    description,
    inputSchema: closeChatToolInputSchema,
    execute: async (input: CloseChatToolInput): Promise<CloseChatToolResult> => {
      await closeChatForAi(aiContext, {
        chatId: options.chatId,
        reason: input.reason,
      });
      return { closed: true, chatId: options.chatId };
    },
  };
}
