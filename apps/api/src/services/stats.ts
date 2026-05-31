import { prisma } from "../prisma.js";

export async function getCampaignStats(tenantId: string, campaignId: string) {
  const [targetTokens, sentToProvider, errors, opens] = await Promise.all([
    prisma.notificationSend.count({ where: { campaignId, campaign: { tenantId } } }),
    prisma.notificationSend.count({
      where: {
        campaignId,
        campaign: { tenantId },
        status: { in: ["sent_to_provider", "receipt_ok", "receipt_error"] }
      }
    }),
    prisma.notificationSend.count({
      where: {
        campaignId,
        campaign: { tenantId },
        status: { in: ["failed", "receipt_error"] }
      }
    }),
    prisma.notificationEvent.count({ where: { tenantId, campaignId, eventType: "opened" } })
  ]);

  return {
    targetTokens,
    sentToProvider,
    errors,
    opens
  };
}
