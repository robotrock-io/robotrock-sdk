import { defineTool } from "eve/tools";
import { z } from "zod";
import type { AgentAdminTaskSummary } from "@robotrock/core/schemas";
import { RobotRockError } from "../../../http.js";
import { requireBoundAgentAdminClient } from "../../../agent-admin.js";
import { requireAdminCaller } from "../../agent/tenant.js";
import { queryTasksOutputSchema } from "../../entity-schemas.js";
import {
  formatTaskDetailResult,
  formatTaskSearchResult,
  formatTasksListResult,
} from "./format-tasks-list.js";

export const QUERY_TASKS_TOOL_NAME = "query_tasks";

export const queryTasksInputSchema = z
  .object({
    action: z.enum(["list", "get", "search"]),
    statusFilter: z
      .enum(["all", "open", "handled", "expired"])
      .optional()
      .describe("Filter by task status for list."),
    typeFilter: z.string().optional(),
    appFilter: z.string().optional(),
    sortField: z
      .enum(["type", "date", "status", "validUntil"])
      .optional(),
    sortDirection: z.enum(["asc", "desc"]).optional(),
    limit: z.number().int().positive().max(100).optional(),
    cursor: z.string().optional(),
    taskId: z
      .string()
      .min(1)
      .optional()
      .describe("Public task id or Convex tasks table id for get."),
    query: z
      .string()
      .min(1)
      .optional()
      .describe("Search type, name, description, or id for search."),
  })
  .superRefine((input, ctx) => {
    switch (input.action) {
      case "get":
        if (!input.taskId) {
          ctx.addIssue({
            code: "custom",
            message: "taskId is required for get.",
            path: ["taskId"],
          });
        }
        break;
      case "search":
        if (!input.query) {
          ctx.addIssue({
            code: "custom",
            message: "query is required for search.",
            path: ["query"],
          });
        }
        break;
    }
  });

export function defineQueryTasksTool() {
  return defineTool({
    description:
      "Tenant-admin tool to list, fetch detail, or search inbox tasks in the workspace. Requires tenant admin access. " +
      "Call get_my_access in the same turn before this tool to verify admin access (the check stays a compact activity marker). " +
      "Results render as chat UI cards — do not restate task names, ids, or statuses in your reply.",
    inputSchema: queryTasksInputSchema,
    outputSchema: queryTasksOutputSchema,
    async execute(input, ctx) {
      const caller = requireAdminCaller(ctx);
      const api = requireBoundAgentAdminClient(ctx);
      const tenantSlug = caller.tenantSlug;

      try {
        switch (input.action) {
          case "list": {
            const result = await api.tasks.list({
              statusFilter: input.statusFilter,
              typeFilter: input.typeFilter,
              appFilter: input.appFilter,
              sortField: input.sortField,
              sortDirection: input.sortDirection,
              limit: input.limit,
              cursor: input.cursor,
            });
            return formatTasksListResult(result.items as AgentAdminTaskSummary[], {
              tenantSlug,
              nextCursor: result.nextCursor,
            });
          }
          case "get": {
            const result = await api.tasks.get(input.taskId!);
            return formatTaskDetailResult(
              result.task as Record<string, unknown>,
              { tenantSlug }
            );
          }
          case "search": {
            const result = await api.tasks.search(input.query!, input.limit);
            return formatTaskSearchResult(
              result.items as AgentAdminTaskSummary[],
              { tenantSlug }
            );
          }
        }
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

export const queryTasksTool = defineQueryTasksTool();
