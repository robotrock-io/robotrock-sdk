import {
  attachWebhookToActions,
  RobotRockError,
  type RobotRock,
  type SendToHumanActionInput,
  type SendToHumanInput,
} from "../../client.js";
import type { TaskPriority } from "../../schemas/index.js";
import type { SessionContext } from "eve/context";
import { tryCreateBoundRobotRockClient } from "./client-from-session.js";
import { tryResolveTenantCaller } from "./tenant.js";

export type CreateRobotRockTaskInput = SendToHumanInput<
  readonly SendToHumanActionInput[]
> & {
  app?: string;
};

function resolveTaskApp(app?: string): string {
  return app?.trim() || process.env.ROBOTROCK_APP?.trim() || "robotrock-agent";
}

function resolveWebhookBaseUrl(baseUrl?: string): string {
  return (
    baseUrl?.trim() ||
    process.env.ROBOTROCK_BASE_URL?.trim() ||
    "http://localhost:4001/v1"
  );
}

/** Resolve the webhook URL RobotRock calls when a delegated inbox task is handled. */
export function resolveTaskHandledWebhookUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  const withV1 = trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
  return `${withV1}/agent-chats/task-handled`;
}

function requireBoundClient(ctx: SessionContext): RobotRock {
  const client = tryCreateBoundRobotRockClient(ctx);
  if (!client) {
    throw new Error(
      "RobotRock auth is unset. Configure ROBOTROCK_AGENT_SERVICE_TOKEN for hosted agents or ROBOTROCK_API_KEY for self-hosted deployments."
    );
  }
  return client;
}

/** Create an inbox task via POST /v1 without waiting for a human response. */
export async function createRobotRockTask(
  input: CreateRobotRockTaskInput,
  ctx: SessionContext
) {
  const client = requireBoundClient(ctx);
  const { app, ...taskInput } = input;
  const resolvedApp = resolveTaskApp(app);

  const webhookUrl = resolveTaskHandledWebhookUrl(
    resolveWebhookBaseUrl(process.env.ROBOTROCK_BASE_URL)
  );

  try {
    const task = await client.tasks.create({
      ...taskInput,
      app: resolvedApp,
      actions: attachWebhookToActions(taskInput.actions, {
        url: webhookUrl,
        headers: {},
      }),
    });
    return {
      taskId: task.taskId,
      threadId: task.threadId,
      status: task.status,
      validUntil: task.validUntil,
      submittedAt: task.submittedAt,
    };
  } catch (error) {
    const caller = tryResolveTenantCaller(ctx);
    if (error instanceof RobotRockError) {
      const response =
        error.response && typeof error.response === "object"
          ? (error.response as Record<string, unknown>)
          : undefined;
      console.error("[create_robotrock_task] API request failed", {
        status: error.statusCode,
        message: error.message,
        code: response?.code,
        hint: response?.hint,
        tenantSlug: caller?.tenantSlug,
        connectionId: caller?.connectionId,
        baseUrl: process.env.ROBOTROCK_BASE_URL?.trim() || null,
      });
    } else {
      console.error("[create_robotrock_task] unexpected error", error);
    }
    throw error;
  }
}

export type RobotRockTaskActionInput = {
  id: string;
  title: string;
  description?: string;
};

export type RobotRockTaskAssignToInput = {
  users?: string[];
  groups?: string[];
};

export type RobotRockTaskContextInput = {
  data?: Record<string, unknown>;
  ui?: Record<string, unknown>;
};

export type RobotRockTaskToolInput = {
  type: string;
  name: string;
  description?: string;
  actions: RobotRockTaskActionInput[];
  assignTo?: RobotRockTaskAssignToInput;
  context?: RobotRockTaskContextInput;
  validUntilHours?: number;
  priority?: TaskPriority;
  updateMessage?: string;
  app?: string;
};

export function buildRobotRockTaskPayload(
  input: RobotRockTaskToolInput,
  options?: { requestedByEmail?: string }
): CreateRobotRockTaskInput {
  const contextData: Record<string, unknown> = {
    ...(input.context?.data ?? {}),
  };

  if (options?.requestedByEmail) {
    contextData.requestedBy = options.requestedByEmail;
  }

  const hasContext =
    Object.keys(contextData).length > 0 ||
    (input.context?.ui && Object.keys(input.context.ui).length > 0);

  const payload: CreateRobotRockTaskInput = {
    type: input.type,
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    actions: input.actions.map((action) => ({
      id: action.id,
      title: action.title,
      ...(action.description ? { description: action.description } : {}),
    })),
    ...(input.assignTo ? { assignTo: input.assignTo } : {}),
    ...(input.priority ? { priority: input.priority } : {}),
    ...(input.app ? { app: input.app } : {}),
    ...(input.validUntilHours
      ? {
          validUntil: new Date(Date.now() + input.validUntilHours * 60 * 60 * 1000),
        }
      : {}),
    ...(input.updateMessage
      ? {
          update: {
            message: input.updateMessage,
            status: "waiting" as const,
          },
        }
      : {}),
  };

  if (hasContext) {
    payload.context = {
      data: contextData,
      ...(input.context?.ui ? { ui: input.context.ui } : {}),
    };
  }

  return payload;
}
