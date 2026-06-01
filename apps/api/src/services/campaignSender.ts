import type { Campaign, Device } from "@prisma/client";
import { env } from "../env.js";
import { prisma } from "../prisma.js";
import { pushProvider, type PushSendResult } from "./pushProvider.js";
import { buildDeviceSegmentWhere } from "./segment.js";
import { sanitizeError } from "./errors.js";
import { dispatchReceiptCheck } from "./receiptQueue.js";
import { activeDeviceDeliveryWhere, campaignByIdWhere } from "./tenantScope.js";

type SendMode = "test" | "campaign";

export async function sendCampaignNow(input: {
  campaignId: string;
  tenantId: string;
  actorId: string;
  mode: SendMode;
  targetDeviceId?: string;
  pushToken?: string;
}) {
  const campaign = await prisma.campaign.findFirst({
    where: {
      ...campaignByIdWhere(input.tenantId, input.campaignId)
    }
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const devices = await resolveTargetDevices(campaign, input);

  if (devices.length === 0 && !input.pushToken) {
    throw new Error("No active consented devices found for campaign");
  }

  if (input.mode === "campaign") {
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "sending", sentBy: input.actorId }
    });
  }

  const sends = await prisma.$transaction([
    ...devices.map((device) =>
      prisma.notificationSend.create({
        data: {
          campaignId: campaign.id,
          deviceId: device.id,
          pushToken: device.pushToken,
          provider: env.PUSH_PROVIDER
        }
      })
    ),
    ...(input.pushToken
      ? [
          prisma.notificationSend.create({
            data: {
              campaignId: campaign.id,
              pushToken: input.pushToken,
              provider: env.PUSH_PROVIDER
            }
          })
        ]
      : [])
  ]);

  const deviceById = new Map(devices.map((device) => [device.id, device]));
  const pushMessages = sends.map((send) => {
      const device = send.deviceId ? deviceById.get(send.deviceId) : undefined;

      return {
        sendId: send.id,
        to: send.pushToken,
        title: campaign.title,
        body: campaign.body,
        imageUrl: campaign.imageUrl,
        deepLink: campaign.deepLink,
        tenantId: campaign.tenantId,
        campaignId: campaign.id,
        androidChannelId: campaign.androidChannelId
      };
    });

  const results: PushSendResult[] = await pushProvider.send(pushMessages).catch((error) =>
    sends.map((send) => ({
      sendId: send.id,
      ok: false,
      errorMessage: sanitizeError(error)
    }))
  );

  await Promise.all(
    results.map((result) =>
      prisma.notificationSend.update({
        where: { id: result.sendId },
        data: {
          status: result.ok ? "sent_to_provider" : "failed",
          receiptCheckedAt: null,
          providerTicketId: result.providerTicketId,
          errorMessage: result.errorMessage ? sanitizeError(result.errorMessage) : undefined
        }
      })
    )
  );

  const errors = results.filter((result) => !result.ok).length;
  const receiptSendIds = results
    .filter((result) => result.ok && result.providerTicketId)
    .map((result) => result.sendId);

  if (receiptSendIds.length > 0) {
    await dispatchReceiptCheck({ sendIds: receiptSendIds });
  }

  if (input.mode === "campaign") {
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: errors > 0 ? "failed" : "sent" }
    });
  }

  return {
    campaignId: campaign.id,
    targeted: sends.length,
    sentToProvider: results.filter((result) => result.ok).length,
    errors
  };
}

async function resolveTargetDevices(
  campaign: Campaign,
  input: { targetDeviceId?: string; pushToken?: string; mode: SendMode }
): Promise<Device[]> {
  if (input.mode === "test") {
    if (input.pushToken && !input.targetDeviceId) {
      return [];
    }

    return prisma.device.findMany({
      where: activeDeviceDeliveryWhere(campaign.tenantId, {
        ...(input.targetDeviceId ? { deviceId: input.targetDeviceId } : {})
      }),
      take: 1
    });
  }

  const segmentWhere = input.mode === "campaign" ? buildDeviceSegmentWhere(campaign.segment) : {};

  return prisma.device.findMany({
    where: activeDeviceDeliveryWhere(campaign.tenantId, {
      ...(input.targetDeviceId ? { deviceId: input.targetDeviceId } : {}),
      ...segmentWhere
    })
  });
}
