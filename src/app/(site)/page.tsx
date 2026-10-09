import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/server/db/client";
import { listBookableTrips } from "@/server/catalog/public";
import { COMPANY } from "@/content/company";
import { DEPARTURE_POINTS } from "@/content/places";
import { OCCASIONS } from "@/content/rental";
import { formatEur } from "@/lib/money";
import { formatDate } from "@/lib/time";
import { ScrollStage } from "@/components/site/scroll-stage";
import { SplitText } from "@/components/site/split-text";
import { SearchPanel } from "@/components/home/search-panel";
import { Journey } from "@/components/home/journey";
import { DestinationRail } from "@/components/home/destination-rail";
import { RouteMap } from "@/components/home/route-map";
import { JsonLd, organizationJsonLd } from "@/components/site/json-ld";

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: "Busreisen & Bus mieten ab Hannover, Bremen und Hamburg | METROPOL TOURS" },
  description:
    "Busreisen mit festen Terminen und Reisebus mit Fahrer für Schulen, Vereine und Firmen. Zustiege in Hannover, Bremen und Hamburg. Angebot anfragen oder Reise finden.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "METROPOL TOURS",
    title: "Europa wartet. Wir fahren. – METROPOL TOURS",
    description: "Busreisen und Busvermietung mit Fahrer ab Hannover, Bremen und Hamburg.",
    images: [{ url: "/media/metropol-man-lions-coach.jpg", width: 1919, height: 1290, alt: "Reisebus von METROPOL TOURS" }],
  },
  twitter: { card: "summary_large_image" },
  robots: process.env.APP_ENV === "production" ? undefined : { index: false, follow: false },
};

const tel = COMPANY.phone.replace(/\s/g, "");

export default async function HomePage() {
  const trips = await listBookableTrips(db, {}, new Date(), 6);

  return (
    <>
      <JsonLd data={organizationJsonLd()} />

      {/* 01 HERO */}
      <ScrollStage className="hero" start="top top" end="bottom top" reducedValue={0} aria-labelledby="hero-title">
        <div className="hero__media">
          <Image
            src="/media/metropol-man-lions-coach.jpg"
            alt="Reisebus von METROPOL TOURS: MAN Lion’s Coach in limettengrüner Lackierung"
            fill
            priority
            sizes="100vw"
            quality={80}
          />
        </div>
        <div className="hero__shade" aria-hidden="true" />
        <div className="shell hero__content">
          <p className="mono-label hero__kicker" data-reveal="fade">
            Busreisen · Busvermietung mit Fahrer
          </p>
          <SplitText as="h1" text={"Europa wartet.\nWir fahren."} className="hero__title" />
          <p className="hero__lead" data-reveal="up" style={{ "--rv-delay": "300ms" } as React.CSSProperties}>
            Busreisen und individuelle Busvermietung ab Hannover, Bremen und Hamburg.
          </p>
          <div className="hero__ctas" data-reveal="up" style={{ "--rv-delay": "420ms" } as React.CSSProperties}>
            <a className="btn btn--brand btn--lg" href="#suche" data-magnetic="0.3" data-cursor="cta">
              Reise finden
            </a>
            <Link className="btn btn--ghost-light btn--lg" href="/bus-mieten" data-magnetic="0.3">
              Bus mieten
            </Link>
          </div>
        </div>
        <div className="hero__meta mono-label" aria-hidden="true">
          <span>MAN Lion’s Coach · Hannover</span>
          <span className="hero__scroll" />
        </div>
      </ScrollStage>

      {/* 02 SEARCH */}
      <SearchPanel />

      {/* 03 POPULAR TRIPS (database only) */}
      <section className="sec shell" aria-labelledby="trips-title">
        <div className="sec-head">
          <p className="mono-label">03 · Reisen</p>
          <SplitText as="h2" id="trips-title" text="Mit festen Terminen." />
        </div>
        {trips.length > 0 ? (
          <div className="trips__grid">
            {trips.map((t) => (
              <Link key={t.slug} href={`/reisen/${t.slug}` as never} className="trip-card" data-reveal="up">
                <span className="mono-label">{t.destination}</span>
                <strong style={{ fontSize: "var(--step-2)" }}>{t.title}</strong>
                <span>
                  {t.durationDays} Tage · ab {formatDate(t.nextDepartureAt)}
                  {t.departuresCount > 1 ? ` · ${t.departuresCount} Termine` : ""}
                </span>
                <span>Zustieg: {t.boardingCities.join(", ")}</span>
                <strong>ab {formatEur(t.fromPriceCents)} p. P.</strong>
              </Link>
            ))}
          </div>
        ) : (
          <div className="trips__empty" data-reveal="up">
            <div style={{ display: "grid", gap: "0.8rem" }}>
              <h3>Aktuell ist kein Reisetermin online buchbar.</h3>
              <p>
                Neue Termine erscheinen hier, sobald sie mit Preis und Plätzen freigegeben sind. Für Gruppen planen wir
                Reisen auch außerhalb des Programms.
              </p>
            </div>
            <div className="actions">
              <Link className="btn btn--brand" href="/bus-mieten?anlass=gruppenreise#anfrage" data-magnetic="0.2">
                Gruppenreise anfragen
              </Link>
              <a className="btn btn--ghost" href={`tel:${tel}`}>
                {COMPANY.phoneDisplay}
              </a>
            </div>
          </div>
        )}
      </section>

      {/* 04 SIGNATURE BUS JOURNEY */}
      <Journey />

      {/* Window transition */}
      <ScrollStage className="window" start="top top" end="bottom bottom" aria-label="Blick aus dem Busfenster">
        <div className="window__track">
          <div className="window__stage">
            <div className="window__view" aria-hidden="true" />
            <div className="window__frame" aria-hidden="true" />
            <div className="window__copy">
              <h2>Der Blick aus dem Fenster.</h2>
              <p>Das ist der Teil, für den man reist.</p>
            </div>
          </div>
        </div>
      </ScrollStage>

      {/* 05 DESTINATIONS */}
      <DestinationRail />

      {/* 06 BUS RENTAL */}
      <section className="sec shell" aria-labelledby="rental-title">
        <div className="sec-head">
          <p className="mono-label">06 · Busvermietung</p>
          <SplitText as="h2" id="rental-title" text={"Ein Bus mit Fahrer.\nFür Ihre Gruppe."} />
          <p data-reveal="up">
            Sie nennen Strecke, Termin und Personenzahl. Wir kalkulieren die Fahrt und schicken Ihnen ein schriftliches
            Angebot.
          </p>
        </div>
        <div className="rental__grid">
          {OCCASIONS.map((o, i) => (
            <Link
              key={o.key}
              href={`/bus-mieten?anlass=${o.key}#anfrage` as never}
              className="rental__item"
              data-reveal="up"
              style={{ "--rv-delay": `${(i % 3) * 80}ms` } as React.CSSProperties}
            >
              <h3>
                {o.label} <span aria-hidden="true">→</span>
              </h3>
              <p>{o.text}</p>
            </Link>
          ))}
        </div>
        <div className="rental__foot">
          <ul>
            <li>inklusive Fahrer</li>
            <li>Abholung an Ihrer Adresse</li>
            <li>schriftliches Angebot vor der Buchung</li>
          </ul>
          <Link className="btn btn--brand btn--lg" href="/bus-mieten#anfrage" data-magnetic="0.3" data-cursor="cta">
            Angebot anfragen
          </Link>
        </div>
      </section>

      {/* 07 FLEET */}
      <ScrollStage className="fleet" start="top top" end="bottom bottom" aria-labelledby="fleet-title">
        <div className="fleet__track">
          <div className="fleet__stage">
            <div className="fleet__media">
              <Image src="/media/metropol-man-lions-coach.jpg" alt="" fill sizes="100vw" quality={78} />
            </div>
            <div className="fleet__shade" aria-hidden="true" />
            <div className="fleet__copy shell">
              <p className="mono-label" style={{ color: "var(--brand)" }}>
                07 · Fuhrpark
              </p>
              <h2 id="fleet-title">Ein Bus, den man wiedererkennt.</h2>
              <dl className="fleet__facts">
                <div className="fleet__fact" style={{ "--at": 0.15 } as React.CSSProperties}>
                  <dt>
                    <span>Modell</span>
                  </dt>
                  <dd style={{ margin: 0 }}>
                    <strong>MAN Lion’s Coach</strong>
                  </dd>
                </div>
                <div className="fleet__fact" style={{ "--at": 0.3 } as React.CSSProperties}>
                  <dt>
                    <span>Bauart</span>
                  </dt>
                  <dd style={{ margin: 0 }}>
                    <strong>Reisebus, drei Achsen</strong>
                  </dd>
                </div>
                <div className="fleet__fact" style={{ "--at": 0.45 } as React.CSSProperties}>
                  <dt>
                    <span>Zuhause</span>
                  </dt>
                  <dd style={{ margin: 0 }}>
                    <strong>Hannover</strong>
                  </dd>
                </div>
                <div className="fleet__fact" style={{ "--at": 0.6 } as React.CSSProperties}>
                  <dt>
                    <span>Erkennungszeichen</span>
                  </dt>
                  <dd style={{ margin: 0 }}>
                    <strong>Limettengrün</strong>
                  </dd>
                </div>
              </dl>
              <p className="fleet__credit">Echtes Foto eines Busses der Metropol Tours GmbH.</p>
            </div>
          </div>
        </div>
      </ScrollStage>

      {/* 08 GROUPS & COMPANIES / 09 HOW BOOKING WORKS */}
      <section className="sec shell" aria-labelledby="how-title">
        <div className="sec-head">
          <p className="mono-label">08 · Gruppen, Schulen, Unternehmen</p>
          <SplitText as="h2" id="how-title" text="Zwei Wege. Beide kurz." />
        </div>
        <div className="paths">
          <article className="path" data-reveal="up">
            <p className="mono-label" style={{ color: "var(--brand-deep)" }}>
              Reise buchen
            </p>
            <h3>Fester Termin, fester Preis.</h3>
            <ol>
              <li>Reise und Termin wählen</li>
              <li>Zustieg und Reisende angeben</li>
              <li>Online bezahlen (Karte oder PayPal)</li>
              <li>Ticket per E-Mail, QR-Code beim Einsteigen</li>
            </ol>
            <Link className="btn btn--ghost" href="/reisen" style={{ justifySelf: "start" }}>
              Reisen ansehen
            </Link>
          </article>
          <article className="path path--dark" data-reveal="up" style={{ "--rv-delay": "120ms" } as React.CSSProperties}>
            <p className="mono-label" style={{ color: "var(--brand)" }}>
              Bus mieten
            </p>
            <h3>Ihre Strecke, Ihr Termin.</h3>
            <ol>
              <li>Anfrage mit Strecke, Datum und Personenzahl</li>
              <li>Schriftliches Angebot inklusive Fahrer</li>
              <li>Sie bestätigen, wir planen Bus und Fahrer ein</li>
              <li>Abholung an der vereinbarten Adresse</li>
            </ol>
            <Link className="btn btn--brand" href="/bus-mieten#anfrage" style={{ justifySelf: "start" }}>
              Angebot anfragen
            </Link>
          </article>
        </div>
      </section>

      {/* 10 DEPARTURE POINTS / ROUTE EXPERIENCE */}
      <ScrollStage as="section" className="sec route on-dark" start="top bottom" end="bottom center" id="abfahrtsorte" aria-labelledby="route-title">
        <div className="shell route__layout">
          <div>
            <div className="sec-head" style={{ marginBlockEnd: 0 }}>
              <p className="mono-label">10 · Abfahrtsorte</p>
              <h2 id="route-title">
                <SplitText text={"Einsteigen in Hamburg,\nBremen oder Hannover."} />
              </h2>
              <p data-reveal="up">Welche Zustiege eine Reise hat und wann der Bus dort hält, steht bei jedem Termin.</p>
            </div>
            <div className="stops">
              {DEPARTURE_POINTS.map((d, i) => (
                <div key={d.slug} className="stop" data-reveal="up" style={{ "--rv-delay": `${i * 90}ms` } as React.CSSProperties}>
                  <strong>{d.stop}</strong>
                  <span>{d.address}</span>
                </div>
              ))}
            </div>
          </div>
          <RouteMap />
        </div>
      </ScrollStage>

      {/* 11 COMPANY / TRUST — facts only */}
      <section className="sec shell" aria-labelledby="trust-title">
        <div className="split2">
          <div className="sec-head">
            <p className="mono-label">11 · Unternehmen</p>
            <SplitText as="h2" id="trust-title" text={"Aus Hannover.\nErreichbar."} />
            <p data-reveal="up">Sie sprechen mit uns direkt, nicht mit einem Vermittlungsportal.</p>
          </div>
          <dl className="facts" data-reveal="up">
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
              <dt>Telefon</dt>
              <dd>
                <a href={`tel:${tel}`}>{COMPANY.phoneDisplay}</a> · {COMPANY.hours}
              </dd>
            </div>
            <div>
              <dt>E-Mail</dt>
              <dd>
                <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
              </dd>
            </div>
            <div>
              <dt>Zahlung online</dt>
              <dd>Kreditkarte und PayPal</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* 12 FINAL CTA — last stage retreats and reveals the footer */}
      <ScrollStage className="final" start="bottom bottom" end="bottom top" reducedValue={0} aria-labelledby="final-title">
        <div className="final__panel">
          <h2 id="final-title">
            <SplitText text={"Wohin\nsoll’s gehen?"} />
          </h2>
          <div className="hero__ctas">
            <Link className="btn btn--lg" href="/reisen" data-magnetic="0.3" data-cursor="cta">
              Reise finden
            </Link>
            <Link className="btn btn--ghost btn--lg" href="/bus-mieten#anfrage" data-magnetic="0.3">
              Bus mieten
            </Link>
            <a className="btn btn--ghost btn--lg" href={`tel:${tel}`}>
              {COMPANY.phoneDisplay}
            </a>
          </div>
        </div>
      </ScrollStage>
    </>
  );
}
