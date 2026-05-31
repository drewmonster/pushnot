import { Queue, type ConnectionOptions } from "bullmq";
import { env } from "../env.js";
import { sendCampaignNow } from "./campaignSender.js";

export const NOTIFICATION_QUEUE_NAME = "notification-send";

export type CampaignSendJob = {
  tenantId: string;
  campaignId: string;
  actorId: string;
  mode: "test" | "campaign";
  targetDeviceId?: string;
  pushToken?: string;
};

let queue: Queue<CampaignSendJob, unknown, string> | null = null;

export function getNotificationQueue() {
  if (!env.REDIS_URL) {
    return null;
  }

  if (!queue) {
    queue = new Queue<CampaignSendJob, unknown, string>(NOTIFICATION_QUEUE_NAME, {
      connection: getRedisConnectionOptions(env.REDIS_URL)
    });
  }

  return queue;
}

export function getRedisConnectionOptions(redisUrl: string): ConnectionOptions {
  const parsed = new URL(redisUrl);
  const db = parsed.pathname.length > 1 ? Number.parseInt(parsed.pathname.slice(1), 10) : undefined;

  return {
    host: parsed.hostname,
    port: parsed.port ? Number.parseInt(parsed.port, 10) : 6379,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: Number.isNaN(db) ? undefined : db,
    tls: parsed.protocol === "rediss:" ? {} : undefined,
    connectTimeout: 5000,
    maxRetriesPerRequest: null
  };
}

export async function dispatchCampaignSend(job: CampaignSendJob) {
  const notificationQueue = getNotificationQueue();

  if (!notificationQueue) {
    return sendCampaignNow(job);
  }

  const queued = await notificationQueue.add("send-campaign", job, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 100
  });

  return {
    queued: true,
    jobId: queued.id,
    campaignId: job.campaignId
  };
}

export async function closeNotificationQueue() {
  if (queue) {
    await queue.close();
    queue = null;
  }
}
