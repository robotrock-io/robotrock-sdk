import { createClient } from "../../client.js";
import type { CreateChatResult } from "../../chats.js";
import { resolveRobotRockConfig } from "../../env.js";

export type CreateRobotRockCronChatInput = {
  title: string;
  messages: { role: "user" | "assistant"; text: string }[];
  agentIdentifier?: string;
  ownerEmail: string;
};

function resolveCronAgentIdentifier(agentIdentifier?: string): string {
  return (
    agentIdentifier?.trim() ||
    process.env.ROBOTROCK_CRON_AGENT_IDENTIFIER?.trim() ||
    "robotrock-agent"
  );
}

/** Create an inbox chat from an Eve schedule via the RobotRock API. */
export async function createRobotRockCronChat(
  input: CreateRobotRockCronChatInput
): Promise<CreateChatResult> {
  const apiKey = process.env.ROBOTROCK_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ROBOTROCK_API_KEY is unset");
  }

  const client = createClient(resolveRobotRockConfig({ apiKey }));
  return client.chats.create({
    agentIdentifier: resolveCronAgentIdentifier(input.agentIdentifier),
    title: input.title,
    messages: input.messages,
    source: "cron",
    ownerEmail: input.ownerEmail,
  });
}
