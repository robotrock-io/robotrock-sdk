import { describe, expect, it } from "vitest";
import {
  ROBOTROCK_CHAT_ID_HEADER,
  ROBOTROCK_EVE_SESSION_ID_HEADER,
  buildChatCorrelationHeaders,
  resolveChatCorrelationFromEnv,
} from "./chat-correlation.js";

describe("buildChatCorrelationHeaders", () => {
  it("returns empty object when correlation is missing", () => {
    expect(buildChatCorrelationHeaders()).toEqual({});
    expect(buildChatCorrelationHeaders({})).toEqual({});
  });

  it("includes chat and eve session headers when provided", () => {
    expect(
      buildChatCorrelationHeaders({
        chatId: "acme:agent:session-1",
        eveSessionId: "eve-123",
      })
    ).toEqual({
      [ROBOTROCK_CHAT_ID_HEADER]: "acme:agent:session-1",
      [ROBOTROCK_EVE_SESSION_ID_HEADER]: "eve-123",
    });
  });
});

describe("resolveChatCorrelationFromEnv", () => {
  it("reads ROBOTROCK_CHAT_ID and ROBOTROCK_EVE_SESSION_ID", () => {
    const previousChatId = process.env.ROBOTROCK_CHAT_ID;
    const previousEveSessionId = process.env.ROBOTROCK_EVE_SESSION_ID;

    process.env.ROBOTROCK_CHAT_ID = " acme:agent:1 ";
    process.env.ROBOTROCK_EVE_SESSION_ID = " eve-1 ";

    expect(resolveChatCorrelationFromEnv()).toEqual({
      chatId: "acme:agent:1",
      eveSessionId: "eve-1",
    });

    if (previousChatId === undefined) {
      delete process.env.ROBOTROCK_CHAT_ID;
    } else {
      process.env.ROBOTROCK_CHAT_ID = previousChatId;
    }

    if (previousEveSessionId === undefined) {
      delete process.env.ROBOTROCK_EVE_SESSION_ID;
    } else {
      process.env.ROBOTROCK_EVE_SESSION_ID = previousEveSessionId;
    }
  });
});
