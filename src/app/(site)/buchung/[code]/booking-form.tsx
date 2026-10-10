"use client";

import { useActionState, useMemo, useState } from "react";
import type { BookableDeparture } from "@/server/booking/departure";
import { quote } from "@/server/booking/pricing";
import { formatEur } from "@/lib/money";
import { LEGAL_LINKS } from "@/content/company";
import { startBookingAction, type BookingState } from "../actions";

const tz = "Europe/Berlin";
const dateFmt = new Intl.DateTimeFormat("de-DE", { timeZone: tz, weekday: "long", day: "2-digit", month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("de-DE", { timeZone: tz, hour: "2-digit", minute: "2-digit" });

interface Pax {
  firstName: string;
  lastName: string;
}

export function BookingForm({ d, initialFare, paymentReady }: { d: BookableDeparture; initialFare?: string; paymentReady: boolean }) {
  const [state, action, pending] = useActionState<BookingState, FormData>(startBookingAction, {});
  const [fareCode, setFareCode] = useState(d.fares.some((f) => f.code === initialFare) ? initialFare! : d.fares.find((f) => f.conditions.recommended)?.code ?? d.fares[0]!.code);
  const [stopId, setStopId] = useState(d.stops[0]!.id);
  const maxPax = Math.min(d.seatsLeft, 10);
  const [pax, setPax] = useState<Pax[]>([{ firstName: "", lastName: "" }]);
  const [opts, setOpts] = useState<Record<string, number>>({});
  const [contact, setContact] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [consents, setConsents] = useState({ terms: false, privacy: false, packageInfo: false });
  const isPackage = d.trip.productType === "PACKAGE_TOUR";
  const fe = state.fieldErrors ?? {};

  const fare = d.fares.find((f) => f.code === fareCode)!;
  const stop = d.stops.find((s) => s.id === stopId)!;
  const price = useMemo(
    () =>
      quote({
        passengers: pax.length,
        fare: { id: fare.code, name: fare.name, priceCents: fare.priceCents },
        boardingStop: { id: stop.id, name: stop.name, surchargeCents: stop.surchargeCents },
        options: d.options.map((o) => ({ id: o.id, name: o.name, priceCents: o.priceCents, unit: o.unit, quantity: opts[o.id] ?? 0 })),
      }),
    [pax.length, fare, stop, opts, d.options],
  );

  const setCount = (n: number) =>
    setPax((p) => (n > p.length ? [...p, ...Array.from({ length: n - p.length }, () => ({ firstName: "", lastName: "" }))] : p.slice(0, n)));

  const payload = JSON.stringify({
    departureCode: d.code,
    fareCode,
    boardingStopId: stopId,
    passengers: pax,
    options: Object.entries(opts).map(([id, quantity]) => ({ id, quantity })),
    contact,
    consents,
  });

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
            <span>1</span> Tarif
          </legend>
          <div className="bk__fares" role="radiogroup">
            {d.fares.map((f) => (
              <label key={f.code} className={f.code === fareCode ? "bk__fare is-on" : "bk__fare"}>
                <input type="radio" name="fare" value={f.code} checked={f.code === fareCode} onChange={() => setFareCode(f.code)} />
                <span className="bk__fare-head">
                  <strong>{f.name}</strong>
                  <span>{formatEur(f.priceCents)} p. P.</span>
                </span>
                <ul>
                  {(f.conditions.features ?? []).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="bk__step">
          <legend>
            <span>2</span> Zustieg
          </legend>
          <div className="bk__list">
            {d.stops.map((s) => (
              <label key={s.id} className={s.id === stopId ? "bk__row is-on" : "bk__row"}>
                <input type="radio" name="stop" value={s.id} checked={s.id === stopId} onChange={() => setStopId(s.id)} />
                <span className="bk__row-main">
                  <strong>{s.name}</strong>
                  <span>
                    {timeFmt.format(new Date(s.plannedAt))} Uhr{s.platform ? ` · ${s.platform}` : ""}
                  </span>
                </span>
                <span className="bk__row-side">{s.surchargeCents ? `+ ${formatEur(s.surchargeCents)} p. P.` : "ohne Aufpreis"}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="bk__step">
          <legend>
            <span>3</span> Reisende
          </legend>
          <div className="field bk__count">
            <label htmlFor="bk-count">Anzahl Reisende</label>
            <select id="bk-count" value={pax.length} onChange={(e) => setCount(Number(e.target.value))}>
              {Array.from({ length: maxPax }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1} {i === 0 ? "Person" : "Personen"}
                </option>
              ))}
            </select>
            {d.seatsLeft <= 10 ? <span className="hint">Noch {d.seatsLeft} Plätze frei</span> : null}
          </div>
          {pax.map((p, i) => (
            <div key={i} className="bk__pax">
              <span className="mono-label">Reisende/r {i + 1}</span>
              <div className="field">
                <label htmlFor={`p${i}f`}>Vorname</label>
                <input
                  id={`p${i}f`}
                  required
                  maxLength={80}
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
                  value={p.lastName}
                  aria-invalid={fe[`passengers.${i}.lastName`] ? true : undefined}
                  onChange={(e) => setPax((all) => all.map((x, j) => (j === i ? { ...x, lastName: e.target.value } : x)))}
                />
              </div>
            </div>
          ))}
        </fieldset>

        {d.options.length ? (
          <fieldset className="bk__step">
            <legend>
              <span>4</span> Zusatzleistungen
            </legend>
            <div className="bk__list">
              {d.options.map((o) => (
                <label key={o.id} className={(opts[o.id] ?? 0) > 0 ? "bk__row is-on" : "bk__row"}>
                  <input
                    type="checkbox"
                    checked={(opts[o.id] ?? 0) > 0}
                    onChange={(e) => setOpts((x) => ({ ...x, [o.id]: e.target.checked ? (o.unit === "PER_PERSON" ? pax.length : 1) : 0 }))}
                  />
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
          </fieldset>
        ) : null}

        <fieldset className="bk__step">
          <legend>
            <span>{d.options.length ? 5 : 4}</span> Kontakt
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
            <span>{d.options.length ? 6 : 5}</span> Bestätigen
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
          <ul className="bk__lines">
            {price.lines.map((l) => (
              <li key={l.kind + l.referenceId}>
                <span>
                  {l.quantity} × {l.description}
                </span>
                <span className="tabular">{formatEur(l.totalCents)}</span>
              </li>
            ))}
          </ul>
          <p className="bk__total">
            <span>Gesamt</span>
            <strong className="tabular">{formatEur(price.totalCents)}</strong>
          </p>
          <p className="hint">inkl. gesetzlicher Steuern, sofern anfallend</p>
          <button className="btn btn--brand btn--lg btn--arrow" type="submit" disabled={pending || !paymentReady}>
            {pending ? "Plätze werden reserviert …" : "Zahlungspflichtig buchen"}
          </button>
          {paymentReady ? (
            <p className="hint">Weiter zur sicheren Zahlung bei Stripe. Ihre Plätze sind währenddessen 30 Minuten reserviert.</p>
          ) : (
            <p className="alert alert--warn">Online-Zahlung ist in dieser Umgebung noch nicht eingerichtet (Stripe-Schlüssel fehlen).</p>
          )}
        </div>
      </aside>
    </form>
  );
}
