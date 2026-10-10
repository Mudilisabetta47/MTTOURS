import type { Metadata } from "next";
import Link from "next/link";
import { FAQ } from "@/content/faq";
import { COMPANY } from "@/content/company";
import { SplitText } from "@/components/site/split-text";
import { JsonLd } from "@/components/site/json-ld";
import "@/styles/trip.css";

export const metadata: Metadata = {
  title: { absolute: "Fragen & Antworten zu Buchung, Tickets und Busmiete | METROPOL TOURS" },
  description: "Antworten zu Buchung, Zahlung, Tickets, Gepäck und Busvermietung bei METROPOL TOURS.",
  alternates: { canonical: "/faq" },
  robots: process.env.APP_ENV === "production" ? undefined : { index: false, follow: false },
};

export default function FaqPage() {
  const tel = COMPANY.phone.replace(/\s/g, "");
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.flatMap((g) => g.items).map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
      <header className="page-hero">
        <div className="shell">
          <p className="mono-label" style={{ color: "var(--brand)" }}>
            Service
          </p>
          <SplitText as="h1" text={"Fragen &\nAntworten."} />
        </div>
      </header>
      <section className="sec shell">
        <div className="faqnav">
          {FAQ.map((g) => (
            <a key={g.id} href={`#${g.id}`} className="chips__link">
              {g.title}
            </a>
          ))}
        </div>
        {FAQ.map((g) => (
          <div key={g.id} id={g.id} className="split2 faqgroup">
            <h2>{g.title}</h2>
            <div className="faq">
              {g.items.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        ))}
        <div className="pmore__card pmore__card--green" style={{ minBlockSize: 0, marginBlockStart: "3rem" }}>
          <span className="mono-label">Noch Fragen?</span>
          <h2>Wir sind für Sie da.</h2>
          <p>
            {COMPANY.hours} · <a href={`tel:${tel}`}>{COMPANY.phoneDisplay}</a>
          </p>
          <div className="hero__ctas">
            <Link className="btn mega__cta-btn" href="/kontakt">
              Kontakt
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
