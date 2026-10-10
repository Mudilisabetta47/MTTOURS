import Link from "next/link";
import type { TripSummary } from "@/server/catalog/trips";
import { tripPath } from "@/server/catalog/trips";
import { DestinationArt, artFor } from "@/components/home/destination-art";
import { formatEur } from "@/lib/money";
import { formatDate } from "@/lib/time";

export function TripCard({ t }: { t: TripSummary }) {
  return (
    <Link href={tripPath(t) as never} className="tcard" data-cursor="cta" data-cursor-label="Ansehen">
      <div className="tcard__art">
        <DestinationArt d={artFor(t)} className="tcard__svg" />
        <span className="tcard__badge">{t.next ? "Buchbar" : "Termine in Planung"}</span>
      </div>
      <div className="tcard__body">
        <span className="mono-label">
          {t.category ?? "Reise"} · {t.durationDays} Tage
        </span>
        <h3>{t.title}</h3>
        <p>{t.summary}</p>
        <dl className="tcard__facts">
          {t.boardingCities.length ? (
            <div>
              <dt>Zustieg</dt>
              <dd>{t.boardingCities.join(" · ")}</dd>
            </div>
          ) : null}
          <div>
            <dt>{t.next ? "Nächster Termin" : "Termine"}</dt>
            <dd>{t.next ? `${formatDate(t.next.departAt)}${t.next.count > 1 ? ` · ${t.next.count} Termine` : ""}` : "Neue Termine folgen"}</dd>
          </div>
        </dl>
        <div className="tcard__foot">
          {t.next ? (
            <span className="tcard__price">
              ab <strong>{formatEur(t.next.fromPriceCents)}</strong> p. P.
            </span>
          ) : (
            <span className="tcard__price tcard__price--muted">Preis je Termin</span>
          )}
          <span className="tcard__go" aria-hidden="true">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
