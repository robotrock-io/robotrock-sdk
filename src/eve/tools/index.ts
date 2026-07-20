import type { DefineCreateInboxTaskToolOptions } from "./inbox/create-task.js";
import {
  CREATE_INBOX_TASK_TOOL_NAME,
  defineCreateInboxTaskTool,
} from "./inbox/create-task.js";
import { MY_ACCESS_TOOL_NAME, myAccessTool } from "./identity/my-access.js";
import { WHOAMI_TOOL_NAME, whoamiTool } from "./identity/whoami.js";

export type CreateRobotrockToolsOptions = {
  inbox?: false | DefineCreateInboxTaskToolOptions;
  identity?: boolean;
};

/** Register standard RobotRock Eve tools keyed by Eve tool slug. */
export function createRobotrockTools(
  options?: CreateRobotrockToolsOptions
): Record<string, unknown> {
  const tools: Record<string, unknown> = {};

  if (options?.inbox !== false) {
    tools[CREATE_INBOX_TASK_TOOL_NAME] = defineCreateInboxTaskTool(
      options?.inbox === undefined ? undefined : options.inbox
    );
  }

  if (options?.identity !== false) {
    tools[WHOAMI_TOOL_NAME] = whoamiTool;
    tools[MY_ACCESS_TOOL_NAME] = myAccessTool;
  }

  return tools;
}

export {
  CREATE_INBOX_TASK_TOOL_NAME,
  createInboxTaskInputSchema,
  defineCreateInboxTaskTool,
  createInboxTaskTool,
} from "./inbox/create-task.js";
export type {
  CreateInboxTaskToolInput,
  DefineCreateInboxTaskToolOptions,
} from "./inbox/create-task.js";

export {
  WHOAMI_TOOL_NAME,
  whoamiInputSchema,
  defineWhoamiTool,
  whoamiTool,
} from "./identity/whoami.js";

export {
  MY_ACCESS_TOOL_NAME,
  myAccessInputSchema,
  defineMyAccessTool,
  myAccessTool,
} from "./identity/my-access.js";

export {
  SEARCH_PRODUCTS_TOOL_NAME,
  searchProductsInputSchema,
  defineSearchProductsTool,
  searchProductsTool,
} from "./catalog/search-products.js";

export {
  GENERATE_RANDOM_CHART_TOOL_NAME,
  generateRandomChartInputSchema,
  buildRandomChartData,
  defineGenerateRandomChartTool,
  generateRandomChartTool,
} from "./catalog/generate-random-chart.js";
export type {
  ChartAxisKind,
  GenerateRandomChartInput,
  GeneratedChartResult,
} from "./catalog/generate-random-chart.js";

export {
  GENERATE_IMAGE_TOOL_NAME,
  generateImageInputSchema,
  generateImageBytes,
  defineGenerateImageTool,
  generateImageTool,
} from "./catalog/generate-image.js";
export type {
  GenerateImageInput,
  GeneratedImageResult,
} from "./catalog/generate-image.js";

export {
  MANAGE_TEAM_MEMBERS_TOOL_NAME,
  defineManageTeamMembersTool,
  manageTeamMembersTool,
} from "./admin/manage-team-members.js";

export {
  MANAGE_GROUPS_TOOL_NAME,
  defineManageGroupsTool,
  manageGroupsTool,
} from "./admin/manage-groups.js";

export {
  QUERY_TASKS_TOOL_NAME,
  defineQueryTasksTool,
  queryTasksTool,
} from "./admin/query-tasks.js";

export {
  ASSIGN_TASKS_TOOL_NAME,
  assignTasksInputSchema,
  defineAssignTasksTool,
  assignTasksTool,
} from "./admin/assign-tasks.js";

export {
  GET_WORKSPACE_USAGE_TOOL_NAME,
  getWorkspaceUsageInputSchema,
  defineGetWorkspaceUsageTool,
  getWorkspaceUsageTool,
} from "./admin/get-workspace-usage.js";
