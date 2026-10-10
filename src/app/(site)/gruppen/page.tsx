import type { Metadata } from "next";
import Link from "next/link";
import { SplitText } from "@/components/site/split-text";
import { KiImage } from "@/components/site/ki-image";
import "@/styles/trip.css";

export const metadata: Metadata = {
  title: { absolute: "Busreisen und Busvermietung für Gruppen | METROPOL TOURS" },
  description: "Für Schulklassen, Vereine, Unternehmen und Reisegruppen: Bus mit Fahrer, eigene Termine, Abholung an Ihrer Adresse. Jetzt Gruppenanfrage stellen.",
  alternates: { canonical: "/gruppen" },
  robots: process.env.APP_ENV === "production" ? undefined : { index: false, follow: false },
};

const GROUPS = [
  { id: "schulen", title: "Schulklassen", text: "Wandertag, Klassenfahrt oder Studienreise – Abfahrt an der Schule, Rechnung auf die Schule.", href: "/schulfahrten" },
  { id: "vereine", title: "Vereine", text: "Auswärtsspiel, Turnier oder Jahresausflug, mit Platz für Ausrüstung.", href: "/vereinsfahrten" },
  { id: "unternehmen", title: "Unternehmen", text: "Betriebsausflug, Kundenevent, Messe oder Werksverkehr – Rechnung auf Ihr Unternehmen, auf Wunsch mit Kostenstelle.", href: "/bus-mieten?anlass=firma#anfrage" },
  { id: "reisegruppen", title: "Reisegruppen", text: "Mehrtägige Reise mit eigenem Termin, auf Wunsch mit Hotel und Programm.", href: "/gruppenreisen" },
  { id: "shuttle", title: "Event- und Messeshuttle", text: "Pendelverkehr zwischen Hotel, Bahnhof und Veranstaltung.", href: "/shuttle-service" },
  { id: "individuell", title: "Individuelle Gruppenreise", text: "Ihr Ziel, Ihr Termin. Wir kalkulieren die Fahrt und schicken ein schriftliches Angebot.", href: "/bus-mieten?anlass=gruppenreise#anfrage" },
];

export default function GruppenPage() {
  return (
    <>
      <header className="page-hero page-hero--photo">
        <KiImage src="/media/ki/hero-group-travel.jpg" alt="Reisegruppe im Reisebus" priority className="page-hero__photo" />
        <div className="shell" style={{ display: "grid", gap: "1rem" }}>
          <p className="mono-label" style={{ color: "var(--brand)" }}>
            Gruppen
          </p>
          <SplitText as="h1" text={"Alle zusammen.\nEin Bus."} className="thero__title" />
          <p className="thero__lead">Ab etwa 20 Personen planen wir Fahrt oder Reise nach Ihren Vorgaben – eigener Termin, eigene Strecke, Abholung an Ihrer Adresse.</p>
          <div className="hero__ctas">
            <Link className="btn btn--brand btn--lg btn--arrow" href="/bus-mieten?anlass=gruppenreise#anfrage">
              Gruppenanfrage stellen
            </Link>
          </div>
        </div>
      </header>
      <section className="sec shell">
        <div className="rental__grid">
          {GROUPS.map((g) => (
            <Link key={g.id} id={g.id} href={g.href as never} className="rental__item">
              <h2 style={{ fontSize: "var(--step-2)" }}>
                {g.title} <span aria-hidden="true">→</span>
              </h2>
              <p>{g.text}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="sec on-dark">
        <div className="shell">
          <div className="sec-head">
            <p className="mono-label">Ablauf</p>
            <h2>Ein Ansprechpartner, ein Angebot.</h2>
          </div>
          <ol className="steps4">
            {[
              ["Anfrage", "Datum, Strecke, Personenzahl – mehr braucht es für den Anfang nicht."],
              ["Angebot", "Sie erhalten ein schriftliches Angebot inklusive Fahrer."],
              ["Bestätigung", "Sie bestätigen, wir planen Bus und Fahrer ein."],
              ["Fahrt", "Abholung an der vereinbarten Adresse."],
            ].map(([h, p], i) => (
              <li key={h}>
                <span className="steps4__n">0{i + 1}</span>
                <strong>{h}</strong>
                <p>{p}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
