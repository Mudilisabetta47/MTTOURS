import type { Metadata } from "next";
import { COMPANY } from "@/content/company";

export const metadata: Metadata = {
  title: "Impressum",
  alternates: { canonical: "/impressum" },
  robots: { index: false, follow: true },
};

/** Content as published on www.metours.de/imprint (09.10.2026). Changes only after confirmation by the company. */
export default function ImpressumPage() {
  return (
    <>
      <header className="page-hero">
        <div className="shell">
          <h1>Impressum</h1>
        </div>
      </header>
      <section className="sec shell">
        <div className="prose">
          <p>
            <strong>{COMPANY.legalName}</strong>
            <br />
            {COMPANY.street}
            <br />
            {COMPANY.postalCode} {COMPANY.city}
          </p>
          <p>
            Handelsregister: HRB 222247
            <br />
            Registergericht: Hannover
          </p>
          <p>
            Vertreten durch:
            <br />
            {COMPANY.managingDirector}
          </p>
          <h2>Kontakt</h2>
          <p>
            Telefon: <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}>{COMPANY.phone}</a>
            <br />
            E-Mail: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
          </p>
          <h2>Redaktionell verantwortlich</h2>
          <p>{COMPANY.editorialResponsible}</p>
          <h2>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
          <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
        </div>
      </section>
    </>
  );
}
