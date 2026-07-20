import type { AgentAdminUsage } from "@robotrock/core/schemas";
import { formatToolObjectResult } from "../../tool-display-format.js";
import { GET_WORKSPACE_USAGE_REPLY_GUIDANCE } from "../../tool-reply-guidance.js";

function formatLimit(current: number, max: number | null): string {
  return max === null ? `${current} / unlimited` : `${current} / ${max}`;
}

export function formatWorkspaceUsageResult(usage: AgentAdminUsage) {
  const tasksLimit =
    usage.maxTasksPerDay === null
      ? `${usage.tasksToday} / unlimited`
      : `${usage.tasksToday} / ${usage.maxTasksPerDay}`;

  return formatToolObjectResult(
    {
      usage: {
        workspace: usage.workspace,
        plan: usage.planName,
        planType: usage.planType,
        trialState: usage.trialState,
        daysRemaining: usage.daysRemaining,
        isPaidPro: usage.isPaidPro,
        subscriptionStatus: usage.subscriptionStatus ?? "—",
        tasksToday: tasksLimit,
        tasksResetAt: new Date(usage.tasksResetAt).toISOString(),
        openTasks: usage.openTasks,
        totalTasks: usage.totalTasks,
        seats: formatLimit(usage.seatsCurrent, usage.seatsMax),
        groups: formatLimit(usage.groupsCurrent, usage.groupsMax),
        apiKeys: formatLimit(usage.apiKeysCurrent, usage.apiKeysMax),
        rateLimitPerSecond: usage.rateLimitPerSecond,
      },
    },
    {
      replyGuidance: GET_WORKSPACE_USAGE_REPLY_GUIDANCE,
    }
  );
}
