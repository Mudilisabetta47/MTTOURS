import type { Metadata } from "next";
import type { TripDetail } from "./trips";

export function tripMetadata(t: TripDetail, path: string): Metadata {
  const description = t.seoDescription ?? t.summary;
  return {
    title: { absolute: `${t.seoTitle ?? t.title} | METROPOL TOURS` },
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", locale: "de_DE", siteName: "METROPOL TOURS", title: t.title, description },
    twitter: { card: "summary_large_image" },
    robots: process.env.APP_ENV === "production" ? undefined : { index: false, follow: false },
  };
}
