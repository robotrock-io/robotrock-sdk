import { describe, expect, it } from "vitest";
import {
  EVE_INPUT_OTHER_CHOICE_ID,
  EVE_INPUT_SUBMIT_ACTION_ID,
  eveInputRequestTaskType,
  eveInputRequestToActions,
  normalizeEveSelectFormData,
  resolveEveInputDisplay,
  taskHandledToEveInputResponse,
  type EveInputRequest,
} from "./input-request.js";
import {
  PLATFORM_MARK_DONE_ACTION_ID,
  PLATFORM_REJECT_REQUEST_ACTION_ID,
} from "../platform-actions.js";

const textRequest: EveInputRequest = {
  requestId: "req-1",
  prompt: "What is the charge ID?",
  display: "text",
};

const selectRequest: EveInputRequest = {
  requestId: "req-2",
  prompt: "Pick a region",
  display: "select",
  options: [
    { id: "us", label: "US" },
    { id: "eu", label: "EU" },
  ],
};

const confirmationRequest: EveInputRequest = {
  requestId: "req-3",
  prompt: "Approve tool call: refund_charge",
  display: "confirmation",
  options: [
    { id: "approve", label: "Yes", style: "primary" },
    { id: "deny", label: "No", style: "danger" },
  ],
};

describe("resolveEveInputDisplay", () => {
  it("uses explicit display when set", () => {
    expect(resolveEveInputDisplay(textRequest)).toBe("text");
  });

  it("infers ask_question without options as text", () => {
    expect(
      resolveEveInputDisplay(
        { requestId: "r", prompt: "Charge ID?" },
        "ask_question"
      )
    ).toBe("text");
  });

  it("infers ask_question with options as select", () => {
    expect(
      resolveEveInputDisplay(
        {
          requestId: "r",
          prompt: "Region?",
          options: [{ id: "us", label: "US" }],
        },
        "ask_question"
      )
    ).toBe("select");
  });
});

describe("eveInputRequestToActions", () => {
  it("maps text requests to a single submit action with answer schema", () => {
    const actions = eveInputRequestToActions(textRequest);
    expect(actions).toHaveLength(1);
    expect(actions[0]?.id).toBe(EVE_INPUT_SUBMIT_ACTION_ID);
    expect(actions[0]?.schema).toMatchObject({
      required: ["answer"],
    });
  });

  it("maps small select requests to one action per option", () => {
    const actions = eveInputRequestToActions(selectRequest);
    expect(actions.map((action) => action.id)).toEqual(["us", "eu"]);
  });

  it("maps select with allowFreeform to a radio form action", () => {
    const actions = eveInputRequestToActions({
      ...selectRequest,
      allowFreeform: true,
    });
    expect(actions).toHaveLength(1);
    expect(actions[0]?.id).toBe(EVE_INPUT_SUBMIT_ACTION_ID);
    expect(actions[0]?.schema).toMatchObject({
      properties: {
        choice: { enum: ["us", "eu", EVE_INPUT_OTHER_CHOICE_ID] },
        other: { type: "string" },
      },
    });
    expect(actions[0]?.ui?.choice).toMatchObject({
      "ui:enumNames": ["US", "EU", "Type your own answer"],
    });
  });

  it("maps confirmation to approve/deny actions", () => {
    const actions = eveInputRequestToActions(confirmationRequest);
    expect(actions.map((action) => action.id)).toEqual(["approve", "deny"]);
  });
});

describe("eveInputRequestTaskType", () => {
  it("uses eve-approval for confirmation with tool name", () => {
    expect(
      eveInputRequestTaskType(confirmationRequest, { toolName: "refund_charge" })
    ).toBe("eve-approval:refund_charge");
  });

  it("uses eve-input for non-confirmation displays", () => {
    expect(eveInputRequestTaskType(textRequest)).toBe("eve-input:text");
  });
});

describe("taskHandledToEveInputResponse", () => {
  it("maps text form submit to Eve text response", () => {
    expect(
      taskHandledToEveInputResponse(textRequest, EVE_INPUT_SUBMIT_ACTION_ID, {
        answer: "ch_123",
      })
    ).toEqual({
      requestId: "req-1",
      text: "ch_123",
    });
  });

  it("maps per-option select click to optionId", () => {
    expect(taskHandledToEveInputResponse(selectRequest, "eu", {})).toEqual({
      requestId: "req-2",
      optionId: "eu",
    });
  });

  it("maps radio form choice to optionId", () => {
    expect(
      taskHandledToEveInputResponse(
        { ...selectRequest, allowFreeform: true },
        EVE_INPUT_SUBMIT_ACTION_ID,
        { choice: "us" }
      )
    ).toEqual({
      requestId: "req-2",
      optionId: "us",
    });
  });

  it("maps radio form other field to text when other is selected", () => {
    expect(
      taskHandledToEveInputResponse(
        { ...selectRequest, allowFreeform: true },
        EVE_INPUT_SUBMIT_ACTION_ID,
        { choice: EVE_INPUT_OTHER_CHOICE_ID, other: "APAC" }
      )
    ).toEqual({
      requestId: "req-2",
      text: "APAC",
    });
  });

  it("ignores freeform text when a preset option is selected", () => {
    expect(
      taskHandledToEveInputResponse(
        { ...selectRequest, allowFreeform: true },
        EVE_INPUT_SUBMIT_ACTION_ID,
        { choice: "us", other: "APAC" }
      )
    ).toEqual({
      requestId: "req-2",
      optionId: "us",
    });
  });

  it("maps confirmation actions to optionId", () => {
    expect(
      taskHandledToEveInputResponse(confirmationRequest, "approve", {})
    ).toEqual({
      requestId: "req-3",
      optionId: "approve",
    });
  });

  it("maps platform terminal actions to deny", () => {
    expect(
      taskHandledToEveInputResponse(
        confirmationRequest,
        PLATFORM_MARK_DONE_ACTION_ID,
        {}
      )
    ).toEqual({
      requestId: "req-3",
      optionId: "deny",
    });

    expect(
      taskHandledToEveInputResponse(
        confirmationRequest,
        PLATFORM_REJECT_REQUEST_ACTION_ID,
        { feedback: "not now" }
      )
    ).toEqual({
      requestId: "req-3",
      optionId: "deny",
      text: "not now",
    });
  });
});

describe("normalizeEveSelectFormData", () => {
  it("drops other when a preset choice is selected", () => {
    expect(
      normalizeEveSelectFormData({ choice: "us", other: "APAC" })
    ).toEqual({ choice: "us" });
  });

  it("keeps other only when the other option is selected", () => {
    expect(
      normalizeEveSelectFormData({
        choice: EVE_INPUT_OTHER_CHOICE_ID,
        other: "APAC",
      })
    ).toEqual({ choice: EVE_INPUT_OTHER_CHOICE_ID, other: "APAC" });
  });
});
