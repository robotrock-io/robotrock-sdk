import { afterEach, describe, expect, it } from "vitest";
import type { SessionContext } from "eve/context";
import { createBoundAgentAdminClient } from "../../../agent-admin.js";

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
      tenantSlug: "acme",
      role: "admin",
      groups: [],
    },
  },
  current: null,
};

describe("createBoundAgentAdminClient", () => {
  const originalApiKey = process.env.ROBOTROCK_API_KEY;
  const originalServiceToken = process.env.ROBOTROCK_AGENT_SERVICE_TOKEN;

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.ROBOTROCK_API_KEY;
    } else {
      process.env.ROBOTROCK_API_KEY = originalApiKey;
    }
    if (originalServiceToken === undefined) {
      delete process.env.ROBOTROCK_AGENT_SERVICE_TOKEN;
    } else {
      process.env.ROBOTROCK_AGENT_SERVICE_TOKEN = originalServiceToken;
    }
  });

  it("uses API key auth for self-hosted localhost sessions without connectionId", () => {
    delete process.env.ROBOTROCK_AGENT_SERVICE_TOKEN;
    process.env.ROBOTROCK_API_KEY = "ll_local_test";

    const client = createBoundAgentAdminClient(sessionContext(adminAuth));
    expect(client).toBeDefined();
    expect(typeof client.members.list).toBe("function");
  });
});
