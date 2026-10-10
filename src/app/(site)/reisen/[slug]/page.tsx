import type { Metadata } from "next";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { db } from "@/server/db/client";
import { getPublishedTrip, tripPath } from "@/server/catalog/trips";
import { tripMetadata } from "@/server/catalog/metadata";
import { getTripGuide } from "@/server/catalog/destinations";
import { TravelProductPage } from "@/components/trip/travel-product-page";
import "@/styles/product.css";
import "@/styles/destination.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

// metadata and page share one query per request
const load = cache((slug: string) => getPublishedTrip(db, slug.slice(0, 200)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await load(slug);
  return t ? tripMetadata(t, tripPath(t)) : { title: "Reise nicht gefunden" };
}

export default async function TripPage({ params }: Props) {
  const { slug } = await params;
  const t = await load(slug);
  if (!t) {
    const r = await db.redirect.findUnique({ where: { fromPath: `/reisen/${slug.slice(0, 200)}` } });
    if (r?.isActive) permanentRedirect(r.toPath as never);
    notFound();
  }
  if (t.productType === "TRANSPORT_ONLY") permanentRedirect(tripPath(t) as never);
  const guide = await getTripGuide(db, t.guideId, { name: t.hotelName, lat: t.hotelLat, lng: t.hotelLng });
  return <TravelProductPage t={t} guide={guide} path={tripPath(t)} breadcrumb={{ label: "Pauschalreisen", href: "/pauschalreisen" }} />;
}
