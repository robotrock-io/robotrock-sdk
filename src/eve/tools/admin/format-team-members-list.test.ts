import { describe, expect, it } from "vitest";
import {
  formatTeamMemberDetailResult,
  formatTeamMembersListResult,
} from "./format-team-members-list.js";

describe("formatTeamMembersListResult", () => {
  it("returns plain member list data with reply guidance", () => {
    const result = formatTeamMembersListResult([
      {
        userId: "user_1",
        role: "admin",
        membershipKind: "team",
        hasLoggedIn: true,
        user: {
          id: "user_1",
          email: "alice@example.com",
          name: "Alice Example",
          profilePictureUrl: "https://cdn.example.com/alice.png",
        },
      },
    ]);

    expect(result.members).toEqual([
      {
        name: "Alice Example",
        email: "alice@example.com",
        role: "admin",
        membershipKind: "team",
        profilePictureUrl: "https://cdn.example.com/alice.png",
      },
    ]);
    expect(result.replyGuidance).toMatch(/do not restate/i);
  });
});

describe("formatTeamMemberDetailResult", () => {
  const member = {
    userId: "user_1",
    role: "member" as const,
    membershipKind: "team" as const,
    hasLoggedIn: false,
    user: {
      id: "user_1",
      email: "quinten@example.com",
      name: "Quinten Beek",
      profilePictureUrl: null,
    },
  };

  it("returns plain member detail data", () => {
    const result = formatTeamMemberDetailResult(member);

    expect(result.name).toBe("Quinten Beek");
    expect(result.email).toBe("quinten@example.com");
    expect(result.profilePictureUrl).toBeNull();
  });
});
