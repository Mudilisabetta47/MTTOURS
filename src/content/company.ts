/**
 * Company facts as published in the legal notice of www.metours.de (09.10.2026).
 * Open point (docs/PHASE-0-AUDIT.md §13): the coach livery shows Engelbosteler Damm 1 and another phone number —
 * the company must confirm which address/number is authoritative.
 */
export const COMPANY = {
  name: "METROPOL TOURS",
  legalName: "Metropol Tours GmbH",
  street: "Rudolf-Diesel-Weg 8",
  postalCode: "30419",
  city: "Hannover",
  country: "DE",
  phone: "+49 511 80781106",
  phoneDisplay: "0511 807 811 06",
  email: "kundenservice@metours.de",
  register: "HRB 222247, Amtsgericht Hannover",
  managingDirector: "Vedat Özel",
  editorialResponsible: "Mohammed Al Bakhit",
  hours: "Mo–Fr 8–20 Uhr",
  url: "https://www.metours.de",
} as const;

/** Current legal texts stay on the live site until the lawyer-reviewed versions are migrated (no self-written AGB). */
export const LEGAL_LINKS = {
  privacy: "https://www.metours.de/privacy",
  terms: "https://www.metours.de/terms",
  withdrawal: "https://www.metours.de/widerruf",
} as const;
