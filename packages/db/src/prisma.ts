import { Prisma, PrismaClient } from "@prisma/client";

/**
 * One base client per process. Prisma pools connections internally; keep
 * `connection_limit` low per replica in DATABASE_URL, since Supavisor
 * multiplexes on top of this (README §7 load-balancing section).
 */
const basePrisma = new PrismaClient();

/**
 * Tenant-scoped client. Every operation runs as a two-statement transaction:
 * set_config('app.tenant_id', ..., TRUE) then the query itself. The `TRUE`
 * makes it transaction-local (equivalent to SET LOCAL), so the setting can't
 * leak to the next request that borrows the same pooled connection — which
 * is the failure mode that would silently break isolation under load.
 *
 * The RLS policies in prisma/migrations/0002_rls read that setting, so a
 * handler that forgets `where: { tenantId }` still cannot see another
 * tenant's rows — enforcement lives in Postgres, not in this file (README §3).
 */
export function forTenant(tenantId: string) {
  // Note: this closes over `basePrisma` rather than using the callback's
  // `prisma` argument. The argument is typed as PrismaClientExtends, which
  // does not expose $executeRaw/$transaction — a real type error, not a
  // cosmetic one, and the reason several blog versions of this snippet
  // don't compile as written.
  return Prisma.defineExtension((_client) =>
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
 * Unscoped client — no app.tenant_id set, so every RLS policy evaluates
 * against NULL and returns zero rows for tenant-owned tables. That is the
 * intended behaviour: this client exists ONLY for the two table sets that
 * are deliberately not tenant-scoped (platform_admins, audit_log) per
 * README §3/§5.
 *
 * It is NOT a service-role escape hatch. Reaching for this to query
 * tenant data is the bug this whole module is shaped to prevent — use
 * getTenantPrisma(tenantId) instead, even from the worker and from
 * platform-admin impersonation paths.
 */
export const adminPrisma = basePrisma;

export { Prisma };
export type { PrismaClient };

/**
 * Postgres unique-constraint violation (Prisma error code P2002).
 *
 * Wrapped here rather than importing Prisma.PrismaClientKnownRequestError at
 * every call site: that symbol only exists after `prisma generate`, so
 * depending on it directly makes unrelated packages fail to compile on a
 * fresh checkout before codegen. Ingest routes use this to turn a redelivered
 * webhook into a 200 instead of a 500 (README §6 idempotency).
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
