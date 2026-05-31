import type { FastifyInstance } from "fastify";
import { env } from "../env.js";
import { prisma } from "../prisma.js";
import { getNotificationQueue } from "../services/queue.js";
import { getReceiptQueue } from "../services/receiptQueue.js";
import { sanitizeError } from "../services/errors.js";
import { getPackageMetadata } from "../version.js";

type ComponentHealth = {
  status: "ok" | "disabled" | "error";
  error?: string;
  details?: Record<string, unknown>;
};

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (_request, reply) => {
    const [postgres, redisAndQueue] = await Promise.all([
      withTimeout(checkPostgres(), 5000, "Postgres healthcheck timed out").catch((error) => ({
        status: "error" as const,
        error: sanitizeError(error)
      })),
      withTimeout(checkRedisAndQueue(), 5000, "Redis healthcheck timed out").catch((error) => ({
        redis: {
          status: "error" as const,
          error: sanitizeError(error)
        },
        queue: {
          status: "error" as const,
          error: sanitizeError(error)
        }
      }))
    ]);
    const status = resolveOverallStatus(postgres, redisAndQueue.redis, redisAndQueue.queue);
    const packageMetadata = getPackageMetadata();

    return reply.code(status === "error" ? 503 : 200).send({
      status,
      timestamp: new Date().toISOString(),
      app: {
        name: packageMetadata.name,
        version: packageMetadata.version
      },
      pushProvider: env.PUSH_PROVIDER,
      postgres,
      redis: redisAndQueue.redis,
      queue: redisAndQueue.queue
    });
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function checkPostgres(): Promise<ComponentHealth> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  } catch (error) {
    return {
      status: "error",
      error: sanitizeError(error)
    };
  }
}

async function checkRedisAndQueue(): Promise<{ redis: ComponentHealth; queue: ComponentHealth }> {
  if (!env.REDIS_URL) {
    return {
      redis: {
        status: "disabled",
        details: { reason: "REDIS_URL is not configured" }
      },
      queue: {
        status: "disabled",
        details: { execution: "inline" }
      }
    };
  }

  try {
    const queue = getNotificationQueue();

    if (!queue) {
      return {
        redis: {
          status: "error",
          error: "Queue is unavailable"
        },
        queue: {
          status: "error",
          error: "Queue is unavailable"
        }
      };
    }

    const receiptQueue = getReceiptQueue();
    await queue.waitUntilReady();
    await receiptQueue?.waitUntilReady();
    const [counts, receiptCounts] = await Promise.all([
      queue.getJobCounts("waiting", "active", "delayed", "completed", "failed"),
      receiptQueue?.getJobCounts("waiting", "active", "delayed", "completed", "failed")
    ]);

    return {
      redis: {
        status: "ok"
      },
      queue: {
        status: "ok",
        details: {
          queues: [
            {
              name: queue.name,
              counts
            },
            {
              name: receiptQueue?.name,
              counts: receiptCounts
            }
          ]
        }
      }
    };
  } catch (error) {
    return {
      redis: {
        status: "error",
        error: sanitizeError(error)
      },
      queue: {
        status: "error",
        error: sanitizeError(error)
      }
    };
  }
}

function resolveOverallStatus(...components: ComponentHealth[]) {
  if (components.some((component) => component.status === "error")) {
    return "error";
  }

  if (components.some((component) => component.status === "disabled")) {
    return "degraded";
  }

  return "ok";
}
