import { prisma } from "../prisma.js";

export async function validateTenantPublicKey(tenantId: string, publicKey: string) {
  const tenant = await prisma.tenant.findFirst({
    where: {
      id: tenantId,
      publicKey
    },
    select: {
      id: true
    }
  });

  return Boolean(tenant);
}
