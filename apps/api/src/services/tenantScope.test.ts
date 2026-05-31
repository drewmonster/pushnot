import assert from "node:assert/strict";
import {
  activeDeviceDeliveryWhere,
  campaignByIdWhere,
  campaignListWhere,
  campaignSendsWhere
} from "./tenantScope.js";

assert.deepEqual(campaignListWhere("tenant-a"), { tenantId: "tenant-a" });

assert.deepEqual(campaignByIdWhere("tenant-a", "campaign-a"), {
  id: "campaign-a",
  tenantId: "tenant-a"
});

assert.deepEqual(campaignSendsWhere("tenant-a", "campaign-a"), {
  campaignId: "campaign-a",
  campaign: { tenantId: "tenant-a" }
});

assert.deepEqual(activeDeviceDeliveryWhere("tenant-a", { platform: "android" }), {
  tenantId: "tenant-a",
  consentStatus: "active",
  pushStatus: "active",
  unregisteredAt: null,
  platform: "android"
});

console.log("tenant isolation helpers passed");
