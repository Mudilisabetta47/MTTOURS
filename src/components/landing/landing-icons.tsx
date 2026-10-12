/** Friendly line icons for the service landing pages. One stroke style, green accent via CSS. */
const P: Record<string, string> = {
  bus: "M5 17V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v11M5 17h14M5 12h14M7.5 20v-3M16.5 20v-3M8 14.5h.01M16 14.5h.01",
  school: "M3 9 12 4l9 5-9 5-9-5Zm4 2.3V16c0 1.4 2.2 3 5 3s5-1.6 5-3v-4.7M21 9v6",
  flag: "M5 21V4m0 0h11l-2 4 2 4H5",
  briefcase: "M4 8h16v11H4zM9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 13h16",
  plane: "M10.5 13.5 4 12l-1 1.5 6 3 3 6 1.5-1-1.5-6.5L17 10c1.5-1.5 2.5-3.5 2-4.5-1-.5-3 .5-4.5 2l-4 5Z",
  building: "M4 21V5l8-2v18M12 7l8 3v11M8 8h.01M8 12h.01M8 16h.01M16 13h.01M16 17h.01M2 21h20",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 21h6M10 17h4",
  music: "M9 18V6l11-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14",
  star: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z",
  users: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 19v-1a4 4 0 0 0-3-3.9M15.5 3.2a3.5 3.5 0 0 1 0 6.6",
  anchor: "M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 0v14M5 13a7 7 0 0 0 14 0M8 11h8",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4.5l3 2",
  moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z",
  gift: "M4 10h16v11H4zM3 7h18v3H3zM12 7v14M12 7S10 3 7.5 4 9 7 12 7Zm0 0s2-4 4.5-3S15 7 12 7Z",
  shield: "M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Zm-3 9 2 2 4-4",
  doc: "M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M9 13h6M9 17h6",
  phone: "M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  check: "m5 12.5 4.5 4.5L19 7.5",
  pin: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  wheel: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0-6V3m-2.6 7.5L4 8m7.4 4.5L20 8M12 15v6",
  send: "M4 12 20 4l-6 16-3-7-7-1Z",
  route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 17h6.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H16",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
};

export type IconName = keyof typeof P;

export function LIcon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="lic">
      <path d={P[name]} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const RULES: [RegExp, IconName][] = [
  [/schul|klasse|wandertag|studien|abschluss|abi/i, "school"],
  [/verein|club|mitglied/i, "flag"],
  [/sport|auswärts|training|turnier|spiel/i, "trophy"],
  [/firm|unternehm|betrieb|team|incentive|industrie|agentur|delegation|werks/i, "briefcase"],
  [/flug|airport|abflug/i, "plane"],
  [/messe|kongress|tagung|hotel|event|roadshow|premiere/i, "building"],
  [/auftritt|konzert|musik|umzug|bühne/i, "music"],
  [/hochzeit|feier|jubiläum|geburtstag/i, "heart"],
  [/kreuzfahrt|hafen|schiff/i, "anchor"],
  [/shuttle|takt|linie|pendel/i, "clock"],
  [/nacht/i, "moon"],
  [/weihnacht|advent|markt/i, "gift"],
  [/senior|gemeinde|kirche|wallfahrt|reisegrupp|gruppe/i, "users"],
  [/ausflug|tagesfahrt|reise|rundreise|mehrtag/i, "map"],
  [/fahrer|lenk|personal/i, "wheel"],
  [/angebot|preis|festpreis|kosten|rechnung/i, "doc"],
  [/sicher|versich|zuverläss|pünktlich|geprüft/i, "shield"],
  [/erreich|telefon|ansprech|kontakt|beratung/i, "phone"],
  [/region|gebiet|stadt|abhol|adresse|ort/i, "pin"],
  [/strecke|route|fahrt/i, "route"],
];

/** Picks a fitting icon from a heading; falls back to the bus. */
export function iconFor(text: string, fallback: IconName = "bus"): IconName {
  return RULES.find(([re]) => re.test(text))?.[1] ?? fallback;
}
