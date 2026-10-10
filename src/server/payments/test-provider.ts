import "server-only";
import { getStripe } from "./stripe";

/**
 * Test-only payment page for automated end-to-end tests. It never talks to Stripe: the "payment" is a
 * Stripe-format event signed with the configured webhook secret and delivered to the real webhook,
 * so confirmation runs through exactly the same verified path as production.
 *
 * Enabled only with APP_ENV=test and TEST_PAYMENTS=1. env() refuses to start production with the flag set.
 */
export function testPaymentsEnabled(): boolean {
  return process.env.APP_ENV === "test" && process.env.TEST_PAYMENTS === "1";
}

export function testCheckoutUrl(orderId: string, accessToken: string): string {
  return `/buchung/testzahlung?o=${encodeURIComponent(orderId)}&t=${encodeURIComponent(accessToken)}`;
}

/** Deliver a signed checkout event for the order to our own webhook endpoint. */
export async function deliverTestPaymentEvent(
  order: { id: string; number: string; totalCents: number; currency: string },
  outcome: "paid" | "expired",
  appUrl: string,
): Promise<number> {
  if (!testPaymentsEnabled()) throw new Error("Test payments are disabled");
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) throw new Error("Webhook secret missing");
  const stamp = Date.now().toString(36);
  const event = {
    id: `evt_test_e2e_${order.id}_${stamp}`,
    object: "event",
    type: outcome === "paid" ? "checkout.session.completed" : "checkout.session.expired",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: {
      object: {
        id: `cs_test_e2e_${order.id}`,
        object: "checkout.session",
        client_reference_id: order.id,
        metadata: { orderId: order.id, orderNumber: order.number },
        amount_total: order.totalCents,
        currency: order.currency.toLowerCase(),
        payment_status: outcome === "paid" ? "paid" : "unpaid",
        status: outcome === "paid" ? "complete" : "expired",
      },
    },
  };
  const payload = JSON.stringify(event);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  const res = await fetch(`${appUrl}/api/webhooks/stripe`, { method: "POST", headers: { "content-type": "application/json", "stripe-signature": header }, body: payload });
  return res.status;
}
