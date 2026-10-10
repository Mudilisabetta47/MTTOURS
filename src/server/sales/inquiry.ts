import { z } from "zod";
import type { Db } from "@/server/db/client";
import { audit } from "@/server/audit";
import { nextNumber } from "@/server/numbering";
import { hitRateLimit } from "@/server/rate-limit";
import { sha256Hex } from "@/server/auth/tokens";
import { OCCASIONS, VEHICLE_CLASSES } from "@/content/rental";
import { COMPANY } from "@/content/company";

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) => text(max).optional().transform((v) => (v ? v : undefined));

export const InquiryInput = z
  .object({
    anlass: z.enum([...OCCASIONS.map((o) => o.key), "sonstiges"] as unknown as [string, ...string[]]),
    datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte ein Datum wählen."),
    uhrzeit: optionalText(5).refine((v) => !v || /^\d{2}:\d{2}$/.test(v), "Ungültige Uhrzeit."),
    start: text(200).min(2, "Bitte den Startort angeben."),
    ziel: text(200).min(2, "Bitte das Ziel angeben."),
    zwischenstopps: optionalText(1000),
    personen: z.coerce.number().int("Bitte eine ganze Zahl.").min(1, "Mindestens 1 Person.").max(500, "Bei mehr als 500 Personen bitte anrufen."),
    gepaeck: z.enum(["keins", "handgepaeck", "koffer", "sondergepaeck"]),
    rueckfahrt: z.boolean(),
    rueckDatum: optionalText(10).refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Ungültiges Datum."),
    rueckUhrzeit: optionalText(5).refine((v) => !v || /^\d{2}:\d{2}$/.test(v), "Ungültige Uhrzeit."),
    fahrzeugklasse: z.enum(VEHICLE_CLASSES.map((v) => v.key) as [string, ...string[]]),
    anforderungen: optionalText(2000),
    name: text(120).min(2, "Bitte Ihren Namen angeben."),
    email: z.string().trim().toLowerCase().email("Bitte eine gültige E-Mail-Adresse angeben.").max(254),
    telefon: optionalText(40).refine((v) => !v || /^[+0-9 ()/-]{6,40}$/.test(v), "Bitte eine gültige Telefonnummer angeben."),
    firma: optionalText(160),
    datenschutz: z.literal(true, { message: "Bitte der Verarbeitung Ihrer Angaben zustimmen." }),
  })
  .superRefine((v, ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    if (v.datum < today) ctx.addIssue({ code: "custom", path: ["datum"], message: "Das Datum liegt in der Vergangenheit." });
    if (v.rueckfahrt && !v.rueckDatum) ctx.addIssue({ code: "custom", path: ["rueckDatum"], message: "Bitte das Datum der Rückfahrt angeben." });
    if (v.rueckfahrt && v.rueckDatum && v.rueckDatum < v.datum)
      ctx.addIssue({ code: "custom", path: ["rueckDatum"], message: "Die Rückfahrt liegt vor der Hinfahrt." });
  });

export type InquiryData = z.infer<typeof InquiryInput>;

export interface StoreInquiryInput {
  source: string;
  tripType: string;
  payload: Record<string, unknown>;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  companyName?: string | null;
  /** parts that identify "the same request" for double-submit protection */
  dedupeParts: (string | number)[];
}

export type CreateInquiryResult =
  | { ok: true; number: string; duplicate: boolean }
  | { ok: false; reason: "rate_limited" };

/**
 * Store a website inquiry (status NEW). Idempotent: the same request within the same hour
 * (double click, reload, retry) returns the existing inquiry instead of creating a second one.
 */
export async function storeInquiry(
  db: Db,
  input: StoreInquiryInput,
  meta: { ipHash: string | null; now?: Date },
): Promise<CreateInquiryResult> {
  const now = meta.now ?? new Date();
  if (meta.ipHash) {
    const rl = await hitRateLimit(db, `inquiry:ip:${meta.ipHash}`, 5, 10 * 60);
    if (!rl.allowed) return { ok: false, reason: "rate_limited" };
  }
  const hourBucket = now.toISOString().slice(0, 13);
  const dedupeKey = sha256Hex([input.source, ...input.dedupeParts, hourBucket].join("|"));

  const existing = await db.inquiry.findUnique({ where: { dedupeKey }, select: { number: true } });
  if (existing) return { ok: true, number: existing.number, duplicate: true };

  try {
    const number = await db.$transaction(async (tx) => {
      const nr = await nextNumber(tx, "INQUIRY", now.getUTCFullYear());
      const inquiry = await tx.inquiry.create({
        data: {
          number: nr,
          source: input.source,
          tripType: input.tripType,
          originalPayload: { ...input.payload, submittedAt: now.toISOString() } as never,
          contactName: input.contactName,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone ?? null,
          companyName: input.companyName ?? null,
          dedupeKey,
        },
      });
      // Queued for the mail worker. Until then new inquiries are visible in the database/admin.
      await tx.notification.create({
        data: {
          channel: "EMAIL",
          recipient: COMPANY.email,
          template: "inquiry.new.staff",
          payload: { inquiryId: inquiry.id, number: nr },
          relatedType: "Inquiry",
          relatedId: inquiry.id,
        },
      });
      await audit(tx, { actorLabel: "website", action: "inquiry.create", entityType: "Inquiry", entityId: inquiry.id, after: { number: nr, source: input.source }, ipHash: meta.ipHash });
      return nr;
    });
    return { ok: true, number, duplicate: false };
  } catch (e) {
    const winner = await db.inquiry.findUnique({ where: { dedupeKey }, select: { number: true } });
    if (winner) return { ok: true, number: winner.number, duplicate: true };
    throw e;
  }
}

/** Bus rental request from /bus-mieten. */
export async function createWebsiteInquiry(
  db: Db,
  data: InquiryData,
  meta: { source: string; ipHash: string | null; now?: Date },
): Promise<CreateInquiryResult> {
  return storeInquiry(
    db,
    {
      source: meta.source,
      tripType: OCCASIONS.find((o) => o.key === data.anlass)?.label ?? "Sonstiges",
      payload: { ...data },
      contactName: data.name,
      contactEmail: data.email,
      contactPhone: data.telefon ?? null,
      companyName: data.firma ?? null,
      dedupeParts: [data.email, data.datum, data.start.toLowerCase(), data.ziel.toLowerCase(), data.personen],
    },
    meta,
  );
}
