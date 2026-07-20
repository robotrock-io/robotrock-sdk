import {
  EVE_INPUT_SUBMIT_ACTION_ID,
  eveInputRequestToActions,
  resolveEveInputDisplay,
  type EveInputOption,
  type EveInputRequest,
  type EveInputRequestDisplay,
  type EveInputResponse,
} from "./input-request.js";

export type EveInputAuditContext = {
  toolCallId: string;
  toolName?: string;
  requestId?: string;
  display?: EveInputRequestDisplay;
  toolInput?: unknown;
};

function matchOptionByText(
  text: string,
  options: readonly EveInputOption[]
): EveInputOption | undefined {
  const normalized = text.trim().toLowerCase();
  if (normalized.length === 0) {
    return undefined;
  }

  const byId = options.find((option) => option.id.toLowerCase() === normalized);
  if (byId) {
    return byId;
  }

  const byLabel = options.find((option) => option.label.toLowerCase() === normalized);
  if (byLabel) {
    return byLabel;
  }

  const index = Number(normalized);
  if (Number.isInteger(index) && index > 0 && index <= options.length) {
    return options[index - 1];
  }

  return undefined;
}

/**
 * Map freeform composer text to an Eve `InputResponse`, mirroring Eve's
 * `resolveTextToResponse` rules (option id/label, numeric index, freeform text).
 */
export function resolveEveFreeformTextToInputResponse(
  request: EveInputRequest,
  text: string
): EveInputResponse | undefined {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const options = request.options ?? [];
  if (options.length > 0) {
    const matched = matchOptionByText(trimmed, options);
    if (matched) {
      return { requestId: request.requestId, optionId: matched.id };
    }
  }

  if (request.allowFreeform === true || options.length === 0) {
    return { requestId: request.requestId, text: trimmed };
  }

  return undefined;
}

/** Returns true for Eve's default approval gate (approve / deny options). */
export function isEveApprovalInputRequest(request: EveInputRequest): boolean {
  const options = request.options ?? [];
  return (
    options.length === 2 &&
    options[0]?.id === "approve" &&
    options[1]?.id === "deny"
  );
}

export type EveInputActionSubmission = {
  actionId: string;
  actionTitle: string;
  formData: Record<string, unknown>;
};

function buildOptionIdFormData(
  display: EveInputRequestDisplay | undefined,
  optionId: string
): Record<string, unknown> {
  if (display === "select" || display === "confirmation") {
    return { choice: optionId };
  }
  return {};
}

/**
 * Map a resolved Eve `InputResponse` to RobotRock audit fields (action id/title).
 */
export function eveInputResponseToActionSubmission(
  request: EveInputRequest,
  response: EveInputResponse,
  options?: { toolName?: string }
): EveInputActionSubmission {
  const display = resolveEveInputDisplay(request, options?.toolName);
  const actions = eveInputRequestToActions(request, options);

  if (response.optionId) {
    const action = actions.find((entry) => entry.id === response.optionId);
    if (action) {
      return {
        actionId: response.optionId,
        actionTitle: action.title,
        formData: buildOptionIdFormData(display, response.optionId),
      };
    }

    const option = request.options?.find((entry) => entry.id === response.optionId);
    if (option) {
      return {
        actionId: response.optionId,
        actionTitle: option.label,
        formData: buildOptionIdFormData(display, response.optionId),
      };
    }

    return {
      actionId: response.optionId,
      actionTitle: response.optionId,
      formData: buildOptionIdFormData(display, response.optionId),
    };
  }

  const text = response.text?.trim();
  if (text) {
    if (display === "text") {
      return {
        actionId: EVE_INPUT_SUBMIT_ACTION_ID,
        actionTitle: text,
        formData: { answer: text },
      };
    }

    if (display === "select") {
      const option = request.options?.find((entry) => entry.id === text);
      if (option) {
        return {
          actionId: EVE_INPUT_SUBMIT_ACTION_ID,
          actionTitle: option.label,
          formData: { choice: option.id },
        };
      }
      return {
        actionId: EVE_INPUT_SUBMIT_ACTION_ID,
        actionTitle: text,
        formData: { choice: text },
      };
    }

    return {
      actionId: EVE_INPUT_SUBMIT_ACTION_ID,
      actionTitle: text,
      formData: { answer: text },
    };
  }

  return {
    actionId: EVE_INPUT_SUBMIT_ACTION_ID,
    actionTitle: "Responded",
    formData: {},
  };
}

/** Audit payload for `chat_action_input_submitted`. */
export function buildEveInputAuditSubmissionData(
  context: EveInputAuditContext,
  formData: Record<string, unknown>
): Record<string, unknown> {
  return {
    toolCallId: context.toolCallId,
    ...(context.toolName ? { toolName: context.toolName } : {}),
    ...(context.requestId ? { requestId: context.requestId } : {}),
    ...(context.display ? { display: context.display } : {}),
    ...(context.toolInput !== undefined ? { toolInput: context.toolInput } : {}),
    ...formData,
  };
}

/**
 * Parse an `ask_question` tool result output into an Eve input response shape.
 */
export function parseEveAskQuestionToolOutput(
  output: unknown
): Pick<EveInputResponse, "optionId" | "text"> | null {
  if (output == null || typeof output !== "object") {
    return null;
  }

  const record = output as Record<string, unknown>;
  const value =
    record.type === "json" && record.value != null && typeof record.value === "object"
      ? (record.value as Record<string, unknown>)
      : record;

  const optionId = typeof value.optionId === "string" ? value.optionId : undefined;
  const text = typeof value.text === "string" ? value.text : undefined;

  if (!optionId && !text) {
    return null;
  }

  return { ...(optionId ? { optionId } : {}), ...(text ? { text } : {}) };
}
