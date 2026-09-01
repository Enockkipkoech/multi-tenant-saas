import { getTenantPrisma } from "@multitenant-saas/db";
import type { Job, JobHandler } from "@multitenant-saas/queue";

interface TwilioCallPayload {
  CallSid?: string;
  MessageSid?: string;
  From?: string;
  To?: string;
  Body?: string;
  CallStatus?: string;
  MessageStatus?: string;
  CallDuration?: string;
}

/**
 * Process a webhook event from the queue. This is the worker-side handler for
 * the webhook ingestion pipeline. It updates the webhook_event row
 * to "processing" and then dispatches to the appropriate handler for the event
 * source/type. If processing succeeds, the row is updated to "processed";
 */
export const processWebhookEvent: JobHandler = async (job: Job) => {
  const { webhookEventId } = job.payload as { webhookEventId: string };
  const db = getTenantPrisma(job.tenantId);

  const event = await db.webhookEvent.findUnique({ where: { id: webhookEventId } });
  if (!event || event.status !== "pending") return; // already claimed/processed

  await db.webhookEvent.update({
    where: { id: event.id },
    data: { status: "processing" },
  });

  const payload = event.payload as TwilioCallPayload;

  try {
    if (event.source === "twilio" && event.eventType === "call") {
      await db.callEvent.upsert({
        where: { twilioCallSid: payload.CallSid! },
        create: {
          tenantId: job.tenantId,
          webhookEventId: event.id,
          twilioCallSid: payload.CallSid!,
          fromNumber: payload.From,
          toNumber: payload.To,
          durationSec: payload.CallDuration ? Number(payload.CallDuration) : null,
          status: payload.CallStatus,
        },
        // Twilio sends multiple callbacks per call as status advances —
        // upsert keeps the latest without creating duplicate rows.
        update: {
          status: payload.CallStatus,
          durationSec: payload.CallDuration ? Number(payload.CallDuration) : undefined,
        },
      });
    } else if (event.source === "twilio" && event.eventType === "sms") {
      await db.smsEvent.upsert({
        where: { twilioMessageSid: payload.MessageSid! },
        create: {
          tenantId: job.tenantId,
          webhookEventId: event.id,
          twilioMessageSid: payload.MessageSid!,
          fromNumber: payload.From,
          toNumber: payload.To,
          body: payload.Body,
          status: payload.MessageStatus,
        },
        update: { status: payload.MessageStatus },
      });
    } else if (event.source === "stripe") {
      await handleStripeEvent(db, job.tenantId, event.eventType, event.payload);
    }

    await db.webhookEvent.update({
      where: { id: event.id },
      data: { status: "processed", processedAt: new Date() },
    });
  } catch (err) {
    await db.webhookEvent.update({
      where: { id: event.id },
      data: { status: "failed" },
    });
    throw err; // let graphile-worker apply its retry/backoff
  }
};

/**
 * Billing state changes are just another event type. Keyed on
 * Stripe's own IDs so a redelivered event updates in place rather than
 * double-writing.
 */
async function handleStripeEvent(
  db: ReturnType<typeof getTenantPrisma>,
  tenantId: string,
  eventType: string,
  payload: unknown
): Promise<void> {
  const obj = payload as Record<string, any>;

  switch (eventType) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      await db.subscription.upsert({
        where: { stripeSubscriptionId: obj.id },
        create: {
          tenantId,
          stripeCustomerId: obj.customer,
          stripeSubscriptionId: obj.id,
          plan: obj.items?.data?.[0]?.price?.id ?? "unknown",
          status: obj.status,
          currentPeriodEnd: obj.current_period_end
            ? new Date(obj.current_period_end * 1000)
            : null,
        },
        update: {
          status: obj.status,
          currentPeriodEnd: obj.current_period_end
            ? new Date(obj.current_period_end * 1000)
            : null,
        },
      });
      break;
    }
    case "customer.subscription.deleted": {
      await db.subscription.updateMany({
        where: { stripeSubscriptionId: obj.id },
        data: { status: "canceled" },
      });
      break;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const subscription = await db.subscription.findUnique({
        where: { stripeSubscriptionId: obj.subscription },
        select: { id: true },
      });
      if (!subscription) {
        console.warn(`invoice ${obj.id} references unknown subscription`);
        break;
      }
      await db.invoice.upsert({
        where: { stripeInvoiceId: obj.id },
        create: {
          subscriptionId: subscription.id,
          stripeInvoiceId: obj.id,
          amountCents: obj.amount_paid ?? obj.amount_due ?? 0,
          status: obj.status,
        },
        update: { status: obj.status, amountCents: obj.amount_paid ?? obj.amount_due ?? 0 },
      });
      break;
    }
    default:
      console.log(`unhandled stripe event ${eventType} for tenant ${tenantId}`);
  }
}
