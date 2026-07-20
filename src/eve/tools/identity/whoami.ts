import { defineTool } from "eve/tools";
import { z } from "zod";
import { tryResolveTenantCaller } from "../../agent/tenant.js";
import {
  WHOAMI_REPLY_GUIDANCE,
  withReplyGuidance,
} from "../../tool-reply-guidance.js";

export const WHOAMI_TOOL_NAME = "whoami";

export const whoamiInputSchema = z.object({});

export function defineWhoamiTool() {
  return defineTool({
    description:
      "Return the authenticated RobotRock user, tenant, role, and group memberships for the current chat session. " +
      "The dashboard renders a profile card — do not repeat name, email, workspace, role, or groups in your reply; only add context not shown in the card.",
    inputSchema: whoamiInputSchema,
    async execute(_input, ctx) {
      const caller = tryResolveTenantCaller(ctx);
      if (!caller) {
        return withReplyGuidance(
          {
            authenticated: false as const,
            message:
              "No RobotRock user is attached to this session. Dashboard chat supplies user context via the Eve proxy.",
          },
          "Explain that no user is attached to this session. Do not invent identity details."
        );
      }

      return withReplyGuidance(
        {
          authenticated: true as const,
          userId: caller.userId,
          name: caller.name,
          email: caller.email,
          tenantSlug: caller.tenantSlug,
          role: caller.role,
          isAdmin: caller.isAdmin,
          groups: caller.groups.map((slug) => ({ slug })),
          ...(caller.workosUserId ? { workosUserId: caller.workosUserId } : {}),
          sessionId: ctx.session.id,
        },
        WHOAMI_REPLY_GUIDANCE
      );
    },
  });
}

export const whoamiTool = defineWhoamiTool();
