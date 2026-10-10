import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db/client";
import { listPublishedTrips } from "@/server/catalog/trips";
import { TripResult } from "@/components/trip/trip-result";
import { SplitText } from "@/components/site/split-text";
import { KiImage } from "@/components/site/ki-image";
import { COMPANY, LEGAL_LINKS } from "@/content/company";
import { DEPARTURE_POINTS } from "@/content/places";
import "@/styles/trip.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Pauschalreisen mit dem Bus ab Hannover, Bremen und Hamburg | METROPOL TOURS" },
  description:
    "Pauschalreisen im Reisebus ans Mittelmeer: Nizza, Lloret de Mar und weitere Ziele. Zustieg in Hamburg, Bremen oder Hannover, feste Termine, online buchbar.",
  alternates: { canonical: "/pauschalreisen" },
  robots: process.env.APP_ENV === "production" ? undefined : { index: false, follow: false },
};

export default async function PauschalreisenPage() {
  const trips = await listPublishedTrips(db, { productType: "PACKAGE_TOUR" });
  const bookable = trips.filter((t) => t.next).length;
  const tel = COMPANY.phone.replace(/\s/g, "");

  return (
    <>
      <header className="phero phero--photo">
        <KiImage src="/media/ki/slider-strandurlaub.jpg" alt="Türkisfarbenes Meer und Sandstrand an einer Mittelmeerküste" priority className="phero__photo" />
        <div className="phero__shade" aria-hidden="true" />
        <div className="shell phero__inner">
          <p className="mono-label" style={{ color: "var(--brand)" }}>
            Pauschalreisen mit dem Bus
          </p>
          <SplitText as="h1" text={"Einsteigen.\nAnkommen.\nUrlaub."} className="phero__title" />
          <p className="phero__lead" data-reveal="up">
            Busreisen mit festen Terminen ans Mittelmeer – Zustieg in {DEPARTURE_POINTS.map((d) => d.name).join(", ").replace(/, ([^,]*)$/, " oder $1")}.
          </p>
          <div className="hero__ctas" data-reveal="up">
            <a className="btn btn--brand btn--lg btn--arrow" href="#reisen" data-magnetic="0.25">
              Reisen ansehen
            </a>
            <Link className="btn btn--ghost-light btn--lg" href="/bus-mieten?anlass=gruppenreise#anfrage">
              Gruppenreise anfragen
            </Link>
          </div>
          <p className="phero__status mono-label" data-reveal="fade">
            {bookable > 0 ? `${bookable} ${bookable === 1 ? "Reise" : "Reisen"} mit freien Plätzen` : "Neue Termine sind in Planung"}
          </p>
        </div>
      </header>

      <section id="reisen" className="sec shell" aria-labelledby="p-trips">
        <div className="sec-head">
          <p className="mono-label">Unsere Pauschalreisen</p>
          <SplitText as="h2" id="p-trips" text="Ziele am Mittelmeer." />
          <p data-reveal="up">Jede Reise mit Busanreise ab Norddeutschland. Termine, Preise und freie Plätze sehen Sie auf der jeweiligen Reiseseite.</p>
        </div>
        {trips.length ? (
          <div className="tresults">
            {trips.map((t) => (
              <TripResult key={t.slug} t={t} />
            ))}
          </div>
        ) : (
          <p className="tnote">Zurzeit ist keine Pauschalreise veröffentlicht.</p>
        )}
      </section>

      <section className="sec on-dark" aria-labelledby="p-how">
        <div className="shell">
          <div className="sec-head">
            <p className="mono-label">So buchen Sie</p>
            <SplitText as="h2" id="p-how" text="Vier Schritte bis zum Urlaub." />
          </div>
          <ol className="steps4">
            {[
              ["Reise & Termin", "Reise öffnen, Termin wählen. Sie sehen Preis und freie Plätze sofort."],
              ["Zustieg & Tarif", "Hamburg, Bremen oder Hannover – mit Abfahrtszeit, Steig und Aufpreis. Dazu den Tarif mit Gepäck und Stornoregeln."],
              ["Reisende & Zahlung", "Namen der Reisenden angeben und online bezahlen. Ihre Plätze sind während der Zahlung reserviert."],
              ["Bestätigung & Ticket", "Buchungsbestätigung und Ticket mit QR-Code per E-Mail. Beim Einsteigen zeigen Sie den Code vor."],
            ].map(([h, p], i) => (
              <li key={h} data-reveal="up" style={{ "--rv-delay": `${i * 90}ms` } as React.CSSProperties}>
                <span className="steps4__n">0{i + 1}</span>
                <strong>{h}</strong>
                <p>{p}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sec shell" aria-labelledby="p-trust">
        <div className="split2">
          <div className="sec-head">
            <p className="mono-label">Sicher gebucht</p>
            <h2 id="p-trust">Pauschalreise heißt: geregelt.</h2>
            <p>Für Pauschalreisen gelten die §§ 651a ff. BGB. Vor der Buchung erhalten Sie das gesetzliche Formblatt mit Ihren wichtigsten Rechten.</p>
          </div>
          <dl className="facts">
            <div>
              <dt>Veranstalter</dt>
              <dd>{COMPANY.legalName}, {COMPANY.city}</dd>
            </div>
            <div>
              <dt>Zahlung</dt>
              <dd>Online bei der Buchung</dd>
            </div>
            <div>
              <dt>Bedingungen</dt>
              <dd>
                <a href={LEGAL_LINKS.terms}>Reisebedingungen</a>
              </dd>
            </div>
            <div>
              <dt>Beratung</dt>
              <dd>
                <a href={`tel:${tel}`}>{COMPANY.phoneDisplay}</a> · {COMPANY.hours}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="sec shell" aria-labelledby="p-more">
        <div className="pmore">
          <Link href="/wochenendtrips" className="pmore__card" data-cursor="cta">
            <span className="mono-label">Kurz weg</span>
            <h2 id="p-more">Wochenendtrips</h2>
            <p>Amsterdam, Kopenhagen, Prag und Paris – Sie buchen die Busfahrt, die Unterkunft optional.</p>
            <span className="pmore__go" aria-hidden="true">
              →
            </span>
          </Link>
          <Link href="/bus-mieten?anlass=gruppenreise#anfrage" className="pmore__card pmore__card--green" data-cursor="cta">
            <span className="mono-label">Ab etwa 20 Personen</span>
            <h2>Gruppenreise nach Wunsch</h2>
            <p>Eigener Termin, eigenes Ziel. Wir planen Bus, Fahrer und auf Wunsch Hotel und Programm.</p>
            <span className="pmore__go" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}
