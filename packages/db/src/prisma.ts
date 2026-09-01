import { Prisma, PrismaClient } from "@prisma/client";

/**
 * Base Prisma client. 
 */
const basePrisma = new PrismaClient();

//
export function forTenant(tenantId: string) {

  return Prisma.defineExtension((_client: PrismaClient) =>
    _client.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            const [, result] = await basePrisma.$transaction([
              basePrisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, TRUE)`,
              query(args),
            ]);
            return result;
          },
        },
      },
    })
  );
}

export type TenantPrismaClient = ReturnType<typeof getTenantPrisma>;

export function getTenantPrisma(tenantId: string) {
  return basePrisma.$extends(forTenant(tenantId));
}

/**
 * Unscoped client — for use in admin tasks (e.g., the worker, or a CLI). The worker
 */
export const adminPrisma = basePrisma;

export { Prisma };
export type { PrismaClient };

/**
 * Detects a unique-constraint violation error from Prisma. 
 */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

/** JSON-compatible value accepted by Prisma Json columns. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
