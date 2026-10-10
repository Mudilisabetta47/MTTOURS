import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/content/company";
import { DEPARTURE_POINTS } from "@/content/places";
import { SplitText } from "@/components/site/split-text";
import { ContactForm } from "./contact-form";
import "@/styles/trip.css";

export const metadata: Metadata = {
  title: { absolute: "Kontakt | METROPOL TOURS Hannover" },
  description: `METROPOL TOURS erreichen: Telefon ${COMPANY.phoneDisplay}, ${COMPANY.email}, ${COMPANY.street}, ${COMPANY.postalCode} ${COMPANY.city}.`,
  alternates: { canonical: "/kontakt" },
  robots: process.env.APP_ENV === "production" ? undefined : { index: false, follow: false },
};

export default function KontaktPage() {
  const tel = COMPANY.phone.replace(/\s/g, "");
  return (
    <>
      <header className="page-hero">
        <div className="shell">
          <p className="mono-label" style={{ color: "var(--brand)" }}>
            Kontakt
          </p>
          <SplitText as="h1" text={"Sprechen Sie\nmit uns."} />
        </div>
      </header>
      <section className="sec shell">
        <div className="split2">
          <div className="kcards">
            <a className="kcard" href={`tel:${tel}`}>
              <span className="mono-label">Telefon</span>
              <strong>{COMPANY.phoneDisplay}</strong>
              <span>{COMPANY.hours}</span>
            </a>
            <a className="kcard" href={`mailto:${COMPANY.email}`}>
              <span className="mono-label">E-Mail</span>
              <strong>{COMPANY.email}</strong>
            </a>
            <div className="kcard">
              <span className="mono-label">Anschrift</span>
              <strong>{COMPANY.legalName}</strong>
              <span>
                {COMPANY.street}, {COMPANY.postalCode} {COMPANY.city}
              </span>
            </div>
            <div className="kcard kcard--links">
              <span className="mono-label">Direkt</span>
              <Link href="/bus-mieten#anfrage">Bus mit Fahrer anfragen →</Link>
              <Link href="/reisen">Reise finden →</Link>
              <Link href="/zustiege">Zustiege: {DEPARTURE_POINTS.map((d) => d.name).join(", ")} →</Link>
            </div>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
