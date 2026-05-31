export function sanitizeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return message
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgresql://[redacted]@")
    .replace(/redis:\/\/[^@\s]+@/gi, "redis://[redacted]@")
    .replace(/\s+/g, " ")
    .slice(0, 240);
}
