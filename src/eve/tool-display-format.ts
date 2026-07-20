import { withReplyGuidance } from "./tool-reply-guidance.js";

export type FormatToolObjectResultOptions = {
  replyGuidance: string;
};

export type FormatToolListResultOptions = {
  replyGuidance: string;
};

export type FormatToolQueryResultOptions = {
  replyGuidance: string;
  /** Data key for the row array (default `"rows"`). */
  rowsPath?: string;
};

type WithReplyGuidance<T> = T & { replyGuidance: string };

/** Attach agent narration hints to plain tool JSON. No display/ui envelope. */
export function formatToolObjectResult<T extends Record<string, unknown>>(
  data: T,
  options: FormatToolObjectResultOptions
): WithReplyGuidance<T> {
  return withReplyGuidance(data, options.replyGuidance);
}

/** Wrap an array field as plain tool JSON with reply guidance.
 *
 * Include `url` on each item when you know a navigable link — the dashboard
 * renders clickable Item rows. Use `attachments` / `files` / `documents` keys
 * for file downloads (Attachment layout).
 */
export function formatToolListResult<
  const K extends string,
  T extends Record<string, unknown>,
>(
  listKey: K,
  items: T[],
  options: FormatToolListResultOptions
): WithReplyGuidance<Record<K, T[]>> {
  return withReplyGuidance(
    { [listKey]: items } as Record<K, T[]>,
    options.replyGuidance
  );
}

/** Format a query-style result: shared meta fields + typed row array. */
export function formatToolQueryResult<
  M extends Record<string, unknown>,
  T extends Record<string, unknown>,
>(
  meta: M,
  rows: T[],
  options: FormatToolQueryResultOptions
): WithReplyGuidance<M & Record<string, T[]>> {
  const rowsPath = options.rowsPath ?? "rows";

  return withReplyGuidance(
    {
      ...meta,
      [rowsPath]: rows,
    } as M & Record<string, T[]>,
    options.replyGuidance
  );
}

export function isAgentAdminErrorResult(
  result: unknown
): result is { ok: false; message: string } {
  return (
    typeof result === "object" &&
    result !== null &&
    (result as { ok?: unknown }).ok === false &&
    typeof (result as { message?: unknown }).message === "string"
  );
}
