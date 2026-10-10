"use client";

import { useActionState, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { formatEur } from "@/lib/money";
import { LEGAL_LINKS } from "@/content/company";
import { quoteAction, type QuoteResult } from "@/app/(site)/buchung/quote-action";
import { submitTripInterest, type InterestState } from "./interest-actions";
import type { TripState } from "@/server/catalog/trips";

export interface CardFare {
  code: string;
  name: string;
  priceCents: number;
  features: string[];
  recommended: boolean;
}
export interface CardDeparture {
  code: string;
  departAt: string;
  returnAt: string | null;
  seatsLeft: number;
  state: "BOOKABLE" | "SOLD_OUT";
  fromPriceCents: number;
  isDemo: boolean;
  fares: CardFare[];
  stops: { id: string; name: string; city: string; plannedAt: string; platform: string | null; surchargeCents: number }[];
}
export interface BookingCardProps {
  slug: string;
  title: string;
  state: TripState;
  lockReason: "package_unprotected" | null;
  departures: CardDeparture[];
  fromPriceCents: number | null;
  pickups: { city: string; name: string; localTime: string | null; surchargeCents: number }[];
  options: { id: string; name: string; description: string | null; priceCents: number; unit: "PER_PERSON" | "PER_BOOKING"; max: number }[];
}

const TZ = "Europe/Berlin";
const dShort = new Intl.DateTimeFormat("de-DE", { timeZone: TZ, weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
const dDay = new Intl.DateTimeFormat("de-DE", { timeZone: TZ, day: "2-digit", month: "2-digit" });
const tFmt = new Intl.DateTimeFormat("de-DE", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const MAX_PAX = 10;

const nightsBetween = (a: string, b: string | null) => (b ? Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 86_400_000) : null);

/** Counts smoothly from the last confirmed total to the new one. */
function AnimatedEur({ cents }: { cents: number }) {
  const [shown, setShown] = useState(cents);
  const from = useRef(cents);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = cents;
      const id = requestAnimationFrame(() => setShown(cents));
      return () => cancelAnimationFrame(id);
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 420);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(a + (cents - a) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = cents;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cents]);
  return <>{formatEur(shown)}</>;
}

function Step({
  n,
  title,
  value,
  open,
  onToggle,
  children,
  locked,
}: {
  n: string;
  title: string;
  value: ReactNode;
  open: boolean;
  onToggle: () => void;
  children?: ReactNode;
  locked?: boolean;
}) {
  const id = useId();
  return (
    <div className="tbk__step" data-open={open ? "true" : "false"}>
      {locked ? (
        <div className="tbk__head is-static">
          <span className="tbk__n">{n}</span>
          <span className="tbk__title">{title}</span>
          <span className="tbk__value">{value}</span>
        </div>
      ) : (
        <button type="button" className="tbk__head" aria-expanded={open} aria-controls={id} onClick={onToggle}>
          <span className="tbk__n">{n}</span>
          <span className="tbk__title">{title}</span>
          <span className="tbk__value">{value}</span>
          <svg className="tbk__chev" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
            <path d="m2 4 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      )}
      {children ? (
        <div id={id} className="tbk__body" hidden={!open}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Eine Person weniger">
        −
      </button>
      <output className="tabular" aria-live="polite">
        {value}
      </output>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Eine Person mehr">
        +
      </button>
    </div>
  );
}

/* ───────────────────────── bookable: the configurator ───────────────────────── */

function Configurator({ p, onBook }: { p: BookingCardProps; onBook?: () => void }) {
  const router = useRouter();
  const bookable = p.departures.filter((d) => d.state === "BOOKABLE");
  const [code, setCode] = useState(bookable[0]!.code);
  const dep = p.departures.find((d) => d.code === code) ?? bookable[0]!;
  const [stopId, setStopId] = useState(dep.stops[0]!.id);
  const [fareCode, setFareCode] = useState((dep.fares.find((f) => f.recommended) ?? dep.fares[0]!).code);
  const [pax, setPax] = useState(Math.min(2, dep.seatsLeft));
  const [opts, setOpts] = useState<Record<string, boolean>>({});
  const [openStep, setOpenStep] = useState<string | null>(bookable.length > 1 ? "date" : dep.fares.length > 1 ? "fare" : null);
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [going, setGoing] = useState(false);

  const stop = dep.stops.find((s) => s.id === stopId) ?? dep.stops[0]!;
  const fare = dep.fares.find((f) => f.code === fareCode) ?? dep.fares[0]!;
  const maxPax = Math.min(MAX_PAX, dep.seatsLeft);
  const count = Math.min(pax, maxPax);

  const chooseDeparture = (c: string) => {
    const next = p.departures.find((d) => d.code === c);
    if (!next || next.state !== "BOOKABLE") return;
    setCode(c);
    // keep what still fits on the new date
    setStopId((next.stops.find((s) => s.city === stop.city) ?? next.stops[0]!).id);
    setFareCode((next.fares.find((f) => f.code === fare.code) ?? next.fares.find((f) => f.recommended) ?? next.fares[0]!).code);
    setOpenStep(null);
  };

  // dates chosen in the "Termine" section of the page
  useEffect(() => {
    const on = (e: Event) => {
      const c = (e as CustomEvent<string>).detail;
      const next = p.departures.find((d) => d.code === c);
      if (!next || next.state !== "BOOKABLE") return;
      setCode(c);
      setStopId((s) => (next.stops.some((x) => x.id === s) ? s : next.stops[0]!.id));
      setFareCode((f) => (next.fares.some((x) => x.code === f) ? f : (next.fares.find((x) => x.recommended) ?? next.fares[0]!).code));
    };
    window.addEventListener("trip:departure", on);
    return () => window.removeEventListener("trip:departure", on);
  }, [p.departures]);

  const selection = {
    departureCode: dep.code,
    fareCode: fare.code,
    boardingStopId: stop.id,
    passengers: count,
    // per-person extras always follow the number of travellers
    options: p.options.filter((o) => opts[o.id]).map((o) => ({ id: o.id, quantity: o.unit === "PER_PERSON" ? count : 1 })),
  };
  const key = JSON.stringify(selection);

  useEffect(() => {
    let alive = true;
    quoteAction({ ...JSON.parse(key), key }).then(
      (r) => alive && setResult(r),
      () => alive && setResult({ ok: false, key, error: "Der Preis konnte gerade nicht berechnet werden.", code: "invalid" }),
    );
    return () => {
      alive = false;
    };
  }, [key]);

  const pending = !result || result.key !== key;
  const confirmed = result?.ok ? result : null;
  const toggle = (s: string) => setOpenStep((o) => (o === s ? null : s));

  const book = () => {
    if (!confirmed || pending) return;
    setGoing(true);
    const q = new URLSearchParams({ tarif: fare.code, zustieg: stop.id, personen: String(count) });
    if (selection.options.length) q.set("extras", selection.options.map((o) => `${o.id}:${o.quantity}`).join(","));
    onBook?.();
    router.push(`/buchung/${dep.code}?${q}` as never);
  };

  return (
    <div className="tbk__steps">
      <Step
        n="01"
        title="Termin"
        locked={bookable.length < 2}
        open={openStep === "date"}
        onToggle={() => toggle("date")}
        value={
          <>
            {dShort.format(new Date(dep.departAt))}
            {dep.returnAt ? ` – ${dDay.format(new Date(dep.returnAt))}` : ""}
          </>
        }
      >
        <div className="tbk__opts" role="radiogroup" aria-label="Termin wählen">
          {p.departures.map((d) => {
            const nights = nightsBetween(d.departAt, d.returnAt);
            return (
              <label key={d.code} className="tbk__opt" data-on={d.code === dep.code ? "true" : "false"} data-disabled={d.state !== "BOOKABLE" ? "true" : undefined}>
                <input type="radio" name="tbk-date" checked={d.code === dep.code} disabled={d.state !== "BOOKABLE"} onChange={() => chooseDeparture(d.code)} />
                <span className="tbk__opt-main">
                  <strong>
                    {dShort.format(new Date(d.departAt))}
                    {d.returnAt ? ` – ${dShort.format(new Date(d.returnAt))}` : ""}
                  </strong>
                  <span>
                    {nights !== null ? `${nights + 1} Tage · ` : ""}
                    {d.state === "SOLD_OUT" ? "ausgebucht" : d.seatsLeft <= 10 ? `noch ${d.seatsLeft} Plätze` : "Plätze frei"}
                  </span>
                </span>
                <span className="tbk__opt-side">{d.state === "BOOKABLE" ? <>ab {formatEur(d.fromPriceCents)}</> : "–"}</span>
              </label>
            );
          })}
        </div>
      </Step>

      <Step
        n="02"
        title="Zustieg"
        locked={dep.stops.length < 2}
        open={openStep === "stop"}
        onToggle={() => toggle("stop")}
        value={
          <>
            {stop.city} · {tFmt.format(new Date(stop.plannedAt))} Uhr
          </>
        }
      >
        <div className="tbk__opts" role="radiogroup" aria-label="Zustieg wählen">
          {dep.stops.map((s) => (
            <label key={s.id} className="tbk__opt" data-on={s.id === stop.id ? "true" : "false"}>
              <input
                type="radio"
                name="tbk-stop"
                checked={s.id === stop.id}
                onChange={() => {
                  setStopId(s.id);
                  setOpenStep(null);
                }}
              />
              <span className="tbk__opt-main">
                <strong>{s.name}</strong>
                <span>
                  {tFmt.format(new Date(s.plannedAt))} Uhr{s.platform ? ` · ${s.platform}` : ""}
                </span>
              </span>
              <span className="tbk__opt-side">{s.surchargeCents ? `+ ${formatEur(s.surchargeCents)} p. P.` : "ohne Aufpreis"}</span>
            </label>
          ))}
        </div>
      </Step>

      <Step n="03" title="Reisende" open={openStep === "pax"} onToggle={() => toggle("pax")} value={`${count} ${count === 1 ? "Person" : "Personen"}`}>
        <div className="tbk__pax">
          <div>
            <strong>Reisende</strong>
            <span>{dep.seatsLeft <= 10 ? `Noch ${dep.seatsLeft} Plätze frei` : `Bis zu ${MAX_PAX} pro Buchung`}</span>
          </div>
          <Stepper value={count} min={1} max={maxPax} onChange={setPax} label="Anzahl Reisende" />
        </div>
        <p className="tbk__hint">Für größere Gruppen planen wir gern einen eigenen Termin.</p>
      </Step>

      <Step n="04" title="Tarif" locked={dep.fares.length < 2} open={openStep === "fare"} onToggle={() => toggle("fare")} value={fare.name}>
        <div className="tbk__fares" role="radiogroup" aria-label="Tarif wählen">
          {dep.fares.map((f) => (
            <label key={f.code} className="tbk__fare" data-on={f.code === fare.code ? "true" : "false"}>
              <input
                type="radio"
                name="tbk-fare"
                checked={f.code === fare.code}
                onChange={() => {
                  setFareCode(f.code);
                }}
              />
              <span className="tbk__fare-head">
                <strong>{f.name}</strong>
                {f.recommended ? <span className="tbk__rec">Empfohlen</span> : null}
                <span className="tbk__fare-price tabular">{formatEur(f.priceCents)}</span>
              </span>
              {f.features.length ? (
                <ul>
                  {f.features.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              ) : null}
            </label>
          ))}
        </div>
      </Step>

      {p.options.length ? (
        <Step
          n="05"
          title="Extras"
          open={openStep === "extras"}
          onToggle={() => toggle("extras")}
          value={selection.options.length ? `${selection.options.length} gewählt` : "keine"}
        >
          <div className="tbk__opts">
            {p.options.map((o) => {
              const on = !!opts[o.id];
              return (
                <label key={o.id} className="tbk__opt" data-on={on ? "true" : "false"}>
                  <input type="checkbox" checked={on} onChange={(e) => setOpts((x) => ({ ...x, [o.id]: e.target.checked }))} />
                  <span className="tbk__opt-main">
                    <strong>{o.name}</strong>
                    {o.description ? <span>{o.description}</span> : null}
                  </span>
                  <span className="tbk__opt-side">
                    {formatEur(o.priceCents)} {o.unit === "PER_PERSON" ? "p. P." : "/ Buchung"}
                  </span>
                </label>
              );
            })}
          </div>
        </Step>
      ) : null}

      <div className="tbk__price" aria-live="polite" data-pending={pending ? "true" : "false"}>
        {confirmed ? (
          <ul className="tbk__lines">
            {confirmed.lines.map((l) => (
              <li key={l.kind + l.description}>
                <span>
                  {l.quantity} × {l.description}
                </span>
                <span className="tabular">{formatEur(l.totalCents)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="tbk__total">
          <span>
            Gesamtpreis
            <small>{pending ? "wird geprüft …" : confirmed ? "vom System bestätigt" : ""}</small>
          </span>
          <strong className="tabular">{confirmed ? <AnimatedEur cents={confirmed.totalCents} /> : "–"}</strong>
        </div>
        {result && !result.ok && !pending ? (
          <p className="tbk__error" role="alert">
            {result.error}
          </p>
        ) : null}
      </div>

      <button type="button" className="btn btn--brand btn--lg btn--arrow tbk__cta" onClick={book} disabled={pending || !confirmed || going} data-magnetic="0.15">
        {going ? "Einen Moment …" : "Jetzt buchen"}
      </button>
      <p className="tbk__fine">
        Noch keine Zahlung. Im nächsten Schritt geben Sie die Reisedaten ein; Ihre Plätze werden erst dann für 30 Minuten reserviert.
      </p>
      {dep.isDemo ? <p className="tbk__demo">Testtermin – nur in der Entwicklungsumgebung sichtbar</p> : null}
    </div>
  );
}

/* ───────────────────────── not bookable: interest list ───────────────────────── */

function InterestList({ p }: { p: BookingCardProps }) {
  const [state, action, pending] = useActionState<InterestState, FormData>(submitTripInterest, { status: "idle" });
  const [startedAt] = useState(() => Date.now());
  const [pax, setPax] = useState(2);
  const e = state.errors ?? {};
  const v = (k: string) => state.values?.[k];
  const cities = [...new Set(p.pickups.map((x) => x.city))];

  if (state.status === "done") {
    return (
      <div className="tbk__done" role="status">
        <span className="tbk__done-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <strong>Sie sind vorgemerkt.</strong>
        {state.number ? (
          <p>
            Vorgangsnummer <span className="tabular">{state.number}</span>
          </p>
        ) : null}
        <p>Sobald Termine für „{p.title}“ freigegeben sind, erhalten Sie Daten und Preise per E-Mail. Unverbindlich – keine Buchung.</p>
      </div>
    );
  }

  return (
    <form action={action} className="tbk__steps tbk__interest" noValidate>
      <input type="hidden" name="t" value={startedAt} />
      <input type="hidden" name="tripSlug" value={p.slug} />
      <input type="hidden" name="personen" value={pax} />
      <p className="hp" aria-hidden="true">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </p>
      {state.message ? (
        <p className="tbk__error" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="tbk__field">
        <label htmlFor="ti-zeitraum">
          <span className="tbk__n">01</span> Wunschzeitraum
        </label>
        <input id="ti-zeitraum" name="zeitraum" maxLength={120} placeholder="z. B. Sommerferien 2027" defaultValue={v("zeitraum")} />
      </div>
      {cities.length ? (
        <div className="tbk__field">
          <label htmlFor="ti-zustieg">
            <span className="tbk__n">02</span> Zustieg
          </label>
          <select id="ti-zustieg" name="zustieg" defaultValue={v("zustieg") ?? ""}>
            <option value="">Noch offen</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="tbk__field tbk__field--row">
        <span className="tbk__label">
          <span className="tbk__n">{cities.length ? "03" : "02"}</span> Reisende
        </span>
        <Stepper value={pax} min={1} max={60} onChange={setPax} label="Anzahl Reisende" />
      </div>
      <div className="tbk__field">
        <label htmlFor="ti-name">Name *</label>
        <input id="ti-name" name="name" autoComplete="name" required maxLength={120} defaultValue={v("name")} aria-invalid={e.name ? true : undefined} />
        {e.name ? <span className="error">{e.name}</span> : null}
      </div>
      <div className="tbk__field">
        <label htmlFor="ti-email">E-Mail *</label>
        <input id="ti-email" name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={v("email")} aria-invalid={e.email ? true : undefined} />
        {e.email ? <span className="error">{e.email}</span> : null}
      </div>
      <div className="tbk__field">
        <label htmlFor="ti-telefon">Telefon (optional)</label>
        <input id="ti-telefon" name="telefon" type="tel" autoComplete="tel" maxLength={40} defaultValue={v("telefon")} aria-invalid={e.telefon ? true : undefined} />
        {e.telefon ? <span className="error">{e.telefon}</span> : null}
      </div>
      <label className="choice tbk__consent">
        <input type="checkbox" name="datenschutz" required defaultChecked={v("datenschutz") === "on"} aria-invalid={e.datenschutz ? true : undefined} />
        <span>
          Ich möchte zu dieser Reise informiert werden. <a href={LEGAL_LINKS.privacy}>Datenschutz</a> *
        </span>
      </label>
      {e.datenschutz ? <span className="error">{e.datenschutz}</span> : null}
      <button className="btn btn--brand btn--lg btn--arrow tbk__cta" type="submit" disabled={pending}>
        {pending ? "Wird gesendet …" : "Über neue Termine informieren"}
      </button>
      <p className="tbk__fine">Unverbindlich und kostenlos. Keine Buchung, keine Werbung zu anderen Reisen.</p>
    </form>
  );
}

/* ───────────────────────── frame: sticky card + mobile sheet ───────────────────────── */

const STATUS: Record<TripState, { pill: string; text: string } | null> = {
  BOOKABLE: null,
  SOLD_OUT: { pill: "Ausgebucht", text: "Alle Plätze der aktuellen Termine sind vergeben. Wir informieren Sie, wenn Zusatztermine oder Plätze frei werden." },
  CANCELLED: { pill: "Termin abgesagt", text: "Der geplante Termin findet nicht statt. Lassen Sie sich vormerken – neue Termine erfahren Sie zuerst." },
  COMING_SOON: { pill: "Neue Termine in Planung", text: "Aktuell ist kein Termin online buchbar. Lassen Sie sich vormerken – Sie erhalten Termine und Preise, sobald sie feststehen." },
};

export function BookingCard(p: BookingCardProps) {
  const [sheet, setSheet] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const bookable = p.state === "BOOKABLE" && p.departures.some((d) => d.state === "BOOKABLE");
  const status = bookable ? null : p.lockReason ? { pill: "Online-Buchung in Kürze", text: "Die Termine stehen fest, die Online-Buchung wird gerade freigeschaltet. Lassen Sie sich vormerken – wir melden uns." } : STATUS[p.state];
  const count = p.departures.filter((d) => d.state === "BOOKABLE").length;

  useEffect(() => {
    if (!sheet) return;
    document.documentElement.classList.add("sheet-open");
    sheetRef.current?.querySelector<HTMLElement>(".tbk__close")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.classList.remove("sheet-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [sheet]);

  // "Wählen" in the date list opens the sheet on small screens
  useEffect(() => {
    const on = () => {
      if (window.matchMedia("(max-width: 1023px)").matches) setSheet(true);
      else sheetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener("trip:departure", on);
    return () => window.removeEventListener("trip:departure", on);
  }, []);

  return (
    <>
      <aside className="tbk" aria-label="Buchung" data-sheet={sheet ? "open" : "closed"}>
        <div className="tbk__scrim" onClick={() => setSheet(false)} aria-hidden="true" />
        <div className="tbk__card" ref={sheetRef} id="buchen">
          <header className="tbk__top">
            <span className="tbk__grab" aria-hidden="true" />
            {bookable && p.fromPriceCents !== null ? (
              <div>
                <span className="tbk__from">
                  ab <strong className="tabular">{formatEur(p.fromPriceCents)}</strong> p. P.
                </span>
                <span className="tbk__sub">
                  {count} {count === 1 ? "Termin" : "Termine"} buchbar · Preis inkl. Zustieg
                </span>
              </div>
            ) : status ? (
              <div>
                <span className="tbk__pill">{status.pill}</span>
                <p className="tbk__sub">{status.text}</p>
              </div>
            ) : null}
            <button type="button" className="tbk__close" onClick={() => setSheet(false)}>
              <span className="sr-only">Schließen</span>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </header>
          {bookable ? <Configurator p={p} onBook={() => setSheet(false)} /> : <InterestList p={p} />}
        </div>
      </aside>

      <div className="tbk-bar" data-hidden={sheet ? "true" : "false"}>
        <span className="tbk-bar__price">
          {bookable && p.fromPriceCents !== null ? (
            <>
              <small>ab</small> <strong className="tabular">{formatEur(p.fromPriceCents)}</strong> <small>p. P.</small>
            </>
          ) : (
            <small>{status?.pill}</small>
          )}
        </span>
        <button type="button" className="btn btn--brand btn--arrow" onClick={() => setSheet(true)} aria-controls="buchen" aria-expanded={sheet}>
          {bookable ? "Verfügbarkeit prüfen" : "Vormerken"}
        </button>
      </div>
    </>
  );
}
