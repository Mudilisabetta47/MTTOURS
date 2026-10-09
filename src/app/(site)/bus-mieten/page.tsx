import type { Metadata } from "next";
import Link from "next/link";
import { OCCASIONS } from "@/content/rental";
import { COMPANY } from "@/content/company";
import { DEPARTURE_POINTS } from "@/content/places";
import { SplitText } from "@/components/site/split-text";
import { InquiryForm } from "./inquiry-form";

export const metadata: Metadata = {
  title: { absolute: "Bus mieten mit Fahrer – Hannover, Bremen, Hamburg | METROPOL TOURS" },
  description:
    "Reisebus mit Fahrer für Klassenfahrt, Verein, Firmenevent oder Transfer. Strecke, Datum und Personenzahl angeben – Sie erhalten ein schriftliches Angebot.",
  alternates: { canonical: "/bus-mieten" },
  robots: process.env.APP_ENV === "production" ? undefined : { index: false, follow: false },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.slice(0, 200);

export default async function BusMietenPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const defaults = {
    anlass: one(sp.anlass),
    start: one(sp.start),
    ziel: one(sp.ziel),
    datum: one(sp.datum)?.match(/^\d{4}-\d{2}-\d{2}$/) ? one(sp.datum) : undefined,
    personen: one(sp.personen)?.match(/^\d{1,3}$/) ? one(sp.personen) : undefined,
  };

  return (
    <>
      <header className="page-hero">
        <div className="shell">
          <p className="mono-label" style={{ color: "var(--brand)" }}>
            Busvermietung mit Fahrer
          </p>
          <SplitText as="h1" text={"Bus mieten.\nFahrer inklusive."} />
          <p data-reveal="up">
            Ob Klassenfahrt, Firmenevent oder Transfer: Wir stellen den passenden Bus mit Fahrer. Teilen Sie uns Strecke,
            Termin und Personenzahl mit – wir kalkulieren Ihre Fahrt.
          </p>
        </div>
      </header>

      <section className="sec shell" aria-labelledby="occ-title">
        <div className="sec-head">
          <p className="mono-label">Wofür</p>
          <h2 id="occ-title">Typische Fahrten</h2>
        </div>
        <div className="rental__grid">
          {OCCASIONS.map((o) => (
            <Link key={o.key} href={`/bus-mieten?anlass=${o.key}#anfrage` as never} className="rental__item" scroll={false}>
              <h3>
                {o.label} <span aria-hidden="true">→</span>
              </h3>
              <p>{o.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="anfrage" className="sec inq-sec" aria-labelledby="inq-title">
        <div className="shell split2">
          <div className="sec-head" style={{ alignSelf: "start", position: "sticky", insetBlockStart: "6rem" }}>
            <p className="mono-label">Anfrage</p>
            <h2 id="inq-title">Angebot anfordern</h2>
            <p>Je genauer die Angaben, desto genauer das Angebot. Pflichtfelder sind mit * markiert.</p>
            <p>
              Lieber telefonisch?{" "}
              <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}>
                <strong>{COMPANY.phoneDisplay}</strong>
              </a>
              <br />
              <span style={{ fontSize: "var(--step--1)" }}>{COMPANY.hours}</span>
            </p>
            <p style={{ fontSize: "var(--step--1)" }}>
              Unsere Haltestellen: {DEPARTURE_POINTS.map((d) => d.stop).join(", ")}. Für Mietfahrten holen wir Sie an Ihrer Adresse ab.
            </p>
          </div>
          <InquiryForm defaults={defaults} />
        </div>
      </section>
    </>
  );
}
