import type { SessionContext } from "eve/context";
import {
  parseTenantRole,
  readStringArrayAttribute,
  readStringAttribute,
} from "./attributes.js";

export type TenantRole = "admin" | "member";

export type TenantCaller = {
  userId: string;
  email: string;
  name: string;
  tenantSlug: string;
  connectionId?: string;
  chatId?: string;
  role: TenantRole;
  isAdmin: boolean;
  groups: string[];
  workosUserId?: string;
};

/** Resolve the authenticated RobotRock dashboard user for the current session. */
export function tryResolveTenantCaller(ctx: SessionContext): TenantCaller | null {
  const caller = ctx.session.auth.initiator ?? ctx.session.auth.current;
  if (caller?.principalType !== "user") {
    return null;
  }

  const email = readStringAttribute(caller.attributes, "email");
  const name = readStringAttribute(caller.attributes, "name");
  const tenantSlug =
    readStringAttribute(caller.attributes, "tenantSlug") ??
    readStringAttribute(caller.attributes, "tenantId");
  const role = parseTenantRole(readStringAttribute(caller.attributes, "role"));
  if (!email || !tenantSlug || !caller.principalId || !role) {
    return null;
  }

  const workosUserId = readStringAttribute(caller.attributes, "workosUserId");
  const connectionId = readStringAttribute(caller.attributes, "connectionId");
  const chatId = readStringAttribute(caller.attributes, "chatId");
  const groups = readStringArrayAttribute(caller.attributes, "groups");

  return {
    userId: caller.principalId,
    email,
    name: name ?? email.split("@")[0] ?? email,
    tenantSlug,
    ...(connectionId ? { connectionId } : {}),
    ...(chatId ? { chatId } : {}),
    role,
    isAdmin: role === "admin",
    groups,
    ...(workosUserId ? { workosUserId } : {}),
  };
}

/** Like {@link tryResolveTenantCaller} but throws when the session has no user. */
export function requireTenantCaller(ctx: SessionContext): TenantCaller {
  const caller = tryResolveTenantCaller(ctx);
  if (!caller) {
    throw new Error("An authenticated RobotRock tenant user is required.");
  }
  return caller;
}

export function isAdminCaller(ctx: SessionContext): boolean {
  return tryResolveTenantCaller(ctx)?.isAdmin === true;
}

/** Require an authenticated tenant admin for the current session. */
export function requireAdminCaller(ctx: SessionContext): TenantCaller {
  const caller = requireTenantCaller(ctx);
  if (!caller.isAdmin) {
    throw new Error("Tenant admin access is required.");
  }
  return caller;
}
