/** Field name agents read; dashboard widgets must ignore when rendering. */
export const TOOL_REPLY_GUIDANCE_FIELD = "replyGuidance" as const;

export const WHOAMI_REPLY_GUIDANCE =
  "When you show this profile in OpenUI, do not restate name, email, workspace, role, or groups in prose. Only add context not in the UI (e.g. permissions, refund approval rules, missing group membership).";

export const MY_ACCESS_REPLY_GUIDANCE =
  "When access details are shown in OpenUI, do not restate role, groups, or admin capabilities. Only explain what the user can or cannot do for their question (e.g. finance group required for refunds ≥ $10,000). When access.tenantAdmin is false and the user needs manageTeam, manageGroups, query-tasks, or workspace-usage capabilities, explain briefly then call ask_question to offer sending an admin request to tenant admins — do not tell them to find an admin manually without offering delegation first.";

export const GET_WORKSPACE_USAGE_REPLY_GUIDANCE =
  "When you show plan and usage in OpenUI, do not restate plan name, task counts, seats, groups, API keys, or rate limits. Only add context not shown (e.g. upgrade options, that LLM token/cost meters are not tracked, or next steps). Never invent token or dollar spend numbers.";

export const CREATE_INBOX_TASK_REPLY_GUIDANCE =
  "When you show the created task in OpenUI, do not restate task ID, assignee, or delegation details. Only mention next steps or answer the user's question.";

export const SEARCH_PRODUCTS_REPLY_GUIDANCE =
  "When you show product results in OpenUI, do not restate product names, prices, or SKUs. Only add context not in the list (e.g. no matches, recommendations).";

export const GENERATE_RANDOM_CHART_REPLY_GUIDANCE =
  "When you show chart metrics in OpenUI, do not restate series values, dates, or categories. Only add brief context (e.g. that this is demo data).";

export const GENERATE_IMAGE_REPLY_GUIDANCE =
  "Show the generated image in OpenUI (Image or ImageBlock with url and storageId). Do not describe the image pixels or restate the prompt. Only add a short acknowledgement or next-step question if useful.";

export const MANAGE_TEAM_MEMBERS_LIST_REPLY_GUIDANCE =
  "When you show team members in OpenUI, do not restate names, emails, or roles. Only add context not shown (e.g. duplicates, next admin actions).";

export const MANAGE_TEAM_MEMBERS_DETAIL_REPLY_GUIDANCE =
  "When you show team member details in OpenUI, do not restate name, email, or role. Only add next steps or policy context.";

export const MANAGE_GROUPS_LIST_REPLY_GUIDANCE =
  "When you show groups in OpenUI, do not restate group names, slugs, or descriptions. Use slug (not internal id) for get, update, delete, and membership actions. Only add context not shown.";

export const MANAGE_GROUPS_DETAIL_REPLY_GUIDANCE =
  "When you show group details in OpenUI, do not restate fields already visible. Only add next steps.";

export const QUERY_TASKS_LIST_REPLY_GUIDANCE =
  "When you show tasks in OpenUI, do not restate task names, ids, or statuses. Only add context not shown (e.g. filters applied, recommended next action).";

export const QUERY_TASKS_DETAIL_REPLY_GUIDANCE =
  "When you show task details in OpenUI, do not restate fields already visible. Only add analysis or next steps.";

export const ASSIGN_TASKS_REPLY_GUIDANCE =
  "When you show reassignment results in OpenUI, do not restate task ids or assignee emails. Only mention failures, partial success, or next steps.";

export const REFUND_CHARGE_REPLY_GUIDANCE =
  "When you show refund details in OpenUI, do not restate charge id, amount, or status. Only add policy context or next steps.";

export const DEPLOY_RELEASE_REPLY_GUIDANCE =
  "When you show deploy details in OpenUI, do not restate service, version, or environment. Only add rollout context or next steps.";

export const GET_WEATHER_REPLY_GUIDANCE =
  "When you show weather in OpenUI, do not restate city, condition, or temperature. Only add conversational context if needed.";

export const ADMIN_MUTATION_REPLY_GUIDANCE =
  "When you show the action result in OpenUI, do not restate fields already visible. Confirm outcome briefly or add next steps only.";

export type ToolResultWithReplyGuidance<T extends Record<string, unknown>> = T & {
  replyGuidance: string;
};

/** Attach model-facing narration hints to a tool execute result. */
export function withReplyGuidance<T extends Record<string, unknown>>(
  result: T,
  guidance: string
): ToolResultWithReplyGuidance<T> {
  return {
    ...result,
    [TOOL_REPLY_GUIDANCE_FIELD]: guidance,
  };
}

/** Remove agent-only fields before showing raw JSON in the dashboard. */
export function stripAgentOnlyToolFields(output: unknown): unknown {
  if (typeof output !== "object" || output === null || Array.isArray(output)) {
    return output;
  }

  const record = { ...(output as Record<string, unknown>) };
  delete record[TOOL_REPLY_GUIDANCE_FIELD];
  // Legacy agent-only fields (no longer emitted by formatTool*).
  delete record["ui"];
  delete record["uiHint"];
  return record;
}
