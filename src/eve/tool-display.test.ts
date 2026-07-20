import { afterEach, describe, expect, it } from "vitest";
import {
  formatEveApprovalTitle,
  getToolDisplayLabel,
  setToolDisplayLabelOverrides,
} from "./tool-display.js";

afterEach(() => {
  setToolDisplayLabelOverrides({});
});

describe("getToolDisplayLabel", () => {
  it("uses the default registry for known tools", () => {
    expect(getToolDisplayLabel("refund_charge")).toBe(
      "Refund a customer charge"
    );
  });

  it("auto-formats unknown snake_case tools", () => {
    expect(getToolDisplayLabel("cancel_subscription")).toBe(
      "Cancel subscription"
    );
  });

  it("uses runtime overrides when set", () => {
    setToolDisplayLabelOverrides({ refund_charge: "Custom refund label" });
    expect(getToolDisplayLabel("refund_charge")).toBe("Custom refund label");
  });
});

describe("formatEveApprovalTitle", () => {
  it("formats confirmation prompts with a friendly tool label", () => {
    expect(
      formatEveApprovalTitle(
        {
          requestId: "req-1",
          prompt: "Approve tool call: refund_charge",
          display: "confirmation",
        },
        "refund_charge"
      )
    ).toBe("Approve: Refund a customer charge");
  });

  it("auto-formats unknown tools in confirmation prompts", () => {
    expect(
      formatEveApprovalTitle(
        {
          requestId: "req-2",
          prompt: "Approve tool call: cancel_subscription",
          display: "confirmation",
        },
        "cancel_subscription"
      )
    ).toBe("Approve: Cancel subscription");
  });

  it("passes through non-confirmation prompts unchanged", () => {
    const prompt = "Which integration path should we use?";
    expect(
      formatEveApprovalTitle(
        {
          requestId: "req-3",
          prompt,
          display: "select",
        },
        "ask_question"
      )
    ).toBe(prompt);
  });

  it("decodes HTML entities in select prompts", () => {
    expect(
      formatEveApprovalTitle(
        {
          requestId: "req-4",
          prompt: 'Met &quot;dummy test&quot; kan ik verschillende dingen doen.',
          display: "select",
        },
        "ask_question"
      )
    ).toBe('Met "dummy test" kan ik verschillende dingen doen.');
  });
});
