import Link from "next/link";
import type { TripSummary } from "@/server/catalog/trips";
import { tripPath } from "@/server/catalog/trips";
import { DestinationArt, artFor } from "@/components/home/destination-art";
import { formatEur } from "@/lib/money";
import { BUSINESS_TZ } from "@/lib/time";

const country = new Intl.DisplayNames("de", { type: "region" });
const dDay = new Intl.DateTimeFormat("de-DE", { timeZone: BUSINESS_TZ, weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
const tTime = new Intl.DateTimeFormat("de-DE", { timeZone: BUSINESS_TZ, hour: "2-digit", minute: "2-digit" });
const TYPE: Record<string, string> = { PACKAGE_TOUR: "Pauschalreise", TRANSPORT_ONLY: "Wochenendtrip", DAY_TRIP: "Tagesfahrt", GROUP_TOUR: "Gruppenreise", LINE_TICKET: "Linie" };
const BADGE: Record<TripSummary["state"], string> = { BOOKABLE: "Buchbar", SOLD_OUT: "Ausgebucht", COMING_SOON: "Termine in Planung" };

function I({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="tres__ico">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const ICON = {
  pin: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4.5l3 2",
  bus: "M5 17V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v11M5 17h14M5 12h14M7.5 20v-3M16.5 20v-3",
  bed: "M3 18V7m0 7h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11.5a1.5 1.5 0 1 0 0-.01",
  check: "m5 12.5 4.5 4.5L19 7.5",
  back: "M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3",
};

/** Search result row: photo, what the trip is, when and where it leaves, what it costs. */
export function TripResult({ t, priority = false }: { t: TripSummary; priority?: boolean }) {
  const href = tripPath(t);
  const nights = t.durationNights > 0 ? ` · ${t.durationNights} ${t.durationNights === 1 ? "Nacht" : "Nächte"}` : "";
  const lodging = t.hotelName ?? (t.productType === "TRANSPORT_ONLY" ? "Busfahrt, Unterkunft optional" : null);
  const templateTimes = t.pickupTimes.filter((p) => p.localTime);

  return (
    <article className="tres" data-state={t.state}>
      <Link href={href as never} className="tres__media" tabIndex={-1} aria-hidden="true">
        {t.cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP from the media store
          <img src={t.cover.src} alt="" width={t.cover.width} height={t.cover.height} loading={priority ? "eager" : "lazy"} decoding="async" />
        ) : (
          <DestinationArt d={artFor(t)} className="tres__svg" />
        )}
        <span className="tres__badge" data-state={t.state}>
          {BADGE[t.state]}
        </span>
        {t.cover && !t.cover.rightsConfirmed ? <span className="tres__rights">Bildrechte ungeprüft</span> : null}
      </Link>

      <div className="tres__body">
        <p className="tres__kicker">
          {t.category && t.category !== TYPE[t.productType] ? `${t.category} · ${TYPE[t.productType]}` : TYPE[t.productType]}
        </p>
        <h3 className="tres__title">
          <Link href={href as never}>{t.title}</Link>
        </h3>
        <p className="tres__where">
          <I d={ICON.pin} />
          {t.destination}, {country.of(t.countryCode) ?? t.countryCode}
        </p>
        <p className="tres__summary">{t.summary}</p>

        <ul className="tres__facts">
          <li>
            <I d={ICON.clock} />
            {t.durationDays} Tage{nights}
          </li>
          <li>
            <I d={ICON.bus} />
            Reisebus
          </li>
          {lodging ? (
            <li>
              <I d={ICON.bed} />
              {lodging}
            </li>
          ) : null}
          {t.included.slice(0, 3).map((x) => (
            <li key={x} className="is-incl">
              <I d={ICON.check} />
              {x}
            </li>
          ))}
        </ul>

        <div className="tres__dep">
          {t.next ? (
            <>
              <div className="tres__dep-head">
                <span className="tres__label">Abfahrt</span>
                <strong>{dDay.format(t.next.departAt)}</strong>
                {t.next.returnAt ? (
                  <span className="tres__return">
                    <I d={ICON.back} />
                    Rückkehr {dDay.format(t.next.returnAt)}
                  </span>
                ) : null}
              </div>
              <ol className="tres__stops" aria-label="Zustiege und Abfahrtszeiten">
                {t.next.stops.map((s) => (
                  <li key={s.name}>
                    <time dateTime={s.at.toISOString()} className="tabular">
                      {tTime.format(s.at)}
                    </time>
                    <span>{s.city}</span>
                    {s.surchargeCents ? <small>+{formatEur(s.surchargeCents)}</small> : null}
                  </li>
                ))}
              </ol>
            </>
          ) : templateTimes.length ? (
            <>
              <div className="tres__dep-head">
                <span className="tres__label">Abfahrtszeiten (Richtwerte)</span>
                <strong>Termine folgen</strong>
              </div>
              <ol className="tres__stops" aria-label="Übliche Abfahrtszeiten">
                {templateTimes.map((s) => (
                  <li key={s.name}>
                    <span className="tabular">{s.localTime}</span>
                    <span>{s.city}</span>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <div className="tres__dep-head">
              <span className="tres__label">Abfahrt</span>
              <strong>{t.state === "SOLD_OUT" ? "Aktuelle Termine ausgebucht" : "Termine und Zeiten folgen"}</strong>
              {t.boardingCities.length ? <span className="tres__return">Zustieg {t.boardingCities.join(", ")}</span> : null}
            </div>
          )}
        </div>
      </div>

      <aside className="tres__aside">
        {t.next ? (
          <>
            <span className="tres__from">ab</span>
            <strong className="tres__price tabular">{formatEur(t.next.fromPriceCents)}</strong>
            <span className="tres__pp">pro Person inkl. Zustieg</span>
            <span className={t.next.seatsLeft <= 10 ? "tres__seats is-low" : "tres__seats"}>
              {t.next.seatsLeft <= 10 ? `Noch ${t.next.seatsLeft} Plätze` : "Plätze frei"}
              {t.next.count > 1 ? ` · ${t.next.count} Termine` : ""}
            </span>
            <Link href={href as never} className="btn btn--brand btn--arrow tres__cta">
              Reise ansehen
            </Link>
          </>
        ) : (
          <>
            <span className="tres__from">Preis</span>
            <strong className="tres__price tres__price--muted">je Termin</strong>
            <span className="tres__pp">{t.state === "SOLD_OUT" ? "Zusatztermine möglich" : "Unverbindlich vormerken"}</span>
            <Link href={`${href}#buchen` as never} className="btn btn--ghost tres__cta">
              Termine vormerken
            </Link>
          </>
        )}
      </aside>
    </article>
  );
}
