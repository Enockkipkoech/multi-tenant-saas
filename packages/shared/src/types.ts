// Core domain types shared across apps/packages. Mirrors the ERD in README §3.

export type Role = "owner" | "admin" | "member";
export type PlatformRole = "support" | "billing_ops" | "superadmin";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  branding: Record<string, unknown>;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Membership {
  id: string;
  tenantId: string;
  userId: string;
  role: Role;
}

export interface PlatformAdmin {
  id: string;
  email: string;
  platformRole: PlatformRole;
}

/** JWT claims for a tenant-scoped user. */
export interface TenantJwtClaims {
  sub: string; // user id
  tenant_id: string;
  role: Role;
}

/** JWT claims for a platform admin. Deliberately has no tenant_id claim. */
export interface PlatformJwtClaims {
  sub: string; // admin id
  platform_role: PlatformRole;
}

export type JwtClaims = TenantJwtClaims | PlatformJwtClaims;

export function isPlatformClaims(claims: JwtClaims): claims is PlatformJwtClaims {
  return "platform_role" in claims;
}

export interface WebhookEvent {
  id: string;
  tenantId: string;
  source: "twilio" | "stripe";
  externalId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: "pending" | "processing" | "processed" | "failed";
}
