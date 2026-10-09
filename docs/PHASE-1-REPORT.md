# Phase 1 – Foundation · Abschlussbericht

Datum: 09.10.2026 · Repository: `/Users/mudilisa/metropoltours.de` (eigenes Git-Repository, Branch `main`)

## Umgesetzte Funktionen

| Funktion | Status | Belegt durch |
|---|---|---|
| Projektgerüst Next.js 16 / React 19 / TS strict (`noUncheckedIndexedAccess`) | fertig | `npm run typecheck` |
| Vollständiges relationales Datenmodell (70 Tabellen, alle Phasen) | fertig, wird je Phase ergänzt | `prisma/schema.prisma`, `docs/DATABASE.md` |
| Datenbank-Integritätsregeln (Überbuchung, Sitz-Doppelvergabe, Bus-/Fahrer-Doppelbelegung, Summenprüfungen, unveränderliche Rechnungen, append-only Audit/Scans, unveränderliche Originalanfrage) | fertig | `tests/db/*` |
| Kapazitätsreservierung (atomar, für Phase 3) | Kern fertig | `server/inventory/capacity.ts` |
| Lückenlose Nummernkreise | fertig | `server/numbering.ts` |
| Login mit argon2id, serverseitige Sessions, HttpOnly-Cookie, Logout | fertig | E2E + DB-Tests |
| Ratenbegrenzung (Postgres, mehrinstanzfähig) | fertig | DB-Test „rate-limits brute force“ |
| 8 Rollen, 50 Berechtigungen, serverseitige Prüfung | fertig | `tests/unit/rbac.test.ts`, E2E 403 für Fahrer |
| Mitarbeiterverwaltung: Konto anlegen (Einmal-Link statt Passwort), Rollen vergeben/entziehen, Schutz des letzten Inhabers | fertig | E2E + DB-Tests |
| Passwort setzen per Einmal-Link | fertig | E2E (zweite Nutzung abgelehnt) |
| Audit-Log mit Filter, Einträge in derselben Transaktion | fertig | `/admin/protokoll`, DB-Test Rollback |
| Admin-Grundgerüst: Sidebar nach Berechtigung, nur fertige Module sichtbar | fertig | E2E „unbuilt modules are not shown“ |
| Dashboard mit echten Kennzahlen aus der DB, ehrliche Leerzustände | fertig | E2E |
| Fahrerbereich `/fahrer` (eigene Einsätze, serverseitig gefiltert) | Basis | E2E |
| Design-Tokens aus echten Markenwerten (Hell/Dunkel), Basis-Komponenten | fertig | `src/styles/*` |
| Health-Endpoint ohne Datenpreisgabe | fertig | E2E |
| Staging nicht indexierbar | fertig | E2E |
| CI (GitHub Actions mit Postgres) | angelegt, noch nicht ausgeführt (kein Remote) | `.github/workflows/ci.yml` |
| Bootstrap erstes Inhaberkonto ohne Standardpasswort | fertig | `npm run admin:create` |

## Datenbankänderungen

- `20261009195845_init` – alle Tabellen, Enums, Indizes
- `20261009200000_integrity_constraints` – `btree_gist`, CHECK-, Exclusion- und partielle Unique-Constraints, Trigger

Angelegte lokale Datenbanken: `metours_dev`, `metours_test`, `metours_e2e_test`. Vorhandene Datenbanken anderer Projekte (u. a. `metropol_dev`, `metropol_test`) wurden **nicht** angerührt.

## Routen

`/` (Staging-Hinweis, noindex) · `/anmelden` · `/passwort-setzen` · `/admin` · `/admin/mitarbeiter` · `/admin/protokoll` · `/fahrer` · `/api/health` · `/robots.txt`

## Tests

| Suite | Ergebnis |
|---|---|
| TypeScript strict | ✔ 0 Fehler |
| ESLint (next/core-web-vitals + typescript) | ✔ 0 Befunde |
| Unit (Vitest) – Geld, Rundung, Aufteilung, RBAC, Zeitzonen/DST, Weiterleitungsschutz, argon2id | ✔ 20/20 |
| DB-Integration – Nebenläufigkeit Inventar (40 parallel → genau 10), Sitzplatz-Unique, Exclusion Bus/Fahrer, Nummernkreis parallel + Rollback, Audit append-only, Rechnung unveränderlich, Anfrage unveränderlich, Login/Sessions/Ratenlimit, Kontoverwaltung | ✔ 24/24 |
| Produktions-Build | ✔ |
| E2E (Playwright), Desktop 1440 × 900 und Mobil 390 × 844 | ✔ 22/22 |

**Durch Tests gefundene und behobene Fehler:** (1) Fahrer wurden nach Login auf eine nicht vorhandene Seite geleitet → `/fahrer` gebaut. (2) Auf Mobilgeräten verbreiterte die Mitarbeitertabelle die ganze Seite auf 669 px (Grid-Spalten ohne `minmax(0, 1fr)`) → behoben, Overflow-Test vergleicht jetzt mit der Gerätebreite. (3) Das Login-Ratenlimit zählte auch erfolgreiche Anmeldungen → zählt pro Konto nur noch Fehlversuche.

## Screenshots

`docs/screenshots/phase-1/`: Login (mobil), Dashboard (Desktop/mobil), Mitarbeiter (Desktop/mobil), Protokoll (Desktop).

## Responsive

Admin und Login geprüft bei 390 und 1440 px ohne horizontales Überlaufen. Die volle Matrix 320–2560 folgt mit der öffentlichen Website (Phase 2), wo sie den größten Unterschied macht.

## Performance

Admin/Login sind Server-gerendert; das Client-JavaScript beschränkt sich auf Formulare und die aktive Navigation. DM Sans wird beim Build selbst gehostet, also ohne Laufzeitanfrage an Google. Messungen der Core Web Vitals folgen mit Phase 2.

## Sicherheit

Siehe `docs/SECURITY.md`. Offen vor Produktion: TOTP-2FA für privilegierte Rollen, CSP mit Nonces, E-Mail-Versand für Passwort-Reset.

## Git

Erster Commit auf `main` im eigenen Repository `/Users/mudilisa/metropoltours.de`. Kein Remote konfiguriert, nichts gepusht.

## Offene Integrationen

Stripe, PayPal, Brevo, S3-Speicher, Fehlerüberwachung. Die Variablen sind vorbereitet und werden von `lib/env.ts` geprüft, aber noch nicht genutzt.

## Bekannte Einschränkungen

- Passwort vergessen nur über die Verwaltung (E-Mail-Versand folgt).
- Kein Remote-Repository, daher CI noch nicht ausgeführt.
- bcrypt-Kompatibilität für migrierte Passwörter folgt in Phase 9.
- Deutsche Texte in der Oberfläche; Englisch ist nicht geplant.

## Kostenrisiken

Keine neuen kostenpflichtigen Dienste eingeführt. Hintergrundjobs und Ratenbegrenzung laufen bewusst auf Postgres statt auf Redis.

## Nächste Phase (2 – Premium Website)

Startseite mit Hero und Signature-Bus-Journey (Canvas 2D, 7 Akte), Busvermietung + Anfrageformular → `Inquiry` (mit Dublettenschutz), Leistungs- und Regio-Seiten aus dem URL-Inventar, Reiseübersicht aus echten Daten (zunächst mit ehrlichem Leerzustand). Dafür benötigt: Entscheidungen aus Audit Abschnitt 13, insbesondere echte Fahrzeugfotos und Fahrzeugliste.
