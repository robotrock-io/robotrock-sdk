import { afterEach, describe, expect, it, vi } from "vitest";
import { createRobotRockCronChat } from "./cron-chat.js";

function mockFetchOnce(response: {
  ok: boolean;
  status: number;
  json: unknown;
}) {
  const fetchMock = vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify(response.json), {
        status: response.status,
        headers: { "content-type": "application/json" },
      })
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ROBOTROCK_API_KEY;
  delete process.env.ROBOTROCK_BASE_URL;
  delete process.env.ROBOTROCK_CRON_AGENT_IDENTIFIER;
});

describe("createRobotRockCronChat", () => {
  it("posts source=cron with seeded messages to /agent-chats", async () => {
    process.env.ROBOTROCK_API_KEY = "ll_test_key";
    process.env.ROBOTROCK_BASE_URL = "https://api.example.test/v1";

    const fetchMock = mockFetchOnce({
      ok: true,
      status: 201,
      json: {
        success: true,
        tenantSlug: "acme",
        chats: [
          {
            chatId: "acme/robotrock-agent/123",
            sessionId: "123",
            agentIdentifier: "robotrock-agent",
            deepLink: "/acme/inbox?selected=chat:123",
          },
        ],
      },
    });

    const result = await createRobotRockCronChat({
      title: "Cron check-in 2026-07-09",
      ownerEmail: "owner@example.com",
      messages: [{ role: "assistant", text: "hello from cron" }],
    });

    expect(result.tenantSlug).toBe("acme");
    expect(result.chats[0]?.chatId).toBe("acme/robotrock-agent/123");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.example.test/v1/agent-chats");
    expect(init?.method).toBe("POST");

    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({
      agentIdentifier: "robotrock-agent",
      title: "Cron check-in 2026-07-09",
      messages: [{ role: "assistant", text: "hello from cron" }],
      source: "cron",
      ownerEmail: "owner@example.com",
    });
  });

  it("uses ROBOTROCK_CRON_AGENT_IDENTIFIER when set", async () => {
    process.env.ROBOTROCK_API_KEY = "ll_test_key";
    process.env.ROBOTROCK_BASE_URL = "https://api.example.test/v1";
    process.env.ROBOTROCK_CRON_AGENT_IDENTIFIER = "custom-agent";

    const fetchMock = mockFetchOnce({
      ok: true,
      status: 201,
      json: {
        tenantSlug: "acme",
        chats: [{ chatId: "x", sessionId: "1", agentIdentifier: "custom-agent", deepLink: "/" }],
      },
    });

    await createRobotRockCronChat({
      title: "Test",
      ownerEmail: "owner@example.com",
      messages: [],
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]?.body));
    expect(body.agentIdentifier).toBe("custom-agent");
  });

  it("throws when ROBOTROCK_API_KEY is unset", async () => {
    await expect(
      createRobotRockCronChat({
        title: "Test",
        ownerEmail: "owner@example.com",
        messages: [],
      })
    ).rejects.toThrow("ROBOTROCK_API_KEY is unset");
  });
});
