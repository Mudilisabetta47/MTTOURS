import type { Metadata } from "next";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { db } from "@/server/db/client";
import { getPublishedTrip, tripPath } from "@/server/catalog/trips";
import { tripMetadata } from "@/server/catalog/metadata";
import { TravelProductPage } from "@/components/trip/travel-product-page";
import "@/styles/product.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

// metadata and page share one query per request
const load = cache((slug: string) => getPublishedTrip(db, slug.slice(0, 200)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await load(slug);
  return t ? tripMetadata(t, tripPath(t)) : { title: "Reise nicht gefunden" };
}

export default async function WeekendTripPage({ params }: Props) {
  const { slug } = await params;
  const t = await load(slug);
  if (!t) notFound();
  if (t.productType !== "TRANSPORT_ONLY") permanentRedirect(tripPath(t) as never);
  return <TravelProductPage t={t} path={tripPath(t)} breadcrumb={{ label: "Wochenendtrips", href: "/wochenendtrips" }} />;
}
