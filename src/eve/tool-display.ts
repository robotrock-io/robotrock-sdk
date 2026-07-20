import {
  resolveEveInputDisplay,
  type EveInputRequest,
} from "./input-request.js";
import { decodeHtmlEntities } from "@robotrock/core/utils";

/** Default per-tool labels for common Eve demo/integration tools. */
export const DEFAULT_TOOL_DISPLAY_LABELS: Readonly<Record<string, string>> = {
  refund_charge: "Refund a customer charge",
  deploy_release: "Deploy a release",
  get_weather: "Get weather",
  get_my_access: "Check my access",
  whoami: "Who am I",
  create_robotrock_task: "Create a RobotRock task",
  search_products: "Search products",
  generate_random_chart: "Generate random chart",
  generate_image: "Generate image",
  manage_team_members: "Manage team members",
  manage_groups: "Manage groups",
  query_tasks: "Query tasks",
  get_workspace_usage: "Get workspace usage",
};

let toolDisplayLabelOverrides: Readonly<Record<string, string>> = {};

/** Register additional or overriding tool display labels at runtime. */
export function setToolDisplayLabelOverrides(
  overrides: Readonly<Record<string, string>>
): void {
  toolDisplayLabelOverrides = overrides;
}

function formatToolName(toolName: string): string {
  const spaced = toolName
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim();

  if (!spaced) {
    return "Tool";
  }

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Resolve a user-facing label for a tool slug. */
export function getToolDisplayLabel(toolName: string): string {
  const trimmed = toolName.trim();
  if (!trimmed) {
    return "Tool";
  }

  return (
    toolDisplayLabelOverrides[trimmed] ??
    DEFAULT_TOOL_DISPLAY_LABELS[trimmed] ??
    formatToolName(trimmed)
  );
}

/** Format an Eve input request prompt for human-facing approval UIs. */
export function formatEveApprovalTitle(
  request: EveInputRequest,
  toolName?: string
): string {
  const display = resolveEveInputDisplay(request, toolName);
  if (display !== "confirmation" || !toolName) {
    return decodeHtmlEntities(request.prompt);
  }

  return `Approve: ${getToolDisplayLabel(toolName)}`;
}
