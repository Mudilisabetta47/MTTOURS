# Sicherheit und Datenschutz

## Umgesetzt (Phase 1)

| Bereich | Umsetzung | Ort |
|---|---|---|
| Passwörter | argon2id (m = 19 MiB, t = 2, p = 1), min. 12 Zeichen, Zeit-Ausgleich bei unbekannter E-Mail | `server/auth/password.ts` |
| Sessions | zufälliges 256-Bit-Token im Cookie, in der DB nur SHA-256; `HttpOnly`, `SameSite=Lax`, `Secure` + `__Host-`-Präfix in Production; Mitarbeitende 12 h, Kunden 30 Tage; Widerruf bei Rollen-/Passwortänderung | `server/auth/session*.ts` |
| CSRF | Server Actions prüfen Origin/Host (Next.js); SameSite=Lax | – |
| Autorisierung | Rollen → Berechtigungen (`lib/rbac.ts`), Prüfung in jeder Seite/Action **serverseitig** (`requireStaff`, `requirePermission`); Navigation zeigt nur Erlaubtes, schützt aber nicht | `lib/rbac.ts`, `server/auth/session.ts` |
| Rollenvergabe | Nur OWNER vergibt OWNER/ADMIN; letzter OWNER nicht entfernbar (Advisory Lock); jede Änderung im Audit-Log derselben Transaktion | `server/staff/service.ts` |
| Konto-Einrichtung | kein Passwort durch Admins; Einmal-Link (48 h, nur Hash gespeichert, einmalig verwendbar) | `passwort-setzen` |
| Ratenbegrenzung | Login: 8 Fehlversuche/15 min pro Konto, 30 Versuche/15 min pro IP; Passwort setzen 10/15 min pro IP; Postgres-basiert (mehrere Instanzen) | `server/rate-limit.ts` |
| Open Redirect | `next`-Parameter nur relative Pfade | `lib/safe-redirect.ts` |
| Audit-Log | append-only per Trigger; IP nur als HMAC | `server/audit.ts` |
| Secrets | nur serverseitig, Zod-validiert beim Start; Production verweigert Stripe-Testschlüssel; `.env` in `.gitignore` | `lib/env.ts` |
| Header | HSTS, nosniff, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, COOP; `/admin`, `/ops`, `/fahrer`, `/mein-konto`: `noindex` + `no-store` | `next.config.ts` |
| Health-Endpoint | nur Status, DB erreichbar, Anzahl Migrationen – keine Versionen, Hosts oder Daten | `app/api/health` |
| Indexierung | Nicht-Production-Umgebungen: `robots.txt` → `Disallow: /` | `app/robots.ts` |
| Testschutz | Testhelfer verweigern Datenbanken ohne `_test`-Suffix und entfernte Hosts | `tests/db/safety.ts` |

## Vor dem Produktivbetrieb (offen)

- **2FA (TOTP)** für OWNER, ADMIN, ACCOUNTING (`requiresMfa()` vorhanden, Erzwingung folgt mit dem TOTP-Modul). Felder `mfaSecretEnc`, `Session.mfaVerified` sind angelegt.
- Content-Security-Policy mit Nonces (sobald Stripe/PayPal-Skripte eingebunden sind).
- Passwort-zurücksetzen per E-Mail (Brevo), Benachrichtigung bei Login aus neuer Umgebung.
- Signierte, kurzlebige URLs für private Dateien; Virenscan für Uploads.
- Lösch- und Aufbewahrungskonzept umsetzen (Tabelle unten), Auskunftsexport je Kunde.
- Penetrationstest-light (OWASP ASVS Level 2 Checkliste) vor Livegang.

## Datenschutz (DSGVO)

| Datenart | Aufbewahrung (Vorschlag, juristisch zu bestätigen) | Grundlage |
|---|---|---|
| Rechnungen, Zahlungs- und Buchungsbelege | 8 Jahre (seit BEG IV, 2025); Bücher/Abschlüsse 10 Jahre – mit Steuerberater bestätigen | § 147 AO, § 257 HGB |
| Geschäftsbriefe/Angebote | 6 Jahre | § 257 HGB |
| Passagierlisten je Fahrt | bis Abschluss der Fahrt + Reklamationsfrist, danach anonymisieren | Zweckbindung |
| Fahrer-Dokumente | Dauer des Beschäftigungsverhältnisses + gesetzliche Fristen | Arbeitsrecht |
| Tachograph-/Lenkzeitdaten | mind. 1 Jahr | FPersV / VO (EU) 165/2014 |
| GPS-Positionen | 90 Tage, danach aggregiert/gelöscht | Interessenabwägung, Betriebsrat/Fahrer informieren |
| Anfragen ohne Auftrag | 2 Jahre nach letztem Kontakt | berechtigtes Interesse |
| Sessions, Ratenlimits | Tage | technisch |

Auftragsverarbeitungsverträge nötig mit: Hosting, Datenbankanbieter, Object Storage, E-Mail-Anbieter, Stripe, PayPal, Fehlerüberwachung. Logs enthalten keine Passwörter, Tokens, vollständigen IPs oder Zahlungsdaten.

## Meldewege

Sicherheitsvorfall → OWNER informieren → Sessions widerrufen (`revokeAllSessions`) → Schlüssel rotieren → Audit-Log sichern → Meldepflicht prüfen (72 h, Art. 33 DSGVO).
