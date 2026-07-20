import { getRobotRockApiBaseUrl } from "@robotrock/core";
import type { SessionContext } from "eve/context";
import {
  buildRobotRockAuthHeaders,
  resolveRobotRockAuthConfig,
  type RobotRockAuthConfig,
} from "./auth-headers.js";
import { RobotRockError, getErrorMessage, parseResponseBody } from "./http.js";
import { requireAdminCaller, requireTenantCaller, tryResolveTenantCaller } from "./eve/agent/tenant.js";
import {
  buildChatCorrelationHeaders,
  resolveChatCorrelationFromEnv,
  type ChatCorrelation,
} from "./chat-correlation.js";

export type AgentAdminClientConfig = {
  baseUrl?: string;
  auth: RobotRockAuthConfig;
  chatCorrelation?: ChatCorrelation;
};

async function agentAdminFetch<T>(
  config: AgentAdminClientConfig,
  path: string,
  init?: RequestInit
): Promise<T> {
  const baseUrl = (config.baseUrl?.trim() || getRobotRockApiBaseUrl()).replace(
    /\/+$/,
    ""
  );
  const url = `${baseUrl}/agent-admin${path}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...buildRobotRockAuthHeaders(config.auth),
      ...buildChatCorrelationHeaders(config.chatCorrelation),
      ...(init?.headers ?? {}),
    },
  });

  const data = await parseResponseBody(response);
  if (!response.ok) {
    throw new RobotRockError(
      getErrorMessage(data, `Agent admin request failed (${response.status})`),
      response.status,
      data
    );
  }

  return data as T;
}

export function createAgentAdminApi(config: AgentAdminClientConfig) {
  return {
    usage: {
      get: () => agentAdminFetch<{ usage: unknown }>(config, "/usage"),
    },
    members: {
      list: () =>
        agentAdminFetch<{ members: unknown[] }>(config, "/members"),
      get: (memberRef: string) =>
        agentAdminFetch<{ member: unknown }>(config, `/members/${encodeURIComponent(memberRef)}`),
      invite: (body: { email: string; role?: "admin" | "member" }) =>
        agentAdminFetch<Record<string, unknown>>(config, "/members", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      updateRole: (memberRef: string, role: "admin" | "member") =>
        agentAdminFetch<Record<string, unknown>>(
          config,
          `/members/${encodeURIComponent(memberRef)}/role`,
          {
            method: "PATCH",
            body: JSON.stringify({ role }),
          }
        ),
      remove: (memberId: string) =>
        agentAdminFetch<Record<string, unknown>>(
          config,
          `/members/${encodeURIComponent(memberId)}`,
          {
            method: "DELETE",
          }
        ),
    },
    groups: {
      list: () => agentAdminFetch<{ groups: unknown[] }>(config, "/groups"),
      get: (groupId: string) =>
        agentAdminFetch<{ group: unknown }>(
          config,
          `/groups/${encodeURIComponent(groupId)}`
        ),
      create: (body: { name: string; description?: string }) =>
        agentAdminFetch<{ group: unknown }>(config, "/groups", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      update: (
        groupId: string,
        body: { name?: string; description?: string }
      ) =>
        agentAdminFetch<{ group: unknown }>(
          config,
          `/groups/${encodeURIComponent(groupId)}`,
          {
            method: "PATCH",
            body: JSON.stringify(body),
          }
        ),
      delete: (groupId: string) =>
        agentAdminFetch<Record<string, unknown>>(
          config,
          `/groups/${encodeURIComponent(groupId)}`,
          {
            method: "DELETE",
          }
        ),
      addMember: (groupRef: string, memberRef: string) =>
        agentAdminFetch<Record<string, unknown>>(
          config,
          `/groups/${encodeURIComponent(groupRef)}/members`,
          {
            method: "POST",
            body: JSON.stringify({ userId: memberRef }),
          }
        ),
      removeMember: (groupRef: string, memberRef: string) =>
        agentAdminFetch<Record<string, unknown>>(
          config,
          `/groups/${encodeURIComponent(groupRef)}/members/${encodeURIComponent(memberRef)}`,
          { method: "DELETE" }
        ),
    },
    tasks: {
      list: (query?: Record<string, string | number | undefined>) => {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(query ?? {})) {
          if (value !== undefined && value !== "") {
            params.set(key, String(value));
          }
        }
        const suffix = params.size > 0 ? `?${params.toString()}` : "";
        return agentAdminFetch<{ items: unknown[]; nextCursor: string | null }>(
          config,
          `/tasks${suffix}`
        );
      },
      search: (q: string, limit?: number) => {
        const params = new URLSearchParams({ q });
        if (limit !== undefined) {
          params.set("limit", String(limit));
        }
        return agentAdminFetch<{ items: unknown[]; total: number }>(
          config,
          `/tasks/search?${params.toString()}`
        );
      },
      get: (taskId: string) =>
        agentAdminFetch<{ task: unknown }>(config, `/tasks/${taskId}`),
      assign: (body: {
        taskIds: string[];
        assignTo: { users?: string[]; groups?: string[] };
      }) =>
        agentAdminFetch<{
          results: Array<{
            taskId: string;
            success: boolean;
            message?: string;
            name?: string | null;
            description?: string | null;
            type?: string | null;
          }>;
        }>(config, "/tasks/assign", {
          method: "POST",
          body: JSON.stringify(body),
        }),
    },
  };
}

export type AgentAdminApi = ReturnType<typeof createAgentAdminApi>;

function resolveBoundChatCorrelation(ctx: SessionContext): ChatCorrelation {
  const caller = tryResolveTenantCaller(ctx);
  return {
    eveSessionId: ctx.session.id,
    ...(caller?.chatId ? { chatId: caller.chatId } : {}),
    ...resolveChatCorrelationFromEnv(),
  };
}

/** Create an agent-admin API client bound to the current Eve session. */
export function createBoundAgentAdminClient(ctx: SessionContext): AgentAdminApi {
  const caller = requireTenantCaller(ctx);
  const baseUrl = process.env.ROBOTROCK_BASE_URL?.trim();
  const serviceToken = process.env.ROBOTROCK_AGENT_SERVICE_TOKEN?.trim();
  const chatCorrelation = resolveBoundChatCorrelation(ctx);

  if (caller.connectionId && serviceToken) {
    return createAgentAdminApi({
      baseUrl,
      chatCorrelation,
      auth: resolveRobotRockAuthConfig({
        agentService: {
          token: serviceToken,
          tenantSlug: caller.tenantSlug,
          connectionId: caller.connectionId,
          actingUserId: caller.userId,
        },
      }),
    });
  }

  const apiKey = process.env.ROBOTROCK_API_KEY?.trim();
  if (apiKey) {
    return createAgentAdminApi({
      baseUrl,
      chatCorrelation,
      auth: {
        kind: "apiKey",
        apiKey,
        actingUserId: caller.userId,
      },
    });
  }

  throw new Error(
    "Agent admin auth is unset. Set ROBOTROCK_AGENT_SERVICE_TOKEN for hosted multi-tenant agents, " +
      "or ROBOTROCK_API_KEY for self-hosted and localhost deployments."
  );
}

/** Require tenant admin and return a bound agent-admin client. */
export function requireBoundAgentAdminClient(ctx: SessionContext): AgentAdminApi {
  requireAdminCaller(ctx);
  return createBoundAgentAdminClient(ctx);
}
