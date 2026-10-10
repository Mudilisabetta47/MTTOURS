"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { requestMeta } from "@/server/auth/session";
import { env } from "@/lib/env";
import { CheckoutError, CheckoutInput, expireOrder, findOrderForGuest, startCheckout } from "@/server/booking/checkout";
import { createStripeCheckout, PaymentUnavailableError, stripeConfigured } from "@/server/payments/stripe";

export interface BookingState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function startBookingAction(_prev: BookingState, fd: FormData): Promise<BookingState> {
  if (!stripeConfigured()) return { error: "Die Online-Zahlung ist in dieser Umgebung nicht eingerichtet. Bitte buchen Sie telefonisch." };

  let raw: unknown;
  try {
    raw = JSON.parse(String(fd.get("payload") ?? "{}"));
  } catch {
    return { error: "Die Eingaben konnten nicht gelesen werden." };
  }
  const parsed = CheckoutInput.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] ??= i.message;
    return { error: "Bitte prüfen Sie Ihre Angaben.", fieldErrors };
  }

  const { ipHash } = await requestMeta();
  let started;
  try {
    started = await startCheckout(db, parsed.data, { ipHash });
  } catch (e) {
    if (e instanceof CheckoutError) return { error: e.message };
    throw e;
  }

  let url: string;
  try {
    url = await createStripeCheckout(db, started.orderId, started.accessToken, env().APP_URL);
  } catch (e) {
    // Do not keep seats blocked if the payment page cannot be created.
    await expireOrder(db, started.orderId, "Zahlungsseite konnte nicht erstellt werden");
    if (e instanceof PaymentUnavailableError) return { error: e.message };
    return { error: "Die Zahlungsseite ist gerade nicht erreichbar. Bitte versuchen Sie es in einigen Minuten erneut." };
  }
  redirect(url as never);
}

/** "Erneut bezahlen" after a cancelled payment, while the reservation is still valid. */
export async function retryPaymentAction(fd: FormData): Promise<void> {
  const orderId = String(fd.get("o") ?? "");
  const token = String(fd.get("t") ?? "");
  const order = await findOrderForGuest(db, orderId, token);
  if (!order || order.status !== "PENDING_PAYMENT") redirect(`/buchung/status?o=${encodeURIComponent(orderId)}&t=${encodeURIComponent(token)}` as never);
  const url = await createStripeCheckout(db, order.id, token, env().APP_URL);
  redirect(url as never);
}
