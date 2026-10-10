import { z } from "zod";
import type { Db } from "@/server/db/client";
import { storeInquiry, type CreateInquiryResult } from "./inquiry";

/** "Termin-Info anfordern" on a trip page: interest in a trip without a bookable departure. */
export const TripInterestInput = z.object({
  tripSlug: z.string().trim().min(1).max(120),
  name: z.string().trim().min(2, "Bitte Ihren Namen angeben.").max(120),
  email: z.string().trim().toLowerCase().email("Bitte eine gültige E-Mail-Adresse angeben.").max(254),
  telefon: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => !v || /^[+0-9 ()/-]{6,40}$/.test(v), "Bitte eine gültige Telefonnummer angeben."),
  personen: z.coerce.number().int().min(1, "Mindestens 1 Person.").max(200),
  zeitraum: z.string().trim().max(120).optional().transform((v) => v || undefined),
  nachricht: z.string().trim().max(1500).optional().transform((v) => v || undefined),
  datenschutz: z.literal(true, { message: "Bitte der Verarbeitung Ihrer Angaben zustimmen." }),
});
export type TripInterestData = z.infer<typeof TripInterestInput>;

export async function createTripInterest(
  db: Db,
  data: TripInterestData,
  trip: { slug: string; title: string },
  meta: { ipHash: string | null },
): Promise<CreateInquiryResult> {
  return storeInquiry(
    db,
    {
      source: `website:/reisen/${trip.slug}`,
      tripType: `Reiseinteresse: ${trip.title}`,
      payload: { ...data, tripTitle: trip.title },
      contactName: data.name,
      contactEmail: data.email,
      contactPhone: data.telefon ?? null,
      dedupeParts: [data.email, trip.slug, data.personen],
    },
    meta,
  );
}
