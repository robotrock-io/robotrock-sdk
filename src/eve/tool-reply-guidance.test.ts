import { describe, expect, it } from "vitest";
import {
  stripAgentOnlyToolFields,
  withReplyGuidance,
  WHOAMI_REPLY_GUIDANCE,
} from "./tool-reply-guidance";

describe("withReplyGuidance", () => {
  it("adds replyGuidance to tool results", () => {
    expect(
      withReplyGuidance({ authenticated: true, userId: "user_1" }, WHOAMI_REPLY_GUIDANCE)
    ).toEqual({
      authenticated: true,
      userId: "user_1",
      replyGuidance: WHOAMI_REPLY_GUIDANCE,
    });
  });
});

describe("stripAgentOnlyToolFields", () => {
  it("removes replyGuidance from JSON fallback output", () => {
    expect(
      stripAgentOnlyToolFields({
        userId: "user_1",
        replyGuidance: WHOAMI_REPLY_GUIDANCE,
      })
    ).toEqual({ userId: "user_1" });
  });

  it("removes uiHint from JSON fallback output", () => {
    expect(
      stripAgentOnlyToolFields({
        items: [],
        uiHint: "list",
      })
    ).toEqual({ items: [] });
  });

  it("removes nested ui metadata from JSON fallback output", () => {
    expect(
      stripAgentOnlyToolFields({
        items: [],
        ui: { layout: "list", entity: "product", present: false },
      })
    ).toEqual({ items: [] });
  });
});
