import "server-only";
import Stripe from "stripe";
import type { Db } from "@/server/db/client";
import { audit } from "@/server/audit";
import { confirmPaidOrder, expireOrder } from "@/server/booking/checkout";

let client: Stripe | null | undefined;

/** null when no key is configured – the UI then does not offer online payment. */
export function getStripe(): Stripe | null {
  if (client !== undefined) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  client = key ? new Stripe(key) : null;
  return client;
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export class PaymentUnavailableError extends Error {}

/** Create (or reuse) the hosted Stripe Checkout Session for a pending order. */
export async function createStripeCheckout(db: Db, orderId: string, accessToken: string, appUrl: string): Promise<string> {
  const stripe = getStripe();
  if (!stripe || !stripeConfigured()) throw new PaymentUnavailableError("Online-Zahlung ist nicht eingerichtet.");
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { lines: true, bookings: { include: { departure: { include: { trip: { select: { title: true } } } } } } },
  });
  if (order.status !== "PENDING_PAYMENT" || !order.expiresAt) throw new PaymentUnavailableError("Die Reservierung ist nicht mehr gültig.");
  const booking = order.bookings[0]!;
  const back = `${appUrl}/buchung/status?o=${encodeURIComponent(order.id)}&t=${encodeURIComponent(accessToken)}`;

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: order.email,
      client_reference_id: order.id,
      metadata: { orderId: order.id, orderNumber: order.number },
      payment_intent_data: { metadata: { orderId: order.id, orderNumber: order.number }, description: `${booking.departure.trip.title} · ${order.number}` },
      expires_at: Math.floor(order.expiresAt.getTime() / 1000),
      line_items: order.lines.map((l) => ({
        quantity: l.quantity,
        price_data: { currency: order.currency.toLowerCase(), unit_amount: l.unitPriceCents, product_data: { name: `${l.description} – ${booking.departure.trip.title}` } },
      })),
      success_url: `${back}&zahlung=ok`,
      cancel_url: `${back}&zahlung=abgebrochen`,
      locale: "de",
    },
    { idempotencyKey: `checkout-${order.id}` },
  );
  await db.payment.upsert({
    where: { provider_providerRef: { provider: "STRIPE", providerRef: session.id } },
    create: { orderId: order.id, provider: "STRIPE", providerRef: session.id, amountCents: order.totalCents, status: "PENDING" },
    update: {},
  });
  if (!session.url) throw new PaymentUnavailableError("Stripe hat keine Zahlungsseite geliefert.");
  return session.url;
}

/**
 * Process a verified Stripe event exactly once. The unique (provider, providerEventId) row is the idempotency key.
 */
export async function processStripeEvent(db: Db, event: Stripe.Event): Promise<"processed" | "duplicate" | "ignored"> {
  try {
    await db.paymentEvent.create({ data: { provider: "STRIPE", providerEventId: event.id, type: event.type, payload: event as unknown as object } });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return "duplicate";
    throw e;
  }
  try {
    let handled = true;
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.payment_status !== "paid") break; // async methods confirm later
        const orderId = s.metadata?.orderId ?? s.client_reference_id;
        if (!orderId) throw new Error("Session without orderId");
        const result = await confirmPaidOrder(db, { orderId, provider: "STRIPE", providerRef: s.id, amountCents: s.amount_total ?? -1, currency: s.currency ?? "" });
        if (result === "amount_mismatch") throw new Error("Amount mismatch – manual review required");
        break;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const orderId = s.metadata?.orderId ?? s.client_reference_id;
        if (orderId) await expireOrder(db, orderId, event.type === "checkout.session.expired" ? "Zahlungsseite abgelaufen" : "Zahlung fehlgeschlagen");
        break;
      }
      default:
        handled = false;
    }
    await db.paymentEvent.update({ where: { provider_providerEventId: { provider: "STRIPE", providerEventId: event.id } }, data: { processedAt: new Date() } });
    return handled ? "processed" : "ignored";
  } catch (e) {
    await db.paymentEvent.update({
      where: { provider_providerEventId: { provider: "STRIPE", providerEventId: event.id } },
      data: { error: e instanceof Error ? e.message.slice(0, 500) : "unknown" },
    });
    await audit(db, { actorLabel: "stripe-webhook", action: "payment.event_failed", entityType: "PaymentEvent", entityId: event.id });
    throw e;
  }
}
