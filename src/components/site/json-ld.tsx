import { COMPANY } from "@/content/company";
import { DEPARTURE_POINTS } from "@/content/places";

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // JSON.stringify output is safe for a script tag once "<" is escaped.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** Organisation data from the legal notice only. Deliberately no AggregateRating. */
export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": `${COMPANY.url}/#organization`,
    name: COMPANY.name,
    legalName: COMPANY.legalName,
    url: COMPANY.url,
    logo: `${COMPANY.url}/brand/metropol-logo.png`,
    image: `${COMPANY.url}/media/metropol-man-lions-coach.jpg`,
    telephone: COMPANY.phone,
    email: COMPANY.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: COMPANY.street,
      postalCode: COMPANY.postalCode,
      addressLocality: COMPANY.city,
      addressCountry: COMPANY.country,
    },
    areaServed: DEPARTURE_POINTS.map((d) => ({ "@type": "City", name: d.name })),
  };
}
