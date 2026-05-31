import cors from "@fastify/cors";
import fastify from "fastify";
import { ZodError } from "zod";
import { env } from "./env.js";
import { campaignRoutes } from "./routes/campaigns.js";
import { deviceRoutes } from "./routes/devices.js";
import { eventRoutes } from "./routes/events.js";
import { healthRoutes } from "./routes/health.js";
import { tenantRoutes } from "./routes/tenants.js";
import { registerRateLimit } from "./plugins/rateLimit.js";
import { registerAdminAuth } from "./plugins/adminAuth.js";

export async function buildApp() {
  const app = fastify({
    logger: true
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "Validation error",
        details: error.flatten()
      });
    }

    if (error.message === "Campaign not found" || error.message.includes("not found")) {
      return reply.code(404).send({ error: error.message });
    }

    if (error.message.includes("No active consented devices")) {
      return reply.code(400).send({ error: error.message });
    }

    if (error.message === "Missing tenant scope") {
      return reply.code(400).send({ error: error.message });
    }

    app.log.error(error);
    return reply.code(500).send({ error: "Internal server error" });
  });

  await app.register(cors, {
    origin: resolveCorsOrigins()
  });
  await registerRateLimit(app);
  await registerAdminAuth(app);

  await app.register(healthRoutes);
  await app.register(tenantRoutes);
  await app.register(deviceRoutes);
  await app.register(campaignRoutes);
  await app.register(eventRoutes);

  return app;
}

function resolveCorsOrigins() {
  if (!env.ADMIN_ORIGIN) {
    return env.NODE_ENV === "production" ? false : true;
  }

  const allowedOrigins = env.ADMIN_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return (origin: string | undefined, callback: (error: Error | null, allowed: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  };
}
