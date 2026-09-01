import { loadEnv } from "@switchboard/shared";

/**
 * Plaid stub — used for tenants linking a bank account directly rather
 * than a card (payment_methods.provider = 'plaid'). Full
 * Link-token + exchange-token flow intentionally left out of this
 * scaffold; wire in `plaid` npm package here when a tenant flow needs it.
 */
export function getPlaidConfig() {
  const env = loadEnv();
  if (!env.PLAID_CLIENT_ID || !env.PLAID_SECRET) {
    throw new Error("Plaid not configured — set PLAID_CLIENT_ID and PLAID_SECRET");
  }
  return {
    clientId: env.PLAID_CLIENT_ID,
    secret: env.PLAID_SECRET,
    env: env.PLAID_ENV,
  };
}
