const CREATE_INBOX_TASK_TOOL_NAME = "create_robotrock_task";

const SKIP_TOOL_NAMES = new Set([
  CREATE_INBOX_TASK_TOOL_NAME,
  "ask_question",
  "closeChat",
  "requestActionInput",
]);

export type ChatToolAuditInput = Record<string, unknown>;

export type ChatToolAuditPayload = {
  toolCallId: string;
  toolName: string;
  input: ChatToolAuditInput;
  success: boolean;
  status: "completed" | "failed" | "rejected";
  error?: string;
};

/**
 * Whether a completed tool call should appear on the RobotRock audit trail.
 * Admin mutations are logged via chat-correlated API audit instead.
 */
export function shouldAuditToolExecution(
  toolName: string,
  _input: ChatToolAuditInput
): boolean {
  if (SKIP_TOOL_NAMES.has(toolName)) {
    return false;
  }

  return false;
}

const AUDIT_INPUT_KEYS = new Set([
  "action",
  "email",
  "userId",
  "role",
  "name",
  "groupId",
  "description",
]);

/** Keep only fields useful for audit display (no secrets or large blobs). */
export function sanitizeToolAuditInput(
  input: ChatToolAuditInput
): ChatToolAuditInput {
  const sanitized: ChatToolAuditInput = {};
  for (const [key, value] of Object.entries(input)) {
    if (!AUDIT_INPUT_KEYS.has(key)) {
      continue;
    }
    if (value == null || value === "") {
      continue;
    }
    if (typeof value === "string" || typeof value === "boolean") {
      sanitized[key] = value;
      continue;
    }
    if (typeof value === "number") {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function buildChatToolAuditPayload(input: {
  toolCallId: string;
  toolName: string;
  toolInput: ChatToolAuditInput;
  status: "completed" | "failed" | "rejected";
  error?: string;
  isError?: boolean;
}): ChatToolAuditPayload | null {
  const sanitized = sanitizeToolAuditInput(input.toolInput);
  if (!shouldAuditToolExecution(input.toolName, sanitized)) {
    return null;
  }

  const success =
    input.status === "completed" && input.isError !== true;

  return {
    toolCallId: input.toolCallId,
    toolName: input.toolName,
    input: sanitized,
    success,
    status: input.status,
    ...(input.error ? { error: input.error } : {}),
  };
}
