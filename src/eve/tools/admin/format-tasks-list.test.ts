import { describe, expect, it } from "vitest";
import {
  formatAssignTasksResult,
  formatTasksListResult,
  resolveTaskCardLabel,
} from "./format-tasks-list.js";

describe("resolveTaskCardLabel", () => {
  it("prefers description when name is missing", () => {
    expect(
      resolveTaskCardLabel({
        description: "Approve $500 refund for Acme",
        type: "refund",
        id: "task_1",
      })
    ).toBe("Approve $500 refund for Acme");
  });
});

describe("formatTasksListResult", () => {
  it("includes inbox fields and url", () => {
    const result = formatTasksListResult(
      [
        {
          id: "task_1",
          convexId: "convex_1",
          status: "open",
          type: "refund",
          name: "Approve refund",
          description: null,
          validUntil: 100,
          createdAt: 50,
          threadPriority: "high",
          handledByUserId: null,
        },
      ],
      { tenantSlug: "acme" }
    );

    expect(result.items).toEqual([
      {
        id: "task_1",
        name: "Approve refund",
        status: "open",
        type: "refund",
        description: null,
        validUntil: 100,
        createdAt: 50,
        threadPriority: "high",
        url: "/acme/inbox?type=refund&selected=task_1",
      },
    ]);
  });
});

describe("formatAssignTasksResult", () => {
  it("maps task name and id for reassignment results", () => {
    const result = formatAssignTasksResult(
      [
        {
          taskId: "task_1",
          success: true,
          name: "Prospect review — Acme",
          type: "prospect-review",
        },
        {
          taskId: "task_2",
          success: true,
          name: "Prospect review — Globex",
          type: "prospect-review",
        },
      ],
      { users: ["peter@example.com"] },
      { tenantSlug: "acme" }
    );

    expect(result.results).toEqual([
      {
        id: "task_1",
        name: "Prospect review — Acme",
        type: "prospect-review",
        description: null,
        status: "reassigned",
        url: "/acme/inbox?type=prospect-review&selected=task_1",
      },
      {
        id: "task_2",
        name: "Prospect review — Globex",
        type: "prospect-review",
        description: null,
        status: "reassigned",
        url: "/acme/inbox?type=prospect-review&selected=task_2",
      },
    ]);
  });

  it("falls back to description when name is missing", () => {
    const result = formatAssignTasksResult(
      [
        {
          taskId: "task_3",
          success: true,
          description: "Prospect review for Globex",
          type: "prospect-review",
        },
      ],
      { users: ["peter@example.com"] },
      { tenantSlug: "acme" }
    );

    expect(result.results).toEqual([
      {
        id: "task_3",
        name: "Prospect review for Globex",
        type: "prospect-review",
        description: "Prospect review for Globex",
        status: "reassigned",
        url: "/acme/inbox?type=prospect-review&selected=task_3",
      },
    ]);
  });

  it("falls back to type or task id when name is missing", () => {
    const result = formatAssignTasksResult(
      [
        {
          taskId: "task_9",
          success: false,
          type: "refund",
          message: "Task not found",
        },
      ],
      { groups: ["finance"] },
      { tenantSlug: "acme" }
    );

    expect(result.results).toEqual([
      {
        id: "task_9",
        name: "refund",
        type: "refund",
        description: null,
        status: "failed",
        url: "/acme/inbox?type=refund&selected=task_9",
      },
    ]);
  });
});
