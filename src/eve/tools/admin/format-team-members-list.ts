import type { AgentAdminMember } from "@robotrock/core/schemas";
import type { z } from "zod";
import {
  manageTeamMembersDetailOutputSchema,
  manageTeamMembersListOutputSchema,
  memberEntityRowSchema,
} from "../../entity-schemas.js";
import {
  formatToolListResult,
  formatToolObjectResult,
} from "../../tool-display-format.js";
import {
  MANAGE_TEAM_MEMBERS_DETAIL_REPLY_GUIDANCE,
  MANAGE_TEAM_MEMBERS_LIST_REPLY_GUIDANCE,
} from "../../tool-reply-guidance.js";

type MemberEntityRow = z.infer<typeof memberEntityRowSchema>;
type ManageTeamMembersListOutput = z.infer<
  typeof manageTeamMembersListOutputSchema
>;
type ManageTeamMembersDetailOutput = z.infer<
  typeof manageTeamMembersDetailOutputSchema
>;

function serializeMemberRow(member: AgentAdminMember): MemberEntityRow {
  return {
    name: member.user.name,
    email: member.user.email,
    role: member.role,
    membershipKind: member.membershipKind,
    profilePictureUrl: member.user.profilePictureUrl ?? null,
  };
}

export function formatTeamMembersListResult(
  members: AgentAdminMember[]
): ManageTeamMembersListOutput {
  return formatToolListResult(
    "members",
    members.map(serializeMemberRow),
    {
      replyGuidance: MANAGE_TEAM_MEMBERS_LIST_REPLY_GUIDANCE,
    }
  );
}

export function formatTeamMemberDetailResult(
  member: AgentAdminMember
): ManageTeamMembersDetailOutput {
  return formatToolObjectResult(serializeMemberRow(member), {
    replyGuidance: MANAGE_TEAM_MEMBERS_DETAIL_REPLY_GUIDANCE,
  });
}
