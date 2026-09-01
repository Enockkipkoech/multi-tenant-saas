import { Router, raw } from "express";
import { verifyStripeSignature } from "@switchboard/billing";
import { getTenantPrisma, isUniqueViolation, type JsonValue } from "@switchboard/db";
import { getQueue } from "@switchboard/queue";

export const stripeIngestRouter: Router = Router();

/**
 * Ingest Stripe webhooks and enqueue them for processing.
 */
stripeIngestRouter.post("/stripe", raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"] as string | undefined;
  if (!signature) return res.status(400).send("missing stripe-signature header");

  let event;
  try {
    event = verifyStripeSignature(req.body as Buffer, signature);
  } catch (err) {
    console.error("stripe signature verification failed", err);
    return res.status(400).send("invalid signature");
  }

  // Tenant resolution: set as customer metadata when the subscription was
  // created by apps/api's billing flow.
  const tenantId = (event.data.object as { metadata?: { tenant_id?: string } })?.metadata
    ?.tenant_id;

  if (!tenantId) {
    console.error("stripe event missing tenant_id metadata", event.id);
    return res.status(200).send("ignored: no tenant_id"); // ack so Stripe stops retrying
  }

  const db = getTenantPrisma(tenantId);

  try {
    const webhookEvent = await db.webhookEvent.create({
      data: {
        tenantId,
        source: "stripe",
        externalId: event.id,
        eventType: event.type,
        payload: event.data.object as unknown as JsonValue,
        status: "pending",
      },
      select: { id: true },
    });

    await getQueue().enqueue(
      "process_webhook_event",
      { webhookEventId: webhookEvent.id },
      tenantId
    );
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(200).send("ok (duplicate)");
    }
    console.error("failed to record webhook event", err);
    return res.status(500).send("failed to record event");
  }

  res.status(200).send("ok");
});
