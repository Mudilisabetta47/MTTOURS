# Betrieb

## Überwachung

| Signal | Quelle | Alarm |
|---|---|---|
| App erreichbar, DB erreichbar | `GET /api/health` alle 60 s | 2 Fehlschläge |
| Fehler | Sentry/GlitchTip | neue Fehlerart, Häufung |
| Hintergrundjobs | `BackgroundJob` Status `FAILED`/`DEAD`, Alter ältester `PENDING` | > 15 min |
| Webhooks | `PaymentEvent.processedAt IS NULL` älter 10 min, `error` gesetzt | sofort |
| Zahlungsabgleich | täglicher Job: Stripe/PayPal-Salden vs. `Payment` | Abweichung |
| E-Mail | `Notification.status = FAILED`, Bounce-Webhooks | Häufung |
| Backups | Alter des letzten erfolgreichen Backups | > 26 h |
| Ablaufende Fristen | HU/SP/Versicherung, Führerschein, Fahrerkarte, Schlüsselzahl 95 | 30/7 Tage vorher |

## Backups und Wiederherstellung

- Datenbank: täglicher Voll-Snapshot + WAL-Archivierung (Point-in-Time-Recovery), Aufbewahrung 30 Tage, Kopie in zweiter Region/zweitem Anbieter.
- Dateien: Object-Storage-Versionierung + nächtliche Replikation.
- **Ziele:** RPO ≤ 15 min, RTO ≤ 4 h.
- **Restore-Test:** vor dem Livegang und danach vierteljährlich in eine leere Datenbank; Ergebnis (Dauer, Datenstand, Prüfsummen) hier protokollieren.

| Datum | Backup-Zeitpunkt | Dauer | Ergebnis | Durchgeführt von |
|---|---|---|---|---|
| – | – | – | noch nicht durchgeführt | – |

## Routineaufgaben

- Wöchentlich: Abhängigkeits-Updates (Sicherheit) prüfen, fehlgeschlagene Jobs sichten.
- Monatlich: Rollen und aktive Konten prüfen (ausgeschiedene Mitarbeitende sperren).
- Vierteljährlich: Restore-Test, Kostenprüfung, Rechtstexte/Informationspflichten auf Änderungen prüfen.
