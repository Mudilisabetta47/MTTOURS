export const BUSINESS_TZ = "Europe/Berlin";

/** Offset of a time zone at a given instant, in minutes (e.g. +120 for CEST). */
export function tzOffsetMinutes(at: Date, timeZone = BUSINESS_TZ): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

/** [start, end) of a calendar day in Europe/Berlin, as UTC instants. Handles DST. */
export function businessDayRange(reference: Date, dayOffset = 0): { start: Date; end: Date } {
  const local = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(reference)
    .split("-")
    .map(Number);
  const [y, m, d] = local as [number, number, number];
  const startGuess = new Date(Date.UTC(y, m - 1, d + dayOffset, 0, 0, 0));
  const endGuess = new Date(Date.UTC(y, m - 1, d + dayOffset + 1, 0, 0, 0));
  const start = new Date(startGuess.getTime() - tzOffsetMinutes(startGuess) * 60000);
  const end = new Date(endGuess.getTime() - tzOffsetMinutes(endGuess) * 60000);
  return { start, end };
}

const dateTimeFmt = new Intl.DateTimeFormat("de-DE", { timeZone: BUSINESS_TZ, dateStyle: "medium", timeStyle: "short" });
const dateFmt = new Intl.DateTimeFormat("de-DE", { timeZone: BUSINESS_TZ, dateStyle: "medium" });

export function formatDateTime(d: Date): string {
  return dateTimeFmt.format(d);
}

export function formatDate(d: Date): string {
  return dateFmt.format(d);
}
