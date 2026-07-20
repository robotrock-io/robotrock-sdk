import {
  verifyJwtHmac,
  extractBearerToken,
  type AuthFn,
} from "eve/channels/auth";
import { verifyRobotRockPlatformUserContextJwt } from "@robotrock/core/eve/user-context-jwt";
import {
  parseTenantRole,
  readStringArrayAttribute,
  readStringAttribute,
} from "./attributes.js";
import {
  ROBOTROCK_USER_CONTEXT_AUDIENCE,
  ROBOTROCK_USER_CONTEXT_HEADER,
  ROBOTROCK_USER_CONTEXT_ISSUER,
} from "./constants.js";
import { resolvePlatformUserContextPublicKeyPem } from "./platform-public-key.js";

function mapVerifiedClaimsToSessionAuth(claims: {
  sub: string;
  email: string;
  name: string;
  tenantSlug: string;
  connectionId?: string;
  chatId?: string;
  role: "admin" | "member";
  groups: string[];
  workosUserId?: string;
}) {
  return {
    authenticator: "robotrock" as const,
    principalId: claims.sub,
    principalType: "user" as const,
    subject: claims.sub,
    issuer: ROBOTROCK_USER_CONTEXT_ISSUER,
    attributes: {
      email: claims.email,
      name: claims.name,
      tenantSlug: claims.tenantSlug,
      tenantId: claims.tenantSlug,
      role: claims.role,
      groups: claims.groups,
      ...(claims.connectionId ? { connectionId: claims.connectionId } : {}),
      ...(claims.workosUserId ? { workosUserId: claims.workosUserId } : {}),
      ...(claims.chatId ? { chatId: claims.chatId } : {}),
    },
  };
}

export type RobotrockUserContextAuthOptions = {
  publicKeyPem?: string | (() => Promise<string | null>);
  hmacSecret?: string;
};

/**
 * Verifies the short-lived user-context JWT minted by the RobotRock dashboard
 * Eve proxy (`X-RobotRock-User-Token`). Hosted tenants use RS256 platform JWTs;
 * self-hosted deployments use per-connection HMAC secrets.
 */
export function robotrockUserContextAuth(
  options?: RobotrockUserContextAuthOptions
): AuthFn<Request> {
  return async (request) => {
    const token = extractBearerToken(
      request.headers.get(ROBOTROCK_USER_CONTEXT_HEADER)
    );
    if (!token) {
      return null;
    }

    const publicKeyPem =
      typeof options?.publicKeyPem === "function"
        ? await options.publicKeyPem()
        : (options?.publicKeyPem ??
          (await resolvePlatformUserContextPublicKeyPem()));

    if (publicKeyPem) {
      const platformResult = verifyRobotRockPlatformUserContextJwt({
        token,
        publicKeyPem,
      });
      if (platformResult.ok) {
        return mapVerifiedClaimsToSessionAuth(platformResult.claims);
      }
    }

    const secret =
      options?.hmacSecret?.trim() ??
      process.env.ROBOTROCK_USER_CONTEXT_SECRET?.trim();
    if (!secret) {
      return null;
    }

    const result = await verifyJwtHmac(token, {
      algorithm: "HS256",
      issuer: ROBOTROCK_USER_CONTEXT_ISSUER,
      audiences: [ROBOTROCK_USER_CONTEXT_AUDIENCE],
      secret,
    });
    if (!result.ok) {
      return null;
    }

    const email = readStringAttribute(result.sessionAuth.attributes, "email");
    const name = readStringAttribute(result.sessionAuth.attributes, "name");
    const tenantSlug = readStringAttribute(
      result.sessionAuth.attributes,
      "tenantSlug"
    );
    const connectionId = readStringAttribute(
      result.sessionAuth.attributes,
      "connectionId"
    );
    const role = parseTenantRole(
      readStringAttribute(result.sessionAuth.attributes, "role")
    );
    const groups = readStringArrayAttribute(result.sessionAuth.attributes, "groups");
    const subject = result.sessionAuth.subject;
    if (!email || !tenantSlug || !subject || !role) {
      return null;
    }

    const workosUserId = readStringAttribute(
      result.sessionAuth.attributes,
      "workosUserId"
    );
    const chatId = readStringAttribute(result.sessionAuth.attributes, "chatId");

    return mapVerifiedClaimsToSessionAuth({
      sub: subject,
      email,
      name: name ?? email.split("@")[0] ?? email,
      tenantSlug,
      connectionId,
      chatId,
      role,
      groups,
      workosUserId,
    });
  };
}

/**
 * Bearer `ras_*` service token for RobotRock platform reachability probes
 * (`GET /eve/v1/info` during verify and tenant connect).
 */
export function robotrockAgentServiceAuth(): AuthFn<Request> {
  return async (request) => {
    const expected = process.env.ROBOTROCK_AGENT_SERVICE_TOKEN?.trim();
    if (!expected) {
      return null;
    }

    const bearer = extractBearerToken(request.headers.get("authorization"));
    if (!bearer || bearer !== expected) {
      return null;
    }

    return {
      authenticator: "robotrock-agent-service",
      principalId: "robotrock:platform",
      principalType: "runtime",
      attributes: {},
    };
  };
}

/**
 * Bearer token for RobotRock platform reachability and dashboard proxy calls.
 *
 * When a workspace admin connects a protected single-tenant deployment, they
 * enter a Bearer token in **Settings → Agents**. RobotRock stores it in
 * WorkOS Vault and sends `Authorization: Bearer <token>` on:
 *
 * - `GET /eve/v1/info` and `GET /eve/v1/health` (connect / re-sync)
 * - `POST /eve/v1/session` and `POST /eve/v1/session/:sessionId` (chat + resume)
 * - `GET /eve/v1/session/:sessionId/stream` (chat streaming)
 * - optional icon paths (`/favicon.ico`, `/icon.svg`, `/icon.png`)
 *
 * Set `EVE_SELF_AUTH_TOKEN` on the agent to the same value. Use
 * `robotrockEveChannel()` so this authenticator is registered on the Eve channel.
 */
export function eveSelfServiceAuth(): AuthFn<Request> {
  return async (request) => {
    const expected = process.env.EVE_SELF_AUTH_TOKEN?.trim();
    if (!expected) {
      return null;
    }

    const bearer = extractBearerToken(request.headers.get("authorization"));
    if (bearer !== expected) {
      return null;
    }

    return {
      authenticator: "eve-self",
      principalId: "eve:runtime",
      principalType: "runtime",
      attributes: {},
    };
  };
}
