-- README §3: shared schema + RLS is the isolation mechanism.
--
-- Two things here that are easy to get wrong and silently lose isolation:
--
-- 1. FORCE ROW LEVEL SECURITY, not just ENABLE. ENABLE alone does not apply
--    policies to the table's OWNER — and the role Prisma migrations run as is
--    typically the owner. Without FORCE, the app role would silently bypass
--    every policy below and isolation would be fiction.
--
-- 2. The application must connect as a NON-SUPERUSER role. Superusers bypass
--    RLS unconditionally, FORCE or not. See the app_user role at the bottom.

-- Tenants: a tenant can only see its own row.
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tenants"
  USING (id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "memberships"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "subscriptions"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Invoices have no tenant_id of their own; scope via their subscription.
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "invoices"
  USING (
    subscription_id IN (
      SELECT id FROM subscriptions
      WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
    )
  );

ALTER TABLE "payment_methods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_methods" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "payment_methods"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE "integrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "integrations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "integrations"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE "webhook_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webhook_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "webhook_events"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE "call_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "call_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "call_events"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE "sms_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sms_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "sms_events"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jobs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "jobs"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- platform_admins / audit_log are intentionally NOT tenant-scoped (README §5).
-- Access is gated at the application layer by requirePlatformAdmin(), and
-- every cross-tenant action writes an audit_log row. Enabling a tenant_id
-- policy here would be wrong: an admin's whole purpose is to act across
-- tenants under audit, not within one.

-- The role the application connects as. Non-superuser, no BYPASSRLS —
-- this is what makes the policies above actually binding.
--   CREATE ROLE app_user LOGIN PASSWORD '...' NOSUPERUSER NOBYPASSRLS;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public
--     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
