import type { SendToHumanActionInput } from "../client.js";
import { decodeHtmlEntities } from "@robotrock/core/utils";
import {
  isPlatformTerminalAction,
  parsePlatformRejectRequestData,
} from "../platform-actions.js";

/** One selectable option in an Eve HITL input request. */
export type EveInputOption = {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly style?: "danger" | "default" | "primary";
};

/** Eve HITL display mode — mirrors `InputRequest.display` from the eve runtime. */
export type EveInputRequestDisplay = "confirmation" | "select" | "text";

/**
 * Minimal Eve `InputRequest` shape for RobotRock bridging. Intentionally
 * self-contained so the SDK does not depend on the `eve` package.
 */
export type EveInputRequest = {
  readonly requestId: string;
  readonly prompt: string;
  readonly display?: EveInputRequestDisplay;
  readonly allowFreeform?: boolean;
  readonly options?: readonly EveInputOption[];
};

/** Eve `InputResponse` shape returned when resuming a parked session. */
export type EveInputResponse = {
  readonly requestId: string;
  readonly optionId?: string;
  readonly text?: string;
};

export const EVE_INPUT_SUBMIT_ACTION_ID = "submit" as const;
export const EVE_INPUT_OTHER_CHOICE_ID = "__other__" as const;
export const EVE_INPUT_OTHER_CHOICE_LABEL = "Type your own answer" as const;

const CONFIRMATION_DEFAULT_OPTIONS: readonly EveInputOption[] = [
  { id: "approve", label: "Approve", style: "primary" },
  { id: "deny", label: "Deny", style: "danger" },
];

const SELECT_PER_OPTION_THRESHOLD = 6;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readStringField(data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key];
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function decodeDisplayText(value: string): string {
  return decodeHtmlEntities(value);
}

/** Resolve the effective display mode when Eve omits `display`. */
export function resolveEveInputDisplay(
  request: EveInputRequest,
  toolName?: string
): EveInputRequestDisplay {
  if (request.display) {
    return request.display;
  }
  if (toolName === "ask_question") {
    return request.options && request.options.length > 0 ? "select" : "text";
  }
  if (request.options && request.options.length > 0) {
    return "select";
  }
  return "confirmation";
}

function confirmationActions(request: EveInputRequest): readonly SendToHumanActionInput[] {
  const options =
    request.options && request.options.length > 0
      ? request.options
      : CONFIRMATION_DEFAULT_OPTIONS;

  return options.map((option) => ({
    id: option.id,
    title: decodeDisplayText(option.label),
    ...(option.description
      ? { description: decodeDisplayText(option.description) }
      : {}),
  }));
}

function textSubmitAction(prompt: string): SendToHumanActionInput {
  const decodedPrompt = decodeDisplayText(prompt);
  return {
    id: EVE_INPUT_SUBMIT_ACTION_ID,
    title: "Submit",
    schema: {
      type: "object",
      required: ["answer"],
      properties: {
        answer: {
          type: "string",
          title: "Your answer",
        },
      },
    },
    ui: {
      answer: {
        "ui:title": decodedPrompt.trim() || "Your answer",
        "ui:widget": "textarea",
      },
    },
  };
}

function selectPerOptionActions(
  options: readonly EveInputOption[]
): readonly SendToHumanActionInput[] {
  return options.map((option) => ({
    id: option.id,
    title: decodeDisplayText(option.label),
    ...(option.description
      ? { description: decodeDisplayText(option.description) }
      : {}),
  }));
}

function selectFormAction(request: EveInputRequest): SendToHumanActionInput {
  const options = request.options ?? [];
  const allowFreeform = request.allowFreeform === true;
  const enumValues = options.map((option) => option.id);
  const enumNames = options.map((option) => decodeDisplayText(option.label));

  if (allowFreeform) {
    enumValues.push(EVE_INPUT_OTHER_CHOICE_ID);
    enumNames.push(EVE_INPUT_OTHER_CHOICE_LABEL);
  }

  const properties: Record<string, unknown> = {
    choice: {
      type: "string",
      title: "Choose one",
      enum: enumValues,
    },
  };

  if (allowFreeform) {
    properties.other = {
      type: "string",
      title: "Your answer",
    };
  }

  const schema: Record<string, unknown> = {
    type: "object",
    required: ["choice"],
    properties,
  };

  if (allowFreeform) {
    schema.allOf = [
      {
        if: {
          properties: {
            choice: { const: EVE_INPUT_OTHER_CHOICE_ID },
          },
          required: ["choice"],
        },
        then: {
          required: ["other"],
          properties: {
            other: {
              type: "string",
              minLength: 1,
            },
          },
        },
      },
    ];
  }

  const ui: Record<string, unknown> = {
    choice: {
      "ui:widget": "radio",
      "ui:enumNames": enumNames,
    },
  };

  if (allowFreeform) {
    ui.other = {
      "ui:placeholder": "Enter your answer",
    };
  }

  return {
    id: EVE_INPUT_SUBMIT_ACTION_ID,
    title: "Submit",
    schema: schema as SendToHumanActionInput["schema"],
    ui: ui as SendToHumanActionInput["ui"],
  };
}

/** Keep select-form submissions mutually exclusive between preset choice and freeform other. */
export function normalizeEveSelectFormData(
  data: Record<string, unknown>
): Record<string, unknown> {
  const choice =
    typeof data.choice === "string" ? data.choice.trim() : undefined;
  if (!choice) {
    return data;
  }
  if (choice === EVE_INPUT_OTHER_CHOICE_ID) {
    return {
      choice,
      ...(data.other !== undefined ? { other: data.other } : {}),
    };
  }
  return { choice };
}

/**
 * Map an Eve `InputRequest` to RobotRock inbox actions.
 */
export function eveInputRequestToActions(
  request: EveInputRequest,
  options?: { toolName?: string }
): readonly SendToHumanActionInput[] {
  const display = resolveEveInputDisplay(request, options?.toolName);

  switch (display) {
    case "confirmation":
      return confirmationActions(request);
    case "text":
      return [textSubmitAction(request.prompt)];
    case "select": {
      const selectOptions = request.options ?? [];
      if (selectOptions.length === 0) {
        return [textSubmitAction(request.prompt)];
      }
      if (
        selectOptions.length <= SELECT_PER_OPTION_THRESHOLD &&
        request.allowFreeform !== true
      ) {
        return selectPerOptionActions(selectOptions);
      }
      return [selectFormAction(request)];
    }
  }
}

/** Task type slug for an Eve input request. */
export function eveInputRequestTaskType(
  request: EveInputRequest,
  options?: { toolName?: string }
): string {
  const display = resolveEveInputDisplay(request, options?.toolName);
  if (display === "confirmation" && options?.toolName) {
    return `eve-approval:${options.toolName}`;
  }
  return `eve-input:${display}`;
}

/**
 * Map a handled RobotRock task action back to an Eve `InputResponse`.
 */
export function taskHandledToEveInputResponse(
  request: EveInputRequest,
  actionId: string,
  actionData: unknown,
  options?: { toolName?: string }
): EveInputResponse {
  const base = { requestId: request.requestId };

  if (isPlatformTerminalAction(actionId)) {
    const feedback = parsePlatformRejectRequestData(actionData)?.feedback;
    return {
      ...base,
      optionId: "deny",
      ...(feedback ? { text: feedback } : {}),
    };
  }

  const display = resolveEveInputDisplay(request, options?.toolName);
  const selectOptions = request.options ?? [];
  const data = asRecord(actionData);

  if (display === "confirmation") {
    return { ...base, optionId: actionId };
  }

  const matchingOption = selectOptions.find((option) => option.id === actionId);
  if (matchingOption) {
    return { ...base, optionId: actionId };
  }

  if (actionId === EVE_INPUT_SUBMIT_ACTION_ID && data) {
    const submissionData =
      display === "select" && request.allowFreeform === true
        ? normalizeEveSelectFormData(data)
        : data;

    const answer = readStringField(submissionData, "answer");
    if (answer) {
      return { ...base, text: answer };
    }

    const choice = readStringField(submissionData, "choice");
    if (choice === EVE_INPUT_OTHER_CHOICE_ID) {
      const other = readStringField(submissionData, "other");
      if (other) {
        return { ...base, text: other };
      }
    }

    if (choice) {
      if (selectOptions.some((option) => option.id === choice)) {
        return { ...base, optionId: choice };
      }
      return { ...base, text: choice };
    }
  }

  if (data) {
    const answer = readStringField(data, "answer");
    if (answer) {
      return { ...base, text: answer };
    }
  }

  return { ...base, optionId: actionId };
}
