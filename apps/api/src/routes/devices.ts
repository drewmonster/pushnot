import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { writeAuditLog } from "../services/audit.js";
import { validateTenantPublicKey } from "../services/tenantAuth.js";

const registerDeviceSchema = z.object({
  tenantId: z.string().min(1),
  appPublicKey: z.string().min(1),
  deviceId: z.string().min(1),
  pushToken: z.string().min(1),
  platform: z.enum(["ios", "android"]),
  appVersion: z.string().min(1),
  locale: z.string().min(1),
  timezone: z.string().min(1),
  consentStatus: z.enum(["active", "revoked"])
});

const unregisterDeviceSchema = z.object({
  tenantId: z.string().min(1),
  appPublicKey: z.string().min(1),
  deviceId: z.string().min(1)
});

export async function deviceRoutes(app: FastifyInstance) {
  app.post("/devices/register", async (request, reply) => {
    const body = registerDeviceSchema.parse(request.body);
    const isValidTenantApp = await validateTenantPublicKey(body.tenantId, body.appPublicKey);

    if (!isValidTenantApp) {
      return reply.code(401).send({ error: "Invalid tenant app key" });
    }

    const device = await prisma.device.upsert({
      where: {
        tenantId_deviceId: {
          tenantId: body.tenantId,
          deviceId: body.deviceId
        }
      },
      update: {
        pushToken: body.pushToken,
        platform: body.platform,
        appVersion: body.appVersion,
        locale: body.locale,
        timezone: body.timezone,
        consentStatus: body.consentStatus,
        pushStatus: body.consentStatus === "active" ? "active" : "inactive",
        invalidatedAt: null,
        unregisteredAt: body.consentStatus === "active" ? null : new Date()
      },
      create: {
        tenantId: body.tenantId,
        deviceId: body.deviceId,
        pushToken: body.pushToken,
        platform: body.platform,
        appVersion: body.appVersion,
        locale: body.locale,
        timezone: body.timezone,
        consentStatus: body.consentStatus,
        pushStatus: body.consentStatus === "active" ? "active" : "inactive",
        unregisteredAt: body.consentStatus === "active" ? null : new Date()
      }
    });

    await writeAuditLog({
      tenantId: body.tenantId,
      actorId: body.deviceId,
      action: "device_registered",
      targetType: "Device",
      targetId: device.id,
      metadata: {
        platform: body.platform,
        appVersion: body.appVersion,
        consentStatus: body.consentStatus
      }
    });

    return reply.code(201).send({ device });
  });

  app.post("/devices/unregister", async (request, reply) => {
    const body = unregisterDeviceSchema.parse(request.body);
    const isValidTenantApp = await validateTenantPublicKey(body.tenantId, body.appPublicKey);

    if (!isValidTenantApp) {
      return reply.code(401).send({ error: "Invalid tenant app key" });
    }

    const device = await prisma.device.update({
      where: {
        tenantId_deviceId: {
          tenantId: body.tenantId,
          deviceId: body.deviceId
        }
      },
      data: {
        consentStatus: "revoked",
        pushStatus: "inactive",
        unregisteredAt: new Date()
      }
    });

    await writeAuditLog({
      tenantId: body.tenantId,
      actorId: body.deviceId,
      action: "device_unregistered",
      targetType: "Device",
      targetId: device.id
    });

    return { device };
  });
}
