import type { AgentAdminGroup, AgentAdminGroupDetail } from "@robotrock/core/schemas";
import type { z } from "zod";
import {
  buildTenantGroupUrl,
  groupEntityRowSchema,
  manageGroupsDetailOutputSchema,
  manageGroupsListOutputSchema,
  manageGroupsSummaryOutputSchema,
} from "../../entity-schemas.js";
import {
  formatToolListResult,
  formatToolObjectResult,
} from "../../tool-display-format.js";
import {
  MANAGE_GROUPS_DETAIL_REPLY_GUIDANCE,
  MANAGE_GROUPS_LIST_REPLY_GUIDANCE,
} from "../../tool-reply-guidance.js";

type GroupEntityRow = z.infer<typeof groupEntityRowSchema>;
type ManageGroupsListOutput = z.infer<typeof manageGroupsListOutputSchema>;
type ManageGroupsDetailOutput = z.infer<typeof manageGroupsDetailOutputSchema>;
type ManageGroupsSummaryOutput = z.infer<typeof manageGroupsSummaryOutputSchema>;

function serializeGroupRow(
  group: AgentAdminGroup,
  tenantSlug: string
): GroupEntityRow {
  return {
    name: group.name,
    slug: group.slug,
    description: group.description,
    memberCount: group.memberCount ?? null,
    url: buildTenantGroupUrl(tenantSlug, group.slug),
  };
}

export function formatGroupsListResult(
  groups: AgentAdminGroup[],
  options: { tenantSlug: string }
): ManageGroupsListOutput {
  return formatToolListResult(
    "groups",
    groups.map((group) => serializeGroupRow(group, options.tenantSlug)),
    {
      replyGuidance: MANAGE_GROUPS_LIST_REPLY_GUIDANCE,
    }
  );
}

export function formatGroupDetailResult(
  group: AgentAdminGroupDetail,
  options: { tenantSlug: string }
): ManageGroupsDetailOutput {
  return formatToolObjectResult(
    {
      name: group.name,
      slug: group.slug,
      description: group.description,
      url: buildTenantGroupUrl(options.tenantSlug, group.slug),
      members: group.members.map((member) => ({
        name: member.user.name,
        email: member.user.email,
        profilePictureUrl: member.user.profilePictureUrl ?? null,
      })),
    },
    {
      replyGuidance: MANAGE_GROUPS_DETAIL_REPLY_GUIDANCE,
    }
  );
}

export function formatGroupSummaryResult(
  group: AgentAdminGroup,
  options: { tenantSlug: string }
): ManageGroupsSummaryOutput {
  return formatToolObjectResult(serializeGroupRow(group, options.tenantSlug), {
    replyGuidance: MANAGE_GROUPS_DETAIL_REPLY_GUIDANCE,
  });
}
