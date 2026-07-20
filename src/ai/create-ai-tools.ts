import type { RobotRock, SendToHumanActionInput } from "../client.js";
import type { Tool } from "ai";
import type { z } from "zod";
import {
  approveByHumanInputSchema,
  approveByHumanTool as buildApproveByHumanTool,
  type ApproveByHumanToolOptions,
} from "./approve-by-human-tool.js";
import {
  createSendToHumanTool as buildSendToHumanTool,
  sendToHumanToolInputSchema,
  type CreateSendToHumanToolOptions,
} from "./create-send-to-human-tool.js";
import {
  createSendUpdateTool as buildSendUpdateTool,
  sendUpdateToolInputSchema,
  type CreateSendUpdateToolOptions,
  type SendUpdateToolResult,
} from "./create-send-update-tool.js";
import {
  requestActionInputTool as buildRequestActionInputTool,
  requestActionInputToolInputSchema,
  type RequestActionInputToolOptions,
} from "./request-action-input-tool.js";
import {
  reportStatusTool as buildReportStatusTool,
  reportStatusToolInputSchema,
  type ReportStatusToolOptions,
  type ReportStatusToolOutput,
} from "./report-status-tool.js";
import {
  closeChatTool as buildCloseChatTool,
  closeChatToolInputSchema,
  type CloseChatToolOptions,
  type CloseChatToolResult,
} from "./close-chat-tool.js";
import type { RequestActionInputToolOutput } from "./request-action-input-tool-core.js";
import {
  normalizeRobotRockAiContext,
  createRobotRockAiTriggerContext,
  createRobotRockAiWorkflowContext,
  type RobotRockAiContext,
} from "./context.js";
import type { HumanToolResult } from "./types.js";

export type CreateRobotRockAiToolsOptions = {
  /** @default "polling" when `client` is passed; `"trigger"` or `"workflow"` for durable waits. */
  mode?: "polling" | "trigger" | "workflow";
  client?: RobotRock;
  app?: string;
  /**
   * Shared thread for tasks and updates these tools create. Enables the
   * `sendUpdate` tool to auto-thread onto tasks made by the `sendToHuman` tool.
   */
  threadId?: string;
  /**
   * Public chatId of the chat the agent is running in. Enables the `closeChat`
   * tool to close the current chat without the model supplying an id.
   */
  chatId?: string;
};

export type RobotRockAiTools = {
  context: RobotRockAiContext;
  approveByHuman: (
    toolOptions?: ApproveByHumanToolOptions
  ) => Tool<z.infer<typeof approveByHumanInputSchema>, HumanToolResult>;
  sendToHuman: <A extends readonly SendToHumanActionInput[]>(
    toolOptions: CreateSendToHumanToolOptions<A>
  ) => Tool<z.infer<typeof sendToHumanToolInputSchema>, HumanToolResult>;
  sendUpdate: (
    toolOptions?: CreateSendUpdateToolOptions
  ) => Tool<z.infer<typeof sendUpdateToolInputSchema>, SendUpdateToolResult>;
  requestActionInput: (
    toolOptions?: RequestActionInputToolOptions
  ) => Tool<
    z.infer<typeof requestActionInputToolInputSchema>,
    RequestActionInputToolOutput
  >;
  reportStatus: (
    toolOptions?: ReportStatusToolOptions
  ) => Tool<
    z.infer<typeof reportStatusToolInputSchema>,
    ReportStatusToolOutput
  >;
  /**
   * Close the current chat. Requires a `chatId` — from `createRobotRockAiTools`
   * options or per-call `toolOptions`.
   */
  closeChat: (
    toolOptions?: CloseChatToolOptions
  ) => Tool<z.infer<typeof closeChatToolInputSchema>, CloseChatToolResult>;
};

/**
 * Build AI SDK tools for a given RobotRock execution mode.
 *
 * @example Polling (Next.js route, scripts)
 * ```ts
 * const tools = createRobotRockAiTools({ client: robotrock });
 * ```
 *
 * @example Trigger.dev worker
 * ```ts
 * const tools = createRobotRockAiTools({ mode: "trigger", app: "my-agent" });
 * ```
 *
 * @example Vercel Workflow + DurableAgent
 * ```ts
 * const tools = createRobotRockAiTools({ mode: "workflow", app: "my-agent" });
 * ```
 */
export function createRobotRockAiTools(
  options: CreateRobotRockAiToolsOptions
): RobotRockAiTools {
  const mode = options.mode ?? (options.client ? "polling" : "trigger");

  if (mode === "polling" && !options.client) {
    throw new Error('createRobotRockAiTools: polling mode requires `client`.');
  }

  const context: RobotRockAiContext =
    mode === "trigger"
      ? { mode: "trigger", app: options.app }
      : mode === "workflow"
        ? { mode: "workflow", app: options.app }
        : { mode: "polling", client: options.client! };

  const durableContext =
    context.mode === "trigger" || context.mode === "workflow" ? context : null;
  const pollingClient = context.mode === "polling" ? context.client : undefined;

  return {
    context,
    approveByHuman: (toolOptions?: ApproveByHumanToolOptions) =>
      durableContext
        ? buildApproveByHumanTool({ ...durableContext, ...toolOptions })
        : buildApproveByHumanTool(pollingClient!, toolOptions),
    sendToHuman: <A extends readonly SendToHumanActionInput[]>(
      toolOptions: CreateSendToHumanToolOptions<A>
    ) =>
      durableContext
        ? buildSendToHumanTool({
            ...durableContext,
            ...(options.threadId ? { threadId: options.threadId } : {}),
            ...toolOptions,
          })
        : buildSendToHumanTool(pollingClient!, {
            ...(options.threadId ? { threadId: options.threadId } : {}),
            ...toolOptions,
          }),
    sendUpdate: (toolOptions: CreateSendUpdateToolOptions = {}) =>
      durableContext
        ? buildSendUpdateTool({
            ...durableContext,
            ...(options.threadId ? { threadId: options.threadId } : {}),
            ...toolOptions,
          })
        : buildSendUpdateTool(pollingClient!, {
            ...(options.threadId ? { threadId: options.threadId } : {}),
            ...toolOptions,
          }),
    requestActionInput: (toolOptions: RequestActionInputToolOptions = {}) =>
      buildRequestActionInputTool(toolOptions),
    reportStatus: (toolOptions: ReportStatusToolOptions = {}) =>
      buildReportStatusTool(toolOptions),
    closeChat: (toolOptions?: CloseChatToolOptions) => {
      const chatId = toolOptions?.chatId ?? options.chatId;
      if (!chatId) {
        throw new Error(
          "createRobotRockAiTools: closeChat requires `chatId`. Pass it on `createRobotRockAiTools({ chatId })` or `closeChat({ chatId })`."
        );
      }
      const resolvedOptions: CloseChatToolOptions = { ...toolOptions, chatId };
      return durableContext
        ? buildCloseChatTool({ ...durableContext, ...resolvedOptions })
        : buildCloseChatTool(pollingClient!, resolvedOptions);
    },
  };
}

export { createRobotRockAiTriggerContext, createRobotRockAiWorkflowContext, normalizeRobotRockAiContext };
