import { notFound, permanentRedirect } from "next/navigation";
import { db } from "@/server/db/client";
import { slugForLegacyTourId, tripPath } from "@/server/catalog/trips";

/** Legacy links /pauschalreisen/<uuid|slug> → canonical trip page (301). */
export default async function LegacyPackageRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = slug.slice(0, 200);
  if (/^[0-9a-f-]{36}$/i.test(s)) {
    const t = await slugForLegacyTourId(db, s);
    if (t) permanentRedirect(tripPath(t) as never);
  }
  const t = await db.trip.findFirst({ where: { slug: s, status: "PUBLISHED" }, select: { slug: true, productType: true } });
  if (t) permanentRedirect(tripPath(t) as never);
  const r = await db.redirect.findUnique({ where: { fromPath: `/reisen/${s}` } });
  if (r?.isActive) permanentRedirect(r.toPath as never);
  notFound();
}
