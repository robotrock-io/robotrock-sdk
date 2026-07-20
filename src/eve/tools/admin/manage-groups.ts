import { defineTool } from "eve/tools";
import { z } from "zod";
import type {
  AgentAdminGroup,
  AgentAdminGroupDetail,
} from "@robotrock/core/schemas";
import { RobotRockError } from "../../../http.js";
import { requireBoundAgentAdminClient } from "../../../agent-admin.js";
import { requireAdminCaller } from "../../agent/tenant.js";
import { manageGroupsOutputSchema } from "../../entity-schemas.js";
import {
  formatGroupDetailResult,
  formatGroupsListResult,
  formatGroupSummaryResult,
} from "./format-groups-list.js";
import { formatToolObjectResult } from "../../tool-display-format.js";
import { ADMIN_MUTATION_REPLY_GUIDANCE } from "../../tool-reply-guidance.js";

export const MANAGE_GROUPS_TOOL_NAME = "manage_groups";

export const manageGroupsInputSchema = z
  .object({
    action: z.enum([
      "list",
      "get",
      "create",
      "update",
      "delete",
      "add_member",
      "remove_member",
    ]),
    groupId: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Convex group id for get, update, delete, and membership actions. Prefer slug when the group list only shows slug."
      ),
    slug: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Group slug (e.g. finance) for get, update, delete, and membership actions."
      ),
    userId: z
      .string()
      .min(1)
      .optional()
      .describe(
        "User id for add_member and remove_member. Prefer email when the member list only shows email."
      ),
    email: z
      .string()
      .email()
      .optional()
      .describe("Member email for add_member and remove_member."),
    name: z
      .string()
      .min(1)
      .optional()
      .describe("Group name for create and update."),
    description: z
      .string()
      .optional()
      .describe("Group description for create and update."),
  })
  .superRefine((input, ctx) => {
    const requireField = (
      field: "groupId" | "userId" | "name",
      message: string
    ) => {
      if (!input[field]) {
        ctx.addIssue({ code: "custom", message, path: [field] });
      }
    };

    const requireGroupIdOrSlug = (message: string) => {
      if (!input.groupId && !input.slug) {
        ctx.addIssue({ code: "custom", message, path: ["slug"] });
      }
    };

    const requireUserIdOrEmail = (message: string) => {
      if (!input.userId && !input.email) {
        ctx.addIssue({ code: "custom", message, path: ["email"] });
      }
    };

    switch (input.action) {
      case "get":
      case "delete":
        requireGroupIdOrSlug(
          "groupId or slug is required for this action."
        );
        break;
      case "create":
        requireField("name", "name is required when creating a group.");
        break;
      case "update":
        requireGroupIdOrSlug("groupId or slug is required for update.");
        break;
      case "add_member":
      case "remove_member":
        requireGroupIdOrSlug(
          "groupId or slug is required for membership changes."
        );
        requireUserIdOrEmail(
          "userId or email is required for membership changes."
        );
        break;
    }
  });

function formatGroupMutationResult(payload: Record<string, unknown>) {
  return formatToolObjectResult(payload, {
    replyGuidance: ADMIN_MUTATION_REPLY_GUIDANCE,
  });
}

function resolveGroupRef(input: {
  groupId?: string;
  slug?: string;
}): string {
  return input.groupId ?? input.slug!;
}

function resolveMemberRef(input: { userId?: string; email?: string }): string {
  return input.userId ?? input.email!;
}

export function defineManageGroupsTool() {
  return defineTool({
    description:
      "Tenant-admin tool for workspace groups: list, get, create, update, delete, and manage group membership. Requires tenant admin access. " +
      "Call get_my_access in the same turn before this tool to verify admin access (the check stays a compact activity marker). " +
      "Use group slug (e.g. finance) from list results for get and membership actions — internal ids are optional. " +
      "Use member email for add_member and remove_member when user ids are unknown. " +
      "Results render as chat UI cards — do not restate group or member fields in your reply.",
    inputSchema: manageGroupsInputSchema,
    outputSchema: manageGroupsOutputSchema,
    async execute(input, ctx) {
      const caller = requireAdminCaller(ctx);
      const api = requireBoundAgentAdminClient(ctx);
      const tenantSlug = caller.tenantSlug;

      try {
        switch (input.action) {
          case "list": {
            const result = await api.groups.list();
            return formatGroupsListResult(result.groups as AgentAdminGroup[], {
              tenantSlug,
            });
          }
          case "get": {
            const result = await api.groups.get(resolveGroupRef(input));
            return formatGroupDetailResult(
              result.group as AgentAdminGroupDetail,
              { tenantSlug }
            );
          }
          case "create": {
            const result = await api.groups.create({
              name: input.name!,
              description: input.description,
            });
            return formatGroupSummaryResult(result.group as AgentAdminGroup, {
              tenantSlug,
            });
          }
          case "update": {
            const result = await api.groups.update(resolveGroupRef(input), {
              name: input.name,
              description: input.description,
            });
            return formatGroupSummaryResult(result.group as AgentAdminGroup, {
              tenantSlug,
            });
          }
          case "delete": {
            const result = await api.groups.delete(resolveGroupRef(input));
            return formatGroupMutationResult(
              result as Record<string, unknown>
            );
          }
          case "add_member": {
            const result = await api.groups.addMember(
              resolveGroupRef(input),
              resolveMemberRef(input)
            );
            return formatGroupMutationResult(
              result as Record<string, unknown>
            );
          }
          case "remove_member": {
            const result = await api.groups.removeMember(
              resolveGroupRef(input),
              resolveMemberRef(input)
            );
            return formatGroupMutationResult(
              result as Record<string, unknown>
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

export const manageGroupsTool = defineManageGroupsTool();
