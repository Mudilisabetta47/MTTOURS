"use server";

import { z } from "zod";
import { db } from "@/server/db/client";
import { requestMeta } from "@/server/auth/session";
import { storeInquiry } from "@/server/sales/inquiry";

export interface ContactState {
  status: "idle" | "error" | "done";
  message?: string;
  number?: string;
  values?: Record<string, string>;
}

const Input = z.object({
  name: z.string().trim().min(2, "Bitte Ihren Namen angeben.").max(120),
  email: z.string().trim().toLowerCase().email("Bitte eine gültige E-Mail-Adresse angeben.").max(254),
  telefon: z.string().trim().max(40).optional().transform((v) => v || undefined),
  thema: z.enum(["Reise", "Busmiete", "Buchung", "Sonstiges"]),
  nachricht: z.string().trim().min(10, "Bitte schreiben Sie uns ein paar Worte.").max(3000),
  datenschutz: z.literal(true, { message: "Bitte der Verarbeitung Ihrer Angaben zustimmen." }),
});

export async function submitContact(_prev: ContactState, fd: FormData): Promise<ContactState> {
  const t = Number(fd.get("t"));
  if (fd.get("website") || !Number.isFinite(t) || Date.now() - t < 2000) return { status: "done" };
  const values: Record<string, string> = {};
  for (const k of ["name", "email", "telefon", "thema", "nachricht"]) values[k] = String(fd.get(k) ?? "").slice(0, 3000);
  const parsed = Input.safeParse({ ...values, datenschutz: fd.get("datenschutz") === "on" });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen.", values };
  const { ipHash } = await requestMeta();
  const res = await storeInquiry(
    db,
    {
      source: "website:/kontakt",
      tripType: `Kontakt: ${parsed.data.thema}`,
      payload: { ...parsed.data },
      contactName: parsed.data.name,
      contactEmail: parsed.data.email,
      contactPhone: parsed.data.telefon ?? null,
      dedupeParts: [parsed.data.email, parsed.data.nachricht.slice(0, 200)],
    },
    { ipHash },
  );
  if (!res.ok) return { status: "error", message: "Zu viele Nachrichten in kurzer Zeit. Bitte rufen Sie uns an.", values };
  return { status: "done", number: res.number };
}
