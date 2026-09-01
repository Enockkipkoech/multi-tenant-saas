// Seeds two tenants so tenant isolation is actually testable (README §3).
//
// Note the chicken-and-egg this has to solve: with FORCE ROW LEVEL SECURITY
// and a USING-only policy, Postgres reuses USING as the INSERT's WITH CHECK.
// So a row can only be inserted into `tenants` when app.tenant_id already
// equals the id being inserted. We therefore generate the UUID client-side
// and go through getTenantPrisma(id), which sets app.tenant_id before the
// insert. That the seed has to do this is itself evidence RLS is enforced.
import { randomUUID } from "node:crypto";
import { adminPrisma, getTenantPrisma } from "../packages/db/src/index.js";

async function seedTenant({ name, slug, userEmail }) {
  const tenantId = randomUUID();
  const db = getTenantPrisma(tenantId);

  await db.tenant.create({
    data: { id: tenantId, name, slug, branding: { primaryColor: "#0f172a" } },
  });

  // `users` has no RLS policy — it's global, not tenant-owned.
  const user = await adminPrisma.user.upsert({
    where: { email: userEmail },
    create: { id: randomUUID(), email: userEmail },
    update: {},
  });

  await db.membership.create({
    data: { id: randomUUID(), tenantId, userId: user.id, role: "owner" },
  });

  return { tenantId, userId: user.id, name, slug };
}

async function main() {
  const acme = await seedTenant({ name: "Acme Corp", slug: "acme", userEmail: "owner@acme.test" });
  const globex = await seedTenant({ name: "Globex", slug: "globex", userEmail: "owner@globex.test" });

  const admin = await adminPrisma.platformAdmin.upsert({
    where: { email: "ops@switchboard.test" },
    create: { id: randomUUID(), email: "ops@switchboard.test", platformRole: "support" },
    update: {},
  });

  console.log("\nSeeded. Export these for Postman:\n");
  console.log(`TENANT_A_ID=${acme.tenantId}`);
  console.log(`TENANT_A_USER=${acme.userId}`);
  console.log(`TENANT_B_ID=${globex.tenantId}`);
  console.log(`TENANT_B_USER=${globex.userId}`);
  console.log(`ADMIN_ID=${admin.id}`);
  console.log("\nMint tokens:");
  console.log(`  pnpm token:tenant ${acme.tenantId} ${acme.userId}`);
  console.log(`  pnpm token:tenant ${globex.tenantId} ${globex.userId}`);
  console.log(`  pnpm token:admin ${admin.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => adminPrisma.$disconnect());
