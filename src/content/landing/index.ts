import type { LandingContent } from "./types";
import { sanitizeLanding } from "./sanitize";
import {
  busunternehmenHannover,
  busMietenHannover,
  reisebusMietenHannover,
  busvermietungHannover,
  busMietenBremen,
  reisebusMietenBremen,
  busvermietungBremen,
  busMietenHamburg,
  reisebusMietenHamburg,
  busvermietungHamburg,
} from "./standorte";
import { reisebusMitFahrer, schulfahrten, vereinsfahrten, ausflugsfahrten, flughafentransfer, shuttleService, busCharter, gruppenreisen } from "./services";

/**
 * SEO landing pages taken over from www.metours.de (same URLs). "/bus-mieten" is its own page with the
 * inquiry form and therefore not part of this list.
 */
const RAW: LandingContent[] = [
  busunternehmenHannover,
  busMietenHannover,
  reisebusMietenHannover,
  busvermietungHannover,
  busMietenBremen,
  reisebusMietenBremen,
  busvermietungBremen,
  busMietenHamburg,
  reisebusMietenHamburg,
  busvermietungHamburg,
  reisebusMitFahrer,
  gruppenreisen,
  schulfahrten,
  vereinsfahrten,
  ausflugsfahrten,
  flughafentransfer,
  shuttleService,
  busCharter,
];

export const landingPages: LandingContent[] = RAW.map(sanitizeLanding);
export const landingBySlug: Record<string, LandingContent> = Object.fromEntries(landingPages.map((p) => [p.slug, p]));
export const landingSlugs = landingPages.map((p) => p.slug);
export type { LandingContent };
