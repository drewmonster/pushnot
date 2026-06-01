import { z } from "zod";
import { ANDROID_NOTIFICATION_ICON_KEYS } from "@pushnot/shared";

const MAX_IMAGE_URL_LENGTH = 2048;

const imageUrlSchema = z
  .string()
  .trim()
  .max(MAX_IMAGE_URL_LENGTH)
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "Image URL must use http or https")
  .optional()
  .nullable();

export const segmentSchema = z
  .object({
    platform: z.enum(["ios", "android"]).optional(),
    locale: z.string().min(1).optional(),
    timezone: z.string().min(1).optional()
  })
  .strict()
  .optional();

export const campaignBodySchema = z.object({
  tenantId: z.string().min(1),
  internalName: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  imageUrl: imageUrlSchema,
  deepLink: z.string().min(1).optional().nullable(),
  segment: segmentSchema,
  scheduledAt: z.string().datetime().optional().nullable(),
  androidChannelId: z.string().min(1).optional().nullable(),
  androidIconKey: z.enum(ANDROID_NOTIFICATION_ICON_KEYS).optional().nullable()
});

export const updateCampaignBodySchema = campaignBodySchema.partial().omit({ tenantId: true });
