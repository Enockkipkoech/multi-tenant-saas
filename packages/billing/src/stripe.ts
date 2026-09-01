import Stripe from "stripe";
import { loadEnv } from "@multitenant-saas/shared";

let stripeClient: Stripe | undefined;

export function getStripeClient(): Stripe {
  if (stripeClient) return stripeClient;
  const env = loadEnv();
  stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
  return stripeClient;
}

/**
 * Verifies the Stripe-Signature header against the raw request body.
 * Must be called with the *raw* (unparsed) body — see apps/api ingest
 * route, which mounts this behind express.raw(), not express.json().
 */
export function verifyStripeSignature(rawBody: Buffer, signatureHeader: string): Stripe.Event {
  const env = loadEnv();
  return getStripeClient().webhooks.constructEvent(
    rawBody,
    signatureHeader,
    env.STRIPE_WEBHOOK_SECRET
  );
}

/**
 * Stripe retries webhook delivery on anything but a 2xx, and can deliver
 * the same event more than once. Idempotency keyed on event.id, checked
 * against webhook_events.external_id before processing —
 * duplicate delivery becomes a no-op, not a double-write.
 */
export function isDuplicateStripeEvent(_eventId: string): Promise<boolean> {
  // Real implementation: SELECT 1 FROM webhook_events WHERE external_id = $1
  // AND source = 'stripe'. Left as a stub here since it depends on which
  // tenant's connection/schema you're querying against — wired up in
  // apps/api/src/ingest/stripe.ts where tenant resolution has already happened.
  throw new Error("not implemented — see apps/api/src/ingest/stripe.ts");
}
