import { describe, expect, it } from "vitest";
import { z } from "zod";
import { manageGroupsInputSchema } from "./manage-groups.js";
import { manageTeamMembersInputSchema } from "./manage-team-members.js";
import { queryTasksInputSchema } from "./query-tasks.js";

function expectGatewayCompatibleToolSchema(
  toolName: string,
  inputSchema: z.ZodType
) {
  const jsonSchema = z.toJSONSchema(inputSchema);
  expect(jsonSchema, `${toolName} must serialize to a top-level object schema`).toMatchObject({
    type: "object",
  });
  expect(jsonSchema).not.toHaveProperty("oneOf");
}

describe("admin tool input schemas", () => {
  it("serializes manage_groups for Anthropic tool calling", () => {
    expectGatewayCompatibleToolSchema(
      "manage_groups",
      manageGroupsInputSchema
    );
  });

  it("serializes manage_team_members for Anthropic tool calling", () => {
    expectGatewayCompatibleToolSchema(
      "manage_team_members",
      manageTeamMembersInputSchema
    );
  });

  it("serializes query_tasks for Anthropic tool calling", () => {
    expectGatewayCompatibleToolSchema("query_tasks", queryTasksInputSchema);
  });
});
