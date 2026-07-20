import {
  type AssignToInput,
  type TaskContextInput,
  createTaskBodySchema,
  threadUpdateBodySchema,
  TASK_CONTEXT_FORMAT_VERSION,
} from "./schemas/index.js";
import {
  type AgentAdminTaskSummary,
  listTasksQuerySchema,
} from "@robotrock/core";
import type { z } from "zod";
import {
  TaskExpiredError,
  TaskTimeoutError,
  toDiscriminatedApprovalResult,
} from "./approval-result.js";
import { RobotRockError, getErrorMessage, parseResponseBody } from "./http.js";
import { getRobotRockApiBaseUrl } from "@robotrock/core";
import { createChatsApi, type ChatsApi } from "./chats.js";
import {
  buildRobotRockAuthHeaders,
  resolveRobotRockAuthConfig,
  type RobotRockAuthConfig,
} from "./auth-headers.js";
import {
  buildChatCorrelationHeaders,
  type ChatCorrelation,
} from "./chat-correlation.js";
import type {
  DiscriminatedApprovalResult,
  Task,
  TaskPriority,
  TaskResponse,
  ThreadUpdate,
  ThreadUpdateResponse,
  ThreadUpdateStatus,
  TaskContextFormatVersion,
} from "./schemas/index.js";

export type RobotRockWebhookConfig = {
  url: string;
  headers?: Record<string, string>;
};

export interface RobotRockPollingOptions {
  /** Poll interval when no webhook is configured (ms). @default 2000 */
  intervalMs?: number;
  /**
   * Max time to poll when no webhook is configured (ms).
   * Polling also stops when the task's `validUntil` passes, whichever is sooner.
   * @default 86400000 (24h)
   */
  timeoutMs?: number;
};

/** Advanced client settings rarely changed by integrators. */
export type RobotRockAdvancedConfig = {
  /** Task context wire format version sent on every request. @default 2 */
  contextVersion?: TaskContextFormatVersion;
};

type RobotRockClientBaseConfig = {
  /** Optional chat correlation headers for audit logging from agent sessions. */
  chatCorrelation?: ChatCorrelation;
  /** Optional override for API key. Falls back to ROBOTROCK_API_KEY when agentService is unset. */
  apiKey?: string;
  /** Acting dashboard user id (required for user-scoped agent APIs like image upload). */
  actingUserId?: string;
  /** Hosted-agent service auth (mutually exclusive with apiKey). */
  agentService?: {
    token: string;
    tenantSlug: string;
    connectionId: string;
    actingUserId?: string;
  };
  /**
   * Base URL for the RobotRock API
   * @default "https://api.robotrock.io/v1"
   */
  baseUrl?: string;
  /**
   * Default inbox app bucket for every task from this client.
   * When omitted, the API uses your API key name.
   */
  app?: string;
  /**
   * Agent release version (semver, git SHA, deploy tag).
   * Defaults to `AGENT_VERSION` or `ROBOTROCK_AGENT_VERSION` from env when omitted.
   */
  version?: string;
  /** Advanced settings (context wire format, etc.). */
  advanced?: RobotRockAdvancedConfig;
};

/** Client config with a webhook (mutually exclusive with `polling`). */
export type RobotRockWebhookClientConfig = RobotRockClientBaseConfig & {
  webhook: RobotRockWebhookConfig;
  polling?: never;
};

/** Client config without a webhook; optional `polling` controls the wait loop. */
export type RobotRockPollingClientConfig = RobotRockClientBaseConfig & {
  webhook?: never;
  polling?: RobotRockPollingOptions;
};

export type RobotRockConfig = RobotRockWebhookClientConfig | RobotRockPollingClientConfig;

export type SendToHumanActionInput = Omit<TaskContextInput["actions"][number], "handlers">;

export type SendToHumanValidUntil = Date | string;

export type SendToHumanInput<
  A extends readonly SendToHumanActionInput[] = readonly SendToHumanActionInput[],
> = Omit<TaskContextInput, "app" | "actions" | "contextVersion" | "version" | "validUntil"> & {
  actions: A;
  /** Task deadline; serialized to an ISO 8601 string on the wire. */
  validUntil?: SendToHumanValidUntil;
  /** Optional idempotency key to prevent duplicate tasks */
  idempotencyKey?: string;
  /** Assign to tenant users (email) and/or groups (slug). Narrows inbox visibility. */
  assignTo?: AssignToInput;
  /**
   * Groups related tasks together in the inbox. Omit to let the server generate
   * one (returned as `task.threadId`) and reuse it on later tasks in the thread.
   */
  threadId?: string;
  /**
   * Optional thread priority. When set, applies to the whole thread and
   * overwrites any previous priority. Omit on later tasks to leave unchanged.
   */
  priority?: TaskPriority;
  /**
   * Optional initial status update logged against the task's thread. Shows in
   * the inbox status bar and the thread update log.
   */
  update?: {
    /** A short status update (1-2 sentences). */
    message: string;
    /** Lifecycle status for the icon/color in the status bar. @default "info" */
    status?: ThreadUpdateStatus;
  };
  /**
   * Agent release version override. When omitted, uses the client `version`.
   * Used for statistics and feedback analysis.
   */
  version?: string;
};

type SendToHumanWithAppInput<
  A extends readonly SendToHumanActionInput[] = readonly SendToHumanActionInput[],
> = (SendToHumanInput<A> | Readonly<SendToHumanInput<A>>) & {
  /** Inbox app bucket. Overrides the client `app` when set. */
  app?: string;
};

export type SendUpdateInput = {
  /** The thread to log the update against (from `task.threadId`). */
  threadId: string;
  /** A short status update (1-2 sentences). */
  message: string;
  /** Lifecycle status for the icon/color in the status bar. @default "info" */
  status?: ThreadUpdateStatus;
};

export type SendToHumanResult<
  A extends readonly SendToHumanActionInput[] = readonly SendToHumanActionInput[],
> =
  | {
      mode: "created";
      task: TaskResponse["task"];
    }
  | ({
      mode: "handled";
      task: TaskResponse["task"];
    } & DiscriminatedApprovalResult<A>);

const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_TIMEOUT_MS = 24 * 60 * 60 * 1_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveAgentVersionFromEnv(): string | undefined {
  const fromEnv =
    process.env.AGENT_VERSION?.trim() || process.env.ROBOTROCK_AGENT_VERSION?.trim();
  return fromEnv || undefined;
}

function parseValidUntilMs(value: string | number | Date | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? undefined : ms;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function serializeValidUntil(value: SendToHumanValidUntil): string {
  if (value instanceof Date) {
    const ms = value.getTime();
    if (Number.isNaN(ms)) {
      throw new RobotRockError("Invalid validUntil: Date is invalid", 400);
    }
    return value.toISOString();
  }

  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }

  throw new RobotRockError("Invalid validUntil: expected a Date or parseable date string", 400);
}

export { RobotRockError } from "./http.js";

export type ListTasksInput = z.infer<typeof listTasksQuerySchema>;

export type SearchTasksInput = {
  q: string;
  limit?: number;
};

/** Task CRUD surface, exposed as `client.tasks`. */
export interface TasksApi {
  /** Create a task via POST /v1 without waiting for a human response. */
  create<const A extends readonly SendToHumanActionInput[]>(
    task: SendToHumanWithAppInput<A>
  ): Promise<TaskResponse["task"]>;
  /** Get a task by public task id. */
  get(taskId: string): Promise<Task | null>;
  /** Cancel a task by public task id. */
  cancel(taskId: string): Promise<void>;
  /** Log a status update against a thread. */
  sendUpdate(input: SendUpdateInput): Promise<ThreadUpdate>;
  /** List tasks in the workspace for this API key. */
  list(input?: ListTasksInput): Promise<{
    items: AgentAdminTaskSummary[];
    nextCursor: string | null;
  }>;
  /** Search tasks by type, name, description, or id. */
  search(input: SearchTasksInput): Promise<{
    items: AgentAdminTaskSummary[];
    total: number;
  }>;
}

/**
 * RobotRock API client for creating and querying human-in-the-loop tasks and
 * chats. CRUD lives under `client.tasks` and `client.chats`; the headline
 * `sendToHuman` verb stays top-level.
 */
export class RobotRock {
  private readonly auth: RobotRockAuthConfig;
  private readonly chatCorrelation?: ChatCorrelation;
  private readonly baseUrl: string;
  private readonly app?: string;
  private readonly agentVersion?: string;
  private readonly contextVersion: TaskContextFormatVersion;
  private readonly webhook?: RobotRockWebhookConfig;
  private readonly polling: RobotRockPollingOptions;

  /** Task CRUD: `create`, `get`, `cancel`, `sendUpdate`. */
  readonly tasks: TasksApi;
  /** Chat CRUD: `create`, `close`. */
  readonly chats: ChatsApi;

  constructor(config: RobotRockConfig) {
    if (config.webhook && config.polling) {
      throw new Error(
        "RobotRock client cannot configure both webhook and polling. Use webhook for callbacks or polling to block until handled."
      );
    }

    const apiKey = config.apiKey ?? process.env.ROBOTROCK_API_KEY;
    const agentService = config.agentService;
    if (apiKey && agentService) {
      throw new Error(
        "RobotRock client cannot configure both apiKey and agentService."
      );
    }

    this.auth = resolveRobotRockAuthConfig({
      ...(apiKey ? { apiKey } : {}),
      ...(config.actingUserId ? { actingUserId: config.actingUserId } : {}),
      ...(agentService ? { agentService } : {}),
    });
    this.chatCorrelation = config.chatCorrelation;
    this.baseUrl = config.baseUrl ?? getRobotRockApiBaseUrl();
    this.app = config.app;
    this.agentVersion = config.version ?? resolveAgentVersionFromEnv();
    this.contextVersion =
      config.advanced?.contextVersion ?? TASK_CONTEXT_FORMAT_VERSION;
    this.webhook = config.webhook;
    this.polling = config.polling ?? {};

    this.tasks = {
      create: (task) => this.createTaskRequest(task),
      get: (taskId) => this.getTaskById(taskId),
      cancel: (taskId) => this.cancelTaskRequest(taskId),
      sendUpdate: (input) => this.sendThreadUpdate(input),
      list: (input) => this.listTasksRequest(input),
      search: (input) => this.searchTasksRequest(input),
    };
    this.chats = createChatsApi({
      baseUrl: this.baseUrl,
      auth: this.auth,
      app: this.app,
      chatCorrelation: this.chatCorrelation,
    });
  }

  private authHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...buildRobotRockAuthHeaders(this.auth),
      ...buildChatCorrelationHeaders(this.chatCorrelation),
      ...extra,
    };
  }

  private async createTaskRequest<const A extends readonly SendToHumanActionInput[]>(
    task: SendToHumanWithAppInput<A>
  ): Promise<TaskResponse["task"]> {
    const normalizedTask = normalizeSendToHumanInput(task, {
      webhook: this.webhook,
      app: this.app,
      contextVersion: this.contextVersion,
      agentVersion: this.agentVersion,
    });
    const agentVersion = task.version ?? this.agentVersion;
    const bodyPayload = {
      ...normalizedTask,
      ...(task.assignTo !== undefined ? { assignTo: task.assignTo } : {}),
      ...(task.threadId !== undefined ? { threadId: task.threadId } : {}),
      ...(task.priority !== undefined ? { priority: task.priority } : {}),
      ...(task.update !== undefined ? { update: task.update } : {}),
      ...(agentVersion !== undefined ? { agent: { version: agentVersion } } : {}),
    };
    const validation = createTaskBodySchema.safeParse(bodyPayload);
    if (!validation.success) {
      throw new RobotRockError(
        `Invalid task: ${validation.error.issues[0]?.message}`,
        400,
        validation.error.issues
      );
    }

    const headers = this.authHeaders(
      task.idempotencyKey
        ? { "Idempotency-Key": task.idempotencyKey }
        : undefined
    );

    const response = await fetch(`${this.baseUrl}/`, {
      method: "POST",
      headers,
      body: JSON.stringify(validation.data),
    });

    const data = await parseResponseBody(response);

    if (!response.ok) {
      throw new RobotRockError(
        getErrorMessage(data, "Failed to create task"),
        response.status,
        data
      );
    }

    return (data as unknown as TaskResponse).task;
  }

  async sendToHuman<const A extends readonly SendToHumanActionInput[]>(
    task: SendToHumanWithAppInput<A>
  ): Promise<SendToHumanResult<A>> {
    const normalizedTask = normalizeSendToHumanInput(task, {
      webhook: this.webhook,
      app: this.app,
      contextVersion: this.contextVersion,
      agentVersion: this.agentVersion,
    });
    const createdTaskTask = await this.createTaskRequest(task);
    const hasHandlers = normalizedTask.actions.some(
      (action) => Array.isArray(action.handlers) && action.handlers.length > 0
    );

    if (hasHandlers) {
      return {
        mode: "created",
        task: createdTaskTask,
      };
    }

    const timeoutMs = this.polling.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const pollIntervalMs = this.polling.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const pollingDeadline = Date.now() + timeoutMs;
    const validUntilMs = parseValidUntilMs(createdTaskTask.validUntil);
    const deadline =
      validUntilMs !== undefined ? Math.min(pollingDeadline, validUntilMs) : pollingDeadline;
    const taskId = createdTaskTask.taskId;

    while (Date.now() < deadline) {
      const existing = await this.getTaskById(taskId);

      if (existing?.status === "handled" && existing.handled) {
        return {
          mode: "handled",
          task: createdTaskTask,
          ...(toDiscriminatedApprovalResult(
            normalizedTask.actions as unknown as A,
            existing
          ) as DiscriminatedApprovalResult<A>),
        };
      }

      if (existing?.status === "expired" || (existing && Date.now() >= existing.validUntil)) {
        throw new TaskExpiredError("Task reached validUntil before a human completed it");
      }

      const remainingMs = deadline - Date.now();
      await sleep(Math.min(pollIntervalMs, Math.max(0, remainingMs)));
    }

    if (validUntilMs !== undefined && Date.now() >= validUntilMs) {
      throw new TaskExpiredError("Task reached validUntil before a human completed it");
    }

    throw new TaskTimeoutError(`No human response within ${timeoutMs}ms`);
  }

  /**
   * Create a task via POST /v1 without waiting for a human response.
   * @deprecated Use `client.tasks.create()` instead.
   */
  async createTask<const A extends readonly SendToHumanActionInput[]>(
    task: SendToHumanWithAppInput<A>
  ): Promise<TaskResponse["task"]> {
    return this.tasks.create(task);
  }

  /**
   * Get a task by public task id (returned as `task.taskId` from {@link sendToHuman}).
   * @deprecated Use `client.tasks.get()` instead.
   */
  async getTask(taskId: string): Promise<Task | null> {
    return this.tasks.get(taskId);
  }

  /**
   * Log a status update against a thread.
   * @deprecated Use `client.tasks.sendUpdate()` instead.
   */
  async sendUpdate(input: SendUpdateInput): Promise<ThreadUpdate> {
    return this.tasks.sendUpdate(input);
  }

  /**
   * Cancel a task by public task id.
   * @deprecated Use `client.tasks.cancel()` instead.
   */
  async cancelTask(taskId: string): Promise<void> {
    return this.tasks.cancel(taskId);
  }

  private async getTaskById(taskId: string): Promise<Task | null> {
    const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
      method: "GET",
      headers: this.authHeaders(),
    });

    if (response.status === 404) {
      return null;
    }

    const data = await parseResponseBody(response);

    if (!response.ok) {
      throw new RobotRockError(
        getErrorMessage(data, "Failed to get task"),
        response.status,
        data
      );
    }

    return data as unknown as Task;
  }

  private async sendThreadUpdate({
    threadId,
    message,
    status,
  }: SendUpdateInput): Promise<ThreadUpdate> {
    if (!threadId) {
      throw new RobotRockError("threadId is required to send an update", 400);
    }

    const validation = threadUpdateBodySchema.safeParse({ message, status });
    if (!validation.success) {
      throw new RobotRockError(
        `Invalid update: ${validation.error.issues[0]?.message}`,
        400,
        validation.error.issues
      );
    }

    const response = await fetch(
      `${this.baseUrl}/threads/${encodeURIComponent(threadId)}/updates`,
      {
        method: "POST",
        headers: this.authHeaders(),
        body: JSON.stringify(validation.data),
      }
    );

    const data = await parseResponseBody(response);

    if (!response.ok) {
      throw new RobotRockError(
        getErrorMessage(data, "Failed to send update"),
        response.status,
        data
      );
    }

    return (data as unknown as ThreadUpdateResponse).update;
  }

  private async cancelTaskRequest(taskId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/tasks/${taskId}/cancel`, {
      method: "POST",
      headers: this.authHeaders(),
    });

    if (!response.ok) {
      const data = await parseResponseBody(response);
      throw new RobotRockError(
        getErrorMessage(data, "Failed to cancel task"),
        response.status,
        data
      );
    }
  }

  private async listTasksRequest(input?: ListTasksInput): Promise<{
    items: AgentAdminTaskSummary[];
    nextCursor: string | null;
  }> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(input ?? {})) {
      if (value !== undefined && value !== "") {
        params.set(key, String(value));
      }
    }
    const suffix = params.size > 0 ? `?${params.toString()}` : "";

    const response = await fetch(`${this.baseUrl}/tasks${suffix}`, {
      method: "GET",
      headers: this.authHeaders(),
    });

    const data = await parseResponseBody(response);
    if (!response.ok) {
      throw new RobotRockError(
        getErrorMessage(data, "Failed to list tasks"),
        response.status,
        data
      );
    }

    return data as { items: AgentAdminTaskSummary[]; nextCursor: string | null };
  }

  private async searchTasksRequest(input: SearchTasksInput): Promise<{
    items: AgentAdminTaskSummary[];
    total: number;
  }> {
    const params = new URLSearchParams({ q: input.q });
    if (input.limit !== undefined) {
      params.set("limit", String(input.limit));
    }

    const response = await fetch(`${this.baseUrl}/tasks/search?${params.toString()}`, {
      method: "GET",
      headers: this.authHeaders(),
    });

    const data = await parseResponseBody(response);
    if (!response.ok) {
      throw new RobotRockError(
        getErrorMessage(data, "Failed to search tasks"),
        response.status,
        data
      );
    }

    return data as { items: AgentAdminTaskSummary[]; total: number };
  }
}

export function createClient(config: RobotRockConfig): RobotRock {
  return new RobotRock(config);
}

export function attachWebhookToActions(
  actions: readonly SendToHumanActionInput[],
  webhook: RobotRockWebhookConfig
): TaskContextInput["actions"] {
  return actions.map((action) => ({
    ...action,
    handlers: webhookToHandlers(webhook),
  }));
}

function webhookToHandlers(
  webhook: RobotRockWebhookConfig
): TaskContextInput["actions"][number]["handlers"] {
  return [
    {
      type: "webhook" as const,
      url: webhook.url,
      headers: webhook.headers ?? {},
    },
  ];
}

function normalizeSendToHumanInput<
  A extends readonly SendToHumanActionInput[] = readonly SendToHumanActionInput[],
>(
  task: SendToHumanWithAppInput<A>,
  clientDefaults: {
    webhook?: RobotRockWebhookConfig;
    app?: string;
    contextVersion: TaskContextFormatVersion;
    agentVersion?: string;
  }
): TaskContextInput {
  const {
    actions,
    idempotencyKey: _idempotencyKey,
    assignTo: _assignTo,
    threadId: _threadId,
    priority: _priority,
    update: _update,
    version: _version,
    validUntil,
    app: taskApp,
    ...rest
  } = task;

  const webhook = clientDefaults.webhook;
  const normalizedActions: TaskContextInput["actions"] = webhook
    ? attachWebhookToActions(actions, webhook)
    : (actions as unknown as TaskContextInput["actions"]);

  const app = taskApp ?? clientDefaults.app;

  return {
    ...rest,
    contextVersion: clientDefaults.contextVersion,
    ...(app ? { app } : {}),
    ...(validUntil !== undefined ? { validUntil: serializeValidUntil(validUntil) } : {}),
    actions: normalizedActions,
  };
}

