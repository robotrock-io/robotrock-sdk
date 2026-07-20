import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGateway, generateImage, type ImageModel } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { tryCreateBoundRobotRockClient } from "../../agent/client-from-session.js";
import { tryResolveTenantCaller } from "../../agent/tenant.js";
import { generateImageOutputSchema } from "../../entity-schemas.js";
import { formatToolObjectResult } from "../../tool-display-format.js";
import { GENERATE_IMAGE_REPLY_GUIDANCE } from "../../tool-reply-guidance.js";

export const GENERATE_IMAGE_TOOL_NAME = "generate_image";

/** Cheap/fast default on OpenRouter's Image API (supports 512 tier). */
const DEFAULT_IMAGE_MODEL = "black-forest-labs/flux.2-klein-4b";
const DEFAULT_IMAGE_SIZE = "512";
const DEFAULT_IMAGE_ASPECT_RATIO = "1:1";

export const generateImageInputSchema = z.object({
  prompt: z
    .string()
    .min(1)
    .describe("Detailed description of the image to generate"),
});

export type GenerateImageInput = z.infer<typeof generateImageInputSchema>;

export type GeneratedImageResult = {
  prompt: string;
  mediaType: string;
  model: string;
  storageId: string;
  url: string;
};

function normalizeEnvValue(value: string | undefined) {
  if (!value) {
    return undefined;
  }
  return value.replace(/^["']|["']$/g, "");
}

function isJwtExpired(token: string, bufferSeconds = 60) {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")
    ) as { exp?: number };
    return (
      typeof payload.exp !== "number" ||
      Date.now() / 1000 >= payload.exp - bufferSeconds
    );
  } catch {
    return true;
  }
}

type AiImageProvider = "openrouter" | "ai-gateway-api-key" | "ai-gateway-oidc";

function resolveAiImageModel(
  modelId =
    normalizeEnvValue(process.env.AI_IMAGE_MODEL) ?? DEFAULT_IMAGE_MODEL
): { model: ImageModel; provider: AiImageProvider; modelId: string } {
  const openRouterKey = normalizeEnvValue(process.env.OPENROUTER_API_KEY);
  if (openRouterKey) {
    const openrouter = createOpenRouter({ apiKey: openRouterKey });
    return {
      provider: "openrouter",
      model: openrouter.imageModel(modelId),
      modelId,
    };
  }

  const gatewayKey = normalizeEnvValue(process.env.AI_GATEWAY_API_KEY);
  if (gatewayKey) {
    const gateway = createGateway({ apiKey: gatewayKey });
    return {
      provider: "ai-gateway-api-key",
      model: gateway.imageModel(modelId),
      modelId,
    };
  }

  const oidcToken = normalizeEnvValue(process.env.VERCEL_OIDC_TOKEN);
  if (!oidcToken) {
    throw new Error(
      `No AI provider credentials for image model "${modelId}". Set OPENROUTER_API_KEY (preferred), or AI_GATEWAY_API_KEY / VERCEL_OIDC_TOKEN.`
    );
  }

  if (isJwtExpired(oidcToken)) {
    throw new Error(
      "VERCEL_OIDC_TOKEN is expired. Set OPENROUTER_API_KEY instead, or refresh the OIDC token."
    );
  }

  process.env.VERCEL_OIDC_TOKEN = oidcToken;
  const gateway = createGateway();
  return {
    provider: "ai-gateway-oidc",
    model: gateway.imageModel(modelId),
    modelId,
  };
}

function resolveAiImageSize(): string {
  return normalizeEnvValue(process.env.AI_IMAGE_SIZE) ?? DEFAULT_IMAGE_SIZE;
}

function resolveAiImageAspectRatio(): `${number}:${number}` {
  return (normalizeEnvValue(process.env.AI_IMAGE_ASPECT_RATIO) ??
    DEFAULT_IMAGE_ASPECT_RATIO) as `${number}:${number}`;
}

function extensionForMediaType(mediaType: string): string {
  const normalized = mediaType.toLowerCase();
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return "jpg";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("gif")) return "gif";
  return "png";
}

/** Build a filesystem-safe filename from a prompt + media type. */
export function filenameFromImagePrompt(
  prompt: string,
  mediaType: string
): string {
  const slug = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${slug || "generated-image"}.${extensionForMediaType(mediaType)}`;
}

/** Generate one image and return base64 + mediaType (before RobotRock upload). */
export async function generateImageBytes(
  input: GenerateImageInput,
  options?: { abortSignal?: AbortSignal }
): Promise<{ prompt: string; mediaType: string; model: string; base64: string }> {
  const { model, modelId } = resolveAiImageModel();
  const size = resolveAiImageSize();
  const aspectRatio = resolveAiImageAspectRatio();

  try {
    // OpenRouter accepts resolution tiers like "512"; AI SDK types expect "WxH".
    const { image } = await generateImage({
      model,
      prompt: input.prompt,
      aspectRatio,
      abortSignal: options?.abortSignal,
      size: size as `${number}x${number}`,
    });

    if (!image.base64) {
      throw new Error(`Image model "${modelId}" returned no image data.`);
    }

    return {
      prompt: input.prompt,
      mediaType: image.mediaType || "image/png",
      model: modelId,
      base64: image.base64,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Image generation failed.";
    throw new Error(`Image generation failed (${modelId}): ${message}`, {
      cause: error,
    });
  }
}

export function defineGenerateImageTool() {
  return defineTool({
    description:
      "Generate an image from a text prompt using a cheap/fast image model. " +
      "Use when the user asks to draw, create, or generate a picture or illustration. " +
      "Show the result in OpenUI with Image or ImageBlock (include url and storageId). " +
      "Do not describe the pixels in your reply.",
    inputSchema: generateImageInputSchema,
    outputSchema: generateImageOutputSchema,
    toModelOutput(output) {
      return {
        type: "text" as const,
        value: [
          `Generated an image for: "${output.prompt}" (model: ${output.model}).`,
          `url: ${output.url}`,
          `storageId: ${output.storageId}`,
          "Emit OpenUI Image or ImageBlock with url and storageId (prefer storageId for durability).",
        ].join("\n"),
      };
    },
    async execute(input, ctx) {
      const caller = tryResolveTenantCaller(ctx);
      const chatId = caller?.chatId?.trim();
      if (!chatId) {
        throw new Error(
          "generate_image requires a dashboard chat session (missing chatId)."
        );
      }

      const client = tryCreateBoundRobotRockClient(ctx);
      if (!client) {
        throw new Error(
          "RobotRock auth is unset. Configure ROBOTROCK_AGENT_SERVICE_TOKEN for hosted agents or ROBOTROCK_API_KEY for self-hosted deployments."
        );
      }

      const generated = await generateImageBytes(input, {
        abortSignal: ctx?.abortSignal,
      });

      const uploaded = await client.chats.uploadImage({
        mediaType: generated.mediaType,
        base64: generated.base64,
        chatId,
        source: GENERATE_IMAGE_TOOL_NAME,
        filename: filenameFromImagePrompt(generated.prompt, generated.mediaType),
        description: generated.prompt,
        tags: [GENERATE_IMAGE_TOOL_NAME],
      });

      return formatToolObjectResult(
        {
          prompt: generated.prompt,
          mediaType: uploaded.mediaType || generated.mediaType,
          model: generated.model,
          storageId: uploaded.storageId,
          url: uploaded.url,
        },
        {
          replyGuidance: GENERATE_IMAGE_REPLY_GUIDANCE,
        }
      );
    },
  });
}

export const generateImageTool = defineGenerateImageTool();
