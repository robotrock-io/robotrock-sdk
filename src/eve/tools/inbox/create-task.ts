import { defineTool } from "eve/tools";
import { z } from "zod";
import type { TenantCaller } from "../../agent/tenant.js";
import {
  buildRobotRockTaskPayload,
  createRobotRockTask,
  type RobotRockTaskToolInput,
} from "../../agent/task-delegation.js";
import { postRobotRockLinkChatTask } from "../../agent/chat-audit-api.js";
import { requireTenantCaller } from "../../agent/tenant.js";
import {
  CREATE_INBOX_TASK_REPLY_GUIDANCE,
  withReplyGuidance,
} from "../../tool-reply-guidance.js";

/** Eve tool slug — must match the agent tool filename `create_robotrock_task.ts`. */
export const CREATE_INBOX_TASK_TOOL_NAME = "create_robotrock_task";

const actionSchema = z.object({
  id: z.string().min(1).describe("Stable action id, e.g. approve or reject."),
  title: z.string().min(1).describe("Button label shown in the inbox."),
  description: z.string().min(1).optional(),
});

const assignToSchema = z
  .object({
    users: z
      .array(z.string().email())
      .optional()
      .describe("Assignee emails — only these users (plus group members) see the task."),
    groups: z
      .array(z.string().min(1))
      .optional()
      .describe(
        'Group slugs, e.g. "finance" or virtual "admins". Virtual "all" means everyone; omit assignTo for the same effect.'
      ),
  })
  .optional()
  .refine(
    (value) =>
      value === undefined ||
      (value.users?.length ?? 0) > 0 ||
      (value.groups?.length ?? 0) > 0,
    { message: "assignTo needs at least one user email or group slug." }
  )
  .refine(
    (value) => {
      const groups = value?.groups ?? [];
      if (groups.includes("all") && groups.length > 1) {
        return false;
      }
      return true;
    },
    { message: 'Cannot combine "all" with other group slugs' }
  );

const contextSchema = z
  .object({
    data: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Structured fields shown in the inbox task detail."),
    ui: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        'Optional ui:* hints keyed by context.data field name (ui:widget, ui:title, ui:options). ' +
          'Use currency for amounts, date for ISO timestamps, link/image for URLs. ' +
          'Load the robotrock skill → context-widgets reference for the full widget catalog.'
      ),
  })
  .optional();

export const createInboxTaskInputSchema = z.object({
  type: z
    .string()
    .min(1)
    .describe("Task category slug, e.g. refund-approval or budget-approval."),
  name: z.string().min(1).describe("Short title shown in the inbox list."),
  description: z.string().min(1).optional(),
  actions: z
    .array(actionSchema)
    .min(1)
    .describe("At least one reviewer action (approve, reject, etc.)."),
  assignTo: assignToSchema.describe(
    "Limit visibility to specific users and/or groups. Omit to show the task to everyone in the tenant."
  ),
  context: contextSchema,
  validUntilHours: z
    .number()
    .positive()
    .optional()
    .describe("Optional deadline in hours from now. Defaults to the tenant task TTL."),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  updateMessage: z
    .string()
    .min(1)
    .optional()
    .describe("Optional thread status update logged when the task is created."),
  delegationReason: z
    .string()
    .min(1)
    .optional()
    .describe(
      "User-facing explanation of why the requester cannot self-approve and the task was routed elsewhere. Required when assignTo excludes the caller."
    ),
});

export type CreateInboxTaskToolInput = z.infer<typeof createInboxTaskInputSchema>;

export type DefineCreateInboxTaskToolOptions = {
  defaultApp?: string;
  resolveDelegationReason?: (
    input: CreateInboxTaskToolInput,
    caller: TenantCaller
  ) => string | undefined;
};

function defaultResolveDelegationReason(
  input: CreateInboxTaskToolInput
): string | undefined {
  const assigneeGroups = input.assignTo?.groups?.filter(Boolean) ?? [];
  if (assigneeGroups.length > 0) {
    return `This was routed to ${assigneeGroups.join(", ")} for review because you are not in the assignee group.`;
  }
  return undefined;
}

export function defineCreateInboxTaskTool(
  options?: DefineCreateInboxTaskToolOptions
) {
  return defineTool({
    description:
      "Create a RobotRock inbox task and assign it to users or groups. Does not wait for a response. " +
      "Only call this after the user explicitly asked to create/send/delegate an inbox task, or after they confirmed via ask_question. " +
      "Never create a task silently when the user only asked for a preview, dummy example, or explanation. " +
      "Always set delegationReason when assignTo excludes the caller. " +
      "For refund approvals include chargeId, amount, currency, and reason in context.data. " +
      "When you show the created task in OpenUI, do not restate task ID, assignee, or delegation details in your reply.",
    inputSchema: createInboxTaskInputSchema,
    async execute(input, ctx) {
      const caller = requireTenantCaller(ctx);
      const payload = buildRobotRockTaskPayload(input as RobotRockTaskToolInput, {
        requestedByEmail: caller.email,
      });

      if (options?.defaultApp && !payload.app) {
        payload.app = options.defaultApp;
      }

      const task = await createRobotRockTask(payload, ctx);
      const delegationReason =
        options?.resolveDelegationReason?.(input, caller) ??
        input.delegationReason?.trim() ??
        defaultResolveDelegationReason(input);

      await postRobotRockLinkChatTask(ctx, {
        eveSessionId: ctx.session.id,
        publicTaskId: task.taskId,
        toolCallId: ctx.callId,
      });

      return withReplyGuidance(
        {
          ...task,
          name: input.name,
          assignedTo: input.assignTo ?? null,
          requestedBy: caller.email,
          delegationReason: delegationReason ?? null,
          message: delegationReason
            ? `${delegationReason} This chat updates when the assignee decides.`
            : "Task created in RobotRock. Assignees can handle it from their inbox; this chat will update when they decide.",
        },
        CREATE_INBOX_TASK_REPLY_GUIDANCE
      );
    },
  });
}

export const createInboxTaskTool = defineCreateInboxTaskTool();
