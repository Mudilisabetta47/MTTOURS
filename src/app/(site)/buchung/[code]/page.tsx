import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db/client";
import { getBookableDeparture } from "@/server/booking/departure";
import { stripeConfigured } from "@/server/payments/stripe";
import { testPaymentsEnabled } from "@/server/payments/test-provider";
import { COMPANY } from "@/content/company";
import { BookingForm } from "./booking-form";
import "@/styles/booking.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Buchung", robots: { index: false, follow: false } };

const REASON: Record<string, string> = {
  not_found: "Diese Reise gibt es nicht (mehr).",
  not_on_sale: "Für diesen Termin ist keine Online-Buchung möglich.",
  sold_out: "Dieser Termin ist ausgebucht.",
  package_locked: "Diese Pauschalreise ist noch nicht online buchbar. Wir beraten Sie gern telefonisch.",
};

export default async function BookingPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ tarif?: string; zustieg?: string; personen?: string; extras?: string }> }) {
  const { code } = await params;
  const sp = await searchParams;
  const prefill = {
    fare: sp.tarif?.slice(0, 40),
    stop: sp.zustieg?.slice(0, 64),
    pax: Math.min(10, Math.max(1, Number.parseInt(sp.personen ?? "1", 10) || 1)),
    extras: (sp.extras ?? "").split(",").map((x) => x.split(":")[0]!.slice(0, 64)).filter(Boolean).slice(0, 20),
  };
  const state = await getBookableDeparture(db, code.slice(0, 80));
  const tel = COMPANY.phone.replace(/\s/g, "");

  return (
    <>
      <header className="bk-hero">
        <div className="shell">
          <p className="mono-label" style={{ color: "var(--brand)" }}>
            Buchung
          </p>
          <h1>{state.ok ? state.d.trip.title : "Buchung nicht möglich"}</h1>
        </div>
      </header>
      <section className="sec shell" style={{ paddingBlockStart: "2.5rem" }}>
        {state.ok ? (
          <BookingForm
            d={state.d}
            prefill={prefill}
            paymentReady={stripeConfigured() || testPaymentsEnabled()}
            tripPath={state.d.trip.productType === "TRANSPORT_ONLY" ? `/wochenendtrips/${state.d.trip.slug}` : `/reisen/${state.d.trip.slug}`}
          />
        ) : (
          <div className="trips__empty on-dark">
            <div style={{ display: "grid", gap: "0.8rem" }}>
              <h2 style={{ fontSize: "var(--step-3)" }}>{REASON[state.reason]}</h2>
              <p>Rufen Sie uns an oder fordern Sie Termin-Infos auf der Reiseseite an.</p>
            </div>
            <div className="actions">
              {state.tripPath ? (
                <Link className="btn btn--brand" href={state.tripPath as never}>
                  Zur Reise
                </Link>
              ) : null}
              <a className="btn btn--ghost-light" href={`tel:${tel}`}>
                {COMPANY.phoneDisplay}
              </a>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
