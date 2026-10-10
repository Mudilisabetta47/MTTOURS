import Link from "next/link";
import type { TripDetail, FareConditions, PublicDeparture } from "@/server/catalog/trips";
import { DestinationArt, artFor } from "@/components/home/destination-art";
import { SplitText } from "@/components/site/split-text";
import { JsonLd } from "@/components/site/json-ld";
import { TripInterestForm } from "./interest-form";
import { COMPANY, LEGAL_LINKS } from "@/content/company";
import { formatEur } from "@/lib/money";
import "@/styles/booking.css";
import { BUSINESS_TZ } from "@/lib/time";

const dayFmt = new Intl.DateTimeFormat("de-DE", { timeZone: BUSINESS_TZ, weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("de-DE", { timeZone: BUSINESS_TZ, hour: "2-digit", minute: "2-digit" });

const TYPE_LABEL: Record<string, string> = {
  PACKAGE_TOUR: "Pauschalreise",
  TRANSPORT_ONLY: "Busfahrt, Unterkunft optional",
  DAY_TRIP: "Tagesfahrt",
  LINE_TICKET: "Linienfahrt",
  GROUP_TOUR: "Gruppenreise",
};

function conditionLines(c: FareConditions): string[] {
  const out: string[] = [];
  if (c.features?.length) return c.features;
  if (c.handLuggageOnly) out.push("Nur Handgepäck");
  if (c.suitcaseKg) out.push(`1 Koffer bis ${c.suitcaseKg} kg`);
  if (c.seatReservation) out.push("Sitzplatzreservierung");
  if (c.refundable && c.cancellationDays) out.push(`Stornierung bis ${c.cancellationDays} Tage vorher (Gebühr ${c.cancellationFeePercent ?? 0} %)`);
  return out;
}

function DepartureCard({ d }: { d: PublicDeparture }) {
  return (
    <article className="dep">
      <header className="dep__head">
        <div>
          <strong className="dep__date">
            {dayFmt.format(d.departAt)}
            {d.returnAt ? ` – ${dayFmt.format(d.returnAt)}` : ""}
          </strong>
          <span className="dep__seats">{d.seatsLeft <= 10 ? `Noch ${d.seatsLeft} Plätze` : "Plätze frei"}</span>
        </div>
        {d.code.startsWith("DEMO-") ? <span className="bk__demo">Testtermin – nur Entwicklung</span> : <span className="mono-label">{d.code}</span>}
      </header>
      <div className="dep__fares">
        {d.fares.map((f) => (
          <div key={f.id} className={f.conditions.recommended ? "fare fare--rec" : "fare"}>
            <div className="fare__head">
              <strong>{f.name}</strong>
              {f.conditions.recommended ? <span className="pill-mini">Empfohlen</span> : null}
            </div>
            <span className="fare__price">
              {formatEur(f.priceCents)} <small>p. P.</small>
            </span>
            <ul>
              {conditionLines(f.conditions).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <Link className="btn btn--brand btn--sm btn--arrow" href={`/buchung/${d.code}?tarif=${f.code}` as never}>
              Auswählen
            </Link>
          </div>
        ))}
      </div>
      <p className="dep__note">Zustieg und Aufpreis wählen Sie im nächsten Schritt.</p>
    </article>
  );
}

export function TripDetailView({ t, basePath, breadcrumb }: { t: TripDetail; basePath: string; breadcrumb: { label: string; href: string } }) {
  const url = `${COMPANY.url}${basePath}/${t.slug}`;
  const bookable = t.departures.length > 0;
  const fromPrice = bookable ? Math.min(...t.departures.flatMap((d) => d.fares.map((f) => f.priceCents))) : null;
  const tel = COMPANY.phone.replace(/\s/g, "");

  const faqs: { q: string; a: string }[] = [];
  if (t.pickups.length)
    faqs.push({
      q: "Wo steige ich zu?",
      a: t.pickups
        .map((p) => `${p.name}${p.localTime ? ` um ${p.localTime} Uhr` : ""}${p.platform ? ` (${p.platform})` : ""}${p.surchargeCents ? `, Aufpreis ${formatEur(p.surchargeCents)}` : ""}`)
        .join("; ") + ". Die genauen Zeiten stehen bei jedem Termin.",
    });
  if (t.included.length) faqs.push({ q: "Was ist im Preis enthalten?", a: `${t.included.join(", ")}.${t.excluded.length ? ` Nicht enthalten: ${t.excluded.join(", ")}.` : ""}` });
  faqs.push({
    q: "Gibt es feste Termine?",
    a: bookable
      ? `Ja, aktuell ${t.departures.length === 1 ? "ist ein Termin" : `sind ${t.departures.length} Termine`} buchbar. Alle Termine stehen oben mit Preis und freien Plätzen.`
      : "Neue Termine werden gerade geplant. Tragen Sie sich unverbindlich ein, dann informieren wir Sie, sobald Termine mit Preis feststehen.",
  });
  faqs.push({ q: "Kann ich die Reise auch als Gruppe buchen?", a: "Ja. Für Gruppen planen wir die Reise auf Wunsch auch zu einem eigenen Termin. Senden Sie uns dazu eine Gruppenanfrage." });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TouristTrip",
        name: t.title,
        description: t.summary,
        url,
        touristType: t.category ?? undefined,
        provider: { "@id": `${COMPANY.url}/#organization` },
        itinerary: { "@type": "Place", name: t.destination },
        ...(bookable
          ? {
              offers: t.departures.flatMap((d) =>
                d.fares.map((f) => ({
                  "@type": "Offer",
                  name: `${f.name} · ${dayFmt.format(d.departAt)}`,
                  price: (f.priceCents / 100).toFixed(2),
                  priceCurrency: "EUR",
                  availability: "https://schema.org/InStock",
                  url: `${COMPANY.url}/buchung/${d.code}?tarif=${f.code}`,
                })),
              ),
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Start", item: COMPANY.url },
          { "@type": "ListItem", position: 2, name: breadcrumb.label, item: `${COMPANY.url}${breadcrumb.href}` },
          { "@type": "ListItem", position: 3, name: t.title, item: url },
        ],
      },
      { "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <header className="thero">
        <div className="thero__art" aria-hidden="true">
          <DestinationArt d={artFor(t)} className="thero__svg" fit="xMidYMid slice" />
        </div>
        <div className="thero__shade" aria-hidden="true" />
        <div className="shell thero__inner">
          <nav aria-label="Brotkrumen" className="crumbs">
            <Link href="/">Start</Link> <span aria-hidden="true">/</span> <Link href={breadcrumb.href as never}>{breadcrumb.label}</Link>{" "}
            <span aria-hidden="true">/</span> <span aria-current="page">{t.destination}</span>
          </nav>
          <p className="mono-label thero__kicker">
            {t.category ?? TYPE_LABEL[t.productType]} · {t.durationDays} Tage
          </p>
          <SplitText as="h1" text={t.title} className="thero__title" />
          <p className="thero__lead" data-reveal="up">
            {t.summary}
          </p>
          <dl className="thero__facts" data-reveal="up">
            <div>
              <dt>Reiseart</dt>
              <dd>{TYPE_LABEL[t.productType]}</dd>
            </div>
            <div>
              <dt>Dauer</dt>
              <dd>{t.durationDays} Tage</dd>
            </div>
            <div>
              <dt>Zustieg</dt>
              <dd>{t.pickups.length ? t.pickups.map((p) => p.city).join(" · ") : "auf Anfrage"}</dd>
            </div>
            <div>
              <dt>{bookable ? "Preis" : "Termine"}</dt>
              <dd>{bookable && fromPrice !== null ? `ab ${formatEur(fromPrice)} p. P.` : "Neue Termine in Planung"}</dd>
            </div>
          </dl>
          <div className="hero__ctas" data-reveal="up">
            <a className="btn btn--brand btn--lg btn--arrow" href="#termine" data-magnetic="0.25">
              {bookable ? "Termin wählen" : "Termin-Info anfordern"}
            </a>
            <Link className="btn btn--ghost-light btn--lg" href={`/bus-mieten?anlass=gruppenreise&ziel=${encodeURIComponent(t.destination)}#anfrage` as never}>
              Als Gruppe anfragen
            </Link>
          </div>
        </div>
      </header>

      <div className="shell tlayout">
        <div className="tmain">
          {t.description.length ? (
            <section className="tsec" aria-labelledby="t-about">
              <h2 id="t-about">Über die Reise</h2>
              <div className="prose">
                {t.description.map((b, i) =>
                  b.type === "p" ? (
                    <p key={i}>{b.text}</p>
                  ) : b.type === "h2" ? (
                    <h3 key={i}>{b.text}</h3>
                  ) : (
                    <ul key={i}>
                      {b.items.map((it) => (
                        <li key={it}>{it}</li>
                      ))}
                    </ul>
                  ),
                )}
              </div>
              {t.highlights.length ? (
                <ul className="chips" aria-label="Highlights">
                  {t.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          <section id="termine" className="tsec" aria-labelledby="t-dates">
            <h2 id="t-dates">Termine &amp; Preise</h2>
            {bookable ? (
              <div className="deps">
                {t.departures.map((d) => (
                  <DepartureCard key={d.id} d={d} />
                ))}
              </div>
            ) : (
              <div className="tnone">
                <div>
                  <h3>Neue Termine sind in Planung.</h3>
                  <p>
                    Aktuell ist für diese Reise kein Termin online buchbar. Tragen Sie sich unverbindlich ein – Sie erhalten Termine und Preise, sobald sie
                    freigegeben sind.
                  </p>
                </div>
                <TripInterestForm tripSlug={t.slug} tripTitle={t.title} />
              </div>
            )}
          </section>

          {t.included.length || t.excluded.length ? (
            <section className="tsec" aria-labelledby="t-incl">
              <h2 id="t-incl">Leistungen</h2>
              <div className="incl">
                {t.included.length ? (
                  <div>
                    <h3>Im Preis enthalten</h3>
                    <ul className="incl__list incl__list--yes">
                      {t.included.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {t.excluded.length ? (
                  <div>
                    <h3>Nicht enthalten</h3>
                    <ul className="incl__list incl__list--no">
                      {t.excluded.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {t.pickups.length ? (
            <section className="tsec" aria-labelledby="t-pick">
              <h2 id="t-pick">Zustiege</h2>
              <ol className="pickups">
                {t.pickups.map((p) => (
                  <li key={p.name}>
                    <span className="pickups__time tabular">{p.localTime ? `${p.localTime} Uhr` : "Zeit folgt"}</span>
                    <div>
                      <strong>{p.name}</strong>
                      <span>
                        {[p.street, [p.postalCode, p.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
                        {p.platform ? ` · ${p.platform}` : ""}
                      </span>
                    </div>
                    <span className="pickups__fee">{p.surchargeCents ? `+ ${formatEur(p.surchargeCents)}` : "ohne Aufpreis"}</span>
                  </li>
                ))}
              </ol>
              <p className="tnote">Zeiten gelten für den Abfahrtstag. Verbindlich sind die Angaben beim gebuchten Termin und in Ihrer Buchungsbestätigung.</p>
            </section>
          ) : null}

          {t.itinerary.length ? (
            <section className="tsec" aria-labelledby="t-itin">
              <h2 id="t-itin">Reiseverlauf</h2>
              <ol className="itin">
                {t.itinerary.map((d) => (
                  <li key={d.dayNumber}>
                    <span className="mono-label">Tag {d.dayNumber}</span>
                    <strong>{d.title}</strong>
                    <p>{d.body}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {t.hotelName ? (
            <section className="tsec" aria-labelledby="t-hotel">
              <h2 id="t-hotel">Unterkunft</h2>
              <p>
                <strong>{t.hotelName}</strong>
                {t.hotelAddress ? (
                  <>
                    <br />
                    {t.hotelAddress}
                  </>
                ) : null}
              </p>
            </section>
          ) : null}

          {t.optionalServices.length ? (
            <section className="tsec" aria-labelledby="t-opt">
              <h2 id="t-opt">Zusätzlich buchbar</h2>
              <ul className="opts">
                {t.optionalServices.map((o) => (
                  <li key={o.id}>
                    <div>
                      <strong>{o.name}</strong>
                      {o.description ? <span>{o.description}</span> : null}
                    </div>
                    <span className="tabular">
                      {formatEur(o.priceCents)} {o.unit === "PER_PERSON" ? "p. P." : "pro Buchung"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="tsec" aria-labelledby="t-faq">
            <h2 id="t-faq">Häufige Fragen</h2>
            <div className="faq">
              {faqs.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="tsec tlegal" aria-labelledby="t-legal">
            <h2 id="t-legal">Gut zu wissen</h2>
            {t.productType === "PACKAGE_TOUR" ? (
              <p>
                Für Pauschalreisen gelten die §§ 651a ff. BGB. Vor der Buchung erhalten Sie das gesetzliche Formblatt mit den wichtigsten Rechten.
                Es gelten unsere <a href={LEGAL_LINKS.terms}>Reisebedingungen</a>.
              </p>
            ) : (
              <p>
                Gebucht wird die Busfahrt; eine Unterkunft ist optional. Es gelten unsere <a href={LEGAL_LINKS.terms}>Beförderungs- und Reisebedingungen</a>.
              </p>
            )}
            <p>
              Fragen? <a href={`tel:${tel}`}>{COMPANY.phoneDisplay}</a> · <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> · {COMPANY.hours}
            </p>
          </section>
        </div>

        <aside className="tside" aria-label="Buchung">
          <div className="tside__card">
            <span className="mono-label">{t.destination}</span>
            {bookable && fromPrice !== null ? (
              <>
                <p className="tside__price">
                  ab <strong>{formatEur(fromPrice)}</strong> p. P.
                </p>
                <p className="tside__meta">
                  {t.departures.length} {t.departures.length === 1 ? "Termin" : "Termine"} buchbar · nächster am {dayFmt.format(t.departures[0]!.departAt)} ·{" "}
                  {timeFmt.format(t.departures[0]!.departAt)} Uhr
                </p>
                <a className="btn btn--brand btn--arrow" href="#termine">
                  Termin wählen
                </a>
              </>
            ) : (
              <>
                <p className="tside__price">Neue Termine in Planung</p>
                <p className="tside__meta">Unverbindlich vormerken lassen – Sie erhalten Termine und Preise per E-Mail.</p>
                <a className="btn btn--brand btn--arrow" href="#termine">
                  Termin-Info anfordern
                </a>
              </>
            )}
            <a className="btn btn--ghost" href={`tel:${tel}`}>
              {COMPANY.phoneDisplay}
            </a>
          </div>
        </aside>
      </div>

      <div className="tbar" aria-hidden="false">
        <span>{bookable && fromPrice !== null ? <>ab <strong>{formatEur(fromPrice)}</strong></> : "Termine in Planung"}</span>
        <a className="btn btn--brand btn--sm btn--arrow" href="#termine">
          {bookable ? "Termin wählen" : "Info anfordern"}
        </a>
      </div>
    </>
  );
}
