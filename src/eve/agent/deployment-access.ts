/**
 * Eve HTTP routes RobotRock reaches when connecting, re-syncing, or proxying
 * dashboard chat. Use these paths when smoke-testing a protected deployment.
 *
 * Self-hosted agents that require deployment access: set `EVE_SELF_AUTH_TOKEN` on
 * the agent to the same value the workspace admin enters under **Settings →
 * Agents → Deployment access → Bearer token**. RobotRock stores that token in
 * WorkOS Vault and sends it as `Authorization: Bearer <token>` on every call
 * below (plus `X-RobotRock-User-Token` during inbox chat).
 */

/** Routes RobotRock calls directly from the dashboard backend (connect / re-sync). */
export const ROBOTROCK_EVE_CONNECT_ROUTES = {
  /** Agent manifest + `robotrock-ready` hook detection. */
  info: { method: "GET", path: "/eve/v1/info" },
  /** Optional health probe (same auth as `/info` when the channel is protected). */
  health: { method: "GET", path: "/eve/v1/health" },
} as const;

/** Static assets RobotRock may HEAD/GET for the agent avatar in Settings. */
export const ROBOTROCK_EVE_ICON_PATHS = [
  "/favicon.ico",
  "/icon.svg",
  "/icon.png",
] as const;

/**
 * Routes proxied through `/{tenant}/api/eve/{connectionId}/…` during inbox chat
 * and task-handled resume. The Eve client issues these against the proxy host;
 * the proxy forwards them to the deployment with vault credentials attached.
 */
export const ROBOTROCK_EVE_CHAT_ROUTES = {
  createSession: { method: "POST", path: "/eve/v1/session" },
  continueSession: {
    method: "POST",
    path: "/eve/v1/session/:sessionId",
  },
  messageStream: {
    method: "GET",
    path: "/eve/v1/session/:sessionId/stream",
  },
} as const;

/** Env var on the Eve agent that must match the dashboard Bearer token. */
export const EVE_SELF_AUTH_TOKEN_ENV_VAR = "EVE_SELF_AUTH_TOKEN";

/** All Eve route paths that should accept the dashboard Bearer token on protected deployments. */
export const ROBOTROCK_EVE_BEARER_PROTECTED_PATHS = [
  ROBOTROCK_EVE_CONNECT_ROUTES.info.path,
  ROBOTROCK_EVE_CONNECT_ROUTES.health.path,
  ROBOTROCK_EVE_CHAT_ROUTES.createSession.path,
  ROBOTROCK_EVE_CHAT_ROUTES.continueSession.path,
  ROBOTROCK_EVE_CHAT_ROUTES.messageStream.path,
  ...ROBOTROCK_EVE_ICON_PATHS,
] as const;
