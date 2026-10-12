import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { landingBySlug, landingSlugs } from "@/content/landing";
import { COMPANY } from "@/content/company";
import { LIcon, iconFor } from "@/components/landing/landing-icons";
import { JsonLd } from "@/components/site/json-ld";
import "@/styles/trip.css";
import "@/styles/product.css";
import "@/styles/landing.css";

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

  const imgs = imagesFor(c.heroImage, c.slug);
  const [main, side1, side2] = imgs;

  return (
    <>
      <JsonLd data={jsonLd} />
      <header className="lhero">
        <div className="shell lhero__grid">
          <div className="lhero__text">
            <nav aria-label="Brotkrumen" className="tp-crumbs">
              <Link href="/">Start</Link>
              <span aria-hidden="true">/</span>
              <Link href="/bus-mieten">Bus mieten</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{c.h1}</span>
            </nav>
            <p className="lhero__kicker">
              <LIcon name="bus" size={18} />
              {c.heroKicker}
            </p>
            <h1 className="lhero__title">{c.h1}</h1>
            {c.heroText ? <p className="lhero__lead">{c.heroText}</p> : null}
            <ul className="lhero__facts" aria-label="Auf einen Blick">
              {c.heroFacts.map((f) => (
                <li key={f}>
                  <span className="lhero__fact-icon">
                    <LIcon name={iconFor(f, "check")} size={18} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="lhero__ctas">
              <Link className="btn btn--brand btn--lg btn--arrow" href={inquiryHref as never} data-magnetic="0.25">
                Angebot anfragen
              </Link>
              <a className="btn btn--ghost btn--lg lhero__call" href={`tel:${tel}`}>
                <LIcon name="phone" size={20} />
                {COMPANY.phoneDisplay}
              </a>
            </div>
            <p className="lhero__note">
              <LIcon name="clock" size={16} /> Persönlich erreichbar {COMPANY.hours} · Antwort mit schriftlichem Angebot
            </p>
          </div>
          <div className="lhero__collage" aria-hidden={false}>
            <figure className="lhero__img lhero__img--main">
              <Image src={main.src} alt={main.alt} fill priority sizes="(max-width: 900px) 100vw, 45vw" quality={78} style={{ objectFit: "cover", objectPosition: main.pos }} />
              <figcaption className="lhero__tag">{main.ki ? "KI-generiert" : "Echtes Foto"}</figcaption>
            </figure>
            <figure className="lhero__img lhero__img--a">
              <Image src={side1.src} alt={side1.alt} fill sizes="22vw" quality={72} style={{ objectFit: "cover", objectPosition: side1.pos }} />
              <figcaption className="lhero__tag">{side1.ki ? "KI" : "Foto"}</figcaption>
            </figure>
            <figure className="lhero__img lhero__img--b">
              <Image src={side2.src} alt={side2.alt} fill sizes="22vw" quality={72} style={{ objectFit: "cover", objectPosition: side2.pos }} />
              <figcaption className="lhero__tag">{side2.ki ? "KI" : "Foto"}</figcaption>
            </figure>
            <div className="lhero__float lhero__float--1">
              <span className="lhero__float-icon">
                <LIcon name="wheel" />
              </span>
              <span>
                <strong>Inklusive Fahrer</strong>
                <small>Bus mit erfahrenem Fahrpersonal</small>
              </span>
            </div>
            <div className="lhero__float lhero__float--2">
              <span className="lhero__float-icon">
                <LIcon name="doc" />
              </span>
              <span>
                <strong>Schriftliches Angebot</strong>
                <small>passend zu Ihrer Strecke</small>
              </span>
            </div>
          </div>
        </div>
      </header>

      {c.why.length ? (
        <section className="sec shell lsec" aria-labelledby="l-why">
          <div className="lhead">
            <p className="lkicker">Warum METROPOL TOURS</p>
            <h2 id="l-why">Worauf Sie sich verlassen können</h2>
          </div>
          <ul className="lcards">
            {c.why.map((w, i) => (
              <li key={w.title} className="lcard" data-reveal="up" style={{ "--rv-delay": `${i * 70}ms` } as React.CSSProperties}>
                <span className="lcard__icon">
                  <LIcon name={iconFor(w.title, (["shield", "users", "clock", "star"] as const)[i % 4])} size={26} />
                </span>
                <strong>{w.title}</strong>
                <p>{w.text}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {c.sections.length ? (
        <section className="sec shell lsec" aria-label="Informationen">
          {c.sections.map((sec, i) => {
            const img = imgs[(i + 1) % imgs.length]!;
            return (
              <div key={sec.h2} className="lrow" data-flip={i % 2 ? "true" : "false"}>
                <div className="lrow__text">
                  <span className="lrow__icon">
                    <LIcon name={iconFor(sec.h2, "bus")} size={24} />
                  </span>
                  <h2>{sec.h2}</h2>
                  <div className="prose">
                    {sec.body.map((b) => (
                      <p key={b.slice(0, 40)}>{b}</p>
                    ))}
                  </div>
                  {sec.blocks?.length ? (
                    <ul className="lrow__blocks">
                      {sec.blocks.map((b) => (
                        <li key={b.h3}>
                          <span className="lrow__check">
                            <LIcon name={iconFor(b.h3, "check")} size={18} />
                          </span>
                          <div>
                            <h3>{b.h3}</h3>
                            <p>{b.text}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <figure className="lrow__img" data-reveal="up">
                  <Image src={img.src} alt={img.alt} fill sizes="(max-width: 900px) 100vw, 40vw" quality={74} style={{ objectFit: "cover", objectPosition: img.pos }} />
                  <figcaption className="lhero__tag">{img.ki ? "KI-generiert" : "Echtes Foto"}</figcaption>
                </figure>
              </div>
            );
          })}
        </section>
      ) : null}

      {c.occasions.length ? (
        <section className="sec lsec lsec--tint" aria-labelledby="l-occ">
          <div className="shell">
            <div className="lhead">
              <p className="lkicker">Anlässe</p>
              <h2 id="l-occ">Wofür Gruppen uns buchen</h2>
              <p>Ein Klick auf einen Anlass führt direkt zur Anfrage.</p>
            </div>
            <ul className="locc">
              {c.occasions.map((o) => (
                <li key={o.title}>
                  <Link href={inquiryHref as never} className="locc__item">
                    <span className="locc__icon">
                      <LIcon name={iconFor(`${o.title} ${o.text}`, "bus")} size={28} />
                    </span>
                    <strong>{o.title}</strong>
                    <span>{o.text}</span>
                    <span className="locc__go" aria-hidden="true">
                      Anfragen →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="sec shell lsec" aria-labelledby="l-process">
        <div className="lhead">
          <p className="lkicker">Ablauf</p>
          <h2 id="l-process">So einfach geht Ihre Anfrage</h2>
        </div>
        <ol className="lsteps">
          {c.process.map((pr, i) => (
            <li key={pr.title} data-reveal="up" style={{ "--rv-delay": `${i * 80}ms` } as React.CSSProperties}>
              <span className="lsteps__icon">
                <LIcon name={(["send", "phone", "doc", "bus"] as const)[i % 4] ?? "bus"} size={26} />
                <span className="lsteps__n">{i + 1}</span>
              </span>
              <strong>{pr.title.replace(/^\d+\.\s*/, "")}</strong>
              <p>{pr.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="lstrip" aria-label="Eindrücke">
        {imgs.slice(0, 3).map((im) => (
          <figure key={im.src} className="lstrip__img">
            <Image src={im.src} alt={im.alt} fill sizes="33vw" quality={70} style={{ objectFit: "cover", objectPosition: im.pos }} />
            <figcaption className="lhero__tag">{im.ki ? "KI-generiert" : "Echtes Foto"}</figcaption>
          </figure>
        ))}
      </section>

      <section className="sec shell lsec" aria-labelledby="l-area">
        <div className="larea">
          <div>
            <p className="lkicker">Einsatzgebiet</p>
            <h2 id="l-area">Wo wir fahren</h2>
            {c.area.intro ? <p className="larea__intro">{c.area.intro}</p> : null}
            <ul className="larea__cities">
              {c.area.cities.map((city) => (
                <li key={city}>
                  <LIcon name="pin" size={16} />
                  {city}
                </li>
              ))}
            </ul>
          </div>
          {c.advantages.length ? (
            <div className="ladv">
              <h3>Ihre Vorteile</h3>
              <ul>
                {c.advantages.map((a) => (
                  <li key={a}>
                    <span className="ladv__icon">
                      <LIcon name="check" size={16} />
                    </span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {c.faqs.length ? (
        <section className="sec shell lsec" aria-labelledby="l-faq">
          <div className="lfaq">
            <div>
              <p className="lkicker">Fragen</p>
              <h2 id="l-faq">Häufige Fragen</h2>
              <p>Ihre Frage ist nicht dabei? Rufen Sie uns an – wir helfen gern.</p>
              <a className="btn btn--ghost lhero__call" href={`tel:${tel}`}>
                <LIcon name="phone" size={18} />
                {COMPANY.phoneDisplay}
              </a>
            </div>
            <div className="tfaq">
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
        <section className="sec shell lsec" aria-labelledby="l-links" style={{ paddingBlockStart: 0 }}>
          <h2 id="l-links" className="lsub">
            Das könnte Sie auch interessieren
          </h2>
          <ul className="llinks">
            {c.links.map((l) => (
              <li key={l.path}>
                <Link href={l.path as never} className="llinks__card">
                  <span className="llinks__icon">
                    <LIcon name={iconFor(`${l.label} ${l.text}`, "bus")} size={22} />
                  </span>
                  <span>
                    <strong>{l.label}</strong>
                    <small>{l.text}</small>
                  </span>
                  <span aria-hidden="true" className="llinks__go">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="sec shell lsec" aria-labelledby="l-cta" style={{ paddingBlockStart: 0 }}>
        <div className="lcta">
          <div className="lcta__text">
            <p className="lkicker lkicker--light">Anfrage</p>
            <h2 id="l-cta">{c.ctaTitle.replace(/Festpreis/gi, "Angebot")}</h2>
            <p>{c.ctaText}</p>
            <div className="lhero__ctas">
              <Link className="btn btn--lg lcta__btn" href={inquiryHref as never}>
                Angebot anfragen →
              </Link>
              <a className="btn btn--ghost-light btn--lg" href={`tel:${tel}`}>
                {COMPANY.phoneDisplay}
              </a>
            </div>
          </div>
          <figure className="lcta__img">
            <Image src="/media/metropol-man-lions-coach.jpg" alt="Reisebus von METROPOL TOURS (echtes Foto)" fill sizes="(max-width: 900px) 100vw, 40vw" quality={74} style={{ objectFit: "cover", objectPosition: "62% 55%" }} />
          </figure>
        </div>
      </section>
    </>
  );
}

type Img = { src: string; alt: string; ki: boolean; pos: string };
const IMG: Record<string, Img> = {
  real: { src: "/media/metropol-man-lions-coach.jpg", alt: "Reisebus von METROPOL TOURS in limettengrüner Lackierung", ki: false, pos: "62% 55%" },
  kueste: { src: "/media/ki/slide-kueste.webp", alt: "Reisebus auf einer Küstenstraße am Meer", ki: true, pos: "62% 60%" },
  nacht: { src: "/media/ki/slide-nacht.webp", alt: "Reisebus nachts auf einer Straße vor Bergen", ki: true, pos: "62% 55%" },
  ankommen: { src: "/media/ki/slide-wir-sind-da.webp", alt: "Reisebus mit der Anzeige „Wir sind da!“ in der Dämmerung", ki: true, pos: "58% 55%" },
  bergsee: { src: "/media/ki/slide-bergsee.webp", alt: "Bergsee mit Kirche auf einer kleinen Insel", ki: true, pos: "50% 60%" },
  gruppe: { src: "/media/ki/hero-group-travel.jpg", alt: "Fröhliche Reisegruppe im Bus", ki: true, pos: "50% 45%" },
  strand: { src: "/media/ki/hero-beach-swimming.jpg", alt: "Badebucht am Mittelmeer", ki: true, pos: "50% 55%" },
  wochenende: { src: "/media/ki/slider-wochenendtrips.jpg", alt: "Städtereise am Wochenende", ki: true, pos: "50% 50%" },
};
const BY_KEY: Record<string, string[]> = {
  busReal: ["real", "kueste", "gruppe"],
  premiumBus: ["kueste", "real", "ankommen"],
  business: ["nacht", "real", "ankommen"],
  group: ["gruppe", "real", "bergsee"],
  heroBus: ["ankommen", "real", "kueste"],
  metropolHero: ["real", "kueste", "nacht"],
  journey: ["bergsee", "real", "gruppe"],
};
/** Three different images per page; topic-based where the slug says more than the image key. */
function imagesFor(key: string, slug: string): [Img, Img, Img] {
  const topic = /schul|verein|gruppen|ausflug/.test(slug) ? ["gruppe", "real", "bergsee"] : /flughafen|shuttle/.test(slug) ? ["nacht", "real", "ankommen"] : null;
  const keys = topic ?? BY_KEY[key] ?? BY_KEY.busReal!;
  return keys.map((k) => IMG[k]!) as [Img, Img, Img];
}
