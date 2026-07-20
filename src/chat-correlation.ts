export const ROBOTROCK_CHAT_ID_HEADER = "x-robotrock-chat-id";
export const ROBOTROCK_EVE_SESSION_ID_HEADER = "x-robotrock-eve-session-id";

export type ChatCorrelation = {
  chatId?: string;
  eveSessionId?: string;
};

/** Resolve chat correlation from env (programmatic / cron chats). */
export function resolveChatCorrelationFromEnv(): ChatCorrelation | undefined {
  const chatId = process.env.ROBOTROCK_CHAT_ID?.trim();
  const eveSessionId = process.env.ROBOTROCK_EVE_SESSION_ID?.trim();
  if (!chatId && !eveSessionId) {
    return undefined;
  }
  return {
    ...(chatId ? { chatId } : {}),
    ...(eveSessionId ? { eveSessionId } : {}),
  };
}

/** Attach chat correlation headers when a chat context is known. */
export function buildChatCorrelationHeaders(
  correlation?: ChatCorrelation
): Record<string, string> {
  if (!correlation) {
    return {};
  }

  const headers: Record<string, string> = {};
  const chatId = correlation.chatId?.trim();
  const eveSessionId = correlation.eveSessionId?.trim();

  if (chatId) {
    headers[ROBOTROCK_CHAT_ID_HEADER] = chatId;
  }
  if (eveSessionId) {
    headers[ROBOTROCK_EVE_SESSION_ID_HEADER] = eveSessionId;
  }

  return headers;
}
