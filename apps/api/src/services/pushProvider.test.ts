import assert from "node:assert/strict";
import { toExpoPushMessage, type PushMessage } from "./pushProvider.js";

const baseMessage: PushMessage = {
  sendId: "send-1",
  to: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  title: "Payment posted",
  body: "Your statement is ready.",
  imageUrl: "https://cdn.example.com/notifications/statement.jpg",
  deepLink: "ledgernotify://campaign/demo",
  tenantId: "demo-tenant",
  campaignId: "campaign-1",
  androidChannelId: "default"
};

const payload = toExpoPushMessage(baseMessage);

assert.equal(payload.title, "Payment posted");
assert.equal(payload.body, "Your statement is ready.");
assert.deepEqual(payload.richContent, {
  image: "https://cdn.example.com/notifications/statement.jpg"
});
assert.deepEqual(payload.data, {
  tenantId: "demo-tenant",
  campaignId: "campaign-1",
  sendId: "send-1",
  imageUrl: "https://cdn.example.com/notifications/statement.jpg",
  deepLink: "ledgernotify://campaign/demo"
});
assert.equal(Object.hasOwn(payload, "icon"), false);
assert.equal(Object.hasOwn(payload.data ?? {}, "appName"), false);
assert.equal(Object.hasOwn(payload.data ?? {}, "appIcon"), false);
assert.equal(Object.hasOwn(payload.data ?? {}, "androidIconKey"), false);

const payloadWithoutImage = toExpoPushMessage({
  ...baseMessage,
  imageUrl: null
});

assert.equal(payloadWithoutImage.richContent, undefined);
assert.equal(Object.hasOwn(payloadWithoutImage.data ?? {}, "imageUrl"), true);
