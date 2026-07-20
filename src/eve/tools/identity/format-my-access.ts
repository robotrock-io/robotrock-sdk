import { formatToolObjectResult } from "../../tool-display-format.js";
import { MY_ACCESS_REPLY_GUIDANCE } from "../../tool-reply-guidance.js";

type MyAccessResultInput = {
  tenantSlug: string;
  tenantRole?: string;
  isTenantAdmin: boolean;
  groupSlugs: string[];
  capabilities: {
    manageSettings: boolean;
    manageBilling: boolean;
    manageTeam: boolean;
    manageIntegrations: boolean;
  };
  email?: string;
};

export function formatMyAccessResult(input: MyAccessResultInput) {
  return formatToolObjectResult(
    {
      access: {
        workspace: input.tenantSlug,
        role: input.tenantRole ?? "member",
        tenantAdmin: input.isTenantAdmin,
        groups: input.groupSlugs.join(", ") || "—",
        manageSettings: input.capabilities.manageSettings,
        manageBilling: input.capabilities.manageBilling,
        manageTeam: input.capabilities.manageTeam,
        manageIntegrations: input.capabilities.manageIntegrations,
        ...(input.email ? { email: input.email } : {}),
      },
    },
    {
      replyGuidance: MY_ACCESS_REPLY_GUIDANCE,
    }
  );
}
