# Deployment

## Umgebungen

| Umgebung | Datenbank | Zweck | Indexierbar |
|---|---|---|---|
| development | `metours_dev` (lokal) | Entwicklung, synthetische Daten | nein |
| test | `metours_test`, `metours_e2e_test` (lokal/CI) | automatische Tests, werden geleert | nein |
| staging | eigene DB, Migrationsprobe mit Echtdaten nur mit Zugriffsbeschränkung | Abnahme | nein |
| production | eigene DB | Betrieb | ja |

`APP_ENV` steuert umgebungsabhängiges Verhalten (z. B. `robots.txt`). Production-Deployments **nur** aus der CI vom geschützten Branch `main` nach grünem Lauf, niemals von einem Entwicklerrechner.

## Variablen

Siehe [`.env.example`](../.env.example). Pflicht: `DATABASE_URL`, `APP_URL`, `SESSION_SECRET` (≥ 32 Zeichen, zufällig), `TICKET_SIGNING_SECRET`. Generieren: `openssl rand -base64 48`.

## Lokale Entwicklung

```bash
npm ci                         # installiert, generiert Prisma-Client
cp .env.example .env           # Werte setzen
createdb metours_dev && createdb metours_test && createdb metours_e2e_test
npx prisma migrate deploy
npm run admin:create -- --email sie@metours.de --name "Ihr Name"
npm run dev                    # http://localhost:3000/anmelden
```

## Prüfungen vor jedem Merge (CI)

`npm run typecheck` · `npm run lint` · `npm run test` (Unit + DB-Integration) · `npm run build` · `npx playwright test` (E2E, Desktop 1440 + Mobil 390)

## Produktionsbetrieb (Variante C, Phase 9)

1. Docker-Image (`node:22-alpine`, `next build` mit `output: standalone`) für App und Worker.
2. Reverse Proxy (Caddy) mit automatischem TLS, HTTP/2/3, Weiterleitung `metours.de` → `www.metours.de` (**301**).
3. `prisma migrate deploy` als eigener Release-Schritt **vor** dem Start der neuen Version; Migrationen sind rückwärtskompatibel (expand → migrate → contract).
4. Health-Check `/api/health` für Proxy und Uptime-Monitoring.
5. Rollback = vorheriges Image starten; Datenbankänderungen werden nie destruktiv in derselben Version ausgerollt.

## Erstes Produktionskonto

Kein Standardpasswort. `npm run admin:create` gibt einen Einmal-Link aus; das Passwort setzt die Person selbst.
