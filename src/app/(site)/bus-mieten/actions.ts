"use server";

import { db } from "@/server/db/client";
import { requestMeta } from "@/server/auth/session";
import { createWebsiteInquiry, InquiryInput } from "@/server/sales/inquiry";

export interface InquiryState {
  status: "idle" | "error" | "done";
  number?: string;
  errors?: Record<string, string>;
  message?: string;
  /** echoed back so the form keeps the user's input after a failed submit */
  values?: Record<string, string>;
}

const ECHO = ["anlass","datum","uhrzeit","start","ziel","zwischenstopps","personen","gepaeck","rueckfahrt","rueckDatum","rueckUhrzeit","fahrzeugklasse","anforderungen","name","email","telefon","firma","datenschutz"] as const;

function echo(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of ECHO) {
    const v = fd.get(k);
    if (typeof v === "string") out[k] = v.slice(0, 2000);
  }
  return out;
}

const MIN_FILL_MS = 2500;

export async function submitInquiry(_prev: InquiryState, fd: FormData): Promise<InquiryState> {
  // Honeypot and time trap: answer like a success so bots learn nothing.
  const startedAt = Number(fd.get("t"));
  if (fd.get("website") || !Number.isFinite(startedAt) || Date.now() - startedAt < MIN_FILL_MS) {
    return { status: "done" };
  }

  const str = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : undefined;
  };
  const parsed = InquiryInput.safeParse({
    anlass: str("anlass"),
    datum: str("datum"),
    uhrzeit: str("uhrzeit"),
    start: str("start"),
    ziel: str("ziel"),
    zwischenstopps: str("zwischenstopps"),
    personen: str("personen"),
    gepaeck: str("gepaeck"),
    rueckfahrt: fd.get("rueckfahrt") === "on",
    rueckDatum: str("rueckDatum"),
    rueckUhrzeit: str("rueckUhrzeit"),
    fahrzeugklasse: str("fahrzeugklasse"),
    anforderungen: str("anforderungen"),
    name: str("name"),
    email: str("email"),
    telefon: str("telefon"),
    firma: str("firma"),
    datenschutz: fd.get("datenschutz") === "on",
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return { status: "error", errors, message: "Bitte prüfen Sie die markierten Felder.", values: echo(fd) };
  }

  const { ipHash } = await requestMeta();
  const res = await createWebsiteInquiry(db, parsed.data, { source: "website:/bus-mieten", ipHash });
  if (!res.ok) return { status: "error", message: "Zu viele Anfragen in kurzer Zeit. Bitte rufen Sie uns an oder versuchen Sie es später.", values: echo(fd) };
  return { status: "done", number: res.number };
}
