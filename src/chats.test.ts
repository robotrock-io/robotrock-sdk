import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "./client.js";
import { RobotRockError } from "./http.js";

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

const client = createClient({
  apiKey: "test-key",
  baseUrl: "https://api.example.test/v1",
  polling: {},
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("client.chats", () => {
  it("create posts to /agent-chats and returns the created chats", async () => {
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 201,
      json: {
        success: true,
        tenantSlug: "acme",
        chats: [
          {
            chatId: "acme/agent/123",
            sessionId: "123",
            agentIdentifier: "agent",
            deepLink: "/acme/inbox?selected=chat:123",
          },
        ],
      },
    });

    const result = await client.chats.create({
      agentIdentifier: "agent",
      title: "New chat",
      ownerEmail: "owner@example.com",
    });

    expect(result.tenantSlug).toBe("acme");
    expect(result.chats).toHaveLength(1);
    expect(result.chats[0]?.chatId).toBe("acme/agent/123");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.example.test/v1/agent-chats");
    expect(init?.method).toBe("POST");
  });

  it("create throws a RobotRockError on validation failure without calling fetch", async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 201, json: {} });

    await expect(
      // Missing both title and agentIdentifier/parentChatId.
      client.chats.create({ title: "" } as never)
    ).rejects.toBeInstanceOf(RobotRockError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("close posts to /agent-chats/:chatId/close", async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, json: { success: true } });

    await client.chats.close("acme/agent/123", { reason: "done" });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      "https://api.example.test/v1/agent-chats/acme%2Fagent%2F123/close"
    );
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ reason: "done" });
  });

  it("close throws a RobotRockError on a non-ok response", async () => {
    mockFetchOnce({ ok: false, status: 404, json: { message: "Chat not found" } });

    await expect(client.chats.close("missing")).rejects.toThrow("Chat not found");
  });

  it("uploadImage mints a URL, uploads bytes to Convex, then finalizes", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "https://api.example.test/v1/agent-chats/images/upload-url") {
        return new Response(
          JSON.stringify({
            success: true,
            uploadUrl: "https://convex.example.test/upload",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          }
        );
      }
      if (url === "https://convex.example.test/upload") {
        expect(init?.method).toBe("POST");
        expect(init?.headers).toMatchObject({
          "Content-Type": "image/png",
        });
        expect(init?.body).toBeInstanceOf(Buffer);
        return new Response(JSON.stringify({ storageId: "storage_1" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url === "https://api.example.test/v1/agent-chats/images/finalize") {
        return new Response(
          JSON.stringify({
            success: true,
            storageId: "storage_1",
            url: "https://example.com/a.png",
            mediaType: "image/png",
            chatId: "acme:agent:1",
          }),
          {
            status: 201,
            headers: { "content-type": "application/json" },
          }
        );
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await client.chats.uploadImage({
      mediaType: "image/png",
      base64: "YWJjMTIz",
      chatId: "acme:agent:1",
      source: "generate_image",
      filename: "a-red-robot.png",
      description: "A red robot",
      tags: ["Generate_Image", " report "],
    });

    expect(result).toEqual({
      storageId: "storage_1",
      url: "https://example.com/a.png",
      mediaType: "image/png",
      chatId: "acme:agent:1",
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);

    const [mintUrl, mintInit] = fetchMock.mock.calls[0]!;
    expect(mintUrl).toBe(
      "https://api.example.test/v1/agent-chats/images/upload-url"
    );
    expect(mintInit?.method).toBe("POST");

    const [finalizeUrl, finalizeInit] = fetchMock.mock.calls[2]!;
    expect(finalizeUrl).toBe(
      "https://api.example.test/v1/agent-chats/images/finalize"
    );
    expect(finalizeInit?.method).toBe("POST");
    expect(JSON.parse(finalizeInit?.body as string)).toEqual({
      storageId: "storage_1",
      mediaType: "image/png",
      chatId: "acme:agent:1",
      source: "generate_image",
      filename: "a-red-robot.png",
      description: "A red robot",
      tags: ["generate_image", "report"],
    });
  });

  it("uploadImage rejects when neither chatId nor publicTaskId is set", async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 201, json: {} });

    await expect(
      client.chats.uploadImage({
        mediaType: "image/png",
        base64: "abc123",
      } as never)
    ).rejects.toBeInstanceOf(RobotRockError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
