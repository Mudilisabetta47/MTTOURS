/**
 * Editorial curation of the legacy catalogue (www.metours.de, Supabase, read 10.10.2026).
 * Only facts that exist in the legacy data or are general geographic facts about the destination.
 * Everything the office still has to confirm is listed in `reviewNotes` and shown in the admin.
 */
import type { ContentBlock } from "../../src/lib/content-blocks.ts";

export interface CuratedTrip {
  source: "package_tours" | "weekend_trips";
  legacySlug: string;
  slug: string;
  title: string;
  productType: "PACKAGE_TOUR" | "TRANSPORT_ONLY";
  status: "DRAFT" | "REVIEW" | "PUBLISHED";
  countryCode: string;
  destination: string;
  category: string;
  motif: string;
  durationDays: number;
  summary: string;
  description: ContentBlock[];
  highlights: string[];
  included: string[];
  excluded: string[];
  hotelName?: string;
  hotelAddress?: string;
  /** legacy optional services to import (by legacy name) */
  optionalServices?: string[];
  seoTitle: string;
  seoDescription: string;
  reviewNotes: string[];
}

const BUS = "Hin- und Rückfahrt im Reisebus";

export const CURATED: CuratedTrip[] = [
  {
    source: "package_tours",
    legacySlug: "nizza",
    slug: "nizza",
    title: "Nizza – 7 Tage Côte d’Azur",
    productType: "PACKAGE_TOUR",
    status: "PUBLISHED",
    countryCode: "FR",
    destination: "Nizza",
    category: "Strandurlaub",
    motif: "riviera",
    durationDays: 7,
    summary: "Sieben Tage an der Côte d’Azur: Promenade, Altstadt und Mittelmeer. Mit dem Reisebus ab Hamburg, Bremen und Hannover.",
    description: [
      { type: "p", text: "Nizza liegt zwischen den Seealpen und der Baie des Anges. Die Promenade des Anglais zieht sich rund sieben Kilometer am Wasser entlang, dahinter liegt die Altstadt Vieux Nice mit engen Gassen und dem Blumen- und Gemüsemarkt am Cours Saleya." },
      { type: "p", text: "Vom Schlossberg (Colline du Château) überblicken Sie Hafen, Altstadt und Bucht. Monaco, Antibes und Cannes liegen in Reichweite der Regionalbahn." },
      { type: "h2", text: "Anreise" },
      { type: "p", text: "Sie reisen im Reisebus an. Zustiege gibt es in Hamburg, Bremen und Hannover; Abfahrtszeit, Steig und Aufpreis stehen beim jeweiligen Zustieg." },
    ],
    highlights: ["Promenade des Anglais", "Altstadt Vieux Nice", "Colline du Château", "Mittelmeer"],
    included: [BUS],
    excluded: [],
    seoTitle: "Busreise Nizza – 7 Tage Côte d’Azur ab Hannover, Bremen, Hamburg",
    seoDescription: "Busreise nach Nizza: 7 Tage Côte d’Azur mit Zustieg in Hamburg, Bremen oder Hannover. Termine, Zustiege und Leistungen im Überblick.",
    reviewNotes: [
      "Unterkunft (Hotel, Kategorie, Lage) und Verpflegung angeben",
      "Reiseverlauf Tag für Tag ergänzen",
      "Eingeschlossene Leistungen vollständig bestätigen",
      "Sicherungsschein / Insolvenzversicherer hinterlegen (Pauschalreise)",
      "Neue Termine mit Preisen anlegen",
    ],
  },
  {
    source: "package_tours",
    legacySlug: "lloret-de-mar-sonne-strand-sorglos-reisen",
    slug: "lloret-de-mar",
    title: "Lloret de Mar – 7 Tage Costa Brava",
    productType: "PACKAGE_TOUR",
    status: "PUBLISHED",
    countryCode: "ES",
    destination: "Lloret de Mar",
    category: "Strandurlaub",
    motif: "beach",
    durationDays: 7,
    summary: "Sieben Tage Costa Brava: Sandstrand, Küstenweg und Altstadt. Mit dem Reisebus ab Hamburg, Bremen und Hannover.",
    description: [
      { type: "p", text: "Lloret de Mar liegt an der Costa Brava, rund 70 Kilometer nordöstlich von Barcelona. Der Hauptstrand Platja de Lloret ist über einen Kilometer lang, kleinere Buchten wie Fenals und Santa Cristina liegen in Gehweite." },
      { type: "p", text: "Der Küstenweg Camí de Ronda verbindet die Buchten, oberhalb von Fenals liegen die Gärten von Santa Clotilde. Girona und Barcelona sind von Lloret aus gut zu erreichen." },
      { type: "h2", text: "Anreise" },
      { type: "p", text: "Sie reisen im Reisebus an, mit WLAN an Bord und Lademöglichkeit am Sitzplatz. Zustiege in Hamburg, Bremen und Hannover; Zeiten und Aufpreise stehen beim jeweiligen Zustieg." },
    ],
    highlights: ["Platja de Lloret", "Küstenweg Camí de Ronda", "Gärten von Santa Clotilde", "Nähe zu Barcelona und Girona"],
    included: [BUS, "WLAN an Bord", "Lademöglichkeit am Sitzplatz"],
    excluded: [],
    optionalServices: ["Reiserücktrittsversicherung"],
    seoTitle: "Busreise Lloret de Mar – 7 Tage Costa Brava ab Hannover, Bremen, Hamburg",
    seoDescription: "Busreise nach Lloret de Mar an der Costa Brava: 7 Tage, Zustieg in Hamburg, Bremen oder Hannover. Termine, Zustiege und Leistungen.",
    reviewNotes: [
      "Altdaten widersprüchlich: „Frühstück enthalten“ und „Frühstück optional vor Ort“ – klären",
      "Altdaten widersprüchlich: „Reiseversicherung inklusive“ vs. Rechtstext „nicht enthalten“ – klären",
      "Unterkunft (Hotel, Kategorie, Lage) angeben",
      "Reiseverlauf Tag für Tag ergänzen",
      "Sicherungsschein / Insolvenzversicherer hinterlegen (Pauschalreise)",
      "Neue Termine mit Preisen anlegen",
    ],
  },
  {
    source: "package_tours",
    legacySlug: "sanremo",
    slug: "sanremo",
    title: "Sanremo – 7 Tage Blumenriviera",
    productType: "PACKAGE_TOUR",
    status: "DRAFT",
    countryCode: "IT",
    destination: "Sanremo",
    category: "Strandurlaub",
    motif: "riviera",
    durationDays: 7,
    summary: "Sieben Tage an der italienischen Blumenriviera: Promenade, Altstadt La Pigna und Mittelmeer.",
    description: [
      { type: "p", text: "Sanremo liegt an der Riviera di Ponente in Ligurien, rund 20 Kilometer vor der französischen Grenze. Die Altstadt La Pigna zieht sich den Hang hinauf, unten liegen Hafen, Corso Imperatrice und das Casino." },
      { type: "h2", text: "Anreise" },
      { type: "p", text: "Im Reisebus mit Zustiegen in Hamburg, Bremen und Hannover." },
    ],
    highlights: ["Altstadt La Pigna", "Corso Imperatrice", "Ligurische Küste"],
    included: [BUS],
    excluded: [],
    seoTitle: "Busreise Sanremo – 7 Tage Blumenriviera",
    seoDescription: "Busreise nach Sanremo an der italienischen Riviera mit Zustieg in Hamburg, Bremen oder Hannover.",
    reviewNotes: ["Im Altsystem Entwurf – Leistungen, Unterkunft und Termine ergänzen", "Bilder im Altsystem stammen teils von fremden Websites – nicht übernommen"],
  },
  {
    source: "package_tours",
    legacySlug: "novalja",
    slug: "novalja",
    title: "Novalja – Insel Pag",
    productType: "PACKAGE_TOUR",
    status: "REVIEW",
    countryCode: "HR",
    destination: "Novalja",
    category: "Strandurlaub",
    motif: "island",
    durationDays: 7,
    summary: "Kroatische Adria auf der Insel Pag. Busreise mit Unterkunft im Apartment.",
    description: [
      { type: "p", text: "Novalja liegt im Norden der Insel Pag in der kroatischen Adria. Bekannt ist die Gegend für ihre Kiesstrände und Buchten, etwa den Strand Zrće." },
    ],
    highlights: ["Insel Pag", "Adria"],
    included: [BUS, "Unterkunft im Apartment", "Reservierter Sitzplatz im Reisebus"],
    excluded: [],
    seoTitle: "Busreise Novalja – Insel Pag",
    seoDescription: "Busreise nach Novalja auf der Insel Pag, Kroatien.",
    reviewNotes: [
      "Im Altsystem mit 0 € veröffentlicht – Preise festlegen, vorher nicht veröffentlichen",
      "Zusatzleistung „Ausflugspaket nach Nizza“ bei einer Kroatien-Reise – nicht übernommen, prüfen",
    ],
  },
  {
    source: "package_tours",
    legacySlug: "paris-demnaechst",
    slug: "paris-7-tage",
    title: "Paris – 7 Tage Rundreise",
    productType: "PACKAGE_TOUR",
    status: "DRAFT",
    countryCode: "FR",
    destination: "Paris",
    category: "Städtereise",
    motif: "paris",
    durationDays: 7,
    summary: "Sieben Tage Paris mit Unterkunft. Eiffelturm, Louvre und Paris bei Nacht.",
    description: [{ type: "p", text: "Im Altsystem als „demnächst“ angelegt. Programm und Termine folgen." }],
    highlights: ["Eiffelturm", "Louvre", "Paris bei Nacht"],
    included: [BUS],
    excluded: [],
    hotelName: "HotelF1 Paris Porte de Montreuil",
    hotelAddress: "Zac Eugène Barlain, Rue Etienne Marcel 290–302, 93170 Bagnolet, Frankreich",
    optionalServices: ["Einzelzimmerzuschlag"],
    seoTitle: "Busreise Paris – 7 Tage",
    seoDescription: "Busreise nach Paris, 7 Tage mit Unterkunft.",
    reviewNotes: ["Im Altsystem Entwurf „demnächst“ – Programm, Termine und Preise ergänzen"],
  },
  // ── Weekend trips (transport only, accommodation optional) ─────────────────
  ...(
    [
      ["amsterdam", "Amsterdam", "NL", "amsterdam", "Grachten, Museen und Cafés: Amsterdam an einem Wochenende. Sie buchen die Busfahrt, eine Übernachtung ist optional.", "Kurztrip nach Amsterdam im Reisebus ab Hamburg, Bremen und Hannover.", ["Preis im Altsystem 449,90 € „nur Fahrt“, andere Ziele 199–299 € – prüfen"]],
      ["kopenhagen", "Kopenhagen", "DK", "kopenhagen", "Nyhavn, Tivoli und die Altstadt: Kopenhagen für ein langes Wochenende. Zustieg in Hannover, Bremen und Hamburg.", "Wochenende in Kopenhagen im Reisebus, Zustieg in Hannover, Bremen oder Hamburg.", ["Abfahrtszeiten der Zustiege fehlen im Altsystem"]],
      ["prag", "Prag", "CZ", "prag", "Altstadt, Karlsbrücke und Burgviertel: Prag am Wochenende. Der Preis gilt für die Busfahrt, eine Übernachtung buchen Sie optional dazu.", "Wochenende in Prag im Reisebus ab Hamburg.", ["Abfahrtszeit fehlt im Altsystem"]],
      ["paris", "Paris", "FR", "paris", "Mit der Nachtfahrt nach Paris: morgens ankommen, den Tag in der Stadt verbringen. Die Übernachtung ist optional dazubuchbar.", "Wochenende in Paris mit Nachtfahrt im Reisebus ab Hamburg.", []],
    ] as const
  ).map(
    ([slug, name, cc, motif, text, summary, notes]): CuratedTrip => ({
      source: "weekend_trips",
      legacySlug: slug,
      slug,
      title: `Wochenende in ${name}`,
      productType: "TRANSPORT_ONLY",
      status: "PUBLISHED",
      countryCode: cc,
      destination: name,
      category: "Wochenendtrip",
      motif,
      durationDays: 3,
      summary,
      description: [{ type: "p", text }],
      highlights: [],
      included: [BUS, "WLAN an Bord", "Steckdosen am Sitzplatz", "Stadtplan und Infomaterial"],
      excluded: ["Übernachtung (optional)", "Verpflegung", "Eintritte und Führungen"],
      seoTitle: `Wochenendtrip ${name} mit dem Bus`,
      seoDescription: `${summary} Termine und Zustiege im Überblick.`,
      reviewNotes: ["Termine mit Preisen anlegen", ...notes],
    }),
  ),
];
