# METROPOL TOURS – Digital Platform

Eigenständige Plattform der Metropol Tours GmbH: öffentliche Website, Buchung, Verwaltung, Disposition, OPS Center, Fahrer-App, Kundenportal. Ablösung der Lovable-Anwendung.

**Stand:** Phase 0 (Audit) und Phase 1 (Foundation) abgeschlossen. Siehe [`docs/PHASE-0-AUDIT.md`](docs/PHASE-0-AUDIT.md) und [`docs/PHASE-1-REPORT.md`](docs/PHASE-1-REPORT.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · PostgreSQL + Prisma 7 · Zod · eigene Session-Auth (argon2id) · Vitest · Playwright

## Schnellstart

```bash
npm ci
cp .env.example .env    # Werte eintragen
npx prisma migrate deploy
npm run admin:create -- --email sie@metours.de --name "Ihr Name"
npm run dev
```

## Prüfen

```bash
npm run check           # typecheck + lint + unit/DB-Tests + build
npm run test:e2e        # Playwright, Desktop + Mobil
```

## Dokumentation

[Architektur](docs/ARCHITECTURE.md) · [Datenbank](docs/DATABASE.md) · [Buchung](docs/BOOKING_ENGINE.md) · [Zahlungen](docs/PAYMENTS.md) · [OPS Center](docs/OPS_CENTER.md) · [Fahrer-App](docs/DRIVER_APP.md) · [Migration](docs/MIGRATION.md) · [SEO](docs/SEO.md) · [Sicherheit](docs/SECURITY.md) · [Deployment](docs/DEPLOYMENT.md) · [Kosten](docs/COSTS.md) · [Betrieb](docs/OPERATIONS.md) · [URL-Inventar](docs/URL-INVENTORY.csv)
