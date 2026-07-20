import { describe, expect, it } from "vitest";
import {
  ROBOTROCK_ACTING_USER_ID_HEADER,
  buildRobotRockAuthHeaders,
} from "./auth-headers.js";

describe("buildRobotRockAuthHeaders", () => {
  it("includes acting user id for API key auth", () => {
    const headers = buildRobotRockAuthHeaders({
      kind: "apiKey",
      apiKey: "ll_test",
      actingUserId: "user_abc",
    });

    expect(headers["X-Api-Key"]).toBe("ll_test");
    expect(headers[ROBOTROCK_ACTING_USER_ID_HEADER]).toBe("user_abc");
  });

  it("includes acting user id for agent service auth", () => {
    const headers = buildRobotRockAuthHeaders({
      kind: "agentService",
      token: "ras_test",
      tenantSlug: "acme",
      connectionId: "conn_1",
      actingUserId: "user_abc",
    });

    expect(headers.Authorization).toBe("Bearer ras_test");
    expect(headers["X-RobotRock-Tenant-Slug"]).toBe("acme");
    expect(headers["X-RobotRock-Connection-Id"]).toBe("conn_1");
    expect(headers[ROBOTROCK_ACTING_USER_ID_HEADER]).toBe("user_abc");
  });

  it("omits acting user header when unset", () => {
    const headers = buildRobotRockAuthHeaders({
      kind: "agentService",
      token: "ras_test",
      tenantSlug: "acme",
      connectionId: "conn_1",
    });

    expect(headers[ROBOTROCK_ACTING_USER_ID_HEADER]).toBeUndefined();
  });
});
