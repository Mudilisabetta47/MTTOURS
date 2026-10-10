import type { LandingContent } from "./types";

/**
 * The legacy landing texts (written in Lovable) contain operational claims nobody has confirmed yet.
 * Instead of silently rewriting them, every rule below removes or neutralises one kind of claim.
 * When the company confirms a claim (e.g. "eigener Fuhrpark"), delete the matching rule – nothing else changes.
 */
export const UNCONFIRMED_CLAIMS: { rule: RegExp; why: string }[] = [
  { rule: /festangestellt/i, why: "Anstellungsverhältnis der Fahrer nicht bestätigt" },
  { rule: /eigene[nmrs]? (Fuhrpark|Fahrzeug|Werkstatt|Fahrerpool|Fahrer)/i, why: "Eigenflotte/-personal nicht bestätigt" },
  { rule: /eigenem Fuhrpark|eigene Fahrzeuge disponieren/i, why: "Eigenflotte nicht bestätigt" },
  { rule: /Werkstattpartner|Partnernetz|Partnerbetrieb|Reservekapazit|Ersatzfahrzeug|Ersatz\b|Ersatz aus/i, why: "Ersatzkonzept nicht bestätigt" },
  { rule: /selben Werktag|innerhalb (weniger|von)|vor 15 Uhr|Minuten/i, why: "Antwort-/Reaktionszeiten nicht zugesagt" },
  { rule: /vierstellig|\d+\s?€|\bEuro\b/i, why: "Preisangaben nicht freigegeben" },
  { rule: /Doppelstock|79|59 Sitze|bis 59|8 bis|8–|8-Sitzer|Kleinbus|Midibus|Fernreisebus/i, why: "Fahrzeugklassen/Sitzplätze nicht bestätigt" },
  { rule: /Kostenlose Stornierung|kostenlos storn/i, why: "Stornoregel widerspricht AGB/Tarifen" },
  { rule: /spätestens zwei Tage|Kontaktdaten Ihres Fahrers/i, why: "Prozesszusage nicht bestätigt" },
  { rule: /Code 95|Doppelbesetzung|Fahrerteam|im Team|regelmäßig weitergebildet|inhabergeführt/i, why: "Personalangaben nicht bestätigt" },
  { rule: /WLAN|Bordküche|\bWC\b|Alle Reisebusse verfügen|Klimaanlage, verstellbare/i, why: "Ausstattung je Fahrzeug nicht bestätigt" },
  { rule: /Festpreis/i, why: "Festpreis-Zusage: Angebot ist verbindlich, aber Begriff nicht freigegeben" },
];

const isUnconfirmed = (text: string) => UNCONFIRMED_CLAIMS.some((c) => c.rule.test(text));

/** Drop sentences containing unconfirmed claims; keep the rest of the paragraph. */
export function cleanText(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+["“”]?\s*|[^.!?]+$/g) ?? [text];
  return sentences
    .filter((s) => !isUnconfirmed(s))
    .join("")
    .trim();
}

const longEnough = (t: string) => (t.length >= 80 ? t : undefined);

export function sanitizeLanding(c: LandingContent): LandingContent {
  const clean = (t: string) => cleanText(t);
  const keep = (t: string) => !isUnconfirmed(t);
  return {
    ...c,
    seoTitle: c.seoTitle.replace(/ab Festpreis|Festpreis/gi, "Angebot").replace(/\s+–\s+mit Fahrer Angebot/, " – mit Fahrer"),
    seoDescription: longEnough(clean(c.seoDescription)) ?? `${c.h1}: Bus mit Fahrer für Gruppen, Schulen, Vereine und Firmen. Strecke, Datum und Personenzahl angeben und schriftliches Angebot erhalten.`,
    heroAlt: "Reisebus von METROPOL TOURS",
    heroKicker: keep(c.heroKicker) ? c.heroKicker : "Bus mit Fahrer · Angebot auf Anfrage",
    heroText: clean(c.heroText),
    heroFacts: ["Inklusive Fahrer", "Schriftliches Angebot", "Abholung an Ihrer Adresse"],
    why: c.why.filter((w) => keep(w.title) && keep(w.text)),
    sections: c.sections
      .map((s) => ({
        ...s,
        body: s.body.map(clean).filter(Boolean),
        blocks: s.blocks?.map((b) => ({ ...b, text: clean(b.text) })).filter((b) => b.text && keep(b.h3)),
      }))
      .filter((s) => s.body.length || s.blocks?.length),
    fleet: [], // shown again once the real fleet list exists
    occasions: c.occasions.map((o) => ({ ...o, text: clean(o.text) })).filter((o) => o.text && keep(o.title)),
    process: c.process.map((p) => ({
      title: p.title.replace(/Festpreis(angebot)?( erhalten)?/i, "Angebot"),
      text: clean(p.text) || "Sie erhalten ein schriftliches Angebot.",
    })),
    area: { ...c.area, intro: clean(c.area.intro) },
    advantages: c.advantages.filter(keep),
    faqs: c.faqs.filter((f) => keep(f.q) && keep(f.a)),
    links: c.links,
    ctaText: clean(c.ctaText) || "Senden Sie uns Datum, Strecke und Personenzahl – Sie erhalten ein schriftliches Angebot.",
  };
}
