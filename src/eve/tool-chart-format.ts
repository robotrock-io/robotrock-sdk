import { withReplyGuidance } from "./tool-reply-guidance.js";

/** Matches OpenUI / shadcn chart variants. */
export type ToolChartType = "line" | "bar" | "area" | "pie" | "radar" | "radial";

/**
 * Wide-format chart payload for OpenUI chart components.
 *
 * Each `series` row is one x-axis point. Numeric series are **columns**
 * (not a long-format dimension column):
 *
 * ```ts
 * {
 *   type: "line",
 *   xKey: "date",
 *   yKeys: ["NL", "BE"],
 *   series: [
 *     { date: "2025-07-21", NL: 100, BE: 40 },
 *     { date: "2025-07-22", NL: 120, BE: 50 },
 *   ],
 * }
 * ```
 *
 * Do **not** return long-format rows like
 * `{ date, country: "NL", visitors: 100 }` — use
 * {@link pivotLongFormatToWideChartSeries} first, or
 * {@link formatToolChartResultFromLong}.
 */
export type ToolChartResultData = {
  title?: string;
  description?: string;
  type: ToolChartType;
  xKey: string;
  yKeys: string[];
  series: Array<Record<string, string | number>>;
};

export type FormatToolChartResultOptions = {
  replyGuidance: string;
};

export type PivotLongFormatToWideChartSeriesArgs = {
  rows: ReadonlyArray<Record<string, unknown>>;
  xKey: string;
  /** Dimension column to spread into series columns (e.g. `country`). */
  seriesKey: string;
  /** Numeric metric column (e.g. `visitors`). */
  valueKey: string;
  /** Cap number of series columns (default 20). */
  maxSeries?: number;
};

type WithReplyGuidance<T> = T & { replyGuidance: string };

const TIME_X_AXIS_KEY_PATTERN =
  /^(date|time|timestamp|month|day|week|period)$/i;

const MAX_SERIES_DEFAULT = 20;

function isNumericValue(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function inferToolChartType(xKey: string): ToolChartType {
  return TIME_X_AXIS_KEY_PATTERN.test(xKey) ? "line" : "bar";
}

/**
 * Pivot long-format rows into wide chart series columns.
 *
 * Input:  `{ date: "d1", country: "NL", visitors: 100 }`
 * Output: `{ yKeys: ["NL","BE"], series: [{ date: "d1", NL: 100, BE: 40 }] }`
 */
export function pivotLongFormatToWideChartSeries(
  args: PivotLongFormatToWideChartSeriesArgs
): { yKeys: string[]; series: Array<Record<string, string | number>> } {
  const maxSeries = args.maxSeries ?? MAX_SERIES_DEFAULT;
  const yKeys: string[] = [];
  const seen = new Set<string>();
  const byX = new Map<string, Record<string, string | number>>();
  const xOrder: string[] = [];

  for (const row of args.rows) {
    const xRaw = row[args.xKey];
    const seriesRaw = row[args.seriesKey];
    const valueRaw = row[args.valueKey];
    if (xRaw == null || xRaw === "") {
      continue;
    }
    if (!isNonEmptyString(seriesRaw) || !isNumericValue(valueRaw)) {
      continue;
    }

    const seriesValue = seriesRaw.trim();
    if (!seen.has(seriesValue)) {
      if (yKeys.length >= maxSeries) {
        continue;
      }
      seen.add(seriesValue);
      yKeys.push(seriesValue);
    }

    const xValue = String(xRaw);
    let point = byX.get(xValue);
    if (!point) {
      point = {
        [args.xKey]: typeof xRaw === "number" ? xRaw : xValue,
      };
      byX.set(xValue, point);
      xOrder.push(xValue);
    }
    point[seriesValue] = valueRaw;
  }

  return {
    yKeys,
    series: xOrder.map((x) => byX.get(x)!),
  };
}

/**
 * Format a tool result for OpenUI chart rendering.
 *
 * Requires **wide** series rows. Sets top-level `type` / `xKey` / `yKeys` /
 * `series` so the agent can map series into OpenUI charts.
 */
export function formatToolChartResult(
  chart: {
    title?: string;
    description?: string;
    type?: ToolChartType;
    xKey: string;
    yKeys: readonly string[];
    series: ReadonlyArray<Record<string, string | number>>;
  },
  options: FormatToolChartResultOptions
): WithReplyGuidance<ToolChartResultData> {
  if (!chart.xKey.trim()) {
    throw new Error("formatToolChartResult: xKey is required");
  }
  const yKeys = chart.yKeys.map((key) => key.trim()).filter((key) => key.length > 0);
  if (yKeys.length === 0) {
    throw new Error("formatToolChartResult: yKeys must include at least one series key");
  }

  const data: ToolChartResultData = {
    ...(chart.title?.trim() ? { title: chart.title.trim() } : {}),
    ...(chart.description?.trim()
      ? { description: chart.description.trim() }
      : {}),
    type: chart.type ?? inferToolChartType(chart.xKey),
    xKey: chart.xKey.trim(),
    yKeys,
    series: chart.series.map((row) => ({ ...row })),
  };

  return withReplyGuidance(data, options.replyGuidance);
}

/**
 * Convenience: pivot long-format rows, then {@link formatToolChartResult}.
 */
export function formatToolChartResultFromLong(
  input: {
    title?: string;
    description?: string;
    type?: ToolChartType;
    xKey: string;
    seriesKey: string;
    valueKey: string;
    rows: ReadonlyArray<Record<string, unknown>>;
    maxSeries?: number;
  },
  options: FormatToolChartResultOptions
): WithReplyGuidance<ToolChartResultData> {
  const pivoted = pivotLongFormatToWideChartSeries({
    rows: input.rows,
    xKey: input.xKey,
    seriesKey: input.seriesKey,
    valueKey: input.valueKey,
    maxSeries: input.maxSeries,
  });

  if (pivoted.yKeys.length === 0) {
    throw new Error(
      "formatToolChartResultFromLong: no series values found after pivot"
    );
  }

  return formatToolChartResult(
    {
      title: input.title,
      description: input.description,
      type: input.type,
      xKey: input.xKey,
      yKeys: pivoted.yKeys,
      series: pivoted.series,
    },
    options
  );
}
