import express from "express";
import { loadEnv } from "@switchboard/shared";
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

app.get("/healthz", (_req, res) => res.status(200).json({ status: "ok" }));

// Tenant-facing API surface — every route here goes through authenticateTenant().
app.use("/tenants", tenantRouter);

// Platform-admin surface — separate route, separate auth, audited (README §5).
app.use("/admin", adminRouter);

app.listen(env.PORT, () => {
  console.log(`api listening on :${env.PORT}`);
});
