import assert from "node:assert/strict";
import { campaignBodySchema } from "./campaignSchemas.js";

const baseCampaign = {
  tenantId: "demo-tenant",
  internalName: "demo-rich",
  title: "Payment posted",
  body: "Your statement is ready.",
  deepLink: null,
  segment: undefined,
  scheduledAt: null,
  androidChannelId: "default",
  androidIconKey: "default"
};

const valid = campaignBodySchema.parse({
  ...baseCampaign,
  imageUrl: "https://cdn.example.com/notifications/statement.jpg"
});

assert.equal(valid.imageUrl, "https://cdn.example.com/notifications/statement.jpg");

const nullable = campaignBodySchema.parse({
  ...baseCampaign,
  imageUrl: null
});

assert.equal(nullable.imageUrl, null);

assert.throws(
  () =>
    campaignBodySchema.parse({
      ...baseCampaign,
      imageUrl: "ftp://cdn.example.com/statement.jpg"
    }),
  /Image URL must use http or https/
);

assert.throws(
  () =>
    campaignBodySchema.parse({
      ...baseCampaign,
      imageUrl: `https://example.com/${"a".repeat(2048)}`
    }),
  /String must contain at most 2048/
);
