import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env.js";

const ADMIN_PATHS = ["/tenants", "/campaigns"];

export async function registerAdminAuth(app: FastifyInstance) {
  app.addHook("onRequest", async (request, reply) => {
    if (!ADMIN_PATHS.some((path) => request.url === path || request.url.startsWith(`${path}/`))) {
      return;
    }

    await requireAdminApiToken(request, reply);
  });
}

async function requireAdminApiToken(request: FastifyRequest, reply: FastifyReply) {
  const authorization = request.headers.authorization;
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
  const headerToken = request.headers["x-admin-token"];
  const token = Array.isArray(headerToken) ? headerToken[0] : headerToken ?? bearerToken;

  if (token !== env.ADMIN_API_TOKEN) {
    return reply.code(401).send({ error: "Unauthorized" });
  }
}
