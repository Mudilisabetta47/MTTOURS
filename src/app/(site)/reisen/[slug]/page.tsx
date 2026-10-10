import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { db } from "@/server/db/client";
import { getPublishedTrip, tripPath } from "@/server/catalog/trips";
import { tripMetadata } from "@/server/catalog/metadata";
import { TripDetailView } from "@/components/trip/trip-detail";
import "@/styles/trip.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getPublishedTrip(db, slug);
  return t ? tripMetadata(t, tripPath(t)) : { title: "Reise nicht gefunden" };
}

export default async function TripPage({ params }: Props) {
  const { slug } = await params;
  const t = await getPublishedTrip(db, slug);
  if (!t) {
    const r = await db.redirect.findUnique({ where: { fromPath: `/reisen/${slug.slice(0, 200)}` } });
    if (r?.isActive) permanentRedirect(r.toPath as never);
    notFound();
  }
  if (t.productType === "TRANSPORT_ONLY") permanentRedirect(tripPath(t) as never);
  return <TripDetailView t={t} basePath="/reisen" breadcrumb={{ label: "Pauschalreisen", href: "/pauschalreisen" }} />;
}
