import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import { findOrderForGuest } from "@/server/booking/checkout";
import { testPaymentsEnabled } from "@/server/payments/test-provider";
import { formatEur } from "@/lib/money";
import { completeTestPaymentAction } from "../actions";
import "@/styles/booking.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Testzahlung", robots: { index: false, follow: false } };

/** Exists only in the automated test environment (APP_ENV=test, TEST_PAYMENTS=1). */
export default async function TestPaymentPage({ searchParams }: { searchParams: Promise<{ o?: string; t?: string }> }) {
  if (!testPaymentsEnabled()) notFound();
  const { o = "", t = "" } = await searchParams;
  const order = await findOrderForGuest(db, o, t);
  if (!order) notFound();
  return (
    <section className="shell bk-status">
      <p className="bk__demo">Testumgebung – es fließt kein Geld</p>
      <h1>Testzahlung</h1>
      <p>
        Bestellung <strong className="tabular">{order.number}</strong> über <strong className="tabular">{formatEur(order.totalCents)}</strong>
      </p>
      <form action={completeTestPaymentAction} className="actions">
        <input type="hidden" name="o" value={o} />
        <input type="hidden" name="t" value={t} />
        <button className="btn btn--brand" name="outcome" value="paid">
          Testzahlung erfolgreich
        </button>
        <button className="btn btn--ghost" name="outcome" value="expired">
          Zahlung abbrechen
        </button>
      </form>
    </section>
  );
}
