import Link from "next/link";
import type { TripDetail, TripDeparture, FareConditions } from "@/server/catalog/trips";
import { JsonLd } from "@/components/site/json-ld";
import { COMPANY, LEGAL_LINKS } from "@/content/company";
import { formatEur } from "@/lib/money";
import { BUSINESS_TZ } from "@/lib/time";
import { TripGallery } from "./gallery";
import { BookingCard, type BookingCardProps } from "./booking-card";
import { PickDepartureButton, SectionNav } from "./trip-interactions";
import { OpenBookingButton, ShareButton } from "./trip-actions";
import { TripHighlights, TripMood } from "./trip-highlights";
import type { Guide } from "@/server/catalog/destinations";
import { DestinationSection } from "@/components/destination/destination-section";
import { CatIcon } from "@/components/destination/explorer";

const dLong = new Intl.DateTimeFormat("de-DE", { timeZone: BUSINESS_TZ, weekday: "short", day: "2-digit", month: "long", year: "numeric" });
const dShort = new Intl.DateTimeFormat("de-DE", { timeZone: BUSINESS_TZ, weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
const tFmt = new Intl.DateTimeFormat("de-DE", { timeZone: BUSINESS_TZ, hour: "2-digit", minute: "2-digit" });
const country = new Intl.DisplayNames("de", { type: "region" });

const TYPE: Record<string, { label: string; short: string }> = {
  PACKAGE_TOUR: { label: "Pauschalreise", short: "Pauschalreise" },
  TRANSPORT_ONLY: { label: "Busfahrt, Unterkunft optional", short: "Wochenendfahrt" },
  DAY_TRIP: { label: "Tagesfahrt", short: "Tagesfahrt" },
  LINE_TICKET: { label: "Linienfahrt", short: "Linienfahrt" },
  GROUP_TOUR: { label: "Gruppenreise", short: "Gruppenreise" },
};

export function fareFeatures(c: FareConditions): string[] {
  if (c.features?.length) return c.features;
  const out: string[] = [];
  if (c.handLuggageOnly) out.push("Nur Handgepäck");
  if (c.suitcaseKg) out.push(`1 Koffer bis ${c.suitcaseKg} kg`);
  if (c.seatReservation) out.push("Sitzplatzreservierung");
  return out;
}

function Icon({ name }: { name: "pin" | "clock" | "bus" | "route" | "cal" | "check" | "plus" | "x" | "shield" | "card" | "doc" | "swap" | "phone" | "hotel" | "mail" | "users" | "ticket" }) {
  const d: Record<string, string> = {
    pin: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
    clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4.5l3 2",
    bus: "M5 17V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v11M5 17h14M5 12h14M7.5 20v-3M16.5 20v-3M8 14.5h.01M16 14.5h.01",
    route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 17h6.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H16",
    cal: "M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Zm0 3h16M8 3v4M16 3v4",
    check: "m5 12.5 4.5 4.5L19 7.5",
    plus: "M12 5v14M5 12h14",
    x: "M6 6l12 12M18 6 6 18",
    shield: "M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Zm-3 9 2 2 4-4",
    card: "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 3h18M7 15h3",
    doc: "M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M9 13h6M9 17h6",
    swap: "M7 7h11l-3-3M17 17H6l3 3",
    phone: "M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
    hotel: "M3 21V8l9-5 9 5v13M9 21v-6h6v6M8 11h.01M12 11h.01M16 11h.01",
    mail: "M4 6h16v12H4zM4 7l8 6 8-6",
    users: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 19v-1a4 4 0 0 0-3-3.9M15.5 3.2a3.5 3.5 0 0 1 0 6.6",
    ticket: "M4 7a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2v-3a2 2 0 0 0 0-4V7Zm9-2v14",
  };
  return (
    <svg className="ico" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d={d[name]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function depDays(d: TripDeparture) {
  if (!d.returnAt) return null;
  const a = new Date(d.departAt.toLocaleDateString("en-CA", { timeZone: BUSINESS_TZ }));
  const b = new Date(d.returnAt.toLocaleDateString("en-CA", { timeZone: BUSINESS_TZ }));
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

function TariffComparison({ d }: { d: TripDeparture }) {
  const fares = d.fares.map((f) => ({ ...f, list: fareFeatures(f.conditions) }));
  const rows = [...new Set(fares.flatMap((f) => f.list))];
  return (
    <div className="tcmp" role="region" aria-label="Tarifvergleich" tabIndex={0}>
      <table>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Leistung</span>
            </th>
            {fares.map((f) => (
              <th key={f.code} scope="col" data-rec={f.conditions.recommended ? "true" : undefined}>
                {f.conditions.recommended ? <span className="tcmp__rec">Empfohlen</span> : null}
                <strong>{f.name}</strong>
                <span className="tabular">{formatEur(f.priceCents)}</span>
                <small>p. P.</small>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <th scope="row">{r}</th>
              {fares.map((f) => (
                <td key={f.code} data-rec={f.conditions.recommended ? "true" : undefined}>
                  {f.list.includes(r) ? (
                    <span className="tcmp__yes">
                      <Icon name="check" />
                      <span className="sr-only">enthalten</span>
                    </span>
                  ) : (
                    <span className="tcmp__no" aria-label="nicht enthalten">
                      –
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TravelProductPage({ t, path, breadcrumb, guide }: { t: TripDetail; path: string; breadcrumb: { label: string; href: string }; guide: Guide | null }) {
  const url = `${COMPANY.url}${path}`;
  const type = TYPE[t.productType] ?? TYPE.PACKAGE_TOUR!;
  const bookable = t.state === "BOOKABLE";
  const firstBookable = t.departures.find((d) => d.state === "BOOKABLE") ?? t.departures[0];
  const glanceDep = t.departures.find((d) => d.state === "BOOKABLE") ?? null;
  const cities = [...new Set((firstBookable?.stops.map((s) => s.city) ?? []).concat(t.pickups.map((p) => p.city)))];
  const tel = COMPANY.phone.replace(/\s/g, "");
  const isPackage = t.productType === "PACKAGE_TOUR";

  const card: BookingCardProps = {
    slug: t.slug,
    title: t.title,
    state: t.state,
    lockReason: t.lockReason,
    fromPriceCents: t.fromPriceCents,
    pickups: t.pickups.map((p) => ({ city: p.city, name: p.name, localTime: p.localTime, surchargeCents: p.surchargeCents })),
    options: t.optionalServices,
    departures: t.departures.map((d) => ({
      code: d.code,
      departAt: d.departAt.toISOString(),
      returnAt: d.returnAt?.toISOString() ?? null,
      seatsLeft: d.seatsLeft,
      state: d.state,
      fromPriceCents: d.fromPriceCents,
      isDemo: d.code.startsWith("DEMO-"),
      fares: d.fares.map((f) => ({ code: f.code, name: f.name, priceCents: f.priceCents, features: fareFeatures(f.conditions), recommended: !!f.conditions.recommended })),
      stops: d.stops.map((s) => ({ id: s.id, name: s.name, city: s.city, plannedAt: s.plannedAt.toISOString(), platform: s.platform, surchargeCents: s.surchargeCents })),
    })),
  };

  const faqs: { q: string; a: string }[] = [];
  if (t.pickups.length)
    faqs.push({
      q: "Wo steige ich zu?",
      a:
        t.pickups
          .map((p) => `${p.name}${p.localTime ? ` um ${p.localTime} Uhr` : ""}${p.platform ? ` (${p.platform})` : ""}${p.surchargeCents ? `, Aufpreis ${formatEur(p.surchargeCents)} p. P.` : ""}`)
          .join("; ") + ". Verbindlich sind die Zeiten beim gebuchten Termin.",
    });
  faqs.push({
    q: "Gibt es feste Termine?",
    a: bookable
      ? `Ja. Aktuell ${t.departures.filter((d) => d.state === "BOOKABLE").length === 1 ? "ist ein Termin" : `sind ${t.departures.filter((d) => d.state === "BOOKABLE").length} Termine`} online buchbar – mit Preis und freien Plätzen.`
      : "Neue Termine werden gerade geplant. Lassen Sie sich unverbindlich vormerken, dann erhalten Sie Termine und Preise, sobald sie feststehen.",
  });
  faqs.push({
    q: "Wann ist meine Buchung verbindlich?",
    a: "Sobald die Zahlung bestätigt ist. Vorher werden Ihre Plätze nur für 30 Minuten reserviert. Danach erhalten Sie die Bestätigung und Ihre Tickets mit QR-Code.",
  });
  faqs.push({ q: "Kann ich die Reise als Gruppe buchen?", a: "Ja. Für Gruppen planen wir die Fahrt auf Wunsch zu einem eigenen Termin – senden Sie uns dazu eine Gruppenanfrage." });

  const nav = [
    { id: "ueberblick", label: "Überblick" },
    { id: "termine", label: "Termine" },
    ...(firstBookable && firstBookable.fares.length > 1 ? [{ id: "tarife", label: "Tarife" }] : []),
    ...(t.included.length || t.excluded.length || t.optionalServices.length ? [{ id: "leistungen", label: "Leistungen" }] : []),
    ...(t.itinerary.length ? [{ id: "verlauf", label: "Reiseverlauf" }] : []),
    ...(cities.length ? [{ id: "zustiege", label: "Zustiege" }] : []),
    ...(t.hotelName ? [{ id: "hotel", label: "Unterkunft" }] : []),
    ...(guide ? [{ id: "umgebung", label: "Umgebung" }] : []),
    { id: "infos", label: "Reiseinfos" },
    { id: "fragen", label: "FAQ" },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TouristTrip",
        name: t.title,
        description: t.seoDescription ?? t.summary,
        url,
        ...(t.media.length ? { image: t.media.filter((m) => m.rightsConfirmed).map((m) => `${COMPANY.url}${m.src}`) } : {}),
        touristType: t.category ?? undefined,
        provider: { "@id": `${COMPANY.url}/#organization` },
        itinerary: { "@type": "Place", name: t.destination, address: { "@type": "PostalAddress", addressCountry: t.countryCode } },
        ...(bookable
          ? {
              offers: t.departures
                .filter((d) => d.state === "BOOKABLE")
                .map((d) => ({
                  "@type": "Offer",
                  price: (d.fromPriceCents / 100).toFixed(2),
                  priceCurrency: "EUR",
                  availability: "https://schema.org/InStock",
                  validThrough: (d.bookingDeadline ?? d.departAt).toISOString(),
                  url,
                })),
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
    <article className="tp" data-state={t.state}>
      <JsonLd data={jsonLd} />
      <div className="shell">
        <nav aria-label="Brotkrumen" className="tp-crumbs">
          <Link href="/">Start</Link>
          <span aria-hidden="true">/</span>
          <Link href={breadcrumb.href as never}>{breadcrumb.label}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{t.destination}</span>
        </nav>

        <header className="tp-head">
          <div className="tp-head__main">
            <p className="tp-kicker">
              <span>{t.category ?? type.short}</span>
              <span aria-hidden="true">·</span>
              <span>{country.of(t.countryCode) ?? t.countryCode}</span>
            </p>
            <h1 className="tp-title">{t.title}</h1>
            <p className="tp-lead">{t.summary}</p>
            <ul className="tp-assure" aria-label="Das Wichtigste">
              <li>
                <Icon name="bus" />
                Reisebus ab {cities.length ? cities.join(", ") : "Norddeutschland"}
              </li>
              <li>
                <Icon name="doc" />
                {isPackage ? "Reiseveranstalter" : "Busunternehmen"} aus {COMPANY.city}
              </li>
              {t.insolvencyProtected ? (
                <li>
                  <Icon name="shield" />
                  Mit Sicherungsschein
                </li>
              ) : null}
              <li>
                <Icon name="phone" />
                Persönliche Beratung
              </li>
            </ul>
            <div className="tp-acts">
              <ShareButton title={t.title} />
              <a className="tp-act" href={`mailto:${COMPANY.email}?subject=${encodeURIComponent(`Frage zur Reise: ${t.title}`)}`}>
                <Icon name="mail" />
                Frage per E-Mail
              </a>
              <a className="tp-act" href={`tel:${tel}`}>
                <Icon name="phone" />
                {COMPANY.phoneDisplay}
              </a>
            </div>
          </div>
          <aside className="tp-headbox" aria-label="Preis und Buchung">
            {bookable && t.fromPriceCents !== null ? (
              <>
                <span className="tp-headbox__label">Preis pro Person</span>
                <span className="tp-headbox__price">
                  <small>ab</small> <strong className="tabular">{formatEur(t.fromPriceCents)}</strong>
                </span>
                <span className="tp-headbox__note">inkl. Busfahrt und Zustieg</span>
                <OpenBookingButton label="Jetzt buchen" />
              </>
            ) : (
              <>
                <span className="tp-headbox__label">{t.state === "SOLD_OUT" ? "Aktuelle Termine" : "Termine"}</span>
                <span className="tp-headbox__price">
                  <strong>{t.state === "SOLD_OUT" ? "ausgebucht" : t.lockReason ? "Buchung in Kürze" : "in Planung"}</strong>
                </span>
                <span className="tp-headbox__note">Unverbindlich vormerken und als Erste erfahren</span>
                <OpenBookingButton label="Termin vormerken" />
              </>
            )}
            <a className="btn btn--ghost tp-headbox__alt" href="#termine">
              Termine &amp; Preise
            </a>
            <a className="tp-headbox__call" href={`tel:${tel}`}>
              <Icon name="phone" />
              <span>
                Beratung: <strong>{COMPANY.phoneDisplay}</strong>
                <small>{COMPANY.hours}</small>
              </span>
            </a>
          </aside>
        </header>
      </div>

      <div className="shell">
        {t.media.length ? (
          <TripGallery media={t.media} title={t.title} />
        ) : (
          <div className="gal-empty">
            <span className="mono-label">{type.label}</span>
            <strong>{t.destination}</strong>
            <span>Fotos dieser Reise folgen in Kürze.</span>
          </div>
        )}
      </div>

      <div className="shell">
        <dl className="tglance" aria-label="Die Reise auf einen Blick">
          <div>
            <dt>
              <Icon name="bus" />
              Reiseart
            </dt>
            <dd>
              <strong>{type.short}</strong>
              <span>{isPackage ? "Fahrt & Aufenthalt" : "Busfahrt, Unterkunft optional"}</span>
            </dd>
          </div>
          <div>
            <dt>
              <Icon name="clock" />
              Dauer
            </dt>
            <dd>
              <strong>{t.durationDays <= 1 ? "1 Tag" : `${t.durationDays} Tage`}</strong>
              <span>{t.durationNights > 0 ? `${t.durationNights} Nächte` : "inkl. An- und Abreise"}</span>
            </dd>
          </div>
          <div>
            <dt>
              <Icon name="cal" />
              Nächste Abfahrt
            </dt>
            <dd>
              {glanceDep ? (
                <>
                  <strong>{dShort.format(glanceDep.departAt)}</strong>
                  <span>{glanceDep.stops[0] ? `ab ${tFmt.format(glanceDep.stops[0].plannedAt)} Uhr in ${glanceDep.stops[0].city}` : "Zeit beim Termin"}</span>
                </>
              ) : (
                <>
                  <strong>{t.state === "SOLD_OUT" ? "ausgebucht" : "in Planung"}</strong>
                  <span>Vormerken möglich</span>
                </>
              )}
            </dd>
          </div>
          <div className="tglance__wide">
            <dt>
              <Icon name="route" />
              {glanceDep ? "Zustiege & Abfahrtszeiten" : "Zustiege (Richtzeiten)"}
            </dt>
            <dd>
              <ul className="tglance__stops">
                {(glanceDep
                  ? glanceDep.stops.map((x) => ({ k: x.id, time: tFmt.format(x.plannedAt), city: x.city }))
                  : t.pickups.map((x) => ({ k: x.name, time: x.localTime, city: x.city }))
                ).map((x) => (
                  <li key={x.k}>
                    <span className="tabular">{x.time ?? "–"}</span> {x.city}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt>
              <Icon name="swap" />
              Rückkehr
            </dt>
            <dd>
              <strong>{glanceDep?.returnAt ? dShort.format(glanceDep.returnAt) : "je Termin"}</strong>
              <span>{glanceDep?.returnAt ? "laut Reiseplan" : "steht beim Termin"}</span>
            </dd>
          </div>
          <div className="tglance__price">
            <dt>
              <Icon name="card" />
              Preis
            </dt>
            <dd>
              <strong className="tabular">{t.fromPriceCents !== null ? `ab ${formatEur(t.fromPriceCents)}` : "je Termin"}</strong>
              <span>{t.fromPriceCents !== null ? "p. P. inkl. Zustieg" : "mit dem Termin"}</span>
            </dd>
          </div>
        </dl>
        <ul className="tadv" aria-label="Ihre Vorteile bei METROPOL TOURS">
          <li>
            <span className="tadv__icon">
              <Icon name="route" />
            </span>
            <strong>Zustieg in Ihrer Nähe</strong>
            <span>{cities.length ? `Abfahrt ab ${cities.join(", ")}` : "Abfahrt in Norddeutschland"}</span>
          </li>
          <li>
            <span className="tadv__icon">
              <Icon name="users" />
            </span>
            <strong>Persönlich für Sie da</strong>
            <span>
              Telefonisch {COMPANY.hours}, Anfragen per E-Mail
            </span>
          </li>
          <li>
            <span className="tadv__icon">
              <Icon name="card" />
            </span>
            <strong>Sicher online bezahlen</strong>
            <span>Zahlung über Stripe, Buchung erst nach bestätigtem Zahlungseingang</span>
          </li>
          <li>
            <span className="tadv__icon">
              <Icon name="ticket" />
            </span>
            <strong>Tickets sofort</strong>
            <span>Bestätigung und Ticket mit QR-Code je Reisendem</span>
          </li>
          {t.insolvencyProtected ? (
            <li>
              <span className="tadv__icon">
                <Icon name="shield" />
              </span>
              <strong>Abgesichert</strong>
              <span>Insolvenzschutz mit Sicherungsschein nach § 651r BGB</span>
            </li>
          ) : null}
        </ul>
      </div>

      <div className="shell">
        <TripHighlights t={t} guide={guide} />
      </div>

      <div className="shell tp-layout">
        <div className="tp-main">
          <SectionNav items={nav} />

          <section id="ueberblick" className="tp-sec tp-about" aria-labelledby="h-ueberblick">
            <h2 id="h-ueberblick">Ihre Reise im Überblick</h2>
            {t.description.length ? (
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
            ) : (
              <p className="tp-lead">{t.summary}</p>
            )}
            {t.highlights.length ? (
              <ul className="tp-tags" aria-label="Schwerpunkte">
                {t.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            ) : null}

            <ol className="tflow" aria-label="So läuft die Reise">
              <li>
                <span className="tflow__step">1</span>
                <div>
                  <strong>Abfahrt</strong>
                  <p>
                    {glanceDep
                      ? `${dLong.format(glanceDep.departAt)} – ${glanceDep.stops.map((x) => `${x.city} ${tFmt.format(x.plannedAt)} Uhr`).join(", ")}.`
                      : t.pickups.length
                        ? `Zustieg in ${t.pickups.map((x) => (x.localTime ? `${x.city} (ca. ${x.localTime} Uhr)` : x.city)).join(", ")}. Genaue Zeiten stehen beim Termin.`
                        : "Zustiege und Zeiten stehen beim Termin."}
                  </p>
                </div>
              </li>
              <li>
                <span className="tflow__step">2</span>
                <div>
                  <strong>{isPackage ? `Aufenthalt in ${t.destination}` : `Zeit in ${t.destination}`}</strong>
                  <p>
                    {t.hotelName
                      ? `Unterkunft: ${t.hotelName}${t.hotelAddress ? `, ${t.hotelAddress}` : ""}.`
                      : isPackage
                        ? "Die Unterkunft wird mit dem Termin veröffentlicht."
                        : "Gebucht wird die Busfahrt – eine Unterkunft wählen Sie selbst."}
                    {guide?.pois.some((x) => x.isHighlight) ? " Ideen für vor Ort finden Sie unten unter „Umgebung“." : ""}
                  </p>
                </div>
              </li>
              <li>
                <span className="tflow__step">3</span>
                <div>
                  <strong>Rückfahrt</strong>
                  <p>{glanceDep?.returnAt ? `${dLong.format(glanceDep.returnAt)} – zurück zu Ihrem Zustieg.` : "Rückfahrt zu Ihrem Zustieg; das Datum steht beim Termin."}</p>
                </div>
              </li>
            </ol>

            {guide && guide.pois.some((x) => x.isHighlight) ? (
              <div className="texpect">
                <h3>Das erwartet Sie in {guide.name}</h3>
                <ul>
                  {guide.pois
                    .filter((x) => x.isHighlight)
                    .slice(0, 3)
                    .map((x) => (
                      <li key={x.id}>
                        <span className="texpect__icon">
                          <CatIcon cat={x.category} size={20} />
                        </span>
                        <div>
                          <strong>{x.name}</strong>
                          <span>{x.highlightText ?? x.description}</span>
                        </div>
                      </li>
                    ))}
                </ul>
                <a href="#umgebung" className="texpect__more">
                  Alle Orte auf der Karte ansehen →
                </a>
              </div>
            ) : null}
          </section>

          <section id="termine" className="tp-sec" aria-labelledby="h-termine">
            <h2 id="h-termine">Termine &amp; Preise</h2>
            {t.departures.length ? (
              <ol className="tdates">
                {t.departures.map((d) => {
                  const days = depDays(d);
                  const first = d.stops[0];
                  return (
                    <li key={d.code} className="tdate" data-state={d.state}>
                      <div className="tdate__when">
                        <span className="tdate__label">Abfahrt</span>
                        <strong>{dLong.format(d.departAt)}</strong>
                        {first ? (
                          <span>
                            {first.city} {tFmt.format(first.plannedAt)} Uhr
                          </span>
                        ) : null}
                      </div>
                      <div className="tdate__when">
                        <span className="tdate__label">Rückkehr</span>
                        <strong>{d.returnAt ? dLong.format(d.returnAt) : "–"}</strong>
                        {days ? <span>{days} Tage</span> : null}
                      </div>
                      <div className="tdate__avail">
                        <span className="tdate__label">Verfügbarkeit</span>
                        {d.state === "SOLD_OUT" ? (
                          <span className="tdate__pill tdate__pill--out">Ausgebucht</span>
                        ) : d.seatsLeft <= 10 ? (
                          <span className="tdate__pill tdate__pill--low">Noch {d.seatsLeft} Plätze</span>
                        ) : (
                          <span className="tdate__pill">Plätze frei</span>
                        )}
                      </div>
                      <div className="tdate__price">
                        <span className="tdate__label">Preis ab</span>
                        <strong className="tabular">{d.state === "BOOKABLE" ? formatEur(d.fromPriceCents) : "–"}</strong>
                        <span>p. P.</span>
                      </div>
                      <div className="tdate__act">
                        {d.state === "BOOKABLE" ? <PickDepartureButton code={d.code} label="Wählen" /> : <span className="tdate__none">nicht buchbar</span>}
                      </div>
                      {d.code.startsWith("DEMO-") ? <span className="tdate__demo">Testtermin – nur Entwicklung</span> : null}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="tp-empty">
                <Icon name="cal" />
                <div>
                  <strong>{t.lockReason ? "Online-Buchung wird freigeschaltet" : t.state === "CANCELLED" ? "Der geplante Termin wurde abgesagt" : "Neue Termine sind in Planung"}</strong>
                  <p>
                    Wir veröffentlichen hier nur Termine mit festem Preis und freien Plätzen. Lassen Sie sich im Buchungsfeld vormerken – Sie erfahren neue Termine zuerst.
                  </p>
                </div>
                <PickDepartureButton code="" label="Vormerken" />
              </div>
            )}
            <p className="tp-note">„Preis ab“ ist der günstigste Tarif inklusive des günstigsten Zustiegs für eine Person. Den genauen Preis berechnet das Buchungsfeld für Ihre Auswahl.</p>
          </section>

          {firstBookable && firstBookable.fares.length > 1 ? (
            <section id="tarife" className="tp-sec" aria-labelledby="h-tarife">
              <h2 id="h-tarife">Tarife im Vergleich</h2>
              <p className="tp-sub">Für den Termin am {dLong.format(firstBookable.departAt)}. Bedingungen laut Tarif und Reisebedingungen.</p>
              <TariffComparison d={firstBookable} />
            </section>
          ) : null}

          {t.included.length || t.excluded.length || t.optionalServices.length ? (
            <section id="leistungen" className="tp-sec" aria-labelledby="h-leistungen">
              <h2 id="h-leistungen">Leistungen</h2>
              <div className="tincl">
                {t.included.length ? (
                  <div className="tincl__col">
                    <h3>Im Preis enthalten</h3>
                    <ul>
                      {t.included.map((x) => (
                        <li key={x} className="is-yes">
                          <Icon name="check" />
                          {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {t.optionalServices.length ? (
                  <div className="tincl__col">
                    <h3>Zubuchbar</h3>
                    <ul>
                      {t.optionalServices.map((o) => (
                        <li key={o.id} className="is-opt">
                          <Icon name="plus" />
                          <span>
                            {o.name}
                            <small className="tabular">
                              {formatEur(o.priceCents)} {o.unit === "PER_PERSON" ? "p. P." : "pro Buchung"}
                            </small>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {t.excluded.length ? (
                  <div className="tincl__col">
                    <h3>Nicht enthalten</h3>
                    <ul>
                      {t.excluded.map((x) => (
                        <li key={x} className="is-no">
                          <Icon name="x" />
                          {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {t.itinerary.length ? (
            <section id="verlauf" className="tp-sec" aria-labelledby="h-verlauf">
              <h2 id="h-verlauf">Reiseverlauf</h2>
              <ol className="ttime">
                {t.itinerary.map((d) => (
                  <li key={d.dayNumber}>
                    <span className="ttime__day">Tag {d.dayNumber}</span>
                    <div>
                      <strong>{d.title}</strong>
                      <p>{d.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {cities.length ? (
            <section id="zustiege" className="tp-sec" aria-labelledby="h-zustiege">
              <h2 id="h-zustiege">Zustiege</h2>
              <ol className="tstops">
                {(firstBookable?.stops.length
                  ? firstBookable.stops.map((s) => ({ key: s.id, name: s.name, time: tFmt.format(s.plannedAt), where: s.platform, address: t.pickups.find((p) => p.city === s.city), fee: s.surchargeCents }))
                  : t.pickups.map((p) => ({ key: p.name, name: p.name, time: p.localTime, where: p.platform, address: p, fee: p.surchargeCents }))
                ).map((s) => (
                  <li key={s.key}>
                    <span className="tstops__time tabular">{s.time ? `${s.time} Uhr` : "Zeit folgt"}</span>
                    <span className="tstops__dot" aria-hidden="true" />
                    <div>
                      <strong>{s.name}</strong>
                      <span>
                        {s.address ? [s.address.street, [s.address.postalCode, s.address.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") : ""}
                        {s.where ? ` · ${s.where}` : ""}
                      </span>
                    </div>
                    <span className="tstops__fee">{s.fee ? `+ ${formatEur(s.fee)} p. P.` : "ohne Aufpreis"}</span>
                  </li>
                ))}
              </ol>
              <p className="tp-note">
                {firstBookable ? `Zeiten für den Termin am ${dLong.format(firstBookable.departAt)}.` : "Richtzeiten – verbindlich sind die Angaben beim gebuchten Termin."}{" "}
                <Link href="/zustiege">Alle Zustiegsorte</Link>
              </p>
            </section>
          ) : null}

          {t.hotelName ? (
            <section id="hotel" className="tp-sec" aria-labelledby="h-hotel">
              <h2 id="h-hotel">Unterkunft</h2>
              <div className="thotel">
                <Icon name="hotel" />
                <div>
                  <strong>
                    {t.hotelName}
                    {t.hotelStars ? <span className="thotel__stars" aria-label={`${t.hotelStars} Sterne`}>{"★".repeat(t.hotelStars)}</span> : null}
                  </strong>
                  {t.hotelAddress ? <span>{t.hotelAddress}</span> : null}
                </div>
              </div>
            </section>
          ) : null}

          <TripMood t={t}>
            <OpenBookingButton label={bookable ? "Jetzt Platz sichern" : "Termin vormerken"} className="btn btn--lg tmood__cta" />
          </TripMood>

          {guide ? <DestinationSection guide={guide} /> : null}

          <section id="infos" className="tp-sec" aria-labelledby="h-infos">
            <h2 id="h-infos">Reiseinfos &amp; Sicherheit</h2>
            <dl className="ttrust">
              <div>
                <dt>
                  <Icon name="doc" />
                  {isPackage ? "Reiseveranstalter" : "Beförderer"}
                </dt>
                <dd>
                  {COMPANY.legalName}, {COMPANY.street}, {COMPANY.postalCode} {COMPANY.city}
                </dd>
              </div>
              <div>
                <dt>
                  <Icon name="bus" />
                  Reiseart
                </dt>
                <dd>{isPackage ? "Pauschalreise nach §§ 651a ff. BGB. Vor der Buchung erhalten Sie das gesetzliche Formblatt." : `${type.label}. Gebucht wird die Busfahrt.`}</dd>
              </div>
              <div>
                <dt>
                  <Icon name="card" />
                  Zahlung
                </dt>
                <dd>Sichere Online-Zahlung über Stripe. Verbindlich bestätigt wird Ihre Buchung erst nach bestätigtem Zahlungseingang.</dd>
              </div>
              <div>
                <dt>
                  <Icon name="swap" />
                  Stornierung &amp; Umbuchung
                </dt>
                <dd>
                  Es gelten die Bedingungen Ihres Tarifs und unsere <a href={LEGAL_LINKS.terms}>Reisebedingungen</a>.
                </dd>
              </div>
              <div>
                <dt>
                  <Icon name="doc" />
                  Reiseunterlagen
                </dt>
                <dd>Nach Zahlungseingang: Buchungsbestätigung und ein Ticket mit QR-Code je Reisendem, jederzeit abrufbar über Ihren persönlichen Buchungslink.</dd>
              </div>
              {t.insolvencyProtected ? (
                <div>
                  <dt>
                    <Icon name="shield" />
                    Sicherungsschein
                  </dt>
                  <dd>Ihre Zahlungen sind gegen Insolvenz abgesichert (§ 651r BGB). Den Sicherungsschein erhalten Sie mit der Buchungsbestätigung.</dd>
                </div>
              ) : null}
              <div>
                <dt>
                  <Icon name="phone" />
                  Persönlich erreichbar
                </dt>
                <dd>
                  <a href={`tel:${tel}`}>{COMPANY.phoneDisplay}</a> · <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> · {COMPANY.hours}
                </dd>
              </div>
            </dl>
          </section>

          <section className="tp-sec tcontact" aria-labelledby="h-kontakt">
            <div className="tcontact__card">
              <div>
                <p className="tcontact__kicker">Persönliche Beratung</p>
                <h2 id="h-kontakt">Fragen zu dieser Reise?</h2>
                <p>
                  Wir beraten Sie gern zu Terminen, Zustiegen und Gruppenreisen – telefonisch {COMPANY.hours} oder per E-Mail.
                </p>
              </div>
              <div className="tcontact__acts">
                <a className="btn btn--brand btn--arrow" href={`tel:${tel}`}>
                  {COMPANY.phoneDisplay} anrufen
                </a>
                <a className="btn btn--ghost" href={`mailto:${COMPANY.email}?subject=${encodeURIComponent(`Frage zur Reise: ${t.title}`)}`}>
                  E-Mail schreiben
                </a>
                <Link className="btn btn--ghost" href={`/bus-mieten?anlass=gruppenreise&ziel=${encodeURIComponent(t.destination)}#anfrage` as never}>
                  Als Gruppe anfragen
                </Link>
              </div>
            </div>
          </section>

          <section id="fragen" className="tp-sec" aria-labelledby="h-fragen">
            <h2 id="h-fragen">Häufige Fragen</h2>
            <div className="tfaq">
              {faqs.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
            <p className="tp-note">
              Reisen Sie als Gruppe?{" "}
              <Link href={`/bus-mieten?anlass=gruppenreise&ziel=${encodeURIComponent(t.destination)}#anfrage` as never}>Gruppenanfrage stellen</Link>
            </p>
          </section>
        </div>

        <BookingCard {...card} />
      </div>
    </article>
  );
}
