// Mints test JWTs matching what packages/auth expects.
//
// There is deliberately no /login endpoint in this scaffold — auth issuance
// would come from Supabase Auth or an identity provider in a real build.
// This script stands in for that so the API is testable end to end.
//
//   node scripts/mint-jwt.mjs tenant <tenantId> <userId> [role]
//   node scripts/mint-jwt.mjs admin  <adminId> [platformRole]
import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error("JWT_SECRET not set — run via: pnpm token:tenant / pnpm token:admin");
  process.exit(1);
}

const [kind, ...rest] = process.argv.slice(2);

if (kind === "tenant") {
  const [tenantId, userId, role = "owner"] = rest;
  if (!tenantId || !userId) {
    console.error("usage: mint-jwt.mjs tenant <tenantId> <userId> [owner|admin|member]");
    process.exit(1);
  }
  // Claims must match TenantJwtClaims in packages/shared/src/types.ts
  console.log(jwt.sign({ sub: userId, tenant_id: tenantId, role }, secret, { expiresIn: "7d" }));
} else if (kind === "admin") {
  const [adminId, platformRole = "support"] = rest;
  if (!adminId) {
    console.error("usage: mint-jwt.mjs admin <adminId> [support|billing_ops|superadmin]");
    process.exit(1);
  }
  // PlatformJwtClaims — note: no tenant_id claim. That's the whole point.
  console.log(jwt.sign({ sub: adminId, platform_role: platformRole }, secret, { expiresIn: "7d" }));
} else {
  console.error("usage: mint-jwt.mjs <tenant|admin> ...");
  process.exit(1);
}
