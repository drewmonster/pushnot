import type { FastifyInstance } from "fastify";
import { prisma } from "../prisma.js";

export async function tenantRoutes(app: FastifyInstance) {
  app.get("/tenants", async () => {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: "asc" }
    });

    return { tenants };
  });
}
