import "dotenv/config";
import { Worker } from "bullmq";
import { env } from "../env.js";
import { prisma } from "../prisma.js";
import { sanitizeError } from "../services/errors.js";
import {
  closeNotificationQueue,
  getRedisConnectionOptions,
  NOTIFICATION_QUEUE_NAME,
  type CampaignSendJob
} from "../services/queue.js";
import { sendCampaignNow } from "../services/campaignSender.js";
import {
  closeReceiptQueue,
  RECEIPT_QUEUE_NAME,
  type ReceiptCheckJob
} from "../services/receiptQueue.js";
import { processExpoReceipts } from "../services/receiptProcessor.js";

if (!env.REDIS_URL) {
  throw new Error("REDIS_URL is required to run the notification worker");
}

console.log(`PushNot worker starting with provider=${env.PUSH_PROVIDER}`);

const worker = new Worker<CampaignSendJob>(
  NOTIFICATION_QUEUE_NAME,
  async (job) => sendCampaignNow(job.data),
  { connection: getRedisConnectionOptions(env.REDIS_URL) }
);

const receiptWorker = new Worker<ReceiptCheckJob>(
  RECEIPT_QUEUE_NAME,
  async (job) => processExpoReceipts(job.data),
  { connection: getRedisConnectionOptions(env.REDIS_URL) }
);

worker.on("completed", (job) => {
  console.log(`Notification job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Notification job ${job?.id} failed: ${sanitizeError(error)}`);
});

receiptWorker.on("completed", (job) => {
  console.log(`Receipt job ${job.id} completed`);
});

receiptWorker.on("failed", (job, error) => {
  console.error(`Receipt job ${job?.id} failed: ${sanitizeError(error)}`);
});

const shutdown = async (signal: string) => {
  console.log(`PushNot worker stopping after ${signal}`);

  await Promise.allSettled([
    worker.close(),
    receiptWorker.close(),
    closeNotificationQueue(),
    closeReceiptQueue(),
    prisma.$disconnect()
  ]);

  console.log("PushNot worker stopped");
  process.exit(0);
};

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
