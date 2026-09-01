import { Router } from "express";
import { requirePlatformAdmin } from "@switchboard/auth";
import { adminPrisma, getTenantPrisma } from "@switchboard/db";
import { getTenantContext } from "@switchboard/shared";

export const adminRouter: Router = Router();

adminRouter.use(requirePlatformAdmin());

/**
 * GET /tenants/:tenantId/summary
 *
 * Returns a summary of the tenant's information, including id, name, slug, and custom domain.
 * This route is protected and requires platform admin privileges.
 */
adminRouter.get("/tenants/:tenantId/summary", async (req, res) => {
  const ctx = getTenantContext(); // isPlatformAdmin = true, tenantId = null
  const { tenantId } = req.params;

  const db = getTenantPrisma(tenantId);
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, slug: true, customDomain: true },
  });

  await adminPrisma.auditLog.create({
    data: {
      adminId: ctx.userId,
      tenantId,
      action: "view_tenant_summary",
      context: { path: req.path },
    },
  });

  if (!tenant) return res.status(404).json({ error: "tenant not found" });
  res.json({ tenant });
});
