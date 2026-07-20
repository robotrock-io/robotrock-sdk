import { describe, expect, it } from "vitest";
import { manageGroupsInputSchema } from "./manage-groups.js";
import { manageTeamMembersInputSchema } from "./manage-team-members.js";

describe("manageGroupsInputSchema", () => {
  it("accepts slug for add_member", () => {
    const parsed = manageGroupsInputSchema.safeParse({
      action: "add_member",
      slug: "finance",
      userId: "user_1",
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts email for add_member", () => {
    const parsed = manageGroupsInputSchema.safeParse({
      action: "add_member",
      slug: "finance",
      email: "alice@example.com",
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts groupId for add_member", () => {
    const parsed = manageGroupsInputSchema.safeParse({
      action: "add_member",
      groupId: "group_finance",
      userId: "user_1",
    });

    expect(parsed.success).toBe(true);
  });

  it("requires slug or groupId for add_member", () => {
    const parsed = manageGroupsInputSchema.safeParse({
      action: "add_member",
      userId: "user_1",
    });

    expect(parsed.success).toBe(false);
  });

  it("requires userId or email for add_member", () => {
    const parsed = manageGroupsInputSchema.safeParse({
      action: "add_member",
      slug: "finance",
    });

    expect(parsed.success).toBe(false);
  });
});

describe("manageTeamMembersInputSchema", () => {
  it("accepts email for get", () => {
    const parsed = manageTeamMembersInputSchema.safeParse({
      action: "get",
      email: "alice@example.com",
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts email for update_role", () => {
    const parsed = manageTeamMembersInputSchema.safeParse({
      action: "update_role",
      email: "alice@example.com",
      role: "admin",
    });

    expect(parsed.success).toBe(true);
  });

  it("requires userId or email for get", () => {
    const parsed = manageTeamMembersInputSchema.safeParse({
      action: "get",
    });

    expect(parsed.success).toBe(false);
  });
});
