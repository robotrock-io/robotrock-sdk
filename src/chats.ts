import {
  agentChatAuditInputBodySchema,
  agentChatAuditToolBodySchema,
  agentChatFinalizeUploadedImageBodySchema,
  agentChatLinkTaskBodySchema,
  agentChatStageHitlBodySchema,
  agentChatUploadImageBodySchema,
  createAgentChatBodySchema,
  type AgentChatAuditInputBody,
  type AgentChatAuditToolBody,
  type AgentChatLinkTaskBody,
  type AgentChatSeedMessage,
  type AgentChatStageHitlBody,
  type AgentChatUploadImageBodyInput,
} from "@robotrock/core";
import { RobotRockError, getErrorMessage, parseResponseBody } from "./http.js";
import {
  buildRobotRockAuthHeaders,
  type RobotRockAuthConfig,
} from "./auth-headers.js";
import {
  buildChatCorrelationHeaders,
  type ChatCorrelation,
} from "./chat-correlation.js";

function decodeBase64ImageBytes(base64: string): Uint8Array {
  const trimmed = base64.trim();
  const bare = trimmed.includes(",")
    ? trimmed.slice(trimmed.indexOf(",") + 1)
    : trimmed;
  const binary = Buffer.from(bare, "base64");
  if (binary.byteLength === 0) {
    throw new RobotRockError("Empty image payload", 400);
  }
  return new Uint8Array(binary);
}

/** A chat created via {@link ChatsApi.create}. */
export type CreatedChat = {
  chatId: string;
  sessionId: string;
  userId?: string;
  agentIdentifier: string;
  deepLink: string;
};

export type CreateChatResult = {
  tenantSlug: string;
  chats: CreatedChat[];
};

export type CreateChatInput = {
  /** Agent to run the chat. Required unless `parentChatId` is provided. */
  agentIdentifier?: string;
  /** Spawn a chat from an existing chat; inherits its agent/app/owner and links audit. */
  parentChatId?: string;
  /** Trigger connection id to run the chat under (defaults to the tenant's). */
  connectionId?: string;
  /** Inbox app bucket. Overrides the client `app` when set. */
  app?: string;
  /** Email of the user who owns the chat. Required unless `parentChatId` is set. */
  ownerEmail?: string;
  /** Chat title shown in the inbox. */
  title: string;
  /** Seed messages to preload the conversation. Defaults to a welcome message. */
  messages?: AgentChatSeedMessage[];
  /** How the chat was created (statistics/audit). @default "api" */
  source?: string;
};

export type CloseChatOptions = {
  /** Optional human-readable reason recorded on the audit trail. */
  reason?: string;
};

export type LogChatToolExecutionInput = AgentChatAuditToolBody;

export type LogChatInputSubmissionInput = AgentChatAuditInputBody;

export type StageChatHitlRequestsInput = AgentChatStageHitlBody;

export type LinkChatTaskInput = AgentChatLinkTaskBody;

export type UploadChatImageInput = AgentChatUploadImageBodyInput;

export type UploadedChatImage = {
  storageId: string;
  url: string;
  mediaType: string;
  chatId?: string;
  publicTaskId?: string;
  filename?: string;
  description?: string;
  tags?: string[];
};

export type StagedChatHitlRequest = StageChatHitlRequestsInput["requests"][number];

export interface ChatsApi {
  /** Create an agent chat owned by a single user. */
  create(input: CreateChatInput): Promise<CreateChatResult>;
  /** Close (archive) a chat by its public chatId — e.g. when an agent is done. */
  close(chatId: string, options?: CloseChatOptions): Promise<void>;
  /** Persist pending Eve HITL requests on the chat for durable audit logging. */
  stageHitlRequests(input: StageChatHitlRequestsInput): Promise<void>;
  /** Read pending Eve HITL requests staged on the chat. */
  getStagedHitlRequests(eveSessionId: string): Promise<StagedChatHitlRequest[]>;
  /** Log an Eve HITL choice to the RobotRock chat audit trail. */
  logInputSubmission(input: LogChatInputSubmissionInput): Promise<void>;
  /** Log a mutating Eve tool execution to the RobotRock chat audit trail. */
  logToolExecution(input: LogChatToolExecutionInput): Promise<void>;
  /** Link an inbox task to the originating Eve chat session. */
  linkTask(input: LinkChatTaskInput): Promise<void>;
  /**
   * Upload an image into Convex storage linked to a chat and/or task.
   * Prefer this over embedding base64 in tool results / chat transcripts.
   */
  uploadImage(input: UploadChatImageInput): Promise<UploadedChatImage>;
}

/**
 * Build the `client.chats` namespace. Mirrors the `client.tasks` surface for the
 * long-lived chat resource, so a single client creates both tasks and chats.
 */
export function createChatsApi(config: {
  baseUrl: string;
  auth: RobotRockAuthConfig;
  app?: string;
  chatCorrelation?: ChatCorrelation;
}): ChatsApi {
  const headers = (): Record<string, string> => ({
    "Content-Type": "application/json",
    ...buildRobotRockAuthHeaders(config.auth),
    ...buildChatCorrelationHeaders(config.chatCorrelation),
  });

  return {
    async create(input: CreateChatInput): Promise<CreateChatResult> {
      const bodyPayload = {
        ...input,
        app: input.app ?? config.app,
        messages: input.messages ?? [],
      };
      const validation = createAgentChatBodySchema.safeParse(bodyPayload);
      if (!validation.success) {
        throw new RobotRockError(
          `Invalid chat: ${validation.error.issues[0]?.message}`,
          400,
          validation.error.issues
        );
      }

      const response = await fetch(`${config.baseUrl}/agent-chats`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(validation.data),
      });

      const data = await parseResponseBody(response);
      if (!response.ok) {
        throw new RobotRockError(
          getErrorMessage(data, "Failed to create chat"),
          response.status,
          data
        );
      }

      const result = data as unknown as CreateChatResult;
      return { tenantSlug: result.tenantSlug, chats: result.chats };
    },

    async close(chatId: string, options?: CloseChatOptions): Promise<void> {
      if (!chatId) {
        throw new RobotRockError("chatId is required to close a chat", 400);
      }

      const response = await fetch(
        `${config.baseUrl}/agent-chats/${encodeURIComponent(chatId)}/close`,
        {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ reason: options?.reason }),
        }
      );

      if (!response.ok) {
        const data = await parseResponseBody(response);
        throw new RobotRockError(
          getErrorMessage(data, "Failed to close chat"),
          response.status,
          data
        );
      }
    },

    async stageHitlRequests(input: StageChatHitlRequestsInput): Promise<void> {
      const validation = agentChatStageHitlBodySchema.safeParse(input);
      if (!validation.success) {
        throw new RobotRockError(
          `Invalid stage HITL input: ${validation.error.issues[0]?.message}`,
          400,
          validation.error.issues
        );
      }

      const response = await fetch(`${config.baseUrl}/agent-chats/stage-hitl`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(validation.data),
      });

      if (!response.ok) {
        const data = await parseResponseBody(response);
        throw new RobotRockError(
          getErrorMessage(data, "Failed to stage chat HITL requests"),
          response.status,
          data
        );
      }
    },

    async getStagedHitlRequests(eveSessionId: string): Promise<StagedChatHitlRequest[]> {
      const trimmed = eveSessionId.trim();
      if (!trimmed) {
        throw new RobotRockError("eveSessionId is required", 400);
      }

      const url = new URL(`${config.baseUrl}/agent-chats/staged-hitl`);
      url.searchParams.set("eveSessionId", trimmed);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: headers(),
      });

      const data = await parseResponseBody(response);
      if (!response.ok) {
        throw new RobotRockError(
          getErrorMessage(data, "Failed to fetch staged chat HITL requests"),
          response.status,
          data
        );
      }

      const requests = (data as { requests?: StagedChatHitlRequest[] }).requests;
      return Array.isArray(requests) ? requests : [];
    },

    async logInputSubmission(input: LogChatInputSubmissionInput): Promise<void> {
      const validation = agentChatAuditInputBodySchema.safeParse(input);
      if (!validation.success) {
        throw new RobotRockError(
          `Invalid audit input: ${validation.error.issues[0]?.message}`,
          400,
          validation.error.issues
        );
      }

      const response = await fetch(`${config.baseUrl}/agent-chats/audit-input`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(validation.data),
      });

      if (!response.ok) {
        const data = await parseResponseBody(response);
        throw new RobotRockError(
          getErrorMessage(data, "Failed to log chat input submission"),
          response.status,
          data
        );
      }
    },

    async logToolExecution(input: LogChatToolExecutionInput): Promise<void> {
      const validation = agentChatAuditToolBodySchema.safeParse(input);
      if (!validation.success) {
        throw new RobotRockError(
          `Invalid audit tool input: ${validation.error.issues[0]?.message}`,
          400,
          validation.error.issues
        );
      }

      const response = await fetch(`${config.baseUrl}/agent-chats/audit-tool`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(validation.data),
      });

      if (!response.ok) {
        const data = await parseResponseBody(response);
        throw new RobotRockError(
          getErrorMessage(data, "Failed to log chat tool execution"),
          response.status,
          data
        );
      }
    },

    async linkTask(input: LinkChatTaskInput): Promise<void> {
      const validation = agentChatLinkTaskBodySchema.safeParse(input);
      if (!validation.success) {
        throw new RobotRockError(
          `Invalid link task input: ${validation.error.issues[0]?.message}`,
          400,
          validation.error.issues
        );
      }

      const response = await fetch(`${config.baseUrl}/agent-chats/link-task`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(validation.data),
      });

      if (!response.ok) {
        const data = await parseResponseBody(response);
        throw new RobotRockError(
          getErrorMessage(data, "Failed to link inbox task to chat"),
          response.status,
          data
        );
      }
    },

    async uploadImage(input: UploadChatImageInput): Promise<UploadedChatImage> {
      const validation = agentChatUploadImageBodySchema.safeParse(input);
      if (!validation.success) {
        throw new RobotRockError(
          `Invalid image upload: ${validation.error.issues[0]?.message}`,
          400,
          validation.error.issues
        );
      }

      // 1) Mint a short-lived Convex upload URL (small JSON via API).
      const uploadUrlResponse = await fetch(
        `${config.baseUrl}/agent-chats/images/upload-url`,
        {
          method: "POST",
          headers: headers(),
        }
      );
      const uploadUrlData = await parseResponseBody(uploadUrlResponse);
      if (!uploadUrlResponse.ok) {
        throw new RobotRockError(
          getErrorMessage(uploadUrlData, "Failed to mint chat image upload URL"),
          uploadUrlResponse.status,
          uploadUrlData
        );
      }
      const uploadUrl =
        uploadUrlData &&
        typeof uploadUrlData === "object" &&
        !Array.isArray(uploadUrlData) &&
        typeof (uploadUrlData as { uploadUrl?: unknown }).uploadUrl === "string"
          ? (uploadUrlData as { uploadUrl: string }).uploadUrl
          : null;
      if (!uploadUrl) {
        throw new RobotRockError(
          "Image upload URL response was invalid",
          500,
          uploadUrlData
        );
      }

      // 2) POST binary bytes directly to Convex (bypasses Vercel body limits).
      const mediaType = validation.data.mediaType.trim() || "image/png";
      const bytes = decodeBase64ImageBytes(validation.data.base64);
      const storageResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": mediaType,
        },
        body: Buffer.from(bytes),
      });
      if (!storageResponse.ok) {
        const detail = await storageResponse.text().catch(() => "");
        throw new RobotRockError(
          `Failed to upload chat image bytes (${storageResponse.status})${
            detail ? `: ${detail.replace(/\s+/g, " ").trim().slice(0, 180)}` : ""
          }`,
          storageResponse.status,
          detail || null
        );
      }
      const storageData = (await storageResponse.json()) as {
        storageId?: string;
      };
      if (typeof storageData.storageId !== "string" || !storageData.storageId) {
        throw new RobotRockError(
          "Convex storage upload returned no storageId",
          500,
          storageData
        );
      }

      // 3) Finalize ownership / signed URL via API (small JSON).
      const finalizeValidation =
        agentChatFinalizeUploadedImageBodySchema.safeParse({
          storageId: storageData.storageId,
          mediaType,
          ...(validation.data.chatId ? { chatId: validation.data.chatId } : {}),
          ...(validation.data.publicTaskId
            ? { publicTaskId: validation.data.publicTaskId }
            : {}),
          ...(validation.data.source ? { source: validation.data.source } : {}),
          ...(validation.data.filename
            ? { filename: validation.data.filename }
            : {}),
          ...(validation.data.description
            ? { description: validation.data.description }
            : {}),
          ...(validation.data.tags?.length
            ? { tags: validation.data.tags }
            : {}),
        });
      if (!finalizeValidation.success) {
        throw new RobotRockError(
          `Invalid image finalize: ${finalizeValidation.error.issues[0]?.message}`,
          400,
          finalizeValidation.error.issues
        );
      }

      const response = await fetch(
        `${config.baseUrl}/agent-chats/images/finalize`,
        {
          method: "POST",
          headers: headers(),
          body: JSON.stringify(finalizeValidation.data),
        }
      );

      const data = await parseResponseBody(response);
      if (!response.ok) {
        throw new RobotRockError(
          getErrorMessage(data, "Failed to upload chat image"),
          response.status,
          data
        );
      }

      const uploaded = data as Partial<UploadedChatImage>;
      if (
        typeof uploaded.storageId !== "string" ||
        typeof uploaded.url !== "string" ||
        typeof uploaded.mediaType !== "string"
      ) {
        throw new RobotRockError(
          "Image upload returned an invalid response",
          500,
          data
        );
      }

      return {
        storageId: uploaded.storageId,
        url: uploaded.url,
        mediaType: uploaded.mediaType,
        ...(typeof uploaded.chatId === "string"
          ? { chatId: uploaded.chatId }
          : {}),
        ...(typeof uploaded.publicTaskId === "string"
          ? { publicTaskId: uploaded.publicTaskId }
          : {}),
        ...(typeof uploaded.filename === "string"
          ? { filename: uploaded.filename }
          : {}),
        ...(typeof uploaded.description === "string"
          ? { description: uploaded.description }
          : {}),
        ...(Array.isArray(uploaded.tags)
          ? {
              tags: uploaded.tags.filter(
                (tag): tag is string => typeof tag === "string"
              ),
            }
          : {}),
      };
    },
  };
}
