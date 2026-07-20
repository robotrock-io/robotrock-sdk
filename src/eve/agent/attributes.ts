export function readStringAttribute(
  attributes: Readonly<Record<string, string | readonly string[]>> | undefined,
  key: string
): string | undefined {
  const value = attributes?.[key];
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].length > 0) {
    return value[0];
  }
  return undefined;
}

export function readStringArrayAttribute(
  attributes: Readonly<Record<string, string | readonly string[]>> | undefined,
  key: string
): string[] {
  const value = attributes?.[key];
  if (typeof value === "string" && value.length > 0) {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter(
      (entry): entry is string => typeof entry === "string" && entry.length > 0
    );
  }
  return [];
}

export function parseTenantRole(
  value: string | undefined
): "admin" | "member" | null {
  if (value === "admin" || value === "member") {
    return value;
  }
  return null;
}
