import { describe, expect, it } from "vitest";
import {
  formatGroupSummaryResult,
  formatGroupsListResult,
} from "./format-groups-list.js";

describe("formatGroupsListResult", () => {
  it("returns plain group list data with reply guidance and url", () => {
    const result = formatGroupsListResult(
      [
        {
          id: "group_1",
          name: "Finance",
          slug: "finance",
          description: null,
          memberCount: 2,
        },
      ],
      { tenantSlug: "acme" }
    );

    expect(result.groups).toEqual([
      {
        name: "Finance",
        slug: "finance",
        description: null,
        memberCount: 2,
        url: "/acme/team/groups/finance",
      },
    ]);
    expect(result.replyGuidance).toMatch(/do not restate/i);
  });
});

describe("formatGroupSummaryResult", () => {
  it("returns plain group summary data with url", () => {
    const result = formatGroupSummaryResult(
      {
        id: "group_1",
        name: "Finance",
        slug: "finance",
        description: "Finance approvals",
        memberCount: 4,
      },
      { tenantSlug: "acme" }
    );

    expect(result).toMatchObject({
      name: "Finance",
      slug: "finance",
      description: "Finance approvals",
      memberCount: 4,
      url: "/acme/team/groups/finance",
    });
  });
});
