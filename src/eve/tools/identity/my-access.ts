import { defineTool } from "eve/tools";
import { z } from "zod";
import { tryResolveTenantCaller } from "../../agent/tenant.js";
import { withReplyGuidance } from "../../tool-reply-guidance.js";
import { formatMyAccessResult } from "./format-my-access.js";

/** Eve tool slug — must match the agent tool filename `get_my_access.ts`. */
export const MY_ACCESS_TOOL_NAME = "get_my_access";

export const myAccessInputSchema = z.object({});

function tenantCapabilities(isAdmin: boolean) {
  return {
    manageSettings: isAdmin,
    manageBilling: isAdmin,
    manageTeam: isAdmin,
    manageIntegrations: isAdmin,
  };
}

export function defineMyAccessTool() {
  return defineTool({
    description:
      "Check the authenticated user's tenant role, group memberships, and admin capabilities in RobotRock. " +
      "Always call this before tenant-admin tools (manage_team_members, manage_groups, query_tasks, get_workspace_usage) in the same turn — " +
      "including read-only requests like listing users or usage. Results render as a visible access tool card in chat like other tools; " +
      "do not restate role, groups, or capabilities in your reply.",
    inputSchema: myAccessInputSchema,
    async execute(_input, ctx) {
      const caller = tryResolveTenantCaller(ctx);
      if (!caller) {
        return withReplyGuidance(
          {
            authenticated: false as const,
            message:
              "No RobotRock user is attached to this session. Dashboard chat supplies user context via the Eve proxy.",
          },
          "Explain that no user is attached to this session. Do not invent access details."
        );
      }

      return formatMyAccessResult({
        tenantSlug: caller.tenantSlug,
        tenantRole: caller.role,
        isTenantAdmin: caller.isAdmin,
        groupSlugs: caller.groups,
        capabilities: tenantCapabilities(caller.isAdmin),
        email: caller.email,
      });
    },
  });
}

export const myAccessTool = defineMyAccessTool();
