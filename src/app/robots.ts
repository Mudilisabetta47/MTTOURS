import type { MetadataRoute } from "next";

// Only production is indexable. Staging/dev must never appear in search results.
// Evaluated per request so the same build behaves correctly in every environment.
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.APP_ENV === "production";
  const base = process.env.APP_URL ?? "https://www.metours.de";
  if (!isProduction) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/ops", "/fahrer", "/mein-konto", "/anmelden", "/api/", "/buchung/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
