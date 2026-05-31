import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const tenantId = process.env.DEMO_TENANT_ID ?? "demo-tenant";
const tenantPublicKey = process.env.DEMO_TENANT_PUBLIC_KEY ?? process.env.APP_PUBLIC_KEY ?? "demo-public-key";

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: tenantId },
    update: { name: "Demo Tenant", publicKey: tenantPublicKey },
    create: { id: tenantId, name: "Demo Tenant", publicKey: tenantPublicKey }
  });

  const template = await prisma.notificationTemplate.create({
    data: {
      tenantId: tenant.id,
      title: "Oferta de teste",
      body: "Mensagem demo para validar o fluxo consent-based.",
      deepLink: "pushnot://campaign/demo"
    }
  });

  await prisma.campaign.create({
    data: {
      tenantId: tenant.id,
      templateId: template.id,
      internalName: "demo-campaign",
      title: template.title,
      body: template.body,
      deepLink: template.deepLink,
      status: "draft",
      createdBy: "seed"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
