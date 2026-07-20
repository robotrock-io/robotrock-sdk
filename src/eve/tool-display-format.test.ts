import { describe, expect, it } from "vitest";
import {
  formatToolListResult,
  formatToolObjectResult,
  formatToolQueryResult,
  isAgentAdminErrorResult,
} from "./tool-display-format.js";

describe("formatToolObjectResult", () => {
  it("returns plain data with reply guidance", () => {
    const result = formatToolObjectResult(
      { city: "Amsterdam", temperatureF: 72 },
      {
        replyGuidance: "Do not repeat weather fields.",
      }
    );

    expect(result.city).toBe("Amsterdam");
    expect(result.replyGuidance).toBe("Do not repeat weather fields.");
    expect(result).not.toHaveProperty("ui");
    expect(result).not.toHaveProperty("uiHint");
  });
});

describe("formatToolListResult", () => {
  it("returns plain list data with reply guidance", () => {
    const result = formatToolListResult(
      "items",
      [{ name: "Ada" }],
      {
        replyGuidance: "Do not repeat list rows.",
      }
    );

    expect(result.items).toEqual([{ name: "Ada" }]);
    expect(result.replyGuidance).toBe("Do not repeat list rows.");
    expect(result).not.toHaveProperty("ui");
    expect(result).not.toHaveProperty("uiHint");
  });
});

describe("formatToolQueryResult", () => {
  it("attaches rows under the default rowsPath", () => {
    const result = formatToolQueryResult(
      { question: "How many?", sql: "select 1", totalRows: 1 },
      [{ id: "1", name: "Widget" }],
      {
        replyGuidance: "Do not restate query rows.",
      }
    );

    expect(result.question).toBe("How many?");
    expect(result.rows).toEqual([{ id: "1", name: "Widget" }]);
    expect(result.replyGuidance).toBe("Do not restate query rows.");
    expect(result).not.toHaveProperty("ui");
  });

  it("respects a custom rowsPath data key", () => {
    const result = formatToolQueryResult(
      { totalRows: 1 },
      [{ id: "1" }],
      {
        replyGuidance: "Do not restate query rows.",
        rowsPath: "items",
      }
    );

    expect(result.items).toEqual([{ id: "1" }]);
    expect(result).not.toHaveProperty("rows");
  });
});

describe("isAgentAdminErrorResult", () => {
  it("detects admin API error payloads", () => {
    expect(
      isAgentAdminErrorResult({ ok: false, message: "Forbidden", status: 403 })
    ).toBe(true);
    expect(isAgentAdminErrorResult({ members: [] })).toBe(false);
  });
});
