import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { landingBySlug, landingSlugs } from "@/content/landing";
import { COMPANY } from "@/content/company";
import { SplitText } from "@/components/site/split-text";
import { JsonLd } from "@/components/site/json-ld";
import "@/styles/trip.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return landingSlugs.map((landing) => ({ landing }));
}

type Props = { params: Promise<{ landing: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { landing } = await params;
  const c = landingBySlug[landing];
  if (!c) return {};
  return {
    title: { absolute: `${c.seoTitle} | METROPOL TOURS` },
    description: c.seoDescription,
    alternates: { canonical: `/${c.slug}` },
    openGraph: { type: "website", locale: "de_DE", siteName: "METROPOL TOURS", title: c.h1, description: c.seoDescription, images: [{ url: "/media/metropol-man-lions-coach.jpg" }] },
    robots: process.env.APP_ENV === "production" ? undefined : { index: false, follow: false },
  };
}

export default async function LandingPage({ params }: Props) {
  const { landing } = await params;
  const c = landingBySlug[landing];
  if (!c) notFound();
  const tel = COMPANY.phone.replace(/\s/g, "");
  const inquiryHref = `/bus-mieten${c.locality ? `?start=${encodeURIComponent(c.locality)}` : ""}#anfrage`;
  const url = `${COMPANY.url}/${c.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: c.h1,
        description: c.seoDescription,
        url,
        serviceType: "Busvermietung mit Fahrer",
        provider: { "@id": `${COMPANY.url}/#organization` },
        // Only the real company seat is an address; other cities are service areas, not locations.
        areaServed: c.locality ? { "@type": "City", name: c.locality } : c.area.cities.slice(0, 10).map((n) => ({ "@type": "City", name: n })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Start", item: COMPANY.url },
          { "@type": "ListItem", position: 2, name: "Bus mieten", item: `${COMPANY.url}/bus-mieten` },
          { "@type": "ListItem", position: 3, name: c.h1, item: url },
        ],
      },
      ...(c.faqs.length
        ? [{ "@type": "FAQPage", mainEntity: c.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }]
        : []),
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <header className="page-hero page-hero--photo">
        <div className="ki">
          <Image src="/media/metropol-man-lions-coach.jpg" alt="Reisebus von METROPOL TOURS (echtes Foto)" fill priority sizes="100vw" quality={80} style={{ objectFit: "cover", objectPosition: "62% 55%" }} />
        </div>
        <div className="shell" style={{ display: "grid", gap: "1.2rem" }}>
          <nav aria-label="Brotkrumen" className="crumbs">
            <Link href="/">Start</Link> <span aria-hidden="true">/</span> <Link href="/bus-mieten">Bus mieten</Link> <span aria-hidden="true">/</span>{" "}
            <span aria-current="page">{c.h1}</span>
          </nav>
          <p className="mono-label" style={{ color: "var(--brand)" }}>
            {c.heroKicker}
          </p>
          <SplitText as="h1" text={c.h1} className="thero__title" />
          {c.heroText ? (
            <p className="thero__lead" data-reveal="up">
              {c.heroText}
            </p>
          ) : null}
          <ul className="chips chips--dark" aria-label="Auf einen Blick">
            {c.heroFacts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <div className="hero__ctas">
            <Link className="btn btn--brand btn--lg btn--arrow" href={inquiryHref as never} data-magnetic="0.25">
              Angebot anfragen
            </Link>
            <a className="btn btn--ghost-light btn--lg" href={`tel:${tel}`}>
              {COMPANY.phoneDisplay}
            </a>
          </div>
        </div>
      </header>

      {c.why.length ? (
        <section className="sec shell" aria-labelledby="l-why">
          <div className="sec-head">
            <p className="mono-label">Warum Metropol Tours</p>
            <SplitText as="h2" id="l-why" text="Worauf Sie sich verlassen können." />
          </div>
          <ol className="steps4">
            {c.why.map((w, i) => (
              <li key={w.title} data-reveal="up" style={{ "--rv-delay": `${i * 80}ms` } as React.CSSProperties}>
                <span className="steps4__n">0{i + 1}</span>
                <strong>{w.title}</strong>
                <p>{w.text}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {c.sections.length ? (
        <section className="sec shell landing-prose" aria-label="Informationen">
          {c.sections.map((s) => (
            <div key={s.h2} className="split2 landing-prose__row">
              <h2>{s.h2}</h2>
              <div className="prose">
                {s.body.map((b) => (
                  <p key={b.slice(0, 40)}>{b}</p>
                ))}
                {s.blocks?.map((b) => (
                  <div key={b.h3}>
                    <h3>{b.h3}</h3>
                    <p>{b.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {c.occasions.length ? (
        <section className="sec shell" aria-labelledby="l-occ">
          <div className="sec-head">
            <p className="mono-label">Anlässe</p>
            <h2 id="l-occ">Wofür Gruppen uns buchen</h2>
          </div>
          <div className="rental__grid">
            {c.occasions.map((o) => (
              <Link key={o.title} href={inquiryHref as never} className="rental__item">
                <h3>
                  {o.title} <span aria-hidden="true">→</span>
                </h3>
                <p>{o.text}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="sec on-dark" aria-labelledby="l-process">
        <div className="shell">
          <div className="sec-head">
            <p className="mono-label">Ablauf</p>
            <h2 id="l-process">So läuft Ihre Anfrage</h2>
          </div>
          <ol className="steps4">
            {c.process.map((p, i) => (
              <li key={p.title}>
                <span className="steps4__n">0{i + 1}</span>
                <strong>{p.title.replace(/^\d+\.\s*/, "")}</strong>
                <p>{p.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sec shell" aria-labelledby="l-area">
        <div className="split2">
          <div className="sec-head">
            <p className="mono-label">Einsatzgebiet</p>
            <h2 id="l-area">Wo wir fahren</h2>
            {c.area.intro ? <p>{c.area.intro}</p> : null}
            <ul className="chips">
              {c.area.cities.map((city) => (
                <li key={city}>{city}</li>
              ))}
            </ul>
          </div>
          {c.advantages.length ? (
            <div>
              <h3 style={{ fontSize: "var(--step-2)", marginBlockEnd: "1rem" }}>Ihre Vorteile</h3>
              <ul className="incl__list incl__list--yes">
                {c.advantages.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {c.faqs.length ? (
        <section className="sec shell" aria-labelledby="l-faq">
          <div className="split2">
            <div className="sec-head">
              <p className="mono-label">Fragen</p>
              <h2 id="l-faq">Häufige Fragen</h2>
            </div>
            <div className="faq">
              {c.faqs.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {c.links.length ? (
        <section className="sec shell" aria-labelledby="l-links" style={{ paddingBlockStart: 0 }}>
          <h2 id="l-links" className="tsub">
            Weitere Seiten
          </h2>
          <div className="links3">
            {c.links.map((l) => (
              <Link key={l.path} href={l.path as never} className="links3__card">
                <strong>{l.label}</strong>
                <span>{l.text}</span>
                <span aria-hidden="true" className="links3__go">
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="sec shell" aria-labelledby="l-cta" style={{ paddingBlockStart: 0 }}>
        <div className="pmore__card pmore__card--green" style={{ minBlockSize: 0 }}>
          <span className="mono-label">Anfrage</span>
          <h2 id="l-cta">{c.ctaTitle.replace(/Festpreis/gi, "Angebot")}</h2>
          <p>{c.ctaText}</p>
          <div className="hero__ctas">
            <Link className="btn btn--lg mega__cta-btn" href={inquiryHref as never}>
              Angebot anfragen →
            </Link>
            <a className="btn btn--ghost-light btn--lg" href={`tel:${tel}`}>
              {COMPANY.phoneDisplay}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
