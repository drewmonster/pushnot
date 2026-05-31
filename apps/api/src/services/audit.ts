import type { AuditAction, Prisma } from "@prisma/client";
import { env } from "../env.js";
import { prisma } from "../prisma.js";

export async function writeAuditLog(input: {
  tenantId?: string | null;
  actorId?: string | null;
  action: AuditAction;
  targetType: string;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId ?? null,
      actorId: input.actorId || env.ADMIN_ACTOR_ID,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      metadata: input.metadata
    }
  });
}
