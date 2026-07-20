import { afterEach, describe, expect, it, vi } from "vitest";
import {
  defineGenerateImageTool,
  GENERATE_IMAGE_TOOL_NAME,
} from "./generate-image.js";

const uploadImage = vi.fn(async () => ({
  storageId: "storage_abc",
  url: "https://example.com/img.png",
  mediaType: "image/png",
  chatId: "acme:robotrock-agent:sess1",
}));

vi.mock("ai", () => ({
  createGateway: vi.fn(),
  generateImage: vi.fn(async () => ({
    image: {
      base64: "abc123",
      mediaType: "image/png",
      uint8Array: new Uint8Array(),
    },
  })),
}));

vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: vi.fn(() => ({
    imageModel: vi.fn(() => ({ provider: "openrouter", modelId: "mock" })),
  })),
}));

vi.mock("../../agent/tenant.js", () => ({
  tryResolveTenantCaller: vi.fn(() => ({
    userId: "user_1",
    tenantSlug: "acme",
    connectionId: "conn_1",
    chatId: "acme:robotrock-agent:sess1",
    isAdmin: false,
    role: "member",
  })),
}));

vi.mock("../../agent/client-from-session.js", () => ({
  tryCreateBoundRobotRockClient: vi.fn(() => ({
    chats: { uploadImage },
  })),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  uploadImage.mockClear();
});

describe("generateImageTool", () => {
  it("exposes the Eve tool slug", () => {
    expect(GENERATE_IMAGE_TOOL_NAME).toBe("generate_image");
  });

  it("uploads to RobotRock and returns storageId/url without base64", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");

    const tool = defineGenerateImageTool();
    const result = await tool.execute!(
      { prompt: "A red robot" },
      { abortSignal: undefined } as never
    );

    expect(uploadImage).toHaveBeenCalledWith({
      mediaType: "image/png",
      base64: "abc123",
      chatId: "acme:robotrock-agent:sess1",
      source: "generate_image",
      filename: "a-red-robot.png",
      description: "A red robot",
      tags: ["generate_image"],
    });
    expect(result).toMatchObject({
      prompt: "A red robot",
      mediaType: "image/png",
      model: "black-forest-labs/flux.2-klein-4b",
      storageId: "storage_abc",
      url: "https://example.com/img.png",
    });
    expect(result).not.toHaveProperty("base64");
    expect(result).not.toHaveProperty("ui");
    expect(result).not.toHaveProperty("uiHint");
  });
});
