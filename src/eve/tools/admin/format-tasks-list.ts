import type { AgentAdminTaskSummary } from "@robotrock/core/schemas";
import type { AssignToInput } from "@robotrock/core/schemas";
import type { z } from "zod";
import {
  assignTasksOutputSchema,
  buildTenantTaskUrl,
  queryTasksDetailOutputSchema,
  queryTasksListOutputSchema,
  statusEntityRowSchema,
  taskEntityRowSchema,
} from "../../entity-schemas.js";
import {
  formatToolListResult,
  formatToolObjectResult,
} from "../../tool-display-format.js";
import {
  ASSIGN_TASKS_REPLY_GUIDANCE,
  QUERY_TASKS_DETAIL_REPLY_GUIDANCE,
  QUERY_TASKS_LIST_REPLY_GUIDANCE,
} from "../../tool-reply-guidance.js";

type TaskEntityRow = z.infer<typeof taskEntityRowSchema>;
type StatusEntityRow = z.infer<typeof statusEntityRowSchema>;
type QueryTasksListOutput = z.infer<typeof queryTasksListOutputSchema>;
type QueryTasksDetailOutput = z.infer<typeof queryTasksDetailOutputSchema>;
type AssignTasksSuccessOutput = Exclude<
  z.infer<typeof assignTasksOutputSchema>,
  { ok: false }
>;

type TaskCardLabelInput = {
  name?: string | null;
  description?: string | null;
  type?: string | null;
  id?: string | null;
};

/** Match inbox list title precedence: name → description → type → id. */
export function resolveTaskCardLabel(task: TaskCardLabelInput): string {
  return (
    task.name?.trim() ||
    task.description?.trim() ||
    task.type?.trim() ||
    task.id?.trim() ||
    "Untitled task"
  );
}

function serializeTaskRow(
  task: AgentAdminTaskSummary,
  tenantSlug: string
): TaskEntityRow {
  return {
    id: task.id,
    name: resolveTaskCardLabel(task),
    status: task.status,
    type: task.type,
    description: task.description,
    validUntil: task.validUntil,
    createdAt: task.createdAt,
    threadPriority: task.threadPriority,
    url: buildTenantTaskUrl(tenantSlug, {
      id: task.id,
      type: task.type,
    }),
  };
}

export function formatTasksListResult(
  items: AgentAdminTaskSummary[],
  options: { tenantSlug: string; nextCursor?: string | null }
): QueryTasksListOutput {
  const payload: {
    items: TaskEntityRow[];
    nextCursor?: string | null;
  } = {
    items: items.map((task) => serializeTaskRow(task, options.tenantSlug)),
  };

  if (options.nextCursor) {
    payload.nextCursor = options.nextCursor;
  }

  return formatToolObjectResult(payload, {
    replyGuidance: QUERY_TASKS_LIST_REPLY_GUIDANCE,
  });
}

export function formatTaskSearchResult(
  items: AgentAdminTaskSummary[],
  options: { tenantSlug: string }
): QueryTasksListOutput {
  return formatTasksListResult(items, options);
}

export function formatTaskDetailResult(
  task: Record<string, unknown>,
  options: { tenantSlug: string }
): QueryTasksDetailOutput {
  const id = typeof task.id === "string" ? task.id : null;
  const type = typeof task.type === "string" ? task.type : null;
  const url =
    id !== null
      ? buildTenantTaskUrl(options.tenantSlug, { id, type })
      : null;

  return formatToolObjectResult(
    {
      id,
      status: typeof task.status === "string" ? task.status : null,
      type,
      name: typeof task.name === "string" ? task.name : null,
      description:
        typeof task.description === "string" ? task.description : null,
      validUntil: typeof task.validUntil === "number" ? task.validUntil : null,
      createdAt: typeof task.createdAt === "number" ? task.createdAt : null,
      url,
    },
    {
      replyGuidance: QUERY_TASKS_DETAIL_REPLY_GUIDANCE,
    }
  );
}

export function formatAssignTasksResult(
  results: Array<{
    taskId: string;
    success: boolean;
    message?: string;
    name?: string | null;
    description?: string | null;
    type?: string | null;
  }>,
  _assignTo: AssignToInput,
  options: { tenantSlug: string }
): AssignTasksSuccessOutput {
  const rows: StatusEntityRow[] = results.map((row) => ({
    id: row.taskId,
    name: resolveTaskCardLabel({
      name: row.name,
      description: row.description,
      type: row.type,
      id: row.taskId,
    }),
    type: row.type ?? null,
    description: row.description ?? null,
    status: row.success ? "reassigned" : "failed",
    url: buildTenantTaskUrl(options.tenantSlug, {
      id: row.taskId,
      type: row.type,
    }),
  }));

  return formatToolListResult("results", rows, {
    replyGuidance: ASSIGN_TASKS_REPLY_GUIDANCE,
  });
}

export { serializeTaskRow };
