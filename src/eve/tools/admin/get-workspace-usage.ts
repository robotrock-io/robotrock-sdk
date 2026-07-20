import { defineTool } from "eve/tools";
import { z } from "zod";
import type { AgentAdminUsage } from "@robotrock/core/schemas";
import { RobotRockError } from "../../../http.js";
import { requireBoundAgentAdminClient } from "../../../agent-admin.js";
import { getWorkspaceUsageOutputSchema } from "../../entity-schemas.js";
import { formatWorkspaceUsageResult } from "./format-workspace-usage.js";

export const GET_WORKSPACE_USAGE_TOOL_NAME = "get_workspace_usage";

export const getWorkspaceUsageInputSchema = z.object({});

export function defineGetWorkspaceUsageTool() {
  return defineTool({
    description:
      "Tenant-admin tool for workspace plan, limits, and usage " +
      "(tasks today, seats, groups, API keys, rate limits). " +
      "Does not include LLM token counts or dollar spend — those are not tracked. " +
      "Requires tenant admin access. Call get_my_access in the same turn before this tool. " +
      "Results render as a chat UI card — do not restate plan or usage numbers in your reply.",
    inputSchema: getWorkspaceUsageInputSchema,
    outputSchema: getWorkspaceUsageOutputSchema,
    async execute(_input, ctx) {
      const api = requireBoundAgentAdminClient(ctx);

      try {
        const result = await api.usage.get();
        return formatWorkspaceUsageResult(result.usage as AgentAdminUsage);
      } catch (error) {
        if (error instanceof RobotRockError) {
          return {
            ok: false as const,
            status: error.statusCode,
            message: error.message,
            response: error.response,
          };
        }
        throw error;
      }
    },
  });
}

export const getWorkspaceUsageTool = defineGetWorkspaceUsageTool();
