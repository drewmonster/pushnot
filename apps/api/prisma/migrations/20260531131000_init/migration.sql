-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('ios', 'android');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('active', 'revoked');

-- CreateEnum
CREATE TYPE "DevicePushStatus" AS ENUM ('active', 'inactive', 'invalid');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "NotificationSendStatus" AS ENUM ('queued', 'sent_to_provider', 'receipt_ok', 'receipt_error', 'failed');

-- CreateEnum
CREATE TYPE "NotificationEventType" AS ENUM ('opened');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('campaign_created', 'campaign_updated', 'campaign_test_sent', 'campaign_sent', 'device_registered', 'device_unregistered');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "pushToken" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "appVersion" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "consentStatus" "ConsentStatus" NOT NULL,
    "pushStatus" "DevicePushStatus" NOT NULL DEFAULT 'active',
    "invalidatedAt" TIMESTAMP(3),
    "unregisteredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "deepLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT,
    "internalName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "deepLink" TEXT,
    "segment" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "androidChannelId" TEXT,
    "androidIconKey" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "createdBy" TEXT NOT NULL,
    "sentBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSend" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "deviceId" TEXT,
    "pushToken" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'expo',
    "providerTicketId" TEXT,
    "receiptCheckedAt" TIMESTAMP(3),
    "status" "NotificationSendStatus" NOT NULL DEFAULT 'queued',
    "errorMessage" TEXT,
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "deviceId" TEXT,
    "sendId" TEXT,
    "eventType" "NotificationEventType" NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "actorId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_publicKey_key" ON "Tenant"("publicKey");

-- CreateIndex
CREATE INDEX "Device_tenantId_consentStatus_idx" ON "Device"("tenantId", "consentStatus");

-- CreateIndex
CREATE INDEX "Device_tenantId_pushStatus_idx" ON "Device"("tenantId", "pushStatus");

-- CreateIndex
CREATE INDEX "Device_pushToken_idx" ON "Device"("pushToken");

-- CreateIndex
CREATE UNIQUE INDEX "Device_tenantId_deviceId_key" ON "Device"("tenantId", "deviceId");

-- CreateIndex
CREATE INDEX "Campaign_tenantId_status_idx" ON "Campaign"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Campaign_scheduledAt_idx" ON "Campaign"("scheduledAt");

-- CreateIndex
CREATE INDEX "NotificationSend_campaignId_status_idx" ON "NotificationSend"("campaignId", "status");

-- CreateIndex
CREATE INDEX "NotificationSend_deviceId_idx" ON "NotificationSend"("deviceId");

-- CreateIndex
CREATE INDEX "NotificationEvent_tenantId_campaignId_eventType_idx" ON "NotificationEvent"("tenantId", "campaignId", "eventType");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_action_idx" ON "AuditLog"("tenantId", "action");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationTemplate" ADD CONSTRAINT "NotificationTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSend" ADD CONSTRAINT "NotificationSend_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSend" ADD CONSTRAINT "NotificationSend_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_sendId_fkey" FOREIGN KEY ("sendId") REFERENCES "NotificationSend"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
