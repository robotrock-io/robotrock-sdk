import { describe, expect, it } from "vitest";
import type { SessionContext } from "eve/context";
import {
  requireAdminCaller,
  requireTenantCaller,
  tryResolveTenantCaller,
} from "./tenant.js";

function sessionContext(
  auth: SessionContext["session"]["auth"]
): SessionContext {
  return {
    session: {
      id: "sess-1",
      auth,
    },
  } as SessionContext;
}

const adminAuth: SessionContext["session"]["auth"] = {
  initiator: {
    authenticator: "robotrock",
    principalId: "user_1",
    principalType: "user",
    subject: "user_1",
    attributes: {
      email: "alice@example.com",
      name: "Alice Example",
      tenantSlug: "acme",
      role: "admin",
      groups: ["engineering", "ops"],
    },
  },
  current: null,
};

describe("tryResolveTenantCaller", () => {
  it("reads role and group memberships from session auth", () => {
    const caller = tryResolveTenantCaller(sessionContext(adminAuth));

    expect(caller).toEqual({
      userId: "user_1",
      email: "alice@example.com",
      name: "Alice Example",
      tenantSlug: "acme",
      role: "admin",
      isAdmin: true,
      groups: ["engineering", "ops"],
    });
  });

  it("reads chatId from session auth attributes", () => {
    const caller = tryResolveTenantCaller(
      sessionContext({
        ...adminAuth,
        initiator: {
          ...adminAuth.initiator!,
          attributes: {
            ...adminAuth.initiator!.attributes,
            chatId: "acme:agent:session-1",
          },
        },
      })
    );

    expect(caller?.chatId).toBe("acme:agent:session-1");
  });

  it("returns null when role is missing", () => {
    expect(
      tryResolveTenantCaller(
        sessionContext({
          initiator: {
            authenticator: "robotrock",
            principalId: "user_1",
            principalType: "user",
            subject: "user_1",
            attributes: {
              email: "alice@example.com",
              tenantSlug: "acme",
            },
          },
          current: null,
        })
      )
    ).toBeNull();
  });

  it("returns null when no user principal is present", () => {
    expect(
      tryResolveTenantCaller(
        sessionContext({
          initiator: null,
          current: null,
        })
      )
    ).toBeNull();
  });
});

describe("requireTenantCaller", () => {
  it("throws when the session is anonymous", () => {
    expect(() =>
      requireTenantCaller(
        sessionContext({
          initiator: null,
          current: null,
        })
      )
    ).toThrow(/authenticated RobotRock tenant user/);
  });
});

describe("requireAdminCaller", () => {
  it("returns admin callers", () => {
    expect(requireAdminCaller(sessionContext(adminAuth)).isAdmin).toBe(true);
  });

  it("throws for members", () => {
    expect(() =>
      requireAdminCaller(
        sessionContext({
          initiator: {
            authenticator: "robotrock",
            principalId: "user_2",
            principalType: "user",
            subject: "user_2",
            attributes: {
              email: "bob@example.com",
              tenantSlug: "acme",
              role: "member",
              groups: [],
            },
          },
          current: null,
        })
      )
    ).toThrow(/Tenant admin access is required/);
  });
});
