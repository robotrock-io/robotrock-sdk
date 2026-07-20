import { defineHook } from "eve/hooks";
import type { HookContext, HookDefinition } from "eve/hooks";
import type { StagedChatHitlRequest } from "../../../chats.js";
import {
  buildEveInputAuditSubmissionData,
  eveInputResponseToActionSubmission,
  isEveApprovalInputRequest,
  parseEveAskQuestionToolOutput,
  resolveEveFreeformTextToInputResponse,
} from "../../input-audit.js";
import type { EveInputRequest, EveInputRequestDisplay } from "../../input-request.js";
import {
  fetchRobotRockStagedHitl,
  postRobotRockChatInputAudit,
  postRobotRockStageHitl,
} from "../chat-audit-api.js";
import { tryResolveTenantCaller } from "../tenant.js";

type PendingInputRequest = StagedChatHitlRequest;

const loggedIdempotencyKeys = new Set<string>();

function toEveInputRequest(request: PendingInputRequest): EveInputRequest {
  return {
    requestId: request.requestId,
    prompt: request.prompt,
    ...(request.display ? { display: request.display } : {}),
    ...(request.allowFreeform !== undefined
      ? { allowFreeform: request.allowFreeform }
      : {}),
    ...(request.options ? { options: request.options } : {}),
  };
}

async function logPendingInputResponse(
  ctx: HookContext,
  pending: PendingInputRequest,
  response: { requestId: string; optionId?: string; text?: string }
): Promise<void> {
  const caller = tryResolveTenantCaller(ctx);
  if (!caller) {
    return;
  }

  const idempotencyKey = `${ctx.session.id}:${pending.requestId}`;
  if (loggedIdempotencyKeys.has(idempotencyKey)) {
    return;
  }

  const eveRequest = toEveInputRequest(pending);
  const submission = eveInputResponseToActionSubmission(eveRequest, response, {
    toolName: pending.toolName,
  });

  const toolInput =
    pending.display === "confirmation" ? pending.toolInput : undefined;

  await postRobotRockChatInputAudit(ctx, {
    eveSessionId: ctx.session.id,
    userId: caller.userId,
    actionId: submission.actionId,
    actionTitle: submission.actionTitle,
    prompt: pending.prompt,
    requestId: pending.requestId,
    toolCallId: pending.toolCallId,
    data: buildEveInputAuditSubmissionData(
      {
        toolCallId: pending.toolCallId,
        toolName: pending.toolName,
        requestId: pending.requestId,
        display: pending.display as EveInputRequestDisplay | undefined,
        toolInput,
      },
      submission.formData
    ),
    idempotencyKey,
  });

  loggedIdempotencyKeys.add(idempotencyKey);
}

/** Reset logged idempotency keys (tests only). */
export function resetRobotrockChatAuditIdempotencyKeys(): void {
  loggedIdempotencyKeys.clear();
}

export const robotrockChatAuditHook: HookDefinition = defineHook({
  events: {
    async "input.requested"(event, ctx) {
      const requests: StagedChatHitlRequest[] = [];

      for (const request of event.data.requests) {
        if (request.action.kind !== "tool-call") {
          continue;
        }

        requests.push({
          requestId: request.requestId,
          prompt: request.prompt,
          toolName: request.action.toolName,
          toolCallId: request.action.callId,
          ...(request.display ? { display: request.display } : {}),
          ...(request.allowFreeform !== undefined
            ? { allowFreeform: request.allowFreeform }
            : {}),
          ...(request.options ? { options: request.options } : {}),
          ...(request.action.input !== undefined
            ? {
                toolInput:
                  request.action.input != null &&
                  typeof request.action.input === "object" &&
                  !Array.isArray(request.action.input)
                    ? (request.action.input as Record<string, unknown>)
                    : undefined,
              }
            : {}),
        });
      }

      await postRobotRockStageHitl(ctx, {
        eveSessionId: ctx.session.id,
        requests,
      });
    },

    async "message.received"(event, ctx) {
      const message = event.data.message?.trim();
      if (!message) {
        return;
      }

      const staged = await fetchRobotRockStagedHitl(ctx, ctx.session.id);
      for (const pending of staged) {
        const response = resolveEveFreeformTextToInputResponse(
          toEveInputRequest(pending),
          message
        );
        if (!response) {
          continue;
        }
        await logPendingInputResponse(ctx, pending, response);
      }
    },

    async "action.result"(event, ctx) {
      const result = event.data.result;
      if (result.kind !== "tool-result") {
        return;
      }

      const staged = await fetchRobotRockStagedHitl(ctx, ctx.session.id);
      const pending = staged.find((entry) => entry.toolCallId === result.callId);
      if (!pending) {
        return;
      }

      const idempotencyKey = `${ctx.session.id}:${pending.requestId}`;
      if (loggedIdempotencyKeys.has(idempotencyKey)) {
        return;
      }

      if (pending.toolName === "ask_question") {
        const parsed = parseEveAskQuestionToolOutput(result.output);
        if (parsed) {
          await logPendingInputResponse(ctx, pending, {
            requestId: pending.requestId,
            ...parsed,
          });
        }
      } else if (isEveApprovalInputRequest(toEveInputRequest(pending))) {
        if (event.data.status === "rejected") {
          await logPendingInputResponse(ctx, pending, {
            requestId: pending.requestId,
            optionId: "deny",
          });
        } else if (event.data.status === "completed") {
          await logPendingInputResponse(ctx, pending, {
            requestId: pending.requestId,
            optionId: "approve",
          });
        }
      }
    },
  },
});

/** Alias for agents that prefer a factory name. */
export function defineRobotRockChatAuditHook(): HookDefinition {
  return robotrockChatAuditHook;
}
