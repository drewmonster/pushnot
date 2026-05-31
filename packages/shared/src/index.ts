export const CAMPAIGN_STATUSES = ["draft", "scheduled", "sending", "sent", "failed"] as const;
export const CONSENT_STATUSES = ["active", "revoked"] as const;
export const DEVICE_PLATFORMS = ["ios", "android"] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

export type CampaignStats = {
  targetTokens: number;
  sentToProvider: number;
  errors: number;
  opens: number;
};

export const ANDROID_NOTIFICATION_ICON_KEYS = ["default", "sale", "news"] as const;
export type AndroidNotificationIconKey = (typeof ANDROID_NOTIFICATION_ICON_KEYS)[number];
