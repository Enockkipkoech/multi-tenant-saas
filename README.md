## Multi-Tenant SaaS Backend Architecture

## Design Diagram
See [architecture diagrams](docs/Multi-tenent-saas-compiled-Architecture.svg#resource-model) — pooled resource model, ERD, webhook dataflow, and the deployment infrastructure.


## 0. Getting Started

This repo is a pnpm + Turborepo monorepo. `apps/api` and `apps/worker` are the two Railway-deployable services; `packages/*` are shared code between them.

```bash
pnpm install
cp .env.example .env        # fill in Supabase/Twilio/Stripe values
pnpm generate               # prisma generate — required before typecheck/build
pnpm migrate                # prisma migrate deploy
pnpm dev                    # runs api + worker together, via turbo
```

Individual services:
```bash
pnpm --filter @switchboard/api dev
pnpm --filter @switchboard/worker dev
```

Type-check, build, and test the whole workspace:
```bash
pnpm typecheck
pnpm build
pnpm test
```

Deploying to Railway: each of `apps/api` and `apps/worker` has its own `railway.json` + `Dockerfile` — connect the repo, point two Railway services at these two subdirectories (Root Directory setting), and Railway builds each from its own Dockerfile independently.

---

## 1.0 Resource Model: Pooled Multitenant vs Silo Multitenant

See [docs/diagrams](docs/diagrams/Pooled%20Multi%20Tenant%20API%20Architetcture.svg) for a visual representation of the pooled resource model.



## 2.0 Event Flow: Webhook → Queue → Worker 
See [docs/diagrams](docs/diagrams/Webhooks%20+%20Event%20Handling.svg) for a visual representation of the event flow.

## 3.0 Tech stack + rationale

| Layer | Choice | Why |
|---|---|---|
| Control plane API | Node.js / TypeScript / Express, hosted on **Railway** | Fast iteration, zero-ops deploys, matches the JD's stated stack |
| Database | **Supabase Postgres** | Managed Postgres with built-in RLS + Auth; forkable per the JD's ask |
| Event durability | **Postgres-backed queue** (`graphile-worker`) now → **AWS SQS** later | No new infra to stand up a durable buffer today; swaps in behind a `Queue` interface when volume justifies AWS |
| Background workers | **Second Railway service** now → **AWS Fargate** later | Independently scalable replica count on Railway today; same shape as Fargate autoscaling, smaller knobs, no new cloud account required to start |
| Payments | **Stripe** (subscriptions) + **Plaid** (bank-linked payment methods) | Matches JD requirement directly |
| IaC | **Terraform**, split across Railway + Supabase + Stripe now, AWS added in Phase 2 | Versioned, reviewable infra; multi-cloud pieces added only when the AWS bridge is actually built |

**Why Railway *and* (eventually) AWS, not just one:** Railway is the fast-moving control plane (API, auth, dashboard, billing endpoints) — cheap to iterate on, good DX. AWS is where I'd move anything that needs to scale independently of request/response latency once Railway's own scaling headroom is exhausted: the event queue and worker fleet. Building the `Queue`/`Worker` interface now, backed by Postgres and a second Railway service, means that move is a swapped implementation later, not a rewrite — that's the scaling-risk answer baked into the architecture itself.

---

## 4.0 Isolation approach: shared schema + RLS, not schema-per-tenant

| | Shared schema + RLS | Schema-per-tenant |
|---|---|---|
| Migrations at 200+ tenants | One migration, applies everywhere | O(n) — 200+ schemas to migrate, drift risk |
| Connection pooling | Simple — one pool | Hard — pool-per-schema or session-level `SET search_path` juggling |
| Isolation guarantee | Enforced by Postgres RLS at the row level | Enforced by schema boundary (strong, but operationally expensive) |
| Onboarding a new tenant | Insert a row | Provision a new schema + run all migrations against it |
| Blast radius of a bug | A missing `tenant_id` filter *could* leak rows — mitigated by RLS being mandatory, not optional | A bug can't cross schemas as easily, but a bad migration script can wreck all of them at once |

**Pick: shared schema, `tenant_id` column, Postgres RLS enforced at the database layer** (not just app middleware). At 200+ tenants, schema-per-tenant's migration and connection-pooling overhead outweighs its isolation benefit — and RLS gives comparable isolation guarantees without the operational cost, as long as every table's policy is enforced by default (deny-by-default, not allow-by-default).

```sql
alter table call_events enable row level security;

create policy tenant_isolation on call_events
  using (tenant_id = current_setting('app.tenant_id')::uuid);
```

The app sets `app.tenant_id` per request/connection from the verified JWT claim — so even a bug in application code that forgets a `WHERE tenant_id = ...` clause still can't leak another tenant's rows, because Postgres enforces it underneath.

---
## 5.0 Auth, Roles & Permissions,and Billing

- **Auth**: JWT (Supabase Auth or custom), claims include `tenant_id`, `user_id`, `role`.
- **Roles**: `owner`, `admin`, `member` per tenant via `memberships.role` — a user can belong to multiple tenants with different roles in each.
- **Enforcement happens twice**: once in app middleware (role → action permission), once in Postgres (RLS on `tenant_id`). Neither is trusted alone.
- **Billing**: `subscriptions` row per tenant, linked to a Stripe subscription. Stripe webhooks (`invoice.paid`, `customer.subscription.updated`, etc.) land on the same ingest → queue → worker pipeline as Twilio events — billing state changes are just another event type, not a special case. Webhook handlers are idempotent, keyed on Stripe's event ID, since Stripe retries deliveries.
- **Plaid**: used for `payment_methods` where a tenant links a bank account directly rather than a card — same `payment_methods` table, `provider = 'plaid'`.

### Cross-platform admins: a separate, audited path — not an RLS bypass

Tenant users authenticate into exactly one tenant per request, by design. Internal staff (support, ops, billing reconciliation) need to look *across* tenants — a genuinely different access pattern that the tenant path is deliberately built not to serve.
- Platform admins carry a **different JWT** — a `platform_role` claim, no ambient `tenant_id` — and hit a separate `/admin` route, never the tenant-facing API surface.
- No admin gets a blanket cross-tenant connection or a `BYPASSRLS` grant. Every admin action **explicitly selects one tenant to act on** — impersonation, not bypass — which still sets `app.tenant_id` for that request, so RLS stays enforced identically for admins and tenant users. The only thing that differs is *who's allowed to pick which tenant*.
- Every impersonation action writes an `audit_log` row (`admin_id`, `tenant_id`, `action`, `context`, `timestamp`) — this is what actually answers "how would you know if an admin misused cross-tenant access," rather than trusting that they didn't.

---

## 6.0 Scalability & Performance

## 7.0 Deployment, Infrastructure, and CI/CD


## 8.0 Testing -  Bash nd postman tests

```bash
pnpm seed                                    # prints tenant/user/admin IDs
pnpm token:tenant <tenantAId> <userAId>      # → tenantAToken
pnpm token:tenant <tenantBId> <userBId>      # → tenantBToken
pnpm token:admin <adminId>                   # → adminToken
pnpm dev
```

Then, in another terminal, run the tests:

```bash
pnpm test:tenant <tenantAToken>              # runs tests as tenant A user
pnpm test:tenant <tenantBToken>              # runs tests as tenant B user
pnpm test:admin <adminToken>                 # runs tests as platform admin
```


