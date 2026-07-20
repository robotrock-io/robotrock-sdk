import { describe, expect, it } from "vitest";
import { z } from "zod";
import { getTaskExampleById } from "@robotrock/core/examples";
import {
  buildRequestActionInputToolDefinition,
  defaultRequestActionInputActionId,
  isRequestActionInputToolPart,
  normalizeRequestActionInputToolInput,
  REQUEST_ACTION_INPUT_TOOL_NAME,
  requestActionInputToolInputSchema,
  requestActionInputToolOutputSchema,
} from "./request-action-input-tool-core.js";

describe("requestActionInputTool", () => {
  it("defaults action.id from title when the model omits it", () => {
    const parsed = normalizeRequestActionInputToolInput({
      prompt: "Kies een blog-brief",
      action: {
        title: "Kies een blog-brief",
        schema: {
          type: "object",
          required: ["selectedSlug"],
          properties: {
            selectedSlug: {
              type: "string",
              title: "Selecteer een blog-idee",
              enum: ["wijn-bij-gegrilde-groenten-van-da-bbq"],
            },
          },
        },
      },
    });

    expect(parsed.action.id).toBe("kies-een-blog-brief");
  });

  it("slugifies default action ids", () => {
    expect(defaultRequestActionInputActionId("Kies een blog-brief")).toBe(
      "kies-een-blog-brief"
    );
    expect(defaultRequestActionInputActionId("   ")).toBe("submit");
  });

  it("parses ai-agent-input action shape", () => {
    const aiAgentInput = getTaskExampleById("ai-agent-input")!;
    const action = aiAgentInput.actions[0]!;
    const parsed = requestActionInputToolInputSchema.parse({
      prompt: "Help me understand your requirements",
      action: {
        id: action.id,
        title: action.title,
        description: action.description,
        schema: action.schema,
        ui: action.ui,
      },
    });

    expect(parsed.action.id).toBe("answer-questions");
    expect(parsed.action.schema).toBeDefined();
  });

  it("validates tool output shape", () => {
    const output = requestActionInputToolOutputSchema.parse({
      actionId: "answer-questions",
      data: { "ui-style": "modern-minimal" },
    });

    expect(output.actionId).toBe("answer-questions");
  });

  it("builds default tool definition", () => {
    const definition = buildRequestActionInputToolDefinition();
    expect(definition.description).toContain("action widget");
    expect(definition.inputSchema).toBe(requestActionInputToolInputSchema);
  });

  it("accepts tool input without action.id for JSON Schema registration", () => {
    expect(() =>
      requestActionInputToolInputSchema.parse({
        action: { title: "Kies een blog-brief" },
      })
    ).not.toThrow();
  });

  it("converts input schema to JSON Schema for AI SDK tool registration", () => {
    expect(() => z.toJSONSchema(requestActionInputToolInputSchema)).not.toThrow();
    const jsonSchema = z.toJSONSchema(requestActionInputToolInputSchema);
    expect(jsonSchema.type).toBe("object");
  });

  it("detects requestActionInput tool parts", () => {
    expect(
      isRequestActionInputToolPart({ type: `tool-${REQUEST_ACTION_INPUT_TOOL_NAME}` })
    ).toBe(true);
    expect(isRequestActionInputToolPart({ type: "tool-other" })).toBe(false);
  });
});
