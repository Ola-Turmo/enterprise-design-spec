export function collectTokenPaths(value: unknown, prefix: string[] = [], result = new Set<string>()): Set<string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return result;
  }

  const record = value as Record<string, unknown>;

  if (Object.prototype.hasOwnProperty.call(record, "$value")) {
    result.add(prefix.join("."));
    return result;
  }

  for (const [key, child] of Object.entries(record)) {
    if (key.startsWith("$")) {
      continue;
    }

    collectTokenPaths(child, [...prefix, key], result);
  }

  return result;
}
