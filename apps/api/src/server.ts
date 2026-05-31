import { env } from "./env.js";
import { buildApp } from "./app.js";
import { prisma } from "./prisma.js";

const app = await buildApp();

const close = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", close);
process.on("SIGTERM", close);

await app.listen({
  host: env.API_HOST,
  port: env.API_PORT
});
