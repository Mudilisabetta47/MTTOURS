import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { COMPANY } from "@/content/company";
import { DEPARTURE_POINTS } from "@/content/places";
import { SplitText } from "@/components/site/split-text";
import "@/styles/trip.css";

export const metadata: Metadata = {
  title: { absolute: "Über uns – Busunternehmen aus Hannover | METROPOL TOURS" },
  description: "METROPOL TOURS ist ein Busunternehmen aus Hannover: Busreisen mit festen Terminen und Busvermietung mit Fahrer für Gruppen, Schulen, Vereine und Firmen.",
  alternates: { canonical: "/ueber-uns" },
  robots: process.env.APP_ENV === "production" ? undefined : { index: false, follow: false },
};

export default function UeberUnsPage() {
  return (
    <>
      <header className="page-hero page-hero--photo">
        <div className="ki">
          <Image src="/media/metropol-man-lions-coach.jpg" alt="Reisebus von METROPOL TOURS (echtes Foto)" fill priority sizes="100vw" style={{ objectFit: "cover", objectPosition: "62% 55%" }} />
        </div>
        <div className="shell" style={{ display: "grid", gap: "1rem" }}>
          <p className="mono-label" style={{ color: "var(--brand)" }}>
            Über uns
          </p>
          <SplitText as="h1" text={"Busunternehmen\naus Hannover."} className="thero__title" />
          <p className="thero__lead">Wir verkaufen Busreisen mit festen Terminen und vermieten Busse mit Fahrer – für Gruppen, Schulen, Vereine und Unternehmen.</p>
        </div>
      </header>
      <section className="sec shell">
        <div className="split2">
          <div className="sec-head">
            <p className="mono-label">Was wir machen</p>
            <h2>Zwei Wege zur Fahrt.</h2>
            <p>Sie buchen eine Reise mit festem Termin oder fragen einen Bus mit Fahrer für Ihre Gruppe an. In beiden Fällen sprechen Sie direkt mit uns.</p>
            <div className="hero__ctas">
              <Link className="btn btn--brand btn--arrow" href="/reisen">
                Reisen
              </Link>
              <Link className="btn btn--ghost" href="/bus-mieten">
                Bus mieten
              </Link>
            </div>
          </div>
          <dl className="facts">
            <div>
              <dt>Unternehmen</dt>
              <dd>{COMPANY.legalName}</dd>
            </div>
            <div>
              <dt>Sitz</dt>
              <dd>
                {COMPANY.street}, {COMPANY.postalCode} {COMPANY.city}
              </dd>
            </div>
            <div>
              <dt>Handelsregister</dt>
              <dd>{COMPANY.register}</dd>
            </div>
            <div>
              <dt>Geschäftsführung</dt>
              <dd>{COMPANY.managingDirector}</dd>
            </div>
            <div>
              <dt>Zustiege</dt>
              <dd>{DEPARTURE_POINTS.map((d) => d.stop).join(", ")}</dd>
            </div>
            <div>
              <dt>Erreichbar</dt>
              <dd>
                {COMPANY.phoneDisplay} · {COMPANY.hours}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </>
  );
}
