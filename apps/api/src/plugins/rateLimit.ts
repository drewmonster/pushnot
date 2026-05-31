import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";

export async function registerRateLimit(app: FastifyInstance) {
  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute"
  });
}
