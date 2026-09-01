import { Router } from "express";
import { authenticateTenant, requireRole } from "@multitenant-saas/auth";
import { getTenantPrisma } from "@multitenant-saas/db";
import { getTenantContext } from "@multitenant-saas/shared";

export const tenantRouter: Router = Router();

tenantRouter.use(authenticateTenant());

// GET /me — returns the current tenant's information, including id, name, slug, custom domain, and branding.
tenantRouter.get("/me", async (_req, res) => {
  const ctx = getTenantContext();
  const db = getTenantPrisma(ctx.tenantId!);

  const tenant = await db.tenant.findUniqueOrThrow({
    where: { id: ctx.tenantId! },
    select: { id: true, name: true, slug: true, customDomain: true, branding: true },
  });

  res.json({ tenant });
});

// Owner/admin only — app-level RBAC is enforcement layer 1; RLS is layer 2.
tenantRouter.patch("/me/branding", requireRole("owner", "admin"), async (req, res) => {
  const ctx = getTenantContext();
  const db = getTenantPrisma(ctx.tenantId!);

  const tenant = await db.tenant.update({
    where: { id: ctx.tenantId! },
    data: { branding: req.body?.branding ?? {} },
    select: { id: true, branding: true },
  });

  res.json({ tenant });
});
