import { describe, expect, it } from "vitest";
import { generateRandomChartOutputSchema } from "../../entity-schemas.js";
import {
  buildRandomChartData,
  defineGenerateRandomChartTool,
} from "./generate-random-chart.js";

describe("buildRandomChartData", () => {
  it("is reproducible with a seed", () => {
    const a = buildRandomChartData({ seed: 42, axis: "time", pointCount: 10 });
    const b = buildRandomChartData({ seed: 42, axis: "time", pointCount: 10 });
    expect(a).toEqual(b);
  });

  it("builds time series with date + numeric y keys", () => {
    const data = buildRandomChartData({
      seed: 7,
      axis: "time",
      seriesCount: 2,
      pointCount: 8,
    });
    expect(data.axis).toBe("time");
    expect(data.series).toHaveLength(8);
    expect(data.series[0]).toMatchObject({
      date: expect.any(String),
      created: expect.any(Number),
      handled: expect.any(Number),
    });
  });

  it("builds category series with category + numeric y keys", () => {
    const data = buildRandomChartData({
      seed: 11,
      axis: "category",
      seriesCount: 1,
      pointCount: 5,
    });
    expect(data.axis).toBe("category");
    expect(data.series).toHaveLength(5);
    expect(data.series[0]).toMatchObject({
      category: expect.any(String),
      value: expect.any(Number),
    });
  });
});

describe("generateRandomChartTool", () => {
  it("returns schema-valid chart data with reply guidance only", async () => {
    const tool = defineGenerateRandomChartTool();
    const result = await tool.execute!(
      {
        seed: 99,
        axis: "time",
        seriesCount: 1,
        pointCount: 6,
      },
      { abortSignal: undefined } as never
    );

    const parsed = generateRandomChartOutputSchema.parse(result);
    expect(parsed.series.length).toBe(6);
    expect(parsed.type).toBe("line");
    expect(parsed.xKey).toBe("date");
    expect(result).not.toHaveProperty("ui");
    expect(result).not.toHaveProperty("uiHint");
  });
});
