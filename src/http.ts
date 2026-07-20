export class RobotRockError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response?: unknown
  ) {
    super(message);
    this.name = "RobotRockError";
  }
}

type ParsedResponseBody = Record<string, unknown> | unknown[] | string | null;

export async function parseResponseBody(
  response: Response
): Promise<ParsedResponseBody> {
  const contentType = response.headers.get("content-type") ?? "";
  const bodyText = await response.text();

  if (!bodyText) {
    return null;
  }

  if (contentType.toLowerCase().includes("application/json")) {
    try {
      return JSON.parse(bodyText) as ParsedResponseBody;
    } catch {
      // Fall through and return text body below so error messages stay useful.
    }
  }

  try {
    return JSON.parse(bodyText) as ParsedResponseBody;
  } catch {
    return bodyText;
  }
}

export function getErrorMessage(
  data: ParsedResponseBody,
  fallback: string
): string {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    const maybeMessage = record.message;
    const maybeHint = record.hint;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      if (typeof maybeHint === "string" && maybeHint.trim()) {
        return `${maybeMessage.trim()} ${maybeHint.trim()}`;
      }
      return maybeMessage;
    }
  }

  if (typeof data === "string" && data.trim()) {
    const compact = data.replace(/\s+/g, " ").trim();
    if (/FUNCTION_PAYLOAD_TOO_LARGE|Request Entity Too Large/i.test(compact)) {
      return `${fallback}. Request body exceeded the platform size limit (upload image bytes directly instead of base64 through the API).`;
    }
    const snippet = compact.length > 180 ? `${compact.slice(0, 180)}...` : compact;
    return `${fallback}. Server returned non-JSON response: ${snippet}`;
  }

  return fallback;
}
