import type { Prisma } from "@prisma/client";

type Segment = {
  platform?: "ios" | "android";
  locale?: string;
  timezone?: string;
};

export function buildDeviceSegmentWhere(segment: Prisma.JsonValue | null | undefined) {
  if (!segment || typeof segment !== "object" || Array.isArray(segment)) {
    return {};
  }

  const parsed = segment as Segment;
  const where: Record<string, string> = {};

  if (parsed.platform === "ios" || parsed.platform === "android") {
    where.platform = parsed.platform;
  }

  if (typeof parsed.locale === "string" && parsed.locale.length > 0) {
    where.locale = parsed.locale;
  }

  if (typeof parsed.timezone === "string" && parsed.timezone.length > 0) {
    where.timezone = parsed.timezone;
  }

  return where;
}
