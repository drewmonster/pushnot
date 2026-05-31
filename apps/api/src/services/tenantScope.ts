import type { Prisma } from "@prisma/client";

export function campaignListWhere(tenantId: string): Prisma.CampaignWhereInput {
  return { tenantId };
}

export function campaignByIdWhere(tenantId: string, campaignId: string): Prisma.CampaignWhereInput {
  return { id: campaignId, tenantId };
}

export function campaignSendsWhere(
  tenantId: string,
  campaignId: string
): Prisma.NotificationSendWhereInput {
  return {
    campaignId,
    campaign: { tenantId }
  };
}

export function activeDeviceDeliveryWhere(
  tenantId: string,
  extra: Prisma.DeviceWhereInput = {}
): Prisma.DeviceWhereInput {
  return {
    tenantId,
    consentStatus: "active",
    pushStatus: "active",
    unregisteredAt: null,
    ...extra
  };
}
