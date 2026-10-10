import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db/client";
import { findOrderForGuest } from "@/server/booking/checkout";
import { ticketQrSvg } from "@/server/tickets/qr";
import { COMPANY } from "@/content/company";
import { formatEur } from "@/lib/money";
import { retryPaymentAction } from "../actions";
import "@/styles/booking.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ihre Buchung", robots: { index: false, follow: false }, referrer: "no-referrer" };

const tz = "Europe/Berlin";
const dateFmt = new Intl.DateTimeFormat("de-DE", { timeZone: tz, weekday: "long", day: "2-digit", month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("de-DE", { timeZone: tz, hour: "2-digit", minute: "2-digit" });

export default async function BookingStatusPage({ searchParams }: { searchParams: Promise<{ o?: string; t?: string; zahlung?: string }> }) {
  const { o = "", t = "", zahlung } = await searchParams;
  const order = await findOrderForGuest(db, o.slice(0, 64), t.slice(0, 200));
  const tel = COMPANY.phone.replace(/\s/g, "");

  if (!order) {
    return (
      <section className="sec shell bk-status">
        <h1>Buchung nicht gefunden</h1>
        <p>Der Link ist unvollständig oder ungültig. Bitte nutzen Sie den Link aus Ihrer E-Mail oder rufen Sie uns an: <a href={`tel:${tel}`}>{COMPANY.phoneDisplay}</a>.</p>
      </section>
    );
  }
  const booking = order.bookings[0]!;
  const trip = booking.departure.trip;
  const pending = order.status === "PENDING_PAYMENT";
  const paid = order.status === "PAID" || order.status === "PARTIALLY_REFUNDED";
  const tickets = paid
    ? await Promise.all(booking.passengers.filter((p) => p.ticket).map(async (p) => ({ p, svg: await ticketQrSvg(p.ticket!.qrTokenId) })))
    : [];

  return (
    <>
      {pending && zahlung === "ok" ? <meta httpEquiv="refresh" content="4" /> : null}
      <section className="sec shell bk-status">
        {paid ? (
          <>
            <p className="mono-label" style={{ color: "var(--brand-deep)" }}>
              Bestätigt
            </p>
            <h1>Ihre Buchung ist bestätigt.</h1>
            <p>
              Buchungsnummer <strong className="tabular">{booking.number}</strong> · Zahlung über {formatEur(order.totalCents)} erhalten. Die Bestätigung
              geht an {order.email}.
            </p>
          </>
        ) : pending ? (
          zahlung === "abgebrochen" ? (
            <>
              <h1>Zahlung abgebrochen.</h1>
              <p>
                Ihre Plätze sind noch bis {order.expiresAt ? timeFmt.format(order.expiresAt) : "–"} Uhr reserviert. Sie können die Zahlung jetzt fortsetzen.
              </p>
              <form action={retryPaymentAction}>
                <input type="hidden" name="o" value={order.id} />
                <input type="hidden" name="t" value={t} />
                <button className="btn btn--brand btn--lg btn--arrow" type="submit">
                  Erneut bezahlen
                </button>
              </form>
            </>
          ) : (
            <>
              <h1>Zahlung wird bestätigt …</h1>
              <p>Wir warten auf die Bestätigung des Zahlungsanbieters. Das dauert meist nur wenige Sekunden; die Seite aktualisiert sich selbst.</p>
            </>
          )
        ) : (
          <>
            <h1>Reservierung abgelaufen.</h1>
            <p>Die Zahlung wurde nicht abgeschlossen, die Plätze sind wieder freigegeben. Es wurde nichts abgebucht.</p>
            <Link className="btn btn--brand" href={(trip.productType === "TRANSPORT_ONLY" ? `/wochenendtrips/${trip.slug}` : `/reisen/${trip.slug}`) as never}>
              Zur Reise
            </Link>
          </>
        )}

        <div className="bk-status__grid">
          <dl className="facts">
            <div>
              <dt>Reise</dt>
              <dd>{trip.title}</dd>
            </div>
            <div>
              <dt>Termin</dt>
              <dd>{dateFmt.format(booking.departure.departAt)}</dd>
            </div>
            <div>
              <dt>Tarif</dt>
              <dd>{booking.fare.name}</dd>
            </div>
            <div>
              <dt>Zustieg</dt>
              <dd>
                {booking.passengers[0]?.boardingStop.stop.name} · {booking.passengers[0] ? timeFmt.format(booking.passengers[0].boardingStop.plannedAt) : ""} Uhr
              </dd>
            </div>
            <div>
              <dt>Bestellung</dt>
              <dd className="tabular">{order.number}</dd>
            </div>
            <div>
              <dt>Gesamt</dt>
              <dd className="tabular">{formatEur(order.totalCents)}</dd>
            </div>
          </dl>
        </div>

        {tickets.length ? (
          <div className="tickets">
            <h2>Ihre Tickets</h2>
            {tickets.map(({ p, svg }) => (
              <article key={p.id} className="ticket">
                <div className="ticket__qr" dangerouslySetInnerHTML={{ __html: svg }} aria-label={`QR-Code Ticket ${p.ticket!.number}`} role="img" />
                <div>
                  <span className="mono-label">Ticket {p.ticket!.number}</span>
                  <strong>
                    {p.firstName} {p.lastName}
                  </strong>
                  <span>
                    {trip.title} · {dateFmt.format(booking.departure.departAt)}
                  </span>
                  <span>
                    Zustieg {p.boardingStop.stop.name}, {timeFmt.format(p.boardingStop.plannedAt)} Uhr{p.boardingStop.platform ? `, ${p.boardingStop.platform}` : ""}
                  </span>
                </div>
              </article>
            ))}
            <p className="hint">Zeigen Sie den QR-Code beim Einsteigen vor – auf dem Handy oder ausgedruckt.</p>
          </div>
        ) : null}
      </section>
    </>
  );
}
