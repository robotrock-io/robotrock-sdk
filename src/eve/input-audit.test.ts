import { describe, expect, it } from "vitest";
import {
  buildEveInputAuditSubmissionData,
  eveInputResponseToActionSubmission,
  isEveApprovalInputRequest,
  parseEveAskQuestionToolOutput,
  resolveEveFreeformTextToInputResponse,
} from "./input-audit.js";

const approvalRequest = {
  requestId: "req-approve",
  prompt: "Approve refund?",
  display: "confirmation" as const,
  options: [
    { id: "approve", label: "Approve", style: "primary" as const },
    { id: "deny", label: "Deny", style: "danger" as const },
  ],
};

describe("resolveEveFreeformTextToInputResponse", () => {
  it("matches approve by option id case-insensitively", () => {
    expect(resolveEveFreeformTextToInputResponse(approvalRequest, "Approve")).toEqual({
      requestId: "req-approve",
      optionId: "approve",
    });
  });

  it("matches option label", () => {
    expect(resolveEveFreeformTextToInputResponse(approvalRequest, "deny")).toEqual({
      requestId: "req-approve",
      optionId: "deny",
    });
  });

  it("matches numeric option index", () => {
    expect(resolveEveFreeformTextToInputResponse(approvalRequest, "1")).toEqual({
      requestId: "req-approve",
      optionId: "approve",
    });
  });

  it("returns freeform text for text display requests", () => {
    const request = {
      requestId: "req-text",
      prompt: "Charge id?",
      display: "text" as const,
    };
    expect(resolveEveFreeformTextToInputResponse(request, "ch_123")).toEqual({
      requestId: "req-text",
      text: "ch_123",
    });
  });
});

describe("eveInputResponseToActionSubmission", () => {
  it("maps approve option to action id and title", () => {
    expect(
      eveInputResponseToActionSubmission(approvalRequest, {
        requestId: "req-approve",
        optionId: "approve",
      })
    ).toEqual({
      actionId: "approve",
      actionTitle: "Approve",
      formData: { choice: "approve" },
    });
  });

  it("maps select option id to choice form data", () => {
    const request = {
      requestId: "req-select",
      prompt: "Pick one",
      display: "select" as const,
      options: [
        { id: "option_a", label: "Option A" },
        { id: "option_b", label: "Option B" },
      ],
    };

    expect(
      eveInputResponseToActionSubmission(request, {
        requestId: "req-select",
        optionId: "option_a",
      })
    ).toEqual({
      actionId: "option_a",
      actionTitle: "Option A",
      formData: { choice: "option_a" },
    });
  });

  it("maps freeform text to submit action", () => {
    const request = {
      requestId: "req-text",
      prompt: "Charge id?",
      display: "text" as const,
    };
    expect(
      eveInputResponseToActionSubmission(request, {
        requestId: "req-text",
        text: "ch_123",
      })
    ).toEqual({
      actionId: "submit",
      actionTitle: "ch_123",
      formData: { answer: "ch_123" },
    });
  });
});

describe("isEveApprovalInputRequest", () => {
  it("detects default approve/deny gate", () => {
    expect(isEveApprovalInputRequest(approvalRequest)).toBe(true);
  });
});

describe("buildEveInputAuditSubmissionData", () => {
  it("includes tool metadata and form fields", () => {
    expect(
      buildEveInputAuditSubmissionData(
        {
          toolCallId: "call-1",
          toolName: "refund_charge",
          requestId: "req-approve",
          display: "confirmation",
          toolInput: { amount: 1200 },
        },
        { choice: "approve" }
      )
    ).toMatchObject({
      toolCallId: "call-1",
      toolName: "refund_charge",
      requestId: "req-approve",
      display: "confirmation",
      toolInput: { amount: 1200 },
      choice: "approve",
    });
  });
});

describe("parseEveAskQuestionToolOutput", () => {
  it("reads optionId from json tool output", () => {
    expect(
      parseEveAskQuestionToolOutput({
        type: "json",
        value: { optionId: "polling", status: "answered" },
      })
    ).toEqual({ optionId: "polling" });
  });
});
