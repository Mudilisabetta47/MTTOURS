import { createHash } from "node:crypto";
import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/server/db/client";
import { listPublishedTrips, tripPath, type TripSummary } from "@/server/catalog/trips";
import { COMPANY } from "@/content/company";
import { DEPARTURE_POINTS } from "@/content/places";
import type { Navigation, NavigationSource, NavLink } from "./types";

const dateFmt = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
const eur = (c: number) => (c / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

/**
 * Builds the navigation from static structure + live catalogue facts.
 * Only links to pages that exist; trip types and departure points appear only when published trips use them.
 */
async function build(): Promise<Navigation> {
  let trips: TripSummary[] = [];
  try {
    trips = await listPublishedTrips(db);
  } catch {
    trips = []; // navigation must render even if the database is briefly unavailable
  }
  const packages = trips.filter((t) => t.productType === "PACKAGE_TOUR");
  const weekend = trips.filter((t) => t.productType === "TRANSPORT_ONLY");
  const bookable = trips.filter((t) => t.next);
  const cities = (["Städtereise", "Strandurlaub"] as const).map((c) => ({ c, n: trips.filter((t) => t.category === c).length }));

  const discover: NavLink[] = [
    { label: "Alle Reisen", href: "/reisen", icon: "compass", count: trips.length },
    ...(bookable.length ? [{ label: "Aktuell buchbar", href: "/reisen", icon: "tag" as const, count: bookable.length }] : []),
    ...(packages.length ? [{ label: "Mehrtagesreisen", href: "/pauschalreisen", icon: "calendar" as const, count: packages.length, description: "Pauschalreisen ans Mittelmeer" }] : []),
    ...(weekend.length ? [{ label: "Wochenendreisen", href: "/wochenendtrips", icon: "city" as const, count: weekend.length, description: "Fahrt buchen, Unterkunft optional" }] : []),
    ...cities.filter((x) => x.n > 0 && x.c === "Strandurlaub").map((x) => ({ label: "Strandurlaub", href: "/reisen?q=Strandurlaub", icon: "sun" as const, count: x.n })),
    ...cities.filter((x) => x.n > 0 && x.c === "Städtereise").map((x) => ({ label: "Städtereisen", href: "/reisen?q=Städtereise", icon: "city" as const, count: x.n })),
  ];

  const fromPoints: NavLink[] = DEPARTURE_POINTS.map((p) => ({
    label: `Reisen ab ${p.name}`,
    href: `/reisen?ab=${p.slug}`,
    icon: "pin" as const,
    count: trips.filter((t) => t.boardingCities.some((c) => c.toLowerCase() === p.name.toLowerCase())).length,
  })).filter((l) => (l.count ?? 0) > 0);

  const next = bookable[0];
  const featuredTrip = next ?? packages[0] ?? trips[0];

  return {
    phone: { display: COMPANY.phoneDisplay, href: `tel:${COMPANY.phone.replace(/\s/g, "")}` },
    primary: { label: "Reise finden", href: "/reisen" },
    secondary: { label: "Bus anfragen", href: "/bus-mieten#anfrage" },
    items: [
      {
        key: "reisen",
        label: "Reisen",
        activePrefixes: ["/reisen", "/pauschalreisen", "/wochenendtrips", "/buchung"],
        columns: [
          { title: "Reisen entdecken", links: discover },
          { title: "Abfahrtsorte", links: [...fromPoints, { label: "Alle Zustiegsorte", href: "/zustiege", icon: "route" }] },
          {
            title: "Reiseplanung",
            search: { action: "/reisen", name: "q", placeholder: "Wohin? z. B. Nizza" },
            links: [
              { label: "Zustiegsorte & Zeiten", href: "/zustiege", icon: "pin" },
              { label: "Fragen & Antworten", href: "/faq", icon: "help" },
              { label: "Tickets & Einsteigen", href: "/faq#tickets", icon: "ticket" },
            ],
          },
        ],
        feature: featuredTrip
          ? {
              eyebrow: next ? "Nächste buchbare Reise" : "Aus unserem Programm",
              title: featuredTrip.title,
              text: next?.next ? `${dateFmt.format(next.next.departAt)} · ab ${eur(next.next.fromPriceCents)} p. P.` : "Neue Termine in Planung",
              href: tripPath(featuredTrip),
              cta: "Reise ansehen",
              visual: { kind: "trip", slug: featuredTrip.slug, destination: featuredTrip.destination, motif: featuredTrip.motif },
            }
          : undefined,
      },
      {
        key: "bus",
        label: "Bus mieten",
        activePrefixes: ["/bus-mieten", "/reisebus-", "/busvermietung-", "/busunternehmen-", "/bus-charter", "/reisebus-mit-fahrer"],
        columns: [
          {
            title: "Busvermietung",
            links: [
              { label: "Reisebus mieten", href: "/bus-mieten", icon: "bus", description: "Anfrage, Ablauf, Angebot" },
              { label: "Bus mit Fahrer", href: "/reisebus-mit-fahrer", icon: "wheel" },
              { label: "Gruppenfahrt", href: "/gruppenreisen", icon: "users" },
              { label: "Individuelle Busreise", href: "/bus-charter", icon: "route" },
            ],
          },
          {
            title: "Für Ihren Anlass",
            links: [
              { label: "Klassenfahrten", href: "/schulfahrten", icon: "school" },
              { label: "Vereinsfahrten", href: "/vereinsfahrten", icon: "flag" },
              { label: "Firmenveranstaltungen", href: "/bus-mieten?anlass=firma#anfrage", icon: "briefcase" },
              { label: "Flughafentransfers", href: "/flughafentransfer", icon: "plane" },
              { label: "Shuttleverkehr", href: "/shuttle-service", icon: "shuttle" },
              { label: "Messefahrten", href: "/shuttle-service", icon: "expo" },
            ],
          },
          {
            title: "Standorte",
            links: [
              { label: "Bus mieten Hannover", href: "/bus-mieten-hannover", icon: "pin" },
              { label: "Bus mieten Bremen", href: "/bus-mieten-bremen", icon: "pin" },
              { label: "Bus mieten Hamburg", href: "/bus-mieten-hamburg", icon: "pin" },
            ],
          },
        ],
        feature: {
          eyebrow: "Busanfrage",
          title: "Der passende Bus für Ihre Reise.",
          text: "Strecke, Datum und Personenzahl angeben – Sie erhalten ein schriftliches Angebot.",
          href: "/bus-mieten#anfrage",
          cta: "Jetzt Bus anfragen",
          visual: { kind: "photo", src: "/media/metropol-man-lions-coach.jpg", alt: "Reisebus von METROPOL TOURS (echtes Foto)", ki: false },
        },
      },
      { key: "fuhrpark", label: "Fuhrpark", href: "/fuhrpark", activePrefixes: ["/fuhrpark"] },
      {
        key: "gruppen",
        label: "Gruppen",
        activePrefixes: ["/gruppen", "/schulfahrten", "/vereinsfahrten", "/gruppenreisen", "/shuttle-service"],
        intro: {
          title: "Reisen für Gruppen",
          text: "Ab etwa 20 Personen planen wir Fahrt oder Reise nach Ihren Vorgaben – mit eigenem Termin, eigener Strecke und Abholung an Ihrer Adresse.",
          cta: { label: "Gruppenanfrage stellen", href: "/bus-mieten?anlass=gruppenreise#anfrage" },
        },
        columns: [
          {
            title: "Für wen",
            links: [
              { label: "Schulklassen", href: "/schulfahrten", icon: "school" },
              { label: "Vereine", href: "/vereinsfahrten", icon: "flag" },
              { label: "Unternehmen", href: "/gruppen#unternehmen", icon: "briefcase" },
              { label: "Reisegruppen", href: "/gruppenreisen", icon: "users" },
              { label: "Event- und Messeshuttle", href: "/shuttle-service", icon: "expo" },
              { label: "Individuelle Gruppenreise", href: "/bus-mieten?anlass=gruppenreise#anfrage", icon: "route" },
            ],
          },
        ],
        feature: {
          eyebrow: "Gruppen",
          title: "Alle zusammen in einem Bus.",
          text: "Ein Ansprechpartner, ein Angebot, eine Rechnung.",
          href: "/gruppen",
          cta: "Mehr für Gruppen",
          visual: { kind: "photo", src: "/media/ki/hero-group-travel.jpg", alt: "Reisegruppe im Bus (KI-generiert)", ki: true },
        },
      },
      {
        key: "service",
        label: "Service",
        activePrefixes: ["/faq", "/zustiege", "/kontakt"],
        columns: [
          {
            title: "Vor der Reise",
            links: [
              { label: "Zustiegsorte", href: "/zustiege", icon: "pin" },
              { label: "Reiseinformationen", href: "/faq#reise", icon: "info" },
              { label: "Tickets", href: "/faq#tickets", icon: "ticket" },
            ],
          },
          {
            title: "Hilfe",
            links: [
              { label: "Fragen & Antworten", href: "/faq", icon: "help" },
              { label: "Kontakt", href: "/kontakt", icon: "mail" },
              { label: COMPANY.phoneDisplay, href: `tel:${COMPANY.phone.replace(/\s/g, "")}`, icon: "phone", description: COMPANY.hours },
            ],
          },
        ],
      },
      {
        key: "about",
        label: "Über uns",
        activePrefixes: ["/ueber-uns", "/fuhrpark", "/impressum"],
        columns: [
          {
            title: "Metropol Tours",
            links: [
              { label: "Unternehmen", href: "/ueber-uns", icon: "building" },
              { label: "Fuhrpark", href: "/fuhrpark", icon: "bus" },
              { label: "Abfahrtsorte", href: "/zustiege", icon: "route" },
              { label: "Kontakt", href: "/kontakt", icon: "mail" },
              { label: "Impressum", href: "/impressum", icon: "info" },
            ],
          },
        ],
      },
      { key: "kontakt", label: "Kontakt", href: "/kontakt", activePrefixes: ["/kontakt"] },
    ],
  };
}

// The data cache lives in .next/ and outlives a single server process; keying it by database keeps
// a dev or test server from ever serving a menu that was built from another database.
const dbKey = createHash("sha256").update(process.env.DATABASE_URL ?? "").digest("hex").slice(0, 12);
const cached = unstable_cache(build, ["navigation-v1", dbKey], { revalidate: 300, tags: ["navigation", "catalog"] });

export const navigationSource: NavigationSource = { load: () => cached() };
