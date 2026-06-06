const SENSITIVE_KEY = /(secret|token|password|authorization|api[_-]?key|bearer)/i;

export function redactDetails(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactDetails);
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(key)) {
        output[key] = "[redacted]";
      } else {
        output[key] = redactDetails(nested);
      }
    }
    return output;
  }

  if (typeof value === "string" && value.length > 500) {
    return `${value.slice(0, 500)}…`;
  }

  return value;
}

export function safeProbeDetails(details: Record<string, unknown>): Record<string, unknown> {
  return redactDetails(details) as Record<string, unknown>;
}
