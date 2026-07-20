import { describe, expect, it } from "vitest";
import {
  buildChatToolAuditPayload,
  sanitizeToolAuditInput,
  shouldAuditToolExecution,
} from "./tool-audit.js";

const MANAGE_TEAM_MEMBERS_TOOL_NAME = "manage_team_members";
const MANAGE_GROUPS_TOOL_NAME = "manage_groups";
const CREATE_INBOX_TASK_TOOL_NAME = "create_robotrock_task";

describe("shouldAuditToolExecution", () => {
  it("does not audit admin tools (API audit replaces tool audit)", () => {
    expect(
      shouldAuditToolExecution(MANAGE_TEAM_MEMBERS_TOOL_NAME, {
        action: "invite",
        email: "a@b.com",
      })
    ).toBe(false);
    expect(
      shouldAuditToolExecution(MANAGE_GROUPS_TOOL_NAME, {
        action: "create",
        name: "Ops",
      })
    ).toBe(false);
  });

  it("skips inbox task creation and HITL tools", () => {
    expect(
      shouldAuditToolExecution(CREATE_INBOX_TASK_TOOL_NAME, { type: "approval" })
    ).toBe(false);
    expect(shouldAuditToolExecution("ask_question", { prompt: "?" })).toBe(
      false
    );
  });
});

describe("sanitizeToolAuditInput", () => {
  it("keeps audit-relevant fields only", () => {
    expect(
      sanitizeToolAuditInput({
        action: "invite",
        email: "a@b.com",
        role: "admin",
        secretToken: "nope",
      })
    ).toEqual({
      action: "invite",
      email: "a@b.com",
      role: "admin",
    });
  });
});

describe("buildChatToolAuditPayload", () => {
  it("returns null now that admin tools use API audit", () => {
    expect(
      buildChatToolAuditPayload({
        toolCallId: "call-2",
        toolName: MANAGE_TEAM_MEMBERS_TOOL_NAME,
        toolInput: { action: "invite", email: "a@b.com", role: "member" },
        status: "completed",
      })
    ).toBeNull();
  });
});
