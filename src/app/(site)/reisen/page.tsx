import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db/client";
import { listBookableTrips } from "@/server/catalog/public";
import { DEPARTURE_POINTS, DESTINATIONS } from "@/content/places";
import { COMPANY } from "@/content/company";
import { formatEur } from "@/lib/money";
import { formatDate } from "@/lib/time";
import { SplitText } from "@/components/site/split-text";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Busreisen ab Hannover, Bremen und Hamburg – Termine | METROPOL TOURS" },
  description: "Busreisen mit festen Terminen, Zustiegen in Hamburg, Bremen und Hannover. Nur freigegebene Termine mit freien Plätzen.",
  alternates: { canonical: "/reisen" },
  robots: process.env.APP_ENV === "production" ? undefined : { index: false, follow: false },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.slice(0, 40);

export default async function ReisenPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filter = {
    ziel: one(sp.ziel),
    ab: one(sp.ab),
    monat: one(sp.monat),
    personen: Number(one(sp.personen)) || 1,
  };
  const trips = await listBookableTrips(db, filter);
  const dest = DESTINATIONS.find((d) => d.slug === filter.ziel);
  const hasFilter = Boolean(filter.ziel || filter.ab || filter.monat);

  return (
    <>
      <header className="page-hero">
        <div className="shell">
          <p className="mono-label" style={{ color: "var(--brand)" }}>
            Reisen
          </p>
          <SplitText as="h1" text={dest ? `Reisen nach\n${dest.name}.` : "Reisen mit\nfesten Terminen."} />
        </div>
      </header>
      <section className="sec shell" aria-label="Suchergebnis">
        <form className="search__form" action="/reisen" method="get" style={{ marginBlockEnd: "2.5rem" }}>
          <div className="field">
            <label htmlFor="f-ziel">Reiseziel</label>
            <select id="f-ziel" name="ziel" defaultValue={filter.ziel ?? ""}>
              <option value="">Alle Ziele</option>
              {DESTINATIONS.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-ab">Abfahrtsort</label>
            <select id="f-ab" name="ab" defaultValue={filter.ab ?? ""}>
              <option value="">Alle Abfahrtsorte</option>
              {DEPARTURE_POINTS.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-monat">Zeitraum ab</label>
            <input id="f-monat" name="monat" type="month" defaultValue={filter.monat} />
          </div>
          <div className="field">
            <label htmlFor="f-pers">Reisende</label>
            <input id="f-pers" name="personen" type="number" min={1} max={60} defaultValue={filter.personen} />
          </div>
          <button className="btn btn--brand" type="submit">
            Aktualisieren
          </button>
        </form>

        <p aria-live="polite" className="tabular" style={{ color: "var(--fg-muted)", marginBlockEnd: "1.25rem" }}>
          {trips.length === 1 ? "1 Reise" : `${trips.length} Reisen`} mit freien Plätzen
        </p>

        {trips.length > 0 ? (
          <div className="trips__grid">
            {trips.map((t) => (
              <article key={t.slug} className="trip-card">
                <span className="mono-label">{t.destination}</span>
                <strong style={{ fontSize: "var(--step-2)" }}>{t.title}</strong>
                <span>
                  {t.durationDays} Tage · nächster Termin {formatDate(t.nextDepartureAt)}
                </span>
                <span>Zustieg: {t.boardingCities.join(", ")}</span>
                <span>
                  {t.seatsLeftOnNext <= 10 ? `Noch ${t.seatsLeftOnNext} Plätze` : "Plätze frei"} · ab {formatEur(t.fromPriceCents)} p. P.
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="trips__empty">
            <div style={{ display: "grid", gap: "0.8rem" }}>
              <h2 style={{ fontSize: "var(--step-3)", letterSpacing: "var(--track-display)" }}>
                {hasFilter ? "Für diese Auswahl gibt es gerade keinen buchbaren Termin." : "Aktuell ist kein Reisetermin online buchbar."}
              </h2>
              <p>
                Wir zeigen nur Termine, die freigegeben sind und freie Plätze haben. Für Gruppen ab etwa 20 Personen
                planen wir die Reise auch individuell.
              </p>
            </div>
            <div className="actions">
              <Link className="btn btn--brand" href={`/bus-mieten?anlass=gruppenreise${dest ? `&ziel=${encodeURIComponent(dest.name)}` : ""}#anfrage` as never}>
                Gruppenreise anfragen
              </Link>
              {hasFilter ? (
                <Link className="btn btn--ghost" href="/reisen">
                  Alle Reisen
                </Link>
              ) : (
                <a className="btn btn--ghost" href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}>
                  {COMPANY.phoneDisplay}
                </a>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
