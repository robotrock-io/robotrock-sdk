export type RobotRockAuthConfig =
  | { kind: "apiKey"; apiKey: string; actingUserId?: string }
  | {
      kind: "agentService";
      token: string;
      tenantSlug: string;
      connectionId: string;
      actingUserId?: string;
    };

export const ROBOTROCK_ACTING_USER_ID_HEADER = "x-robotrock-acting-user-id";

export function buildRobotRockAuthHeaders(
  auth: RobotRockAuthConfig
): Record<string, string> {
  if (auth.kind === "apiKey") {
    const headers: Record<string, string> = {
      "X-Api-Key": auth.apiKey,
    };
    if (auth.actingUserId?.trim()) {
      headers[ROBOTROCK_ACTING_USER_ID_HEADER] = auth.actingUserId.trim();
    }
    return headers;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.token}`,
    "X-RobotRock-Tenant-Slug": auth.tenantSlug,
    "X-RobotRock-Connection-Id": auth.connectionId,
  };

  if (auth.actingUserId?.trim()) {
    headers[ROBOTROCK_ACTING_USER_ID_HEADER] = auth.actingUserId.trim();
  }

  return headers;
}

export function resolveRobotRockAuthConfig(overrides?: {
  apiKey?: string;
  actingUserId?: string;
  agentService?: {
    token: string;
    tenantSlug: string;
    connectionId: string;
    actingUserId?: string;
  };
}): RobotRockAuthConfig {
  if (overrides?.agentService) {
    return {
      kind: "agentService",
      ...overrides.agentService,
    };
  }

  const apiKey = overrides?.apiKey ?? process.env.ROBOTROCK_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RobotRock auth is required. Set ROBOTROCK_API_KEY, ROBOTROCK_AGENT_SERVICE_TOKEN with tenant context, or pass auth when creating the client."
    );
  }

  return {
    kind: "apiKey",
    apiKey,
    ...(overrides?.actingUserId?.trim()
      ? { actingUserId: overrides.actingUserId.trim() }
      : {}),
  };
}
