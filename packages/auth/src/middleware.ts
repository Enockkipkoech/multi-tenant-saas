import type { NextFunction, Request, Response } from "express";
import { verifyJwt } from "./jwt.js";
import {
  isPlatformClaims,
  runWithTenantContext,
  type Role,
} from "@switchboard/shared";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      claims?: import("@switchboard/shared").JwtClaims;
    }
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

/**
 * Tenant-facing auth (README §5). Requires a tenant_id claim — platform
 * admin tokens are rejected here, they use requirePlatformAdmin instead.
 * On success, sets AsyncLocalStorage tenant context for the rest of the
 * request so packages/db can scope RLS without threading tenantId manually.
 */
export function authenticateTenant() {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = extractBearerToken(req);
    if (!token) return res.status(401).json({ error: "missing bearer token" });

    let claims;
    try {
      claims = verifyJwt(token);
    } catch {
      return res.status(401).json({ error: "invalid or expired token" });
    }

    if (isPlatformClaims(claims)) {
      return res.status(403).json({ error: "platform admins must use the /admin route" });
    }

    req.claims = claims;
    runWithTenantContext(
      {
        tenantId: claims.tenant_id,
        userId: claims.sub,
        role: claims.role,
        isPlatformAdmin: false,
      },
      next
    );
  };
}

/** Role check — run after authenticateTenant(). Enforcement layer 1 of 2 (app-level); RLS is layer 2. */
export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const claims = req.claims;
    if (!claims || isPlatformClaims(claims)) {
      return res.status(403).json({ error: "forbidden" });
    }
    if (!allowed.includes(claims.role)) {
      return res.status(403).json({ error: `requires one of: ${allowed.join(", ")}` });
    }
    next();
  };
}

/**
 * Platform-admin auth (README §5 admin subsection). Requires a
 * platform_role claim and no ambient tenant_id — the admin selects a
 * tenant explicitly per action via req.body.tenantId / req.params.tenantId,
 * handled in the route, not here, and every selection is written to
 * audit_log by the route handler.
 */
export function requirePlatformAdmin() {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = extractBearerToken(req);
    if (!token) return res.status(401).json({ error: "missing bearer token" });

    let claims;
    try {
      claims = verifyJwt(token);
    } catch {
      return res.status(401).json({ error: "invalid or expired token" });
    }

    if (!isPlatformClaims(claims)) {
      return res.status(403).json({ error: "tenant users cannot access /admin" });
    }

    req.claims = claims;
    runWithTenantContext(
      { tenantId: null, userId: claims.sub, role: claims.platform_role, isPlatformAdmin: true },
      next
    );
  };
}
