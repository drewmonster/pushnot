import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { ANDROID_NOTIFICATION_ICON_KEYS } from "@pushnot/shared";
import { env } from "../env.js";
import { prisma } from "../prisma.js";
import { writeAuditLog } from "../services/audit.js";
import { dispatchCampaignSend } from "../services/queue.js";
import { getCampaignStats } from "../services/stats.js";
import { campaignByIdWhere, campaignListWhere, campaignSendsWhere } from "../services/tenantScope.js";

const segmentSchema = z
  .object({
    platform: z.enum(["ios", "android"]).optional(),
    locale: z.string().min(1).optional(),
    timezone: z.string().min(1).optional()
  })
  .strict()
  .optional();

const campaignBodySchema = z.object({
  tenantId: z.string().min(1),
  internalName: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  imageUrl: z.string().url().optional().nullable(),
  deepLink: z.string().min(1).optional().nullable(),
  segment: segmentSchema,
  scheduledAt: z.string().datetime().optional().nullable(),
  androidChannelId: z.string().min(1).optional().nullable(),
  androidIconKey: z.enum(ANDROID_NOTIFICATION_ICON_KEYS).optional().nullable()
});

const updateCampaignBodySchema = campaignBodySchema.partial().omit({ tenantId: true });

const paramsSchema = z.object({ id: z.string().min(1) });
const tenantQuerySchema = z.object({ tenantId: z.string().min(1) });

const testSendSchema = z.object({
  targetDeviceId: z.string().min(1).optional(),
  pushToken: z.string().min(1).optional()
});

export async function campaignRoutes(app: FastifyInstance) {
  app.get("/campaigns", async (request) => {
    const { tenantId } = tenantQuerySchema.parse(request.query);
    const campaigns = await prisma.campaign.findMany({
      where: campaignListWhere(tenantId),
      orderBy: { createdAt: "desc" },
      include: {
        sends: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });

    const withStats = await Promise.all(
      campaigns.map(async (campaign) => ({
        ...campaign,
        stats: await getCampaignStats(campaign.tenantId, campaign.id)
      }))
    );

    return { campaigns: withStats };
  });

  app.post("/campaigns", async (request, reply) => {
    const body = campaignBodySchema.parse(request.body);
    const actorId = getActorId(request);
    const status = body.scheduledAt ? "scheduled" : "draft";

    const campaign = await prisma.$transaction(async (tx) => {
      const template = await tx.notificationTemplate.create({
        data: {
          tenantId: body.tenantId,
          title: body.title,
          body: body.body,
          imageUrl: body.imageUrl,
          deepLink: body.deepLink
        }
      });

      return tx.campaign.create({
        data: {
          tenantId: body.tenantId,
          templateId: template.id,
          internalName: body.internalName,
          title: body.title,
          body: body.body,
          imageUrl: body.imageUrl,
          deepLink: body.deepLink,
          segment: body.segment ?? undefined,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
          androidChannelId: body.androidChannelId,
          androidIconKey: body.androidIconKey,
          status,
          createdBy: actorId
        }
      });
    });

    await writeAuditLog({
      tenantId: body.tenantId,
      actorId,
      action: "campaign_created",
      targetType: "Campaign",
      targetId: campaign.id,
      metadata: { internalName: body.internalName }
    });

    return reply.code(201).send({ campaign });
  });

  app.put("/campaigns/:id", async (request) => {
    const { id } = paramsSchema.parse(request.params);
    const body = updateCampaignBodySchema.parse(request.body);
    const actorId = getActorId(request);
    const tenantId = getTenantScope(request);
    await prisma.campaign.findFirstOrThrow({ where: campaignByIdWhere(tenantId, id) });

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        internalName: body.internalName,
        title: body.title,
        body: body.body,
        imageUrl: body.imageUrl,
        deepLink: body.deepLink,
        segment: body.segment ?? undefined,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        androidChannelId: body.androidChannelId,
        androidIconKey: body.androidIconKey,
        status: body.scheduledAt ? "scheduled" : undefined
      }
    });

    await writeAuditLog({
      tenantId: campaign.tenantId,
      actorId,
      action: "campaign_updated",
      targetType: "Campaign",
      targetId: campaign.id
    });

    return { campaign };
  });

  app.post("/campaigns/:id/test-send", async (request) => {
    const { id } = paramsSchema.parse(request.params);
    const body = testSendSchema.parse(request.body ?? {});
    const actorId = getActorId(request);
    const tenantId = getTenantScope(request);

    const result = await dispatchCampaignSend({
      tenantId,
      campaignId: id,
      actorId,
      mode: "test",
      targetDeviceId: body.targetDeviceId,
      pushToken: body.pushToken
    });

    const campaign = await prisma.campaign.findFirstOrThrow({ where: campaignByIdWhere(tenantId, id) });
    await writeAuditLog({
      tenantId: campaign.tenantId,
      actorId,
      action: "campaign_test_sent",
      targetType: "Campaign",
      targetId: id
    });

    return { result };
  });

  app.post("/campaigns/:id/send", async (request) => {
    const { id } = paramsSchema.parse(request.params);
    const actorId = getActorId(request);
    const tenantId = getTenantScope(request);

    const result = await dispatchCampaignSend({
      tenantId,
      campaignId: id,
      actorId,
      mode: "campaign"
    });

    const campaign = await prisma.campaign.findFirstOrThrow({ where: campaignByIdWhere(tenantId, id) });
    await writeAuditLog({
      tenantId: campaign.tenantId,
      actorId,
      action: "campaign_sent",
      targetType: "Campaign",
      targetId: id
    });

    return { result };
  });

  app.get("/campaigns/:id/stats", async (request) => {
    const { id } = paramsSchema.parse(request.params);
    const tenantId = getTenantScope(request);
    await prisma.campaign.findFirstOrThrow({ where: campaignByIdWhere(tenantId, id) });
    return { stats: await getCampaignStats(tenantId, id) };
  });

  app.get("/campaigns/:id/sends", async (request) => {
    const { id } = paramsSchema.parse(request.params);
    const tenantId = getTenantScope(request);
    await prisma.campaign.findFirstOrThrow({ where: campaignByIdWhere(tenantId, id) });
    const sends = await prisma.notificationSend.findMany({
      where: campaignSendsWhere(tenantId, id),
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return { sends };
  });
}

function getTenantScope(request: FastifyRequest) {
  const header = request.headers["x-tenant-id"];
  const value = Array.isArray(header) ? header[0] : header;

  if (!value) {
    throw new Error("Missing tenant scope");
  }

  return value;
}

function getActorId(request: FastifyRequest) {
  const header = request.headers["x-actor-id"];

  if (Array.isArray(header)) {
    return header[0] ?? env.ADMIN_ACTOR_ID;
  }

  return header || env.ADMIN_ACTOR_ID;
}
