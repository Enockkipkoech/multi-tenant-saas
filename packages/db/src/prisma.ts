import { Prisma, PrismaClient } from "@prisma/client";

/**
 * One base client per process. Prisma pools connections internally; keep
 * `connection_limit` low per replica in DATABASE_URL, since Supavisor
 * multiplexes on top of thisoad-balancing.
 */
const basePrisma = new PrismaClient();

/**
 * Tenant-scoped client. The `tenantId` is set in the Postgres session for RLS policies to enforce isolation. 
 */
export function forTenant(tenantId: string) {
  // The object form of defineExtension, not the callback form, deliberately.
  //

  return Prisma.defineExtension({
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
  });
}

export type TenantPrismaClient = ReturnType<typeof getTenantPrisma>;

export function getTenantPrisma(tenantId: string) {
  return basePrisma.$extends(forTenant(tenantId));
}

/**
 * Unscoped client — no tenant ID is set, so RLS policies will block all reads/writes.is
 */
export const adminPrisma = basePrisma;

export { Prisma };
export type { PrismaClient };

/**
 * Postgres unique-constraint violation (Prisma error code P2002).
 *
 * This is a common error when trying to insert a row with a duplicate value
 * in a column that has a unique constraint.
 */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

/**
 * JSON value accepted by Prisma `Json` columns.
 *
 */
export type JsonValue = Prisma.InputJsonValue;