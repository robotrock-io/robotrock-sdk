import { describe, expect, it } from "vitest";
import { toolChartResultSchema } from "./entity-schemas.js";
import {
  formatToolChartResult,
  formatToolChartResultFromLong,
  pivotLongFormatToWideChartSeries,
} from "./tool-chart-format.js";

describe("pivotLongFormatToWideChartSeries", () => {
  it("pivots country dimension into yKeys columns", () => {
    expect(
      pivotLongFormatToWideChartSeries({
        xKey: "date",
        seriesKey: "country",
        valueKey: "visitors",
        rows: [
          { date: "2025-07-21", country: "NL", visitors: 100 },
          { date: "2025-07-21", country: "BE", visitors: 40 },
          { date: "2025-07-22", country: "NL", visitors: 120 },
          { date: "2025-07-22", country: "BE", visitors: 50 },
        ],
      })
    ).toEqual({
      yKeys: ["NL", "BE"],
      series: [
        { date: "2025-07-21", NL: 100, BE: 40 },
        { date: "2025-07-22", NL: 120, BE: 50 },
      ],
    });
  });
});

describe("formatToolChartResult", () => {
  it("emits schema-valid wide chart output with reply guidance only", () => {
    const result = formatToolChartResult(
      {
        title: "Visitors",
        type: "line",
        xKey: "date",
        yKeys: ["NL", "BE"],
        series: [
          { date: "2025-07-21", NL: 100, BE: 40 },
          { date: "2025-07-22", NL: 120, BE: 50 },
        ],
      },
      { replyGuidance: "Do not restate series values." }
    );

    expect(toolChartResultSchema.parse(result)).toMatchObject({
      title: "Visitors",
      type: "line",
      xKey: "date",
      yKeys: ["NL", "BE"],
      replyGuidance: "Do not restate series values.",
    });
    expect(result).not.toHaveProperty("ui");
    expect(result).not.toHaveProperty("uiHint");
  });

  it("accepts pie chart type", () => {
    const result = formatToolChartResult(
      {
        title: "Browser share",
        type: "pie",
        xKey: "browser",
        yKeys: ["visitors"],
        series: [
          { browser: "Chrome", visitors: 275 },
          { browser: "Safari", visitors: 200 },
        ],
      },
      { replyGuidance: "Do not restate series values." }
    );

    expect(toolChartResultSchema.parse(result).type).toBe("pie");
  });
});

describe("formatToolChartResultFromLong", () => {
  it("pivots then formats to toolChartResultSchema", () => {
    const result = formatToolChartResultFromLong(
      {
        title: "Visitors NL/BE",
        xKey: "date",
        seriesKey: "country",
        valueKey: "visitors",
        rows: [
          { date: "2025-07-21", country: "NL", visitors: 100 },
          { date: "2025-07-21", country: "BE", visitors: 40 },
        ],
      },
      { replyGuidance: "Do not restate series values." }
    );

    expect(toolChartResultSchema.parse(result).yKeys).toEqual(["NL", "BE"]);
    expect(result.series).toEqual([{ date: "2025-07-21", NL: 100, BE: 40 }]);
    expect(result).not.toHaveProperty("ui");
  });
});
