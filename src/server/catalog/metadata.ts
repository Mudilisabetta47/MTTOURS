import type { Metadata } from "next";
import type { TripDetail } from "./trips";

export function tripMetadata(t: TripDetail, path: string): Metadata {
  const description = t.seoDescription ?? t.summary;
  return {
    title: { absolute: `${t.seoTitle ?? t.title} | METROPOL TOURS` },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "de_DE",
      siteName: "METROPOL TOURS",
      title: t.title,
      description,
      ...(t.media[0] ? { images: [{ url: t.media[0].src, width: t.media[0].width, height: t.media[0].height, alt: t.media[0].alt }] } : {}),
    },
    twitter: { card: "summary_large_image" },
    robots: process.env.APP_ENV === "production" ? undefined : { index: false, follow: false },
  };
}
