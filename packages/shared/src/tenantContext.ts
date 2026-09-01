import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-request tenant context, threaded through async calls without passing
 * tenantId explicitly down every function signature. Set once in auth
 * middleware (packages/auth), read anywhere downstream (e.g. packages/db
 * to set the RLS session variable).
 */
export interface TenantContext {
  tenantId: string | null; // null only for a platform-admin session pre-impersonation
  userId: string;
  role: string;
  isPlatformAdmin: boolean;
}

const storage = new AsyncLocalStorage<TenantContext>();

export function runWithTenantContext<T>(ctx: TenantContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getTenantContext(): TenantContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error(
      "No tenant context set — this code path must run inside auth middleware's runWithTenantContext()."
    );
  }
  return ctx;
}

export function tryGetTenantContext(): TenantContext | undefined {
  return storage.getStore();
}
