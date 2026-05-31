import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { validateTenantPublicKey } from "../services/tenantAuth.js";

const notificationOpenedSchema = z.object({
  tenantId: z.string().min(1),
  appPublicKey: z.string().min(1),
  campaignId: z.string().min(1),
  deviceId: z.string().min(1).optional(),
  sendId: z.string().min(1).optional(),
  payload: z.record(z.unknown()).optional()
});

export async function eventRoutes(app: FastifyInstance) {
  app.post("/events/notification-opened", async (request, reply) => {
    const body = notificationOpenedSchema.parse(request.body);
    const isValidTenantApp = await validateTenantPublicKey(body.tenantId, body.appPublicKey);

    if (!isValidTenantApp) {
      return reply.code(401).send({ error: "Invalid tenant app key" });
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: body.campaignId,
        tenantId: body.tenantId
      },
      select: { id: true }
    });

    if (!campaign) {
      return reply.code(404).send({ error: "Campaign not found" });
    }

    const device = body.deviceId
      ? await prisma.device.findUnique({
          where: {
            tenantId_deviceId: {
              tenantId: body.tenantId,
              deviceId: body.deviceId
            }
          }
        })
      : null;

    const send = body.sendId
      ? await prisma.notificationSend.findFirst({
          where: {
            id: body.sendId,
            campaignId: body.campaignId
          },
          select: { id: true }
        })
      : null;

    if (body.sendId && !send) {
      return reply.code(404).send({ error: "Notification send not found" });
    }

    const event = await prisma.notificationEvent.create({
      data: {
        tenantId: body.tenantId,
        campaignId: body.campaignId,
        deviceId: device?.id,
        sendId: send?.id,
        eventType: "opened",
        payload: body.payload as Prisma.InputJsonValue | undefined
      }
    });

    if (send) {
      await prisma.notificationSend.update({
        where: { id: send.id },
        data: { openedAt: new Date() }
      });
    }

    return reply.code(201).send({ event });
  });
}
