import { describe, expect, it } from "vitest";
import { manageTeamMembersInputSchema } from "./manage-team-members.js";

describe("manageTeamMembersInputSchema", () => {
  it("accepts email for remove", () => {
    const parsed = manageTeamMembersInputSchema.safeParse({
      action: "remove",
      email: "quinten@6wines.com",
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts userId for remove", () => {
    const parsed = manageTeamMembersInputSchema.safeParse({
      action: "remove",
      userId: "jd7abc123",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects remove without userId or email", () => {
    const parsed = manageTeamMembersInputSchema.safeParse({
      action: "remove",
    });

    expect(parsed.success).toBe(false);
  });
});
