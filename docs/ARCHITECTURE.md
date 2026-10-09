# Architektur

## Grundsatz

Ein **modularer Monolith**: eine Next.js-Anwendung, eine PostgreSQL-Datenbank, ein Worker-Prozess für Hintergrundjobs. Keine Microservices. Alle Oberflächen (Website, Buchung, Admin, OPS, Fahrer-App, Kundenportal) nutzen dieselben serverseitigen Geschäftsfunktionen und dieselben Daten.

```
                 ┌──────────────────────── Next.js (Node) ───────────────────────┐
Browser ────────►│  app/(public)   app/buchung   app/admin   app/ops   app/fahrer │
  │              │       │              │            │          │         │       │
  │              │       └──────────────┴─────┬──────┴──────────┴─────────┘       │
  │              │                            ▼                                   │
  │              │   src/server/<modul>  ← Geschäftslogik, Autorisierung, Zod     │
  │              │                            │                                   │
  │              │                            ▼                                   │
  │              │   src/server/db (Prisma, $transaction, Raw SQL für Inventar)   │
  │              └────────────────────────────┬──────────────────────────────────┘
  │                                           ▼
  │                                  PostgreSQL (Constraints = letzte Verteidigung)
  │                                           ▲
Stripe/PayPal ── Webhooks ──► app/api/webhooks ┘      Worker: BackgroundJob (SKIP LOCKED)
                                                      → E-Mail (Brevo), PDFs, Ablauf von Holds
```

## Schichten und Regeln

| Ebene | Ort | Darf importieren | Regel |
|---|---|---|---|
| Routen/Seiten | `src/app/**` | `server/*`, `lib/*`, `components/*` | Keine SQL-Abfragen mit Geschäftslogik direkt in Seiten außer reinen Listen. Jede Seite ruft zuerst `requireStaff()`/`requirePermission()` |
| Server-Actions / Route Handler | `src/app/**/actions.ts`, `src/app/api/**` | wie oben | Eingaben **immer** mit Zod parsen; Autorisierung **vor** jeder Datenoperation |
| Geschäftslogik | `src/server/<modul>/` | `server/db`, `lib/*`, andere `server/*` | Reine Funktionen mit `db`/`tx` als Parameter → testbar ohne Next.js |
| Infrastruktur | `src/server/db`, `audit.ts`, `numbering.ts`, `rate-limit.ts` | `lib/*` | |
| Gemeinsame Logik | `src/lib/` | nichts aus `server/` | läuft auf Server und Client (Geld, RBAC, Zeit) |
| UI | `src/components/` | `lib/*` | Keine Server-Geheimnisse |

`server-only` verhindert, dass Session-/DB-Code in Client-Bundles gelangt.

## Module (Zielbild)

| Modul | Verzeichnis | Phase |
|---|---|---|
| Auth, Sessions, RBAC | `server/auth`, `lib/rbac.ts` | 1 ✔ |
| Mitarbeiter | `server/staff` | 1 ✔ |
| Audit, Nummernkreise, Ratenbegrenzung | `server/audit.ts`, `numbering.ts`, `rate-limit.ts` | 1 ✔ |
| Inventar (Kapazität/Sitze) | `server/inventory` | 1 (Kern) ✔ / 3 |
| Katalog (Reisen, Abfahrten) | `server/catalog` | 2–3 |
| Buchung/Checkout | `server/booking` | 3 |
| Zahlungen | `server/payments` | 3 |
| Tickets | `server/tickets` | 3 |
| Vertrieb (Anfrage, Angebot, Kalkulation) | `server/sales` | 4 |
| Disposition (Fahrten, Zuweisungen, Regeln) | `server/dispatch` | 5 |
| Betrieb (Events, Positionen, Nachrichten) | `server/ops` | 6 |
| Rechnungen | `server/invoicing` | 7 |
| CMS/SEO | `server/cms` | 8 |
| Migration | `scripts/migrate/*` | 9 |

## Rendering

- **Öffentliche Seiten:** Server Components, statisch bzw. mit `revalidate`, sodass Titel, Text, Canonical und JSON-LD im ersten HTML stehen.
- **Buchung/Checkout:** dynamisch, so wenig Client-JavaScript wie möglich, Server Actions.
- **Admin/OPS:** dynamisch, `no-store`, `noindex`.
- **Motion:** kleine Client-Inseln (eine rAF-Schleife, Scroll-Timeline, Reveals) nach HANDOVER-Prinzipien; außerhalb des Viewports pausiert; `prefers-reduced-motion` = statischer Endzustand.

## Konsistenz und Nebenläufigkeit

- Kritische Abläufe laufen in **einer** Datenbanktransaktion inkl. Audit-Eintrag.
- Inventar: bedingtes `UPDATE … WHERE soldCount + heldCount + n <= capacity` + CHECK-Constraint.
- Sitze: partieller Unique-Index auf aktive Reservierungen.
- Disposition: Exclusion-Constraints (`btree_gist`) gegen überlappende Fahrzeug- und Fahrerzuweisungen.
- Nummern: Zähler-Tabelle mit Zeilensperre → lückenlos bei Commit.
- Webhooks: `PaymentEvent (provider, providerEventId)` unique → idempotent.
- Offline-Sync (Fahrer-App): `clientEventId` unique → idempotent.

## Hintergrundjobs

`BackgroundJob`-Tabelle mit `FOR UPDATE SKIP LOCKED`, Wiederholung mit Backoff, `dedupeKey`. Ein Worker-Prozess (`node scripts/worker.ts`, Phase 3) läuft neben der App. Redis wird erst eingeführt, wenn Last oder Latenz es verlangen; die Schnittstellen (`hitRateLimit`, Job-Enqueue) sind darauf vorbereitet.

## Externe Dienste

| Dienst | Zweck | Austauschbar |
|---|---|---|
| PostgreSQL 16+ (EU) | Daten | ja (Standard-Postgres) |
| S3-kompatibler Speicher (EU) | Dateien, privat per signierter URL | ja |
| Stripe | Karten, SEPA, Wallets | – |
| PayPal | falls weiter gewünscht | – |
| Brevo (oder bestehendes Resend) | Transaktions-E-Mail | ja (ein Adapter) |
| MapLibre + eigene/kostenlose Tiles | Karten (Phase 6) | ja |
| Sentry oder GlitchTip | Fehlerüberwachung | ja |
