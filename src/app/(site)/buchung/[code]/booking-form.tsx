"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import type { BookableDeparture } from "@/server/booking/departure";
import { formatEur } from "@/lib/money";
import { LEGAL_LINKS } from "@/content/company";
import { startBookingAction, type BookingState } from "../actions";
import { quoteAction, type QuoteResult } from "../quote-action";

const tz = "Europe/Berlin";
const dateFmt = new Intl.DateTimeFormat("de-DE", { timeZone: tz, weekday: "long", day: "2-digit", month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("de-DE", { timeZone: tz, hour: "2-digit", minute: "2-digit" });

interface Pax {
  firstName: string;
  lastName: string;
}

export interface BookingPrefill {
  fare?: string;
  stop?: string;
  pax?: number;
  extras?: string[];
}

export function BookingForm({ d, prefill, paymentReady, tripPath }: { d: BookableDeparture; prefill: BookingPrefill; paymentReady: boolean; tripPath: string }) {
  const [state, action, pending] = useActionState<BookingState, FormData>(startBookingAction, {});
  const [fareCode, setFareCode] = useState(
    d.fares.some((f) => f.code === prefill.fare) ? prefill.fare! : (d.fares.find((f) => f.conditions.recommended)?.code ?? d.fares[0]!.code),
  );
  const [stopId, setStopId] = useState(d.stops.some((s) => s.id === prefill.stop) ? prefill.stop! : d.stops[0]!.id);
  const maxPax = Math.min(d.seatsLeft, 10);
  const [pax, setPax] = useState<Pax[]>(() => Array.from({ length: Math.min(Math.max(1, prefill.pax ?? 1), maxPax) }, () => ({ firstName: "", lastName: "" })));
  const [extras, setExtras] = useState<Record<string, boolean>>(() => Object.fromEntries((prefill.extras ?? []).filter((id) => d.options.some((o) => o.id === id)).map((id) => [id, true])));
  const [contact, setContact] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [consents, setConsents] = useState({ terms: false, privacy: false, packageInfo: false });
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const isPackage = d.trip.productType === "PACKAGE_TOUR";
  const fe = state.fieldErrors ?? {};

  const stop = d.stops.find((s) => s.id === stopId)!;
  const options = d.options.filter((o) => extras[o.id]).map((o) => ({ id: o.id, quantity: o.unit === "PER_PERSON" ? pax.length : 1 }));
  const selection = { departureCode: d.code, fareCode, boardingStopId: stopId, passengers: pax.length, options };
  const key = JSON.stringify(selection);

  // The price shown is always the one the server calculated for exactly this selection.
  useEffect(() => {
    let alive = true;
    quoteAction({ ...JSON.parse(key), key }).then(
      (r) => alive && setQuote(r),
      () => alive && setQuote({ ok: false, key, error: "Der Preis konnte gerade nicht berechnet werden.", code: "invalid" }),
    );
    return () => {
      alive = false;
    };
  }, [key]);
  const quotePending = !quote || quote.key !== key;
  const confirmed = quote?.ok && !quotePending ? quote : null;

  const setCount = (n: number) =>
    setPax((p) => (n > p.length ? [...p, ...Array.from({ length: n - p.length }, () => ({ firstName: "", lastName: "" }))] : p.slice(0, n)));

  const payload = JSON.stringify({ ...selection, passengers: pax, contact, consents });

  return (
    <form action={action} className="bk">
      <input type="hidden" name="payload" value={payload} />
      <div className="bk__main">
        {state.error ? (
          <p className="alert alert--danger" role="alert">
            {state.error}
          </p>
        ) : null}

        <fieldset className="bk__step">
          <legend>
            <span>1</span> Ihre Auswahl
          </legend>
          <div className="bk__sel">
            <div className="field">
              <label htmlFor="bk-fare">Tarif</label>
              <select id="bk-fare" value={fareCode} onChange={(e) => setFareCode(e.target.value)}>
                {d.fares.map((f) => (
                  <option key={f.code} value={f.code}>
                    {f.name} – {formatEur(f.priceCents)} p. P.
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="bk-stop">Zustieg</label>
              <select id="bk-stop" value={stopId} onChange={(e) => setStopId(e.target.value)}>
                {d.stops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}, {timeFmt.format(new Date(s.plannedAt))} Uhr{s.surchargeCents ? ` (+ ${formatEur(s.surchargeCents)} p. P.)` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="bk-count">Reisende</label>
              <select id="bk-count" value={pax.length} onChange={(e) => setCount(Number(e.target.value))}>
                {Array.from({ length: maxPax }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} {i === 0 ? "Person" : "Personen"}
                  </option>
                ))}
              </select>
              {d.seatsLeft <= 10 ? <span className="hint">Noch {d.seatsLeft} Plätze frei</span> : null}
            </div>
          </div>
          {d.options.length ? (
            <div className="bk__list">
              {d.options.map((o) => (
                <label key={o.id} className={extras[o.id] ? "bk__row is-on" : "bk__row"}>
                  <input type="checkbox" checked={!!extras[o.id]} onChange={(e) => setExtras((x) => ({ ...x, [o.id]: e.target.checked }))} />
                  <span className="bk__row-main">
                    <strong>{o.name}</strong>
                    {o.description ? <span>{o.description}</span> : null}
                  </span>
                  <span className="bk__row-side">
                    {formatEur(o.priceCents)} {o.unit === "PER_PERSON" ? "p. P." : "pro Buchung"}
                  </span>
                </label>
              ))}
            </div>
          ) : null}
          <Link className="bk__back" href={`${tripPath}#termine` as never}>
            Anderen Termin wählen
          </Link>
        </fieldset>

        <fieldset className="bk__step">
          <legend>
            <span>2</span> Reisende
          </legend>
          {pax.map((p, i) => (
            <div key={i} className="bk__pax">
              <span className="mono-label">Reisende/r {i + 1}</span>
              <div className="field">
                <label htmlFor={`p${i}f`}>Vorname</label>
                <input
                  id={`p${i}f`}
                  required
                  maxLength={80}
                  autoComplete={i === 0 ? "given-name" : "off"}
                  value={p.firstName}
                  aria-invalid={fe[`passengers.${i}.firstName`] ? true : undefined}
                  onChange={(e) => setPax((all) => all.map((x, j) => (j === i ? { ...x, firstName: e.target.value } : x)))}
                />
              </div>
              <div className="field">
                <label htmlFor={`p${i}l`}>Nachname</label>
                <input
                  id={`p${i}l`}
                  required
                  maxLength={80}
                  autoComplete={i === 0 ? "family-name" : "off"}
                  value={p.lastName}
                  aria-invalid={fe[`passengers.${i}.lastName`] ? true : undefined}
                  onChange={(e) => setPax((all) => all.map((x, j) => (j === i ? { ...x, lastName: e.target.value } : x)))}
                />
              </div>
            </div>
          ))}
          <p className="hint">Bitte die Namen wie im Ausweis angeben.</p>
        </fieldset>

        <fieldset className="bk__step">
          <legend>
            <span>3</span> Kontakt
          </legend>
          <div className="inq__grid">
            {(
              [
                ["firstName", "Vorname", "given-name", "text"],
                ["lastName", "Nachname", "family-name", "text"],
                ["email", "E-Mail", "email", "email"],
                ["phone", "Telefon (für Rückfragen am Reisetag)", "tel", "tel"],
              ] as const
            ).map(([k, label, ac, type]) => (
              <div key={k} className="field">
                <label htmlFor={`c-${k}`}>{label} *</label>
                <input
                  id={`c-${k}`}
                  type={type}
                  autoComplete={ac}
                  required
                  maxLength={k === "email" ? 254 : 80}
                  value={contact[k]}
                  aria-invalid={fe[`contact.${k}`] ? true : undefined}
                  onChange={(e) => setContact((c) => ({ ...c, [k]: e.target.value }))}
                />
                {fe[`contact.${k}`] ? <span className="error">{fe[`contact.${k}`]}</span> : null}
              </div>
            ))}
          </div>
          <p className="hint">Sie buchen als Gast – ein Kundenkonto ist nicht nötig. Den Zugang zu Ihrer Buchung erhalten Sie per E-Mail.</p>
        </fieldset>

        <fieldset className="bk__step">
          <legend>
            <span>4</span> Bestätigen
          </legend>
          <label className="choice">
            <input type="checkbox" checked={consents.terms} onChange={(e) => setConsents((c) => ({ ...c, terms: e.target.checked }))} />
            <span>
              Ich akzeptiere die <a href={LEGAL_LINKS.terms}>Reise- und Beförderungsbedingungen</a>. *
            </span>
          </label>
          <label className="choice">
            <input type="checkbox" checked={consents.privacy} onChange={(e) => setConsents((c) => ({ ...c, privacy: e.target.checked }))} />
            <span>
              Ich habe die <a href={LEGAL_LINKS.privacy}>Datenschutzhinweise</a> gelesen. *
            </span>
          </label>
          {isPackage ? (
            <label className="choice">
              <input type="checkbox" checked={consents.packageInfo} onChange={(e) => setConsents((c) => ({ ...c, packageInfo: e.target.checked }))} />
              <span>Ich habe das Formblatt zur Unterrichtung über Pauschalreisen erhalten. *</span>
            </label>
          ) : null}
          {fe["consents.terms"] || fe["consents.privacy"] ? <span className="error">Bitte die Pflichtbestätigungen setzen.</span> : null}
        </fieldset>
      </div>

      <aside className="bk__side" aria-label="Preisübersicht">
        <div className="bk__summary">
          {d.isDemo ? <p className="bk__demo">Testtermin – nur Entwicklung</p> : null}
          <span className="mono-label">{d.trip.destination}</span>
          <strong className="bk__title">{d.trip.title}</strong>
          <span className="bk__date">
            {dateFmt.format(new Date(d.departAt))}
            <br />
            Abfahrt {stop.city} {timeFmt.format(new Date(stop.plannedAt))} Uhr
          </span>
          <div aria-live="polite" data-pending={quotePending ? "true" : "false"} className="bk__price">
            {quote?.ok ? (
              <ul className="bk__lines">
                {quote.lines.map((l) => (
                  <li key={l.kind + l.description}>
                    <span>
                      {l.quantity} × {l.description}
                    </span>
                    <span className="tabular">{formatEur(l.totalCents)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="bk__total">
              <span>Gesamt</span>
              <strong className="tabular">{quote?.ok ? formatEur(quote.totalCents) : "–"}</strong>
            </p>
            {quote && !quote.ok && !quotePending ? (
              <p className="alert alert--danger" role="alert">
                {quote.error}
              </p>
            ) : null}
          </div>
          <p className="hint">{quotePending ? "Preis wird geprüft …" : "Vom System berechnet, inkl. gesetzlicher Steuern, sofern anfallend."}</p>
          <button className="btn btn--brand btn--lg btn--arrow" type="submit" disabled={pending || !paymentReady || !confirmed}>
            {pending ? "Plätze werden reserviert …" : "Zahlungspflichtig buchen"}
          </button>
          {paymentReady ? (
            <p className="hint">Weiter zur sicheren Zahlung. Ihre Plätze sind währenddessen 30 Minuten reserviert.</p>
          ) : (
            <p className="alert alert--warn">Online-Zahlung ist in dieser Umgebung noch nicht eingerichtet (Stripe-Schlüssel fehlen).</p>
          )}
        </div>
      </aside>
    </form>
  );
}
