import type { StagedChatHitlRequest } from "../../chats.js";
import { RobotRockError } from "../../http.js";
import type { SessionContext } from "eve/context";
import { tryCreateBoundRobotRockClient } from "./client-from-session.js";

let warnedMissingAuth = false;
let warnedConnectionRefused = false;

function isConnectionRefused(error: unknown): boolean {
  const inspect = (value: unknown): boolean => {
    if (!value || typeof value !== "object") {
      return false;
    }
    if ("code" in value && value.code === "ECONNREFUSED") {
      return true;
    }
    if ("cause" in value) {
      return inspect(value.cause);
    }
    if ("errors" in value && Array.isArray(value.errors)) {
      return value.errors.some((entry) => inspect(entry));
    }
    return false;
  };

  return inspect(error);
}

function logAuditFailure(label: string, error: unknown): void {
  if (isConnectionRefused(error)) {
    if (!warnedConnectionRefused) {
      warnedConnectionRefused = true;
      console.warn(
        "robotrock-chat-audit: RobotRock API is not reachable (connection refused). " +
          "Audit and task-link calls are skipped until the API is up."
      );
    }
    return;
  }

  const hint =
    error instanceof RobotRockError && error.statusCode === 405
      ? " — set ROBOTROCK_BASE_URL=http://localhost:4001/v1 and run the local API"
      : "";
  console.warn(`robotrock-chat-audit: failed to ${label}${hint}`, error);
}

export type RobotRockChatAuditPayload = {
  eveSessionId: string;
  userId: string;
  actionId: string;
  actionTitle?: string;
  prompt?: string;
  data?: Record<string, unknown>;
  idempotencyKey?: string;
  requestId?: string;
  toolCallId?: string;
};

export type RobotRockChatToolAuditPayload = {
  eveSessionId: string;
  userId: string;
  toolCallId: string;
  toolName: string;
  input: Record<string, unknown>;
  success: boolean;
  status: "completed" | "failed" | "rejected";
  error?: string;
  idempotencyKey?: string;
};

/** Observe-only tool audit POST — never throws. */
export async function postRobotRockChatToolAudit(
  ctx: SessionContext,
  payload: RobotRockChatToolAuditPayload
): Promise<void> {
  const client = tryCreateBoundRobotRockClient(ctx);
  if (!client) {
    if (!warnedMissingAuth) {
      warnedMissingAuth = true;
      console.warn(
        "robotrock-chat-audit: RobotRock auth is unset; skipping tool audit logging."
      );
    }
    return;
  }

  try {
    await client.chats.logToolExecution(payload);
  } catch (error) {
    logAuditFailure("log tool execution", error);
  }
}

/** Observe-only audit POST — never throws. */
export async function postRobotRockChatInputAudit(
  ctx: SessionContext,
  payload: RobotRockChatAuditPayload
): Promise<void> {
  const client = tryCreateBoundRobotRockClient(ctx);
  if (!client) {
    if (!warnedMissingAuth) {
      warnedMissingAuth = true;
      console.warn(
        "robotrock-chat-audit: RobotRock auth is unset; skipping HITL audit logging."
      );
    }
    return;
  }

  try {
    await client.chats.logInputSubmission(payload);
  } catch (error) {
    logAuditFailure("log input submission", error);
  }
}

/** Persist pending HITL requests across Eve durable waits — never throws. */
export async function postRobotRockStageHitl(
  ctx: SessionContext,
  input: {
    eveSessionId: string;
    requests: StagedChatHitlRequest[];
  }
): Promise<void> {
  const client = tryCreateBoundRobotRockClient(ctx);
  if (!client) {
    return;
  }

  if (input.requests.length === 0) {
    return;
  }

  try {
    await client.chats.stageHitlRequests(input);
  } catch (error) {
    logAuditFailure("stage HITL requests", error);
  }
}

/** Load staged HITL requests from Convex — returns [] on failure. */
export async function fetchRobotRockStagedHitl(
  ctx: SessionContext,
  eveSessionId: string
): Promise<StagedChatHitlRequest[]> {
  const client = tryCreateBoundRobotRockClient(ctx);
  if (!client) {
    return [];
  }

  try {
    return await client.chats.getStagedHitlRequests(eveSessionId);
  } catch (error) {
    logAuditFailure("fetch staged HITL requests", error);
    return [];
  }
}

/** Register an inbox task with its originating Eve chat session — never throws. */
export async function postRobotRockLinkChatTask(
  ctx: SessionContext,
  input: {
    eveSessionId: string;
    publicTaskId: string;
    toolCallId: string;
  }
): Promise<void> {
  const client = tryCreateBoundRobotRockClient(ctx);
  if (!client) {
    if (!warnedMissingAuth) {
      warnedMissingAuth = true;
      console.warn(
        "robotrock-task-link: RobotRock auth is unset; skipping chat task link."
      );
    }
    return;
  }

  try {
    await client.chats.linkTask(input);
  } catch (error) {
    logAuditFailure("link task to chat", error);
  }
}

/** Reset audit warning flags (tests only). */
export function resetChatAuditWarnings(): void {
  warnedMissingAuth = false;
  warnedConnectionRefused = false;
}
