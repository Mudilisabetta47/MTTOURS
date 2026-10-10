"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { requireStaff } from "@/server/auth/session";
import {
  addPoiFromOsm,
  assignTrips,
  DestinationAdminError,
  DestinationInput,
  PoiCreateInput,
  PoiUpdateInput,
  setPoiReview,
  updateDestination,
  updatePoi,
} from "@/server/destinations/admin";

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : undefined);
const back = (slug: string, q: Record<string, string>) => `/admin/destinationen/${encodeURIComponent(slug)}?${new URLSearchParams(q)}`;

function done(slug: string) {
  revalidatePath(`/admin/destinationen/${slug}`);
  revalidateTag("catalog", "max");
}

export async function saveDestinationAction(fd: FormData): Promise<void> {
  const actor = await requireStaff("cms.write");
  const id = str(fd, "id") ?? "";
  const slug = str(fd, "slug") ?? "";
  const parsed = DestinationInput.safeParse(Object.fromEntries(fd));
  if (!parsed.success) redirect(back(slug, { fehler: "Bitte Name, Referenzpunkt und Koordinaten prüfen." }) as never);
  await updateDestination(db, actor, id, parsed.data);
  done(slug);
  redirect(back(slug, { ok: "Destination gespeichert." }) as never);
}

export async function savePoiAction(fd: FormData): Promise<void> {
  const actor = await requireStaff("cms.write");
  const slug = str(fd, "slug") ?? "";
  const parsed = PoiUpdateInput.safeParse({ ...Object.fromEntries(fd), isActive: fd.get("isActive") === "on", isHighlight: fd.get("isHighlight") === "on" });
  if (!parsed.success) redirect(back(slug, { fehler: "Ort nicht gespeichert: Angaben unvollständig." }) as never);
  await updatePoi(db, actor, str(fd, "id") ?? "", parsed.data);
  done(slug);
  redirect(back(slug, { ok: "Ort gespeichert." }) as never);
}

export async function reviewPoiAction(fd: FormData): Promise<void> {
  const actor = await requireStaff("cms.write");
  const slug = str(fd, "slug") ?? "";
  const review = str(fd, "review");
  if (review !== "VERIFIED" && review !== "REJECTED" && review !== "DRAFT") redirect(back(slug, {}) as never);
  await setPoiReview(db, actor, str(fd, "id") ?? "", review);
  done(slug);
  redirect(back(slug, { ok: review === "VERIFIED" ? "Ort freigegeben." : "Status geändert." }) as never);
}

export async function addPoiAction(fd: FormData): Promise<void> {
  const actor = await requireStaff("cms.write");
  const slug = str(fd, "slug") ?? "";
  const parsed = PoiCreateInput.safeParse(Object.fromEntries(fd));
  if (!parsed.success) redirect(back(slug, { fehler: "Bitte Name und Kategorie angeben." }) as never);
  let msg: string;
  try {
    const r = await addPoiFromOsm(db, actor, str(fd, "destinationId") ?? "", parsed.data);
    msg = `Gefunden: ${r.match}. Bitte Lage prüfen und freigeben.`;
  } catch (e) {
    if (e instanceof DestinationAdminError) redirect(back(slug, { fehler: e.message }) as never);
    throw e;
  }
  done(slug);
  redirect(back(slug, { ok: msg }) as never);
}

export async function assignTripsAction(fd: FormData): Promise<void> {
  const actor = await requireStaff("cms.write");
  const slug = str(fd, "slug") ?? "";
  const ids = fd.getAll("tripIds").filter((x): x is string => typeof x === "string").slice(0, 100);
  await assignTrips(db, actor, str(fd, "destinationId") ?? "", ids);
  done(slug);
  redirect(back(slug, { ok: "Zuordnung gespeichert." }) as never);
}
