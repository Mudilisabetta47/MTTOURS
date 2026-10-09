# SEO

> Status: Phase 1 – Staging ist nicht indexierbar (`robots.txt` dynamisch je `APP_ENV`). Umsetzung der öffentlichen Seiten Phase 2, CMS/Regio Phase 8.

## Technik (verbindlich für jede öffentliche Seite)

Server-gerendertes HTML mit: eindeutigem `<title>` und Description, selbstreferenzierendem Canonical, OpenGraph/Twitter, genau einem `h1`, Breadcrumb (sichtbar + `BreadcrumbList`), passendem JSON-LD (`TravelAgency`/`LocalBusiness` mit echter Adresse, `Service`, `Trip`/`TouristTrip` + `Offer` nur mit echtem, aktuellem Preis und Verfügbarkeit, `FAQPage` nur für sichtbare FAQs). **Kein `AggregateRating`** ohne belegbare Datenbasis. `sitemap.xml` aus der Datenbank (nur veröffentlichte, indexierbare Seiten), Weiterleitungen aus `Redirect` (301), `metours.de` → `www` per 301.

## Migration

Grundlage: [`URL-INVENTORY.csv`](URL-INVENTORY.csv). Keine relevante URL wird ohne bewusste Entscheidung entfernt. Für die 11 `/busunternehmen-<Stadt>`-Seiten ohne Standort entscheidet die Search Console (Impressionen/Klicks der letzten 16 Monate): mit Leistung → mit echten Inhalten (Abholung möglich, Referenzen) behalten; ohne → `noindex`, nach 3 Monaten 301 auf `/bus-mieten`.

## Inhalte

Konkrete Sprache, keine Leerformeln („Ihr zuverlässiger Partner“, „maßgeschneiderte Lösungen“, „unvergessliche Erlebnisse“). Zahlen nur, wenn sie aus der Datenbank kommen oder belegt sind. Regio-Seiten nur bei echtem lokalem Nutzen (Abholorte, Zustiege, Beispielfahrten, Referenzen).

## Messung

Search Console (Domain-Property, Sitemap-Einreichung), Core Web Vitals aus CrUX/Search Console. Optional datenschutzfreundliche Analyse (selbst gehostetes Matomo/Plausible ohne Cookies) mit Events: Reise angesehen, Suche, Buchung begonnen/abgeschlossen, Anfrage begonnen/abgesendet, Telefonklick.
