import { describe, expect, it } from "vitest";
import type { AgentAdminUsage } from "@robotrock/core/schemas";
import { formatWorkspaceUsageResult } from "./format-workspace-usage.js";

const sampleUsage: AgentAdminUsage = {
  workspace: "acme",
  planName: "Pro",
  planType: "pro",
  trialState: "none",
  daysRemaining: null,
  isPaidPro: true,
  subscriptionStatus: "active",
  tasksToday: 12,
  maxTasksPerDay: 1000,
  tasksResetAt: Date.UTC(2026, 6, 18),
  openTasks: 3,
  totalTasks: 40,
  seatsCurrent: 5,
  seatsMax: 20,
  groupsCurrent: 2,
  groupsMax: 20,
  apiKeysCurrent: 1,
  apiKeysMax: 20,
  rateLimitPerSecond: 25,
  limits: {
    tasksPerDay: 1000,
    members: 20,
    apiKeys: 20,
    groups: 20,
    auditLogRetention: 365,
    rateLimitPerSecond: 25,
    taskRetentionDays: 30,
  },
};

describe("formatWorkspaceUsageResult", () => {
  it("returns usage card fields with reply guidance", () => {
    const result = formatWorkspaceUsageResult(sampleUsage);

    expect(result.usage).toMatchObject({
      workspace: "acme",
      plan: "Pro",
      tasksToday: "12 / 1000",
      seats: "5 / 20",
      groups: "2 / 20",
      apiKeys: "1 / 20",
      rateLimitPerSecond: 25,
    });
    expect(result.replyGuidance).toMatch(/do not restate/i);
    expect(result).not.toHaveProperty("ui");
  });

  it("formats unlimited limits", () => {
    const result = formatWorkspaceUsageResult({
      ...sampleUsage,
      planName: "Enterprise",
      planType: "enterprise",
      maxTasksPerDay: null,
      seatsMax: null,
      groupsMax: null,
      apiKeysMax: null,
    });

    expect(result.usage.tasksToday).toBe("12 / unlimited");
    expect(result.usage.seats).toBe("5 / unlimited");
    expect(result.usage.groups).toBe("2 / unlimited");
    expect(result.usage.apiKeys).toBe("1 / unlimited");
  });
});
