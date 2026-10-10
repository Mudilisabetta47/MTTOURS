import Link from "next/link";
import type { TripSummary } from "@/server/catalog/trips";
import { tripPath } from "@/server/catalog/trips";
import { DestinationArt, artFor } from "@/components/home/destination-art";
import { formatEur } from "@/lib/money";
import { formatDate } from "@/lib/time";

const country = new Intl.DisplayNames("de", { type: "region" });
const TYPE: Record<string, string> = { PACKAGE_TOUR: "Pauschalreise", TRANSPORT_ONLY: "Wochenendtrip", DAY_TRIP: "Tagesfahrt", GROUP_TOUR: "Gruppenreise", LINE_TICKET: "Linie" };
const BADGE: Record<TripSummary["state"], string> = { BOOKABLE: "Buchbar", SOLD_OUT: "Ausgebucht", COMING_SOON: "Termine in Planung" };

/** Photo-led product card. Prices and dates only from bookable departures; everything else says so. */
export function TripCard({ t, priority = false }: { t: TripSummary; priority?: boolean }) {
  return (
    <Link href={tripPath(t) as never} className="tcard" data-state={t.state} data-cursor="cta" data-cursor-label="Ansehen">
      <div className="tcard__art">
        {t.cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP from the media store
          <img className="tcard__img" src={t.cover.src} alt={t.cover.alt} width={t.cover.width} height={t.cover.height} loading={priority ? "eager" : "lazy"} decoding="async" />
        ) : (
          <DestinationArt d={artFor(t)} className="tcard__svg" />
        )}
        <span className="tcard__shade" aria-hidden="true" />
        <span className="tcard__badge" data-state={t.state}>
          {BADGE[t.state]}
        </span>
        {t.cover && !t.cover.rightsConfirmed ? <span className="tcard__rights">Bildrechte ungeprüft</span> : null}
        <span className="tcard__where">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" fill="currentColor" />
          </svg>
          {t.destination}, {country.of(t.countryCode) ?? t.countryCode}
        </span>
      </div>
      <div className="tcard__body">
        <span className="tcard__kicker">
          {t.category ?? TYPE[t.productType] ?? "Reise"} · {t.durationDays} Tage
        </span>
        <h3>{t.title}</h3>
        <ul className="tcard__chips" aria-label="Eckdaten">
          <li>Reisebus</li>
          {t.boardingCities.length ? <li>ab {t.boardingCities.join(", ")}</li> : null}
        </ul>
        <div className="tcard__foot">
          <div className="tcard__when">
            <span>{t.state === "BOOKABLE" ? "Nächster Termin" : "Termine"}</span>
            <strong>
              {t.next ? formatDate(t.next.departAt) : t.state === "SOLD_OUT" ? "ausgebucht" : "folgen"}
              {t.next && t.next.count > 1 ? <small> +{t.next.count - 1}</small> : null}
            </strong>
          </div>
          {t.next ? (
            <div className="tcard__price">
              <span>ab</span>
              <strong className="tabular">{formatEur(t.next.fromPriceCents)}</strong>
              <span>p. P.</span>
            </div>
          ) : (
            <div className="tcard__price tcard__price--muted">
              <span>{t.state === "SOLD_OUT" ? "Zusatztermine" : "Vormerken"}</span>
              <strong>möglich</strong>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
