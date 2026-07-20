import { describe, expect, it } from "vitest";
import {
  assignTasksOutputSchema,
  buildTenantGroupUrl,
  buildTenantTaskUrl,
  generateRandomChartOutputSchema,
  manageGroupsDetailOutputSchema,
  manageGroupsListOutputSchema,
  manageGroupsSummaryOutputSchema,
  manageTeamMembersListOutputSchema,
  queryTasksDetailOutputSchema,
  queryTasksListOutputSchema,
  searchProductsOutputSchema,
} from "./entity-schemas.js";
import {
  formatAssignTasksResult,
  formatTaskDetailResult,
  formatTasksListResult,
} from "./tools/admin/format-tasks-list.js";
import {
  formatGroupDetailResult,
  formatGroupsListResult,
  formatGroupSummaryResult,
} from "./tools/admin/format-groups-list.js";
import { formatTeamMembersListResult } from "./tools/admin/format-team-members-list.js";
import { formatToolListResult } from "./tool-display-format.js";
import { formatToolChartResult } from "./tool-chart-format.js";
import {
  GENERATE_RANDOM_CHART_REPLY_GUIDANCE,
  SEARCH_PRODUCTS_REPLY_GUIDANCE,
} from "./tool-reply-guidance.js";
import { buildRandomChartData } from "./tools/catalog/generate-random-chart.js";

describe("entity URL helpers", () => {
  it("builds inbox task urls with selected and type", () => {
    expect(
      buildTenantTaskUrl("acme", { id: "task_1", type: "refund" })
    ).toBe("/acme/inbox?type=refund&selected=task_1");
  });

  it("builds group urls", () => {
    expect(buildTenantGroupUrl("acme", "finance")).toBe(
      "/acme/team/groups/finance"
    );
  });
});

describe("entity outputSchema parse", () => {
  it("parses product list with required url", () => {
    const result = formatToolListResult(
      "items",
      [
        {
          id: "sku-1001",
          name: "Wireless Keyboard",
          price: 79.99,
          currency: "USD",
          inStock: true,
          url: "https://shop.example.com/products/sku-1001",
        },
      ],
      {
        replyGuidance: SEARCH_PRODUCTS_REPLY_GUIDANCE,
      }
    );

    const parsed = searchProductsOutputSchema.parse(result);
    expect(parsed.items[0]?.url).toMatch(/^https:\/\//);
  });

  it("parses random chart series", () => {
    const data = buildRandomChartData({
      seed: 3,
      axis: "category",
      seriesCount: 2,
      pointCount: 4,
    });
    const xKey = "category";
    const yKeys = Object.keys(data.series[0] ?? {}).filter((key) => key !== xKey);
    const result = formatToolChartResult(
      {
        title: data.title,
        type: "bar",
        xKey,
        yKeys,
        series: data.series,
      },
      {
        replyGuidance: GENERATE_RANDOM_CHART_REPLY_GUIDANCE,
      }
    );

    const parsed = generateRandomChartOutputSchema.parse(result);
    expect(parsed.type).toBe("bar");
    expect(parsed.xKey).toBe("category");
    expect(parsed.yKeys.length).toBeGreaterThan(0);
    expect(parsed.series).toHaveLength(4);
    expect(parsed).not.toHaveProperty("ui");
  });

  it("parses member list (no url)", () => {
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

    const parsed = manageTeamMembersListOutputSchema.parse(result);
    expect(parsed.members).toHaveLength(1);
    expect(parsed.members[0]?.profilePictureUrl).toBe(
      "https://cdn.example.com/alice.png"
    );
  });

  it("parses task list with url and inbox fields", () => {
    const result = formatTasksListResult(
      [
        {
          id: "task_1",
          convexId: "jx7…",
          status: "open",
          type: "refund",
          name: "Approve refund",
          description: null,
          validUntil: 1_700_000_000_000,
          createdAt: 1_699_000_000_000,
          threadPriority: "high",
          handledByUserId: null,
        },
      ],
      { tenantSlug: "acme" }
    );

    const parsed = queryTasksListOutputSchema.parse(result);
    expect(parsed).toMatchObject({
      items: [
        {
          id: "task_1",
          threadPriority: "high",
          url: "/acme/inbox?type=refund&selected=task_1",
        },
      ],
    });
  });

  it("parses task detail with url", () => {
    const result = formatTaskDetailResult(
      {
        id: "task_1",
        status: "open",
        type: "refund",
        name: "Approve refund",
        description: "Details",
        validUntil: 1,
        createdAt: 2,
      },
      { tenantSlug: "acme" }
    );

    expect(queryTasksDetailOutputSchema.parse(result).url).toBe(
      "/acme/inbox?type=refund&selected=task_1"
    );
  });

  it("parses group list/detail/summary with url", () => {
    const list = formatGroupsListResult(
      [
        {
          id: "g1",
          name: "Finance",
          slug: "finance",
          description: null,
          memberCount: 2,
        },
      ],
      { tenantSlug: "acme" }
    );
    expect(manageGroupsListOutputSchema.parse(list).groups[0]?.url).toBe(
      "/acme/team/groups/finance"
    );

    const summary = formatGroupSummaryResult(
      {
        id: "g1",
        name: "Finance",
        slug: "finance",
        description: "Approvals",
        memberCount: 2,
      },
      { tenantSlug: "acme" }
    );
    expect(manageGroupsSummaryOutputSchema.parse(summary).url).toBe(
      "/acme/team/groups/finance"
    );

    const detail = formatGroupDetailResult(
      {
        id: "g1",
        name: "Finance",
        slug: "finance",
        description: null,
        members: [
          {
            userId: "u1",
            user: {
              id: "u1",
              email: "a@example.com",
              name: "Alice",
              profilePictureUrl: "https://cdn.example.com/a.png",
            },
          },
        ],
      },
      { tenantSlug: "acme" }
    );
    const parsedDetail = manageGroupsDetailOutputSchema.parse(detail);
    expect(parsedDetail.url).toBe("/acme/team/groups/finance");
    expect(parsedDetail.members[0]?.profilePictureUrl).toBe(
      "https://cdn.example.com/a.png"
    );
  });

  it("parses assign status rows with task url", () => {
    const result = formatAssignTasksResult(
      [
        {
          taskId: "task_1",
          success: true,
          name: "Prospect review",
          type: "prospect-review",
        },
      ],
      { users: ["peter@example.com"] },
      { tenantSlug: "acme" }
    );

    const parsed = assignTasksOutputSchema.parse(result);
    if (!("results" in parsed)) {
      throw new Error("expected assign success payload");
    }
    expect(parsed.results[0]?.url).toBe(
      "/acme/inbox?type=prospect-review&selected=task_1"
    );
  });
});
