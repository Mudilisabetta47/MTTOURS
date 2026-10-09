/** Occasions for bus rental — matches the service pages of the existing site. */
export const OCCASIONS = [
  { key: "klassenfahrt", label: "Klassenfahrt", text: "Abfahrt an der Schule, Gepäck für die ganze Woche, Rückfahrt zur vereinbarten Zeit." },
  { key: "verein", label: "Vereinsfahrt", text: "Auswärtsspiel, Turnier oder Jahresausflug – mit Platz für Ausrüstung." },
  { key: "firma", label: "Firmenevent & Shuttle", text: "Betriebsausflug, Messe-Shuttle oder Werksverkehr, auch spät am Abend." },
  { key: "transfer", label: "Flughafentransfer", text: "Gruppen zum Flughafen und zurück, mit Puffer für Verspätungen." },
  { key: "feier", label: "Hochzeit & Feier", text: "Gästetransfer zwischen Kirche, Location und Hotel." },
  { key: "gruppenreise", label: "Gruppenreise", text: "Mehrtägige Reise mit Fahrer, auf Wunsch mit Hotel und Programm." },
] as const;

export type OccasionKey = (typeof OCCASIONS)[number]["key"];

export const VEHICLE_CLASSES = [
  { key: "egal", label: "Bitte passend vorschlagen" },
  { key: "kleinbus", label: "Kleinbus (bis ca. 19 Plätze)" },
  { key: "midibus", label: "Midibus (ca. 20–35 Plätze)" },
  { key: "reisebus", label: "Reisebus (ca. 50 Plätze)" },
] as const;
