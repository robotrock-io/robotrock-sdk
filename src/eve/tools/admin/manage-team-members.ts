import type { AgentAdminMember } from "@robotrock/core/schemas";
import { RobotRockError } from "../../../http.js";
import { requireBoundAgentAdminClient } from "../../../agent-admin.js";
import {
  formatTeamMemberDetailResult,
  formatTeamMembersListResult,
} from "./format-team-members-list.js";
import {
  formatToolObjectResult,
} from "../../tool-display-format.js";
import { ADMIN_MUTATION_REPLY_GUIDANCE } from "../../tool-reply-guidance.js";
import { manageTeamMembersOutputSchema } from "../../entity-schemas.js";
import { defineTool } from "eve/tools";
import { z } from "zod";

export const MANAGE_TEAM_MEMBERS_TOOL_NAME = "manage_team_members";

export const manageTeamMembersInputSchema = z
  .object({
    action: z.enum(["list", "get", "invite", "update_role", "remove"]),
    userId: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Convex users table id for get, update_role, and remove. Prefer email when the member list only shows email."
      ),
    email: z
      .string()
      .email()
      .optional()
      .describe(
        "Member email for get, update_role, and remove; invitee email for invite."
      ),
    role: z
      .enum(["admin", "member"])
      .optional()
      .describe("Role for invite and update_role."),
  })
  .superRefine((input, ctx) => {
    const requireField = (
      field: "userId" | "email" | "role",
      message: string
    ) => {
      if (!input[field]) {
        ctx.addIssue({ code: "custom", message, path: [field] });
      }
    };

    const requireUserIdOrEmail = (message: string) => {
      if (!input.userId && !input.email) {
        ctx.addIssue({ code: "custom", message, path: ["email"] });
      }
    };

    switch (input.action) {
      case "get":
        requireUserIdOrEmail("userId or email is required for this action.");
        break;
      case "remove":
        requireUserIdOrEmail(
          "userId or email is required when removing a member."
        );
        break;
      case "invite":
        requireField("email", "email is required when inviting a member.");
        break;
      case "update_role":
        requireUserIdOrEmail(
          "userId or email is required when updating a role."
        );
        requireField("role", "role is required when updating a role.");
        break;
    }
  });

function resolveMemberRef(input: { userId?: string; email?: string }): string {
  return input.userId ?? input.email!;
}

function formatMemberMutationResult(payload: Record<string, unknown>) {
  return formatToolObjectResult(payload, {
    replyGuidance: ADMIN_MUTATION_REPLY_GUIDANCE,
  });
}

export function defineManageTeamMembersTool() {
  return defineTool({
    description:
      "Tenant-admin tool for workspace team members: list, get, invite, change role, or remove. Requires tenant admin access. " +
      "Call get_my_access in the same turn before this tool to verify admin access (the check stays a compact activity marker). " +
      "Use member email from list results for get, update_role, and remove — internal ids are optional. " +
      "Results render as chat UI cards — do not restate member names, emails, or roles in your reply.",
    inputSchema: manageTeamMembersInputSchema,
    outputSchema: manageTeamMembersOutputSchema,
    async execute(input, ctx) {
      const api = requireBoundAgentAdminClient(ctx);

      try {
        switch (input.action) {
          case "list": {
            const result = await api.members.list();
            return formatTeamMembersListResult(
              result.members as AgentAdminMember[]
            );
          }
          case "get": {
            const result = await api.members.get(resolveMemberRef(input));
            return formatTeamMemberDetailResult(result.member as AgentAdminMember);
          }
          case "invite": {
            const result = await api.members.invite({
              email: input.email!,
              role: input.role,
            });
            if (result.member) {
              return formatTeamMemberDetailResult(
                result.member as AgentAdminMember
              );
            }
            return formatMemberMutationResult(
              result as Record<string, unknown>
            );
          }
          case "update_role": {
            const result = await api.members.updateRole(
              resolveMemberRef(input),
              input.role!
            );
            return formatMemberMutationResult(
              result as Record<string, unknown>
            );
          }
          case "remove": {
            const memberId = resolveMemberRef(input);
            const result = await api.members.remove(memberId);
            return formatMemberMutationResult(
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

export const manageTeamMembersTool = defineManageTeamMembersTool();
