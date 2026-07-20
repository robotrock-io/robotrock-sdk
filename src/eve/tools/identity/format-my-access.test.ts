import { describe, expect, it } from "vitest";
import { formatMyAccessResult } from "./format-my-access.js";

describe("formatMyAccessResult", () => {
  it("returns plain access data with reply guidance", () => {
    const result = formatMyAccessResult({
      tenantSlug: "6wines",
      tenantRole: "member",
      isTenantAdmin: false,
      groupSlugs: ["all"],
      capabilities: {
        manageSettings: false,
        manageBilling: false,
        manageTeam: false,
        manageIntegrations: false,
      },
    });

    expect(result.access).toEqual({
      workspace: "6wines",
      role: "member",
      tenantAdmin: false,
      groups: "all",
      manageSettings: false,
      manageBilling: false,
      manageTeam: false,
      manageIntegrations: false,
    });
    expect(result.replyGuidance).toBeTruthy();
  });
});
