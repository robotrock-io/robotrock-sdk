import { describe, expect, it } from "vitest";
import { eveSelfServiceAuth, robotrockAgentServiceAuth } from "./auth.js";

describe("eveSelfServiceAuth", () => {
  it("accepts the configured self-auth token", async () => {
    process.env.EVE_SELF_AUTH_TOKEN = "dashboard-shared-secret";
    const auth = eveSelfServiceAuth();
    const request = new Request("https://agent.example.com/eve/v1/info", {
      headers: { authorization: "Bearer dashboard-shared-secret" },
    });

    await expect(auth(request)).resolves.toEqual({
      authenticator: "eve-self",
      principalId: "eve:runtime",
      principalType: "runtime",
      attributes: {},
    });
  });

  it("rejects missing or mismatched bearer tokens", async () => {
    process.env.EVE_SELF_AUTH_TOKEN = "dashboard-shared-secret";
    const auth = eveSelfServiceAuth();

    await expect(
      auth(
        new Request("https://agent.example.com/eve/v1/session", {
          headers: { authorization: "Bearer other-secret" },
        })
      )
    ).resolves.toBeNull();

    await expect(
      auth(new Request("https://agent.example.com/eve/v1/info"))
    ).resolves.toBeNull();
  });
});

describe("robotrockAgentServiceAuth", () => {
  it("accepts the configured service token", async () => {
    process.env.ROBOTROCK_AGENT_SERVICE_TOKEN = "ras_testtoken123";
    const auth = robotrockAgentServiceAuth();
    const request = new Request("https://agent.example.com/eve/v1/info", {
      headers: { authorization: "Bearer ras_testtoken123" },
    });

    await expect(auth(request)).resolves.toEqual({
      authenticator: "robotrock-agent-service",
      principalId: "robotrock:platform",
      principalType: "runtime",
      attributes: {},
    });
  });

  it("rejects missing or mismatched bearer tokens", async () => {
    process.env.ROBOTROCK_AGENT_SERVICE_TOKEN = "ras_testtoken123";
    const auth = robotrockAgentServiceAuth();

    await expect(
      auth(
        new Request("https://agent.example.com/eve/v1/info", {
          headers: { authorization: "Bearer ras_other" },
        })
      )
    ).resolves.toBeNull();

    await expect(
      auth(new Request("https://agent.example.com/eve/v1/info"))
    ).resolves.toBeNull();
  });
});
