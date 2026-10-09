# Phase 0 – Bestandsaufnahme der Lovable-Plattform

Stand: 09.10.2026 · Erstellt im Rahmen des Relaunchs „METROPOL TOURS DIGITAL PLATFORM“

## Quellen und Grenzen dieser Analyse

| Quelle | Was geprüft wurde |
|---|---|
| Live-Website `www.metours.de` | Alle 46 Sitemap-URLs per HTTP abgerufen; Kernseiten im Browser gerendert und Texte ausgelesen (09.10.2026, während der angekündigten Wartung 09.–11.10.) |
| Lokaler Projektexport `~/Downloads/metropol-tours-projekt-export-v2-2026-08-31.zip` | Vollständiger Quellcode (Vite/React), 125 Supabase-Migrationen, 44 Edge Functions. **Stand 31.08.2026** – die Live-Seite hat seitdem neue Seiten (`/blog`, `/bewertungen`, `/gutscheine`, `/partner`), die im Export fehlen |
| Supabase-REST-API | Nur **lesende** Abfragen mit dem öffentlichen Schlüssel aus dem Export, also exakt das, was jeder Website-Besucher sieht. Tabellen mit Kundendaten sind per RLS geschützt (0 Zeilen sichtbar) |
| `SEO_Analyse_Metropol_Tours_08-10-2026.pdf` | Abgeglichen; Befunde F01–F04 bestätigt |
| `HANDOVER(2).md` | Motion-/Architekturprinzipien übernommen (siehe Abschnitt 11) |

**Nicht zugänglich:** Lovable-Projekt (ID `a97d4e92-…`), Supabase-Dashboard/Service-Key (Projekt `wberoibxqpffhnyvjnci`), GitHub-Repository, Stripe-, PayPal-, Resend-, Mapbox-, reCAPTCHA-Konten, Google Search Console, DNS. Alles, was davon abhängt, ist unten als **offen** markiert. Es wurde nichts verändert, gelöscht oder testweise gebucht.

---

## 1. Bestandsaufnahme der Website

**Technik:** Vite-SPA (React 18, shadcn/ui, Tailwind) hinter Cloudflare, gehostet von Lovable. Supabase als Backend (Auth, Postgres, Storage, 44 Edge Functions, pg_cron). Capacitor-iOS-App im selben Projekt. Schrift DM Sans, Primärfarbe `hsl(145 100% 40%)`.

**Struktur:** ca. 46 öffentliche Seiten in der Sitemap, dazu ca. 30 weitere öffentliche Routen (Checkout, Konto, Shop, App) und ~70 Admin-Routen. Vollständige Liste mit Entscheidung je URL: [`URL-INVENTORY.csv`](URL-INVENTORY.csv).

**Technische SEO (gemessen):**

| Prüfung | Ergebnis |
|---|---|
| HTML-Antwort je URL | **Alle 46 URLs liefern dasselbe 7,6-KB-HTML:** gleicher `<title>`, keine Description, kein Canonical, kein Inhalt. Inhalte, Titel und JSON-LD entstehen erst per JavaScript |
| Nach dem Rendern | Eigene Titel und Canonicals, Breadcrumb- und FAQ-Daten auf Landingpages vorhanden |
| `metours.de` → `www` | **302** (vorübergehend) statt 301 |
| robots.txt / sitemap.xml | sauber, 46 URLs |
| Linkvorschauen (WhatsApp, LinkedIn …) | zeigen für jede Seite denselben Titel |

**Unbelegte bzw. widersprüchliche Aussagen auf der Live-Seite:**

| Aussage | Fundort | Befund |
|---|---|---|
| „4,8 ★ Bewertung“, „Über 12.000 Reisende“ | `/reisen` | keine Datenbasis gefunden |
| „50+ moderne Busse“, „4,9/5“ | `/business` (lt. SEO-Analyse) | `buses`-Tabelle öffentlich leer; widerspricht 4,8 |
| „Bestpreis-Garantie“, „Sofortbestätigung“ | `/reisen`, `/busreisen` | keine Regelung in AGB gefunden |
| „Über 30 europäische Ziele im Linienverkehr“, „ab 19 €“, „täglich oder mehrmals wöchentlich“ | `/busreisen` | DB enthält 8 Linien-Routen (Hamburg–Kroatien, Rom, Barcelona …) und 5 Buslinien ohne Fahrplan (`line_schedules` = 0) |
| „Moderne 4- & 5-Sterne-Reisebusse“, „4★ Hotels“ | `/busreisen`, `/reisen` | nicht belegt |
| „alle unsere Busse sind mit Rollstuhlrampen ausgestattet“ | `/service` FAQ | für Reisebusse unüblich – **prüfen**, sonst falsch |
| Storno „bis 15 Minuten vor Abfahrt kostenlos“ | `/service` | widerspricht „Flexibles Umbuchen bis 24 h“ (`/busreisen`) und den Tarif-Stornoregeln in der DB |
| „Doppelstockbus bis 79 Sitze“, „8–59 Plätze“ | Regio-Seiten | Fahrzeugklassen gegen echte Flotte/Partner prüfen |
| Footer „Beliebte Strecken“ Berlin → Sarajevo, München → Ljubljana, Frankfurt → Belgrad | alle Seiten | keine entsprechenden Abfahrten in der DB |
| **Bewertungen „Verifizierte Bewertung“** | Startseite, `/bewertungen` | siehe Abschnitt 5 – **kritisch** |
| Impressum: Rudolf-Diesel-Weg 8, 30419 Hannover | `/imprint` | Busbeschriftung nennt Engelbosteler Damm 1, 30167 Hannover und Tel. 0511 842 50 67 – Adresse/Telefon vereinheitlichen |

**Bilder:** Viele Motive sind als „KI-generiert“ gekennzeichnet (Hero, Kategorien). Echtes Fahrzeugfoto vorhanden: `metropol-bus-real.jpg` (MAN Lion's Coach, dreiachsig, limettengrüne Lackierung). Mehrere Bilder liegen nur im Lovable-Asset-Speicher (`/__l5e/assets-v1/…`, R2) und müssen exportiert werden.

## 2. Bestehende Backend-/Lovable-Architektur

```
Browser (Vite-SPA, Capacitor-iOS)
  │  supabase-js mit öffentlichem Schlüssel
  ├─► Supabase Postgres (152 Tabellen, RLS, ~40 SQL-Funktionen, pg_cron)
  ├─► Supabase Auth (Rollen: customer/agent/admin/office/driver)
  ├─► Supabase Storage
  └─► 44 Edge Functions (Deno)
        ├─ Stripe (Checkout Sessions), PayPal (Orders API)
        ├─ Resend (E-Mail, Absender booking@app.metours.de)
        ├─ Mapbox (Token-Ausgabe), reCAPTCHA
        ├─ Apple-Wallet-Pässe (.pkpass)
        └─ Lovable AI Gateway (ai.gateway.lovable.dev) ← Lovable-Laufzeitabhängigkeit
```

**Lovable-spezifische Abhängigkeiten zur Laufzeit:** Hosting/Deployment, Asset-Speicher `__l5e`, KI-Gateway (`copilot-chat`, `travel-advisor` = Chat-Widget „Brauchst du Hilfe?“, vermutlich `generate-tour-description`), OAuth-Consent-Route `/.lovable/oauth/consent`, `lovable-tagger`, `@lovable.dev/mcp-js` (MCP-Server). Ob Supabase als **„Lovable Cloud“** (von Lovable verwaltet) oder als eigenes Supabase-Konto läuft, ist **offen** und entscheidet über den Exportweg (Abschnitt 7).

## 3. Verfügbare Datenbanken und APIs

**Datenbank:** Supabase Postgres, 152 Tabellen in `public`. Fachliche Kerngruppen:

- Reisen: `package_tours`, `tour_dates`, `tour_tariffs`, `tour_pickup_stops`, `tour_extras`, `tour_inclusions`, `tour_bookings`, `tour_payment_entries`, `tour_invoices`, `weekend_trips`, `waitlist_entries`
- Linie/Tickets: `routes`, `stops`, `trips`, `bookings`, `seats`, `seat_holds`, `tickets`, `scan_logs`, `bus_lines`, `line_*`
- Charter/Disposition: `admin_bookings`, `dispatch_orders`, `dispatch_order_stops`, `package_tour_inquiries`, `tour_offers`, `employee_shifts`, `driver_*` (Lenkzeit-Log, Lizenzen, Nachrichten), `buses`, `fleet_*`, `bus_positions_live`, `vehicle_positions`
- Kunden/B2B: `profiles`, `user_roles`, `b2b_customers`, `b2b_contracts`, `customer_*`, `complaints`, `support_tickets`
- Sonstiges: Shop (10 Tabellen), CMS, E-Mail-Logs, KI-Copilot, Audit-Logs

**Öffentlich lesbar (Stichprobe 09.10.2026):** 14 Reisen, 11 Termine, 35 Tarife, 16 Zustiege, 4 Wochenendtrips, 70 Haltestellen, 17 Routen, 103 Sitze, 40 Bewertungen, 2 Shop-Produkte. Geschützt (0 sichtbar): Buchungen, Tickets, Profile, Rollen, Fahrzeuge.

**APIs:** ausschließlich Supabase PostgREST + Edge Functions. 21 Functions laufen mit `verify_jwt = false` (teils gewollt, z. B. Buchungsabfrage per Token).

## 4. Funktionen, die erhalten bleiben müssen

Pauschalreisen mit Terminen/Tarifen/Zustiegen · Wochenendtrips („nur Fahrt“ + optional Unterkunft) · Busvermietung/Gruppenanfrage mit allen Leistungsseiten und Regio-Landingpages · Stripe und PayPal · Buchungsbestätigung per E-Mail · Ticket-PDF mit QR · Ticket-Scan durch Fahrer · Buchungsabfrage für Gäste („Meine Buchungen“) · Stornierung/Erstattung · Admin: Reisen, Termine, Buchungen, Kunden, B2B, Angebote/PDF, Rechnungs-PDF, Disposition, Fahrer, Fahrzeuge, Wartung, Lenkzeit-Log, OPS-Ansicht, Fahrer-Navigation · Rechtstexte (unverändert bis zur juristischen Prüfung) · Apple-Wallet-Pass (vorhanden; nur mit gültigem Zertifikat weiterführen).

**Nicht im Auftrag genannt, Entscheidung nötig:** Shop (`/shop`), KI-Reiseberater, KI-Copilot, Kunden-iOS-App, Wallboard, Newsletter mit „10 % Rabatt“.

## 5. Defekte, unvollständige oder vorgetäuschte Funktionen

### Kritisch (Sicherheit / Geld / Recht)

1. **Reisepreis wird im Browser festgelegt.** `TourCheckoutPage` schreibt `total_price` direkt in `tour_bookings` (anonymer Insert erlaubt). `create-tour-payment` belastet bei Stripe genau diesen Betrag; `capture-paypal-order` prüft gegen denselben Wert. Ein manipulierter Request kann eine Reise zu einem frei gewählten Preis „bezahlen“. Es gibt keinen Trigger, der den Preis serverseitig berechnet (anders als bei Linientickets: `trg_bookings_insert_guard`).
2. **Kein Stripe-Webhook.** Die Zahlung wird nur bestätigt, wenn der Browser nach der Rückleitung `verify-tour-payment` aufruft. Schließt der Kunde den Tab, bleibt die bezahlte Buchung „pending“. `verify-tour-payment` ist nicht idempotent (jeder Aufruf versendet erneut eine Bestätigungs-E-Mail) und ohne JWT aufrufbar.
3. **Sitzplatzkontingent ohne Bindung an die Buchung.** `reserve_tour_seats` ist für anonyme Nutzer freigegeben, nimmt bis zu 20 Plätze je Aufruf ohne Buchungsbezug und gibt sie nie wieder frei. Schlägt die Reservierung fehl („ausverkauft“), wird die Buchung trotzdem angelegt und zur Zahlung geführt (nur `console.warn`) → **Überbuchung möglich**, und Kontingente lassen sich von außen „leer reservieren“.
4. **Gutscheine** werden bei Erstellung der Zahlungssitzung als eingelöst gezählt, auch wenn die Zahlung abgebrochen wird.
5. **Bewertungen:** Alle 40 veröffentlichten Bewertungen (`customer_reviews`, `source = import_mail`, `is_verified = true`, **ohne** Buchungsbezug, ohne Sternwert) stimmen Wort für Wort und mit Namen mit der Datei `metours_bewertungen_intern_100.csv` (100 Einträge, gleichförmige Texte) überein. Sie werden als „Verifizierte Bewertung“ angezeigt. Ohne belegbare Herkunft ist das nach § 5b Abs. 3 UWG und Nr. 23b/23c Anhang UWG unzulässig. **Empfehlung: sofort depublizieren**, bis die Herkunft je Bewertung belegt ist.
6. **0-€-Reise öffentlich:** `Novalja` ist `published` mit `price_from = 0`, ein Termin mit allen Tarifen 0 €. Tarif „Business“ steht bei mehreren Reisen auf 0 €.
7. **Vorkasse per Überweisung** an die IBAN `DE89 3704 0044 0532 0130 00` in der Mail-Vorlage `payment_pending`. Das ist die bekannte **Beispiel-IBAN** aus Dokumentationen. Prüfen, ob die Vorlage aktiv ist; falls ja, sofort korrigieren.

### Funktional unvollständig

- Kein buchbarer Pauschalreise-Termin in der Zukunft (einziger: Novalja 30.10., 1 Platz, ausverkauft). `/reisen` zeigt „0 bzw. 1 Reisen verfügbar“, Startseite und Footer bewerben trotzdem Reisen und Strecken (bestätigt SEO-Analyse F01).
- Linienverkehr: Routen und Linien vorhanden, aber `line_schedules` = 0 → `/busreisen` lädt „Strecken werden geladen…“ ohne Ergebnis.
- Admin: `/admin/drivers`, `/admin/profile`, `/admin/help` sind Platzhalter („in Arbeit“).
- Viele Admin-Module ohne erkennbaren Datenbestand (Fuel-Log, Payroll, SLA-Monitor, AI-Insights …).
- Doppelte, uneinheitlich geschriebene Zustiege (`HAMBURG ZOB ` vs. `Hamburg ZOB`, ohne `tour_id`).
- Datenmüll in `package_tours` (`tedt`, `Neue Reise`, `prag` doppelt).

## 6. Liste aller bestehenden Website-URLs

Siehe [`URL-INVENTORY.csv`](URL-INVENTORY.csv): 71 Zeilen mit Status, Inhalt, neuer URL, Redirect-Bedarf und Entscheidung. Kurzfassung:

- **behalten (gleiche URL):** Startseite, `/reisen`, `/reisen/:slug`, `/busreisen`, `/wochenendtrips(/:slug)`, `/bus-mieten` + 9 Regio-Seiten Hannover/Bremen/Hamburg, 8 Leistungsseiten, `/service`, `/widerruf`
- **301 auf deutsche Rechtstexte:** `/imprint` → `/impressum`, `/privacy` → `/datenschutz`, `/terms` → `/agb`
- **ersetzen (301):** Checkout-, Konto-, Login-, Tracking-Routen
- **Entscheidung nach Search-Console-Daten:** 11 × `/busunternehmen-<Stadt ohne Standort>` (Doorway-Risiko)
- **Inhaber-Entscheidung:** `/bewertungen`, `/shop`, `/app`, `/blog`, `/gutscheine`, `/partner`, `/fahrplan`

## 7. Datenmigrationsplan

Ausführlich in [`MIGRATION.md`](MIGRATION.md). Kernpunkte:

1. **Zugriff klären:** Ist das Supabase-Projekt ein eigenes Konto oder „Lovable Cloud“? Benötigt wird ein vollständiger `pg_dump` (Schema + Daten + `auth`-Schema) sowie ein Storage-Export.
2. **Read-only-Snapshot** in eine isolierte Staging-Datenbank laden; dort Bestandsaufnahme (Datensatzzahlen, Relationen, Waisen, Dubletten).
3. **Wiederholbare Importskripte** je Entität mit `LegacyIdMap` (alte ID → neue ID), Prüfsummen und Fehlerbericht.
4. **Passwörter:** Supabase speichert bcrypt-Hashes. Diese können übernommen und beim ersten Login transparent auf argon2id umgehasht werden (Login prüft bcrypt, schreibt argon2id). Nicht übertragbare Konten erhalten einen Passwort-Reset-Link.
5. **Zahlungsreferenzen** (Stripe Session/PaymentIntent, PayPal Order/Capture) werden übernommen; Abgleich gegen Stripe/PayPal-Exporte.
6. **Keine Löschung im Altsystem.** Lovable bleibt bis zum verifizierten Cutover live.

## 8. Architektur der neuen Plattform

Ausführlich in [`ARCHITECTURE.md`](ARCHITECTURE.md). Modularer Monolith: Next.js 16 (App Router, Server Components), TypeScript strict, PostgreSQL + Prisma 7, Zod, eigene Session-Authentifizierung (argon2id, HttpOnly-Cookies), RBAC serverseitig, Postgres-basierte Job-Queue und Ratenbegrenzung (kein Redis nötig bei aktuellem Volumen), S3-kompatibler Speicher, Stripe + PayPal über Webhooks, Brevo für E-Mail.

## 9. Datenbankmodell

Ausführlich in [`DATABASE.md`](DATABASE.md). 70 Tabellen. Entscheidende Unterschiede zum Altsystem: Reiseprodukt (`Trip`) und Abfahrt (`TripDeparture`) getrennt; Produkttyp rechtlich klassifiziert (`PACKAGE_TOUR`, `TRANSPORT_ONLY` …); Beträge als Cent-Integer; Überbuchung, Doppelbelegung von Bus/Fahrer, Rechnungsnummern und Audit-Log **datenbankseitig** abgesichert (CHECK-, Exclusion- und Unique-Constraints, Trigger).

## 10. Hosting- und Kostenvergleich

Ausführlich in [`COSTS.md`](COSTS.md). Empfehlung **Variante C (Hybrid):** App und Worker in Docker auf einem EU-VPS, PostgreSQL als verwaltete EU-Datenbank mit Point-in-Time-Recovery, Hetzner Object Storage, Cloudflare (DNS/CDN, Free). Geschätzt **ca. 35–130 € pro Monat** Infrastruktur ohne Transaktionsgebühren (Spanne je nach Datenbank-Tarif); Zahlungsgebühren sind der weit größere Kostenblock.

## 11. Design- und Motion-Konzept

- **Marke:** Logo-Grün `#0AC55C`, Logo-Schwarz, DM Sans (selbst gehostet), Lackierungs-Limette `≈ #8CC63F` nur als Akzent (exakter RAL-Ton beim Unternehmen zu erfragen). Token-Datei `src/styles/tokens.css` ist die einzige Quelle.
- **Motion aus HANDOVER übernommen, nicht der Stack:** Scrollfortschritt 0–1 als reine Funktion; eine zentrale rAF-Schleife; gebündelte Messung (`refreshAll`); Sticky-Spur/Bühne; Reveals per Datenattribut und CSS; Bühnen-Rückzug; Reduced Motion als eigener Auslieferungszustand; Szenen außerhalb des Viewports pausieren; Pixelbudget für Canvas. Umsetzung als kleine Client-Module in Next.js (`useEffect` + Aufräumfunktion), keine GSAP-/Three.js-Abhängigkeit.
- **Signature Bus Journey (7 Akte):** Canvas 2D mit Lochkamera-Projektion (HANDOVER §7). Der **echte** Bus (Silhouette und Lackierung des MAN Lion's Coach) fährt vom ZOB Hannover über die Autobahn zu einem realen Ziel, das aus einer veröffentlichten Reise stammt. Kein KI-Bus als „unsere Flotte“.
- **Weitere Bühnen:** Destination Rail (horizontal, nur echte Ziele), Fleet Reveal (nur mit echten Fotos/Daten), Route Experience (SVG-Karte aus echten Koordinaten der Zustiege), Window Transition, Footer-Reveal. Pro Seite höchstens zwei große Bühnen.
- **Backend:** ruhiges Arbeitswerkzeug, keine Scrollfilme, dunkles OPS-Thema.

## 12. Priorisierter Implementierungsplan

| Phase | Inhalt | Status |
|---|---|---|
| 0 | Audit, URL-Inventar, Migrationsplan, Kosten | **erledigt (dieses Dokument)** |
| 1 | Repository, Datenmodell + Constraints, Auth, RBAC, Audit, Design-Tokens, Admin-Grundgerüst, CI, Tests | **erledigt** (siehe Bericht) |
| 2 | Öffentliche Website + Motion + Busvermietung + Anfrageformular → Lead | nächster Schritt |
| 3 | Reisen/Abfahrten/Sitzplätze/Checkout/Stripe+PayPal-Webhooks/Tickets | danach |
| 4 | Anfragen → Angebot (Kalkulation, PDF) → Auftrag | |
| 5 | Fahrzeuge, Fahrer, Kalender, Konfliktprüfung, Lenk-/Ruhezeit-Engine | |
| 6 | OPS Center, Fahrer-PWA, Ticket-Scan offline | |
| 7 | Kundenportal, Rechnungen, Benachrichtigungen | |
| 8 | CMS, Regio-SEO, Redirects | |
| 9 | Migration, QA, Staging, Cutover, Rollback | |

**Sofortmaßnahmen im Altsystem** (unabhängig vom Relaunch, durch Sie bzw. in Lovable): Bewertungen depublizieren · Novalja/0-€-Tarife depublizieren · unbelegte Claims entfernen · Beispiel-IBAN prüfen · serverseitige Preisberechnung für `tour_bookings` (oder Online-Buchung von Pauschalreisen bis zum Relaunch deaktivieren) · 302 → 301.

## 13. Risiken und offene Zugänge

| # | Offen / Risiko | Wer | Auswirkung |
|---|---|---|---|
| 1 | Supabase-Zugang (eigenes Konto oder Lovable Cloud?) + DB-Dump inkl. `auth` | Inhaber | Ohne Dump keine Migration |
| 2 | Lovable-Asset-Export, GitHub-Repo-Zugang | Inhaber | Bilder/Historie |
| 3 | Stripe-/PayPal-Konten: Inhaber? Testmodus-Schlüssel für Staging | Inhaber | Phase 3 |
| 4 | Brevo-Konto oder Weiterbetrieb Resend; DNS-Zugang (SPF/DKIM/DMARC) | Inhaber | E-Mail-Versand |
| 5 | Google Search Console Zugriff | Inhaber | Entscheidung Regio-Seiten |
| 6 | Echte Fahrzeugliste (Kennzeichen, Sitzplätze, Ausstattung, Eigentum/Partner) | Disposition | Fuhrpark, Sitzpläne |
| 7 | Sicherungsschein/Insolvenzversicherer für Pauschalreisen | Inhaber | Pauschalreisen dürfen sonst nicht verkauft werden |
| 8 | Juristische Prüfung AGB/Reisebedingungen/Formblätter; Steuerberater (Umsatzsteuer Personenbeförderung 7 %/19 %, grenzüberschreitend, Margenbesteuerung § 25 UStG, E-Rechnung) | extern | Phase 3/7 |
| 9 | Fachkundige Validierung der Lenk-/Ruhezeit-Regeln | extern | Phase 5 |
| 10 | Aktuelle Lovable-Monatskosten (für den Kostenvergleich) | Inhaber | COSTS.md |
| 11 | Firmenadresse/Telefon vereinheitlichen | Inhaber | Impressum, Schema.org |
| 12 | Nutzungsrechte an Fotos; Liste KI-generierter Bilder | Inhaber | Medien |
