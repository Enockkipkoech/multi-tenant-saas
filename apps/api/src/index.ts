import express from "express";
import { loadEnv } from "@multitenant-saas/shared";
import { tenantRouter } from "./routes/tenants.js";
import { adminRouter } from "./routes/admin.js";
import { twilioIngestRouter } from "./ingest/twilio.js";
import { stripeIngestRouter } from "./ingest/stripe.js";

const env = loadEnv();
const app = express();

// Ingest routes need the *raw* body for signature verification, so they're mounted before the global express.json() parser.
app.use("/webhooks", twilioIngestRouter);
app.use("/webhooks", stripeIngestRouter);

app.use(express.json());

app.get("/", (_req, res) => res.status(200).json({ status: "[ROOT-ROUTE].Success! Multi-tenant SaaS API is running.", Description: "Hyper Assesment API for 200+ Workspaces multi-tenant. This is the public-facing API surface for tenants and platform admins. All tenant routes are RLS-scoped to the authenticated tenant", Developer: "[Developed by Enock Kipkoech]" }));

app.get("/healthz", (_req, res) => res.status(200).json({ status: "[HEALTH-CHECK].Success. Multi-tenant SaaS API is running.", Description: "Hyper Assesment API for 200+ Workspaces multi-tenant. This is the public-facing API surface for tenants and platform admins. All tenant routes are RLS-scoped to the authenticated tenant", Developer: "[Developed by Enock Kipkoech]" }));


// Tenant-facing API surface — every route here goes through authenticateTenant().
app.use("/tenants", tenantRouter);

// Platform-admin surface — separate route, separate auth, audited
app.use("/admin", adminRouter);

app.listen(env.PORT, () => {
  console.log(`api listening on :${env.PORT}`);
});


