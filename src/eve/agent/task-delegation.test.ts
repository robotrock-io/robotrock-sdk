import { describe, expect, it } from "vitest";
import {
  buildRobotRockTaskPayload,
  resolveTaskHandledWebhookUrl,
} from "./task-delegation.js";

describe("resolveTaskHandledWebhookUrl", () => {
  it("appends /v1 when missing", () => {
    expect(resolveTaskHandledWebhookUrl("http://localhost:4001")).toBe(
      "http://localhost:4001/v1/agent-chats/task-handled"
    );
  });

  it("preserves /v1 suffix", () => {
    expect(resolveTaskHandledWebhookUrl("http://localhost:4001/v1")).toBe(
      "http://localhost:4001/v1/agent-chats/task-handled"
    );
  });
});

describe("buildRobotRockTaskPayload", () => {
  it("includes requestedBy in context data", () => {
    const payload = buildRobotRockTaskPayload(
      {
        type: "budget-approval",
        name: "Approve Q1 budget",
        actions: [{ id: "approve", title: "Approve" }],
        context: { data: { amount: 1000 } },
      },
      { requestedByEmail: "alice@example.com" }
    );

    expect(payload.context?.data).toEqual({
      amount: 1000,
      requestedBy: "alice@example.com",
    });
  });
});
