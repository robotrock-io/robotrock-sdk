export {
  ROBOTROCK_USER_CONTEXT_HEADER,
  ROBOTROCK_USER_CONTEXT_AUDIENCE,
  ROBOTROCK_USER_CONTEXT_ISSUER,
  ROBOTROCK_PLATFORM_USER_CONTEXT_PUBLIC_KEY_URL,
  ROBOTROCK_READY_HOOK_SLUG,
} from "./constants.js";

export {
  tryResolveTenantCaller,
  requireTenantCaller,
  isAdminCaller,
  requireAdminCaller,
} from "./tenant.js";
export type { TenantCaller, TenantRole } from "./tenant.js";

export {
  robotrockUserContextAuth,
  robotrockAgentServiceAuth,
  eveSelfServiceAuth,
} from "./auth.js";
export {
  ROBOTROCK_EVE_CONNECT_ROUTES,
  ROBOTROCK_EVE_ICON_PATHS,
  ROBOTROCK_EVE_CHAT_ROUTES,
  ROBOTROCK_EVE_BEARER_PROTECTED_PATHS,
  EVE_SELF_AUTH_TOKEN_ENV_VAR,
} from "./deployment-access.js";
export type { RobotrockUserContextAuthOptions } from "./auth.js";

export { resolvePlatformUserContextPublicKeyPem } from "./platform-public-key.js";

export { robotrockEveChannel } from "./channel.js";
export type { RobotrockEveChannelOptions } from "./channel.js";

export {
  tryCreateBoundRobotRockClient,
  resetBoundClientAuthWarning,
} from "./client-from-session.js";

export {
  postRobotRockChatInputAudit,
  postRobotRockStageHitl,
  fetchRobotRockStagedHitl,
  postRobotRockLinkChatTask,
  resetChatAuditWarnings,
} from "./chat-audit-api.js";
export type { RobotRockChatAuditPayload } from "./chat-audit-api.js";

export {
  createRobotRockTask,
  buildRobotRockTaskPayload,
  resolveTaskHandledWebhookUrl,
} from "./task-delegation.js";
export type {
  CreateRobotRockTaskInput,
  RobotRockTaskActionInput,
  RobotRockTaskAssignToInput,
  RobotRockTaskContextInput,
  RobotRockTaskToolInput,
} from "./task-delegation.js";

export { createRobotRockCronChat } from "./cron-chat.js";
export type { CreateRobotRockCronChatInput } from "./cron-chat.js";

export {
  robotrockReadyHook,
  defineRobotRockReadyHook,
} from "./hooks/ready.js";

export {
  robotrockChatAuditHook,
  defineRobotRockChatAuditHook,
  resetRobotrockChatAuditIdempotencyKeys,
} from "./hooks/chat-audit.js";

export {
  createBoundAgentAdminClient,
  createAgentAdminApi,
  requireBoundAgentAdminClient,
  type AgentAdminApi,
} from "../../agent-admin.js";
