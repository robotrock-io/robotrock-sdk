import { defineTool } from "eve/tools";
import { z } from "zod";
import { generateRandomChartOutputSchema } from "../../entity-schemas.js";
import { formatToolChartResult } from "../../tool-chart-format.js";
import { GENERATE_RANDOM_CHART_REPLY_GUIDANCE } from "../../tool-reply-guidance.js";

export const GENERATE_RANDOM_CHART_TOOL_NAME = "generate_random_chart";

export const generateRandomChartInputSchema = z.object({
  axis: z
    .enum(["time", "category", "random"])
    .optional()
    .describe(
      "X-axis style: time (line), category (bar), or random. Defaults to random."
    ),
  seriesCount: z
    .number()
    .int()
    .min(1)
    .max(3)
    .optional()
    .describe("Number of numeric series (1–3). Defaults to a random 1–2."),
  pointCount: z
    .number()
    .int()
    .min(4)
    .max(30)
    .optional()
    .describe("Number of data points (4–30). Defaults to a random 8–14."),
  seed: z
    .number()
    .int()
    .optional()
    .describe("Optional seed for reproducible random data."),
});

export type GenerateRandomChartInput = z.infer<
  typeof generateRandomChartInputSchema
>;

export type ChartAxisKind = "time" | "category";

export type GeneratedChartResult = {
  title: string;
  axis: ChartAxisKind;
  series: Array<Record<string, string | number>>;
};

type Rng = () => number;

function createRng(seed: number | undefined): Rng {
  let state =
    seed === undefined
      ? (Math.floor(Math.random() * 0x7fffffff) ^ Date.now()) >>> 0
      : seed >>> 0;
  if (state === 0) {
    state = 1;
  }
  return () => {
    // xorshift32
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

function randomInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function roundMetric(value: number): number {
  return Math.round(value * 10) / 10;
}

const TIME_TITLES = [
  "Task throughput",
  "Approvals over time",
  "Inbox volume",
  "Agent tool calls",
  "Webhook deliveries",
] as const;

const CATEGORY_TITLES = [
  "Tasks by status",
  "Approvals by team",
  "Volume by region",
  "Spend by category",
  "Tickets by priority",
] as const;

const TIME_SERIES_KEYS = [
  ["value"],
  ["created", "handled"],
  ["open", "handled", "expired"],
] as const;

const CATEGORY_SERIES_KEYS = [
  ["value"],
  ["revenue", "costs"],
  ["approved", "rejected", "pending"],
] as const;

const CATEGORIES = [
  ["North", "South", "East", "West", "Central"],
  ["Finance", "Ops", "Support", "Engineering", "Sales"],
  ["P0", "P1", "P2", "P3", "P4"],
  ["Draft", "Open", "Handled", "Expired", "Cancelled"],
] as const;

function formatDate(daysAgo: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function buildSeriesPoints(args: {
  rng: Rng;
  axis: ChartAxisKind;
  seriesKeys: readonly string[];
  pointCount: number;
}): Array<Record<string, string | number>> {
  const { rng, axis, seriesKeys, pointCount } = args;
  const baselines = seriesKeys.map(() => 20 + rng() * 80);

  if (axis === "time") {
    return Array.from({ length: pointCount }, (_, index) => {
      const point: Record<string, string | number> = {
        date: formatDate(pointCount - 1 - index),
      };
      for (let i = 0; i < seriesKeys.length; i++) {
        const drift = (rng() - 0.45) * 12;
        baselines[i] = Math.max(1, baselines[i]! + drift);
        point[seriesKeys[i]!] = roundMetric(baselines[i]!);
      }
      return point;
    });
  }

  const labels = pick(rng, CATEGORIES).slice(0, pointCount);
  return labels.map((label) => {
    const point: Record<string, string | number> = { category: label };
    for (let i = 0; i < seriesKeys.length; i++) {
      point[seriesKeys[i]!] = roundMetric(8 + rng() * 120);
    }
    return point;
  });
}

/** Pure helper — generate chart-shaped demo data for UI testing. */
export function buildRandomChartData(
  input: GenerateRandomChartInput = {}
): GeneratedChartResult {
  const rng = createRng(input.seed);
  const axis: ChartAxisKind =
    input.axis === "time" || input.axis === "category"
      ? input.axis
      : pick(rng, ["time", "category"] as const);
  const seriesCount = input.seriesCount ?? randomInt(rng, 1, 2);
  const pointCount =
    input.pointCount ??
    (axis === "time" ? randomInt(rng, 8, 14) : randomInt(rng, 4, 6));

  const keyPool = axis === "time" ? TIME_SERIES_KEYS : CATEGORY_SERIES_KEYS;
  const seriesKeys =
    keyPool.find((keys) => keys.length === seriesCount) ?? keyPool[0]!;

  const title = pick(rng, axis === "time" ? TIME_TITLES : CATEGORY_TITLES);
  const series = buildSeriesPoints({
    rng,
    axis,
    seriesKeys,
    pointCount,
  });

  return { title, axis, series };
}

export function defineGenerateRandomChartTool() {
  return defineTool({
    description:
      "Generate random chart-ready demo metrics for testing chat chart UI. " +
      "Results render as a chart card — do not restate series values in your reply.",
    inputSchema: generateRandomChartInputSchema,
    outputSchema: generateRandomChartOutputSchema,
    async execute(input) {
      const data = buildRandomChartData(input);
      const xKey = data.axis === "time" ? "date" : "category";
      const sample = data.series[0] ?? {};
      const yKeys = Object.keys(sample).filter((key) => key !== xKey);
      const result = formatToolChartResult(
        {
          title: data.title,
          type: data.axis === "time" ? "line" : "bar",
          xKey,
          yKeys,
          series: data.series,
        },
        {
          replyGuidance: GENERATE_RANDOM_CHART_REPLY_GUIDANCE,
        }
      );
      // Demo schema requires title; formatToolChartResult keeps it optional.
      return { ...result, title: data.title };
    },
  });
}

export const generateRandomChartTool = defineGenerateRandomChartTool();
