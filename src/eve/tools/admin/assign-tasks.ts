import { assignToSchema } from "@robotrock/core/schemas";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { createBoundAgentAdminClient } from "../../../agent-admin.js";
import { RobotRockError } from "../../../http.js";
import { requireTenantCaller } from "../../agent/tenant.js";
import { assignTasksOutputSchema } from "../../entity-schemas.js";
import { formatAssignTasksResult } from "./format-tasks-list.js";

export const ASSIGN_TASKS_TOOL_NAME = "assign_tasks";

export const assignTasksInputSchema = z.object({
  taskIds: z
    .array(z.string().min(1))
    .min(1)
    .max(100)
    .describe(
      "Public task ids or Convex tasks table ids to reassign. Use query_tasks search/get to resolve ids first."
    ),
  assignTo: assignToSchema
    .refine(
      (value) => (value.users?.length ?? 0) > 0 || (value.groups?.length ?? 0) > 0,
      { message: "assignTo needs at least one user email or group slug." }
    )
    .describe(
      'New assignees — user emails and/or group slugs (e.g. "finance", virtual "admins").'
    ),
});

export function defineAssignTasksTool() {
  return defineTool({
    description:
      "Reassign existing inbox tasks to users or groups. Requires access to each task (tenant admins can reassign any task; others only tasks they can see). " +
      "Use query_tasks to find task ids when needed. Results render as chat UI — do not restate task ids or assignees in your reply.",
    inputSchema: assignTasksInputSchema,
    outputSchema: assignTasksOutputSchema,
    async execute(input, ctx) {
      const caller = requireTenantCaller(ctx);
      const api = createBoundAgentAdminClient(ctx);

      try {
        const result = await api.tasks.assign({
          taskIds: input.taskIds,
          assignTo: input.assignTo,
        });
        return formatAssignTasksResult(result.results, input.assignTo, {
          tenantSlug: caller.tenantSlug,
        });
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

export const assignTasksTool = defineAssignTasksTool();
