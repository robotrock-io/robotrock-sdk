import type { RobotRockWebhookPayload } from "../webhook.js";

/** Build the assistant resume prompt when an inbox task linked to a chat is handled. */
export function buildTaskHandledResumeMessage(
  payload: RobotRockWebhookPayload
): string {
  const handledBy = payload.handledBy?.trim() || "someone";
  const actionTitle = payload.action.title.trim();
  return `RobotRock task ${payload.taskId} was handled: ${actionTitle} by ${handledBy}. Briefly tell the user what was decided and what happens next.`;
}
