import { Router, raw } from "express";
import twilio from "twilio";
import { loadEnv } from "@multitenant-saas/shared";
import { getTenantPrisma, isUniqueViolation } from "@multitenant-saas/db";
import { getQueue } from "@multitenant-saas/queue";

export const twilioIngestRouter: Router = Router();

/**
 * POST /twilio/:tenantId
 *
 * Ingests Twilio webhook events for a given tenant. Validates the request signature
 */
twilioIngestRouter.post(
  "/twilio/:tenantId",
  raw({ type: "application/x-www-form-urlencoded" }),
  async (req, res) => {
    const env = loadEnv();
    const { tenantId } = req.params;
    const signature = req.headers["x-twilio-signature"] as string | undefined;
    const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const params = Object.fromEntries(new URLSearchParams(req.body.toString()));

    const valid =
      !!signature &&
      twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, url, params);

    if (!valid) return res.status(401).send("invalid signature");

    const externalId = String(params.CallSid ?? params.MessageSid ?? "");
    if (!externalId) return res.status(400).send("missing CallSid/MessageSid");

    const db = getTenantPrisma(tenantId);

    try {
      const webhookEvent = await db.webhookEvent.create({
        data: {
          tenantId,
          source: "twilio",
          externalId,
          eventType: params.CallSid ? "call" : "sms",
          payload: params,
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
      // P2002 = unique constraint on (source, external_id): Twilio redelivered
      // an event we already have. Ack it so retries stop.
      if (isUniqueViolation(err)) {
        return res.status(200).send("ok (duplicate)");
      }
      console.error("failed to record webhook event", err);
      return res.status(500).send("failed to record event");
    }

    res.status(200).send("ok");
  }
);
