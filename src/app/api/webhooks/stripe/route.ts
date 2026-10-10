import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { getStripe, processStripeEvent } from "@/server/payments/stripe";

export const dynamic = "force-dynamic";

/** Stripe webhook. Only signed events are accepted; the browser redirect is never proof of payment. */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature ?? "", secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  try {
    const result = await processStripeEvent(db, event);
    return NextResponse.json({ received: true, result });
  } catch {
    // 500 → Stripe retries; the event is stored with its error for review.
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
