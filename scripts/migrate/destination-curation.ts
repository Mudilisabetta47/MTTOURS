/**
 * Editorial starting set for the destination guides. Every place is looked up in OpenStreetMap before it is
 * stored (see seed-destinations.ts); places that cannot be matched near the destination are not published.
 * Descriptions are deliberately short and factual. The office can edit everything in /admin/destinationen.
 */
export type Cat = "SIGHT" | "BEACH_NATURE" | "FOOD" | "LEISURE" | "TRANSPORT" | "AIRPORT";

export interface CuratedPoi {
  name: string;
  category: Cat;
  /** Nominatim query; defaults to "<name>, <city>" */
  query?: string;
  description?: string;
  highlight?: string;
  /** max distance from the destination centre for a match, km (default 10) */
  radiusKm?: number;
  /** the matched OSM name must satisfy this (protects against shops named after a sight) */
  expect?: RegExp;
  /** long features (promenades, streets): place the marker on the point of the line closest to the reference point */
  nearest?: true;
}

export interface CuratedDestination {
  slug: string;
  name: string;
  countryCode: string;
  region?: string;
  city: string;
  intro?: string;
  ref: { label: string; query: string };
  zoom: number;
  trips: string[];
  pois: CuratedPoi[];
}

export const DESTINATIONS: CuratedDestination[] = [
  {
    slug: "nizza",
    name: "Nizza",
    countryCode: "FR",
    region: "Côte d'Azur",
    city: "Nice",
    intro: "Strände, Altstadt und Aussichtspunkte – entdecken Sie, was Sie in Nizza erwartet.",
    ref: { label: "Stadtzentrum (Place Masséna)", query: "Place Masséna, Nice" },
    zoom: 13,
    trips: ["nizza"],
    pois: [
      { name: "Promenade des Anglais", category: "SIGHT", nearest: true, expect: /^Promenade des Anglais/, description: "Uferpromenade entlang der Baie des Anges.", highlight: "Der klassische Spaziergang am Meer – morgens ruhig, abends belebt." },
      { name: "Vieux Nice", category: "SIGHT", query: "Vieux Nice, Nice", description: "Altstadt mit engen Gassen, Plätzen und Märkten.", highlight: "Enge Gassen, bunte Fassaden und kleine Plätze." },
      { name: "Cours Saleya", category: "SIGHT", description: "Platz in der Altstadt, bekannt für seinen Markt." },
      { name: "Place Masséna", category: "SIGHT", description: "Zentraler Platz zwischen Altstadt und Neustadt." },
      { name: "Colline du Château", category: "BEACH_NATURE", description: "Parkhügel über der Altstadt mit Blick auf Bucht und Hafen.", highlight: "Der Blick über die Baie des Anges lohnt den Aufstieg." },
      { name: "Port Lympia", category: "SIGHT", query: "Port Lympia, Nice", description: "Hafen von Nizza östlich des Schlossbergs." },
      { name: "Musée Matisse", category: "SIGHT", description: "Museum zu Henri Matisse im Stadtteil Cimiez." },
      { name: "Cathédrale Saint-Nicolas", category: "SIGHT", query: "Cathédrale Saint-Nicolas, Nice", description: "Russisch-orthodoxe Kathedrale." },
      { name: "Jardin Albert Ier", category: "BEACH_NATURE", query: "Jardin Albert 1er, Nice", expect: /^Jardin Albert/, description: "Parkanlage nahe der Promenade." },
      { name: "Parc du Mont Boron", category: "BEACH_NATURE", query: "Mont Boron, Nice", description: "Waldgebiet mit Wanderwegen östlich des Hafens." },
      { name: "Fenocchio", category: "FOOD", query: "Fenocchio, Place Rossetti, Nice", description: "Eisdiele an der Place Rossetti in der Altstadt." },
      { name: "Avenue Jean Médecin", category: "LEISURE", nearest: true, description: "Einkaufsstraße im Zentrum." },
      { name: "Gare de Nice-Ville", category: "TRANSPORT", query: "Gare de Nice Ville", description: "Hauptbahnhof von Nizza." },
      { name: "Flughafen Nizza Côte d'Azur", category: "AIRPORT", query: "Aéroport Nice Côte d'Azur", description: "Internationaler Flughafen westlich der Stadt.", radiusKm: 15 },
    ],
  },
  {
    slug: "lloret-de-mar",
    name: "Lloret de Mar",
    countryCode: "ES",
    region: "Costa Brava",
    city: "Lloret de Mar",
    intro: "Strände, Küstenwege und Gärten – entdecken Sie, was Sie in Lloret de Mar erwartet.",
    ref: { label: "Ortszentrum (Rathaus)", query: "Ajuntament de Lloret de Mar" },
    zoom: 13.5,
    trips: ["lloret-de-mar"],
    pois: [
      { name: "Platja de Lloret", category: "BEACH_NATURE", description: "Hauptstrand direkt am Ortszentrum.", highlight: "Der Hauptstrand liegt direkt vor dem Ortszentrum." },
      { name: "Platja de Fenals", category: "BEACH_NATURE", description: "Sandstrand in einer Bucht südwestlich des Zentrums." },
      { name: "Cala Banys", category: "BEACH_NATURE", description: "Felsige Bucht am Küstenweg." },
      { name: "Jardins de Santa Clotilde", category: "BEACH_NATURE", description: "Terrassengärten über dem Meer.", highlight: "Terrassengärten mit Blick über die Küste." },
      { name: "Castell d'en Plaja", category: "SIGHT", query: "Castell d'en Plaja, Lloret de Mar", description: "Burgähnliches Gebäude am Ende des Hauptstrands.", highlight: "Das bekannteste Fotomotiv am Ende des Strandes." },
      { name: "Església de Sant Romà", category: "SIGHT", query: "Sant Romà, Lloret de Mar", description: "Pfarrkirche im Ortskern." },
      { name: "Dona Marinera", category: "SIGHT", query: "Dona Marinera, Lloret de Mar", description: "Bronzestatue an der Küste." },
      { name: "Water World", category: "LEISURE", query: "Water World, Lloret de Mar", description: "Wasserpark am Ortsrand." },
      { name: "Busbahnhof Lloret de Mar", category: "TRANSPORT", query: "Estació d'autobusos, Lloret de Mar", description: "Busbahnhof des Ortes." },
      { name: "Flughafen Girona–Costa Brava", category: "AIRPORT", query: "Aeroport de Girona-Costa Brava", description: "Nächstgelegener Flughafen.", radiusKm: 50 },
      { name: "Flughafen Barcelona–El Prat", category: "AIRPORT", query: "Aeroport Josep Tarradellas Barcelona-El Prat", description: "Großflughafen Barcelonas.", radiusKm: 120 },
    ],
  },
  {
    slug: "kopenhagen",
    name: "Kopenhagen",
    countryCode: "DK",
    city: "København",
    intro: "Hafen, Schlösser und Parks – entdecken Sie, was Sie in Kopenhagen erwartet.",
    ref: { label: "Stadtzentrum (Rathausplatz)", query: "Rådhuspladsen, København" },
    zoom: 13,
    trips: ["kopenhagen"],
    pois: [
      { name: "Nyhavn", category: "SIGHT", query: "Nyhavn, København", description: "Hafenkanal mit bunten Häuserzeilen.", highlight: "Bunte Giebelhäuser am alten Hafenkanal." },
      { name: "Die kleine Meerjungfrau", category: "SIGHT", query: "Den Lille Havfrue", description: "Bronzefigur an der Uferpromenade Langelinie.", highlight: "Kleine Figur, großer Name – an der Langelinie." },
      { name: "Schloss Amalienborg", category: "SIGHT", query: "Amalienborg, København", description: "Residenz der dänischen Königsfamilie." },
      { name: "Schloss Christiansborg", category: "SIGHT", query: "Christiansborg Slot", description: "Sitz des dänischen Parlaments." },
      { name: "Rundetårn", category: "SIGHT", query: "Rundetårn, København", description: "Historischer Turm mit Aussichtsplattform." },
      { name: "Schloss Rosenborg", category: "SIGHT", query: "Rosenborg Slot", description: "Renaissanceschloss im Königsgarten." },
      { name: "Tivoli", category: "LEISURE", query: "Tivoli Gardens, København", expect: /^Tivoli( Gardens|s Have)?,/, description: "Vergnügungspark im Stadtzentrum.", highlight: "Der traditionsreiche Vergnügungspark mitten in der Stadt." },
      { name: "Kongens Have", category: "BEACH_NATURE", query: "Kongens Have, København", description: "Ältester Park der Stadt am Schloss Rosenborg." },
      { name: "Amager Strandpark", category: "BEACH_NATURE", query: "Amager Strandpark", description: "Stadtstrand mit Lagune." },
      { name: "Torvehallerne", category: "FOOD", query: "Torvehallerne, København", description: "Markthallen mit Ständen für Lebensmittel und Imbiss." },
      { name: "Københavns Hovedbanegård", category: "TRANSPORT", query: "København H", description: "Hauptbahnhof." },
      { name: "Flughafen Kopenhagen", category: "AIRPORT", query: "Københavns Lufthavn, Kastrup", description: "Internationaler Flughafen in Kastrup.", radiusKm: 20 },
    ],
  },
  // A guide without places yet: shows the clean empty state.
  {
    slug: "prag",
    name: "Prag",
    countryCode: "CZ",
    city: "Praha",
    ref: { label: "Altstädter Ring", query: "Staroměstské náměstí, Praha" },
    zoom: 13,
    trips: ["prag"],
    pois: [],
  },
];
