import { Queue, type ConnectionOptions } from "bullmq";
import { env } from "../env.js";
import { getRedisConnectionOptions } from "./queue.js";
import { processExpoReceipts } from "./receiptProcessor.js";

export const RECEIPT_QUEUE_NAME = "expo-receipt-check";

export type ReceiptCheckJob = {
  sendIds: string[];
};

let queue: Queue<ReceiptCheckJob, unknown, string> | null = null;

export function getReceiptQueue() {
  if (!env.REDIS_URL) {
    return null;
  }

  if (!queue) {
    queue = new Queue<ReceiptCheckJob, unknown, string>(RECEIPT_QUEUE_NAME, {
      connection: getRedisConnectionOptions(env.REDIS_URL) as ConnectionOptions
    });
  }

  return queue;
}

export async function dispatchReceiptCheck(job: ReceiptCheckJob) {
  if (job.sendIds.length === 0) {
    return { queued: false, sendIds: [] };
  }

  const receiptQueue = getReceiptQueue();

  if (!receiptQueue) {
    return processExpoReceipts(job);
  }

  const queued = await receiptQueue.add("check-receipts", job, {
    delay: 60_000,
    attempts: 3,
    backoff: { type: "exponential", delay: 30_000 },
    removeOnComplete: 100,
    removeOnFail: 100
  });

  return {
    queued: true,
    jobId: queued.id,
    sendIds: job.sendIds
  };
}

export async function closeReceiptQueue() {
  if (queue) {
    await queue.close();
    queue = null;
  }
}
