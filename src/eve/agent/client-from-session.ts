import {
  createClient,
  type RobotRock,
} from "../../client.js";
import type { SessionContext } from "eve/context";
import {
  resolveChatCorrelationFromEnv,
  type ChatCorrelation,
} from "../../chat-correlation.js";
import { tryResolveTenantCaller } from "./tenant.js";

let warnedMissingAuth = false;

function resolveBoundChatCorrelation(ctx: SessionContext): ChatCorrelation {
  const caller = tryResolveTenantCaller(ctx);
  return {
    eveSessionId: ctx.session.id,
    ...(caller?.chatId ? { chatId: caller.chatId } : {}),
    ...resolveChatCorrelationFromEnv(),
  };
}

/** Create a RobotRock client bound to the current Eve session tenant context. */
export function tryCreateBoundRobotRockClient(
  ctx: SessionContext
): RobotRock | null {
  const caller = tryResolveTenantCaller(ctx);
  const serviceToken = process.env.ROBOTROCK_AGENT_SERVICE_TOKEN?.trim();
  const chatCorrelation = resolveBoundChatCorrelation(ctx);

  if (caller?.connectionId && serviceToken) {
    return createClient({
      baseUrl: process.env.ROBOTROCK_BASE_URL?.trim(),
      chatCorrelation,
      agentService: {
        token: serviceToken,
        tenantSlug: caller.tenantSlug,
        connectionId: caller.connectionId,
        actingUserId: caller.userId,
      },
    });
  }

  const apiKey = process.env.ROBOTROCK_API_KEY?.trim();
  if (apiKey) {
    return createClient({
      apiKey,
      ...(caller?.userId ? { actingUserId: caller.userId } : {}),
      baseUrl: process.env.ROBOTROCK_BASE_URL?.trim(),
      chatCorrelation,
    });
  }

  if (!warnedMissingAuth) {
    warnedMissingAuth = true;
    console.warn(
      "robotrock: set ROBOTROCK_AGENT_SERVICE_TOKEN for hosted multi-tenant auth, " +
        "or ROBOTROCK_API_KEY for single-tenant deployments."
    );
  }

  return null;
}

/** Reset missing-auth warning (tests only). */
export function resetBoundClientAuthWarning(): void {
  warnedMissingAuth = false;
}
