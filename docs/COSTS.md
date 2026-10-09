# Betriebskosten – Vergleich

> **Wichtig:** Die Preise sind Listenpreise nach meinem Kenntnisstand (Stand 2025/26) und als Größenordnung gedacht. Vor einer Vertragsentscheidung bitte die aktuellen Preisseiten prüfen. Die aktuellen Lovable-Kosten sind mir nicht bekannt; ohne sie ist die Ersparnis nicht bezifferbar (offener Punkt).

## Annahmen

| Größe | Annahme |
|---|---|
| Website-Besuche | 50.000 / Monat |
| Online-Buchungen | 300 / Monat, Ø 400 € → 120.000 € Zahlungsvolumen |
| Busanfragen | 150 / Monat |
| Datenbank | < 10 GB im ersten Jahr |
| Dateien (Fotos, PDFs, Dokumente) | ≈ 50 GB |
| Ausgehender Traffic | ≈ 200 GB / Monat (Bilder über CDN) |
| E-Mails | ≈ 6.000 / Monat (Bestätigungen, Tickets, Angebote) |
| Mitarbeiterkonten | ≤ 15, Fahrer ≤ 20 |

## Variante A – Vercel + verwaltete Datenbank + Object Storage

| Posten | Anbieter (Beispiel) | €/Monat |
|---|---|---|
| Hosting App | Vercel Pro (1 Seat, EU-Region für Functions) | ≈ 19 |
| Hintergrundjobs | Vercel Cron + Queue-Tabelle | 0 |
| PostgreSQL | Supabase Pro (Frankfurt) **oder** Neon | ≈ 23–70 |
| Point-in-Time-Recovery | Supabase-Add-on bzw. im Neon-Tarif | ≈ 0–95 |
| Object Storage | Cloudflare R2 / Hetzner | ≈ 1–5 |
| Rate-Limit-Speicher | Postgres (vorhanden) | 0 |
| E-Mail | Brevo (Free 300/Tag bzw. Starter) | 0–19 |
| Fehlerüberwachung | Sentry Developer/Team | 0–25 |
| Uptime-Monitoring | Better Stack Free | 0 |
| **Summe Infrastruktur** | | **≈ 45–230** |
| Wartung (Updates, Monitoring) | 2–4 h | |

+ Wenig Betriebsaufwand, Vorschau-Deployments.
− Vercel ist US-Anbieter (EU-Region und Standardvertragsklauseln möglich, aber Drittlandbezug), Kosten steigen mit Traffic/Function-Laufzeit, langlaufende Worker passen schlecht.

## Variante B – Europäischer VPS + Docker + selbst betriebenes PostgreSQL

| Posten | Anbieter (Beispiel) | €/Monat |
|---|---|---|
| Produktionsserver (4 vCPU, 8 GB) | Hetzner Cloud, DE/FI | ≈ 8–16 |
| Server-Backups/Snapshots | Hetzner | ≈ 2–4 |
| Staging-Server (2 vCPU, 4 GB) | Hetzner | ≈ 5 |
| PostgreSQL | im Docker-Stack auf dem Server | 0 |
| DB-Backups + PITR | WAL-G/pgBackRest → Object Storage | in Storage enthalten |
| Object Storage | Hetzner Object Storage (inkl. 1 TB) | ≈ 5 |
| CDN/DNS/TLS | Cloudflare Free + Caddy | 0 |
| E-Mail | Brevo | 0–19 |
| Monitoring | Uptime Kuma + GlitchTip (selbst gehostet) | 0 |
| **Summe Infrastruktur** | | **≈ 20–50** |
| Wartung (OS-, Docker-, Postgres-Updates, Restore-Tests) | 4–8 h | |

+ Am günstigsten, volle Kontrolle, alles in der EU.
− Die Datenbank ist der kritischste Teil und läuft ohne Hochverfügbarkeit auf einem Server. Ausfall und Wiederherstellung hängen an einer Person mit Postgres-Erfahrung.

## Variante C – Hybrid (Empfehlung)

| Posten | Anbieter (Beispiel) | €/Monat |
|---|---|---|
| App + Worker (Docker) | Hetzner Cloud, Produktion | ≈ 8–16 |
| Staging | Hetzner Cloud | ≈ 5 |
| **Verwaltete PostgreSQL mit PITR, EU** | z. B. Scaleway, Aiven, Supabase (nur als Postgres) | ≈ 15–60 |
| Object Storage | Hetzner Object Storage | ≈ 5 |
| CDN/DNS | Cloudflare Free | 0 |
| E-Mail | Brevo | 0–19 |
| Fehlerüberwachung | Sentry Developer/Team oder GlitchTip | 0–25 |
| Uptime | Better Stack Free / Uptime Kuma | 0 |
| **Summe Infrastruktur** | | **≈ 35–130** |
| Wartung | 3–5 h | |

**Warum C:** Die App ist zustandslos und ohne Risiko auf einem günstigen Server austauschbar. Die Datenbank mit Buchungen und Zahlungen ist das einzige, was nicht verloren gehen darf. Genau dort zahlt man für Verwaltung, automatische Backups und Point-in-Time-Recovery. Alle Daten bleiben in der EU, Auftragsverarbeitungsverträge sind Standard.

## Transaktions- und nutzungsabhängige Kosten (in allen Varianten gleich)

| Posten | Satz (Größenordnung) | Bei 120.000 €/Monat |
|---|---|---|
| Stripe, EWR-Standardkarten | 1,5 % + 0,25 € | ≈ 1.800 € + 75 € (wenn 100 % Karte) |
| Stripe SEPA-Lastschrift | ≈ 0,35 € | – |
| PayPal (Deutschland) | ≈ 2,5–3 % + 0,35–0,39 € | entsprechend höher |
| Karten/Tiles | MapLibre + OpenFreeMap/Protomaps | 0 |
| Routing (Distanzen für Kalkulation) | OpenRouteService Free bzw. eigener OSRM | 0 |
| Live-Positionen | Fahrer-App (GPS des Smartphones) | 0; Telematik-Anbindung je nach Anbieter |

**Kostenhebel:** Zahlungsgebühren übersteigen die Infrastruktur um mehr als das Zehnfache. SEPA-Lastschrift/Überweisung für Gruppen und B2B sowie Kartenzahlung statt PayPal als Standard senken die Kosten stärker als jede Hosting-Entscheidung.

## Was nicht gespart wird

Tägliche Backups + PITR, ein Restore-Test vor dem Livegang und danach vierteljährlich, getrennte Staging-Umgebung, Fehlerüberwachung, TLS, Sicherheitsupdates.

## Ersetzte Lovable-Kosten

Entfallen nach dem Cutover: Lovable-Abo/Credits, Lovable Cloud (falls genutzt), Lovable-KI-Gateway, Resend (falls zu Brevo gewechselt), Mapbox (falls MapLibre), reCAPTCHA (ersetzt durch Honigtopf + Zeitsperre + Ratenbegrenzung). Bitte aktuelle Rechnungen bereitstellen, dann wird die Gegenüberstellung konkret.
