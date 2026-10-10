import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db/client";
import { listPublishedTrips } from "@/server/catalog/trips";
import { DEPARTURE_POINTS, DESTINATIONS } from "@/content/places";
import { COMPANY } from "@/content/company";
import { TripCard } from "@/components/trip/trip-card";
import "@/styles/trip.css";
import "@/styles/product.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Busreisen ab Hannover, Bremen und Hamburg – alle Reisen | METROPOL TOURS" },
  description: "Alle Busreisen von METROPOL TOURS: Pauschalreisen und Wochenendtrips mit Zustieg in Hamburg, Bremen und Hannover. Buchbare Termine mit freien Plätzen.",
  alternates: { canonical: "/reisen" },
  robots: process.env.APP_ENV === "production" ? undefined : { index: false, follow: false },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.slice(0, 40);

export default async function ReisenPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = one(sp.q)?.trim().toLowerCase() ?? "";
  const ziel = one(sp.ziel);
  const ab = one(sp.ab);
  const monat = one(sp.monat);
  const personen = Math.max(1, Math.min(60, Number(one(sp.personen)) || 1));
  const dest = DESTINATIONS.find((d) => d.slug === ziel);
  const point = DEPARTURE_POINTS.find((d) => d.slug === ab);
  const monthStart = monat && /^\d{4}-\d{2}$/.test(monat) ? new Date(`${monat}-01T00:00:00Z`) : null;

  const all = await listPublishedTrips(db);
  const trips = all.filter(
    (t) =>
      (!q || `${t.title} ${t.destination} ${t.category ?? ""}`.toLowerCase().includes(q)) &&
      (!dest || t.destination.toLowerCase() === dest.name.toLowerCase()) &&
      (!point || t.boardingCities.some((c) => c.toLowerCase() === point.name.toLowerCase())) &&
      (!monthStart || (t.next && t.next.departAt >= monthStart)) &&
      (personen <= 1 || !t.next || t.next.seatsLeft >= personen),
  );
  const bookable = trips.filter((t) => t.next);
  const planned = trips.filter((t) => !t.next);
  const hasFilter = Boolean(q || dest || point || monthStart);

  return (
    <>
      <header className="rhero">
        <div className="shell">
          <nav aria-label="Brotkrumen" className="tp-crumbs">
            <Link href="/">Start</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Reisen</span>
          </nav>
          <p className="rhero__kicker">Busreisen ab Hamburg, Bremen und Hannover</p>
          <h1 className="rhero__title">{dest ? `Reisen nach ${dest.name}` : q ? `Ihre Suche: „${q}“` : "Wohin soll es gehen?"}</h1>
          <p className="rhero__lead">Feste Termine, echte Preise und freie Plätze – direkt aus unserem Buchungssystem.</p>
          <form className="rsearch" action="/reisen" method="get" role="search">
            {q ? <input type="hidden" name="q" value={q} /> : null}
            <div className="rsearch__field">
              <label htmlFor="f-ziel">Reiseziel</label>
              <select id="f-ziel" name="ziel" defaultValue={ziel ?? ""}>
                <option value="">Alle Ziele</option>
                {DESTINATIONS.map((d) => (
                  <option key={d.slug} value={d.slug}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="rsearch__field">
              <label htmlFor="f-ab">Abfahrt ab</label>
              <select id="f-ab" name="ab" defaultValue={ab ?? ""}>
                <option value="">Alle Zustiege</option>
                {DEPARTURE_POINTS.map((d) => (
                  <option key={d.slug} value={d.slug}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="rsearch__field">
              <label htmlFor="f-monat">Reisezeitraum ab</label>
              <input id="f-monat" name="monat" type="month" defaultValue={monat} />
            </div>
            <div className="rsearch__field rsearch__field--s">
              <label htmlFor="f-pers">Reisende</label>
              <input id="f-pers" name="personen" type="number" min={1} max={60} defaultValue={personen} />
            </div>
            <button className="btn btn--brand btn--lg btn--arrow rsearch__go" type="submit">
              Reisen finden
            </button>
          </form>
          <ul className="rhero__quick" aria-label="Schnellauswahl">
            <li>
              <Link href="/pauschalreisen">Pauschalreisen</Link>
            </li>
            <li>
              <Link href="/wochenendtrips">Wochenendtrips</Link>
            </li>
            <li>
              <Link href={"/bus-mieten?anlass=gruppenreise#anfrage" as never}>Gruppenreise anfragen</Link>
            </li>
            {hasFilter ? (
              <li>
                <Link href="/reisen">Filter zurücksetzen</Link>
              </li>
            ) : null}
          </ul>
        </div>
      </header>
      <section className="sec shell rresults" aria-label="Reisen">
        <p aria-live="polite" className="tabular tcount">
          {bookable.length === 1 ? "1 Reise" : `${bookable.length} Reisen`} mit freien Plätzen
          {planned.length ? ` · ${planned.length} in Planung` : ""}
        </p>

        {bookable.length ? (
          <div className="tgrid" style={{ marginBlockEnd: "3rem" }}>
            {bookable.map((t, i) => (
              <TripCard key={t.slug} t={t} priority={i < 3} />
            ))}
          </div>
        ) : (
          <div className="rempty">
            <div style={{ display: "grid", gap: "0.8rem" }}>
              <h2 style={{ fontSize: "var(--step-3)", letterSpacing: "var(--track-display)" }}>
                {hasFilter ? "Für diese Auswahl gibt es gerade keinen buchbaren Termin." : "Aktuell ist kein Reisetermin online buchbar."}
              </h2>
              <p>Wir zeigen nur Termine, die freigegeben sind und freie Plätze haben. Unten finden Sie Reisen, für die neue Termine geplant werden.</p>
            </div>
            <div className="actions">
              <Link className="btn btn--brand" href={`/bus-mieten?anlass=gruppenreise${dest ? `&ziel=${encodeURIComponent(dest.name)}` : ""}#anfrage` as never}>
                Gruppenreise anfragen
              </Link>
              <a className="btn btn--ghost" href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}>
                {COMPANY.phoneDisplay}
              </a>
            </div>
          </div>
        )}

        {planned.length && !monthStart ? (
          <>
            <h2 className="tsub">Ausgebucht oder neue Termine in Planung</h2>
            <div className="tgrid">
              {planned.map((t) => (
                <TripCard key={t.slug} t={t} />
              ))}
            </div>
          </>
        ) : null}
      </section>
    </>
  );
}
