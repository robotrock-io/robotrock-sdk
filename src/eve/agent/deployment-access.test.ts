import { describe, expect, it } from "vitest";
import {
  EVE_SELF_AUTH_TOKEN_ENV_VAR,
  ROBOTROCK_EVE_BEARER_PROTECTED_PATHS,
  ROBOTROCK_EVE_CHAT_ROUTES,
  ROBOTROCK_EVE_CONNECT_ROUTES,
  ROBOTROCK_EVE_ICON_PATHS,
} from "./deployment-access.js";

describe("deployment-access constants", () => {
  it("lists connect-time routes RobotRock probes", () => {
    expect(ROBOTROCK_EVE_CONNECT_ROUTES.info).toEqual({
      method: "GET",
      path: "/eve/v1/info",
    });
    expect(ROBOTROCK_EVE_CONNECT_ROUTES.health.path).toBe("/eve/v1/health");
  });

  it("lists proxied chat routes", () => {
    expect(ROBOTROCK_EVE_CHAT_ROUTES.createSession.path).toBe("/eve/v1/session");
    expect(ROBOTROCK_EVE_CHAT_ROUTES.continueSession.path).toBe(
      "/eve/v1/session/:sessionId"
    );
    expect(ROBOTROCK_EVE_CHAT_ROUTES.messageStream.path).toBe(
      "/eve/v1/session/:sessionId/stream"
    );
  });

  it("includes icon paths in bearer-protected list", () => {
    for (const iconPath of ROBOTROCK_EVE_ICON_PATHS) {
      expect(ROBOTROCK_EVE_BEARER_PROTECTED_PATHS).toContain(iconPath);
    }
    expect(ROBOTROCK_EVE_BEARER_PROTECTED_PATHS).toContain(
      ROBOTROCK_EVE_CONNECT_ROUTES.info.path
    );
  });

  it("documents the agent env var name", () => {
    expect(EVE_SELF_AUTH_TOKEN_ENV_VAR).toBe("EVE_SELF_AUTH_TOKEN");
  });
});
