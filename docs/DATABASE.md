# Datenbank

PostgreSQL ≥ 16 (lokal getestet mit 18.6), Prisma 7 mit `@prisma/adapter-pg`. Schema: [`prisma/schema.prisma`](../prisma/schema.prisma). Migrationen: [`prisma/migrations`](../prisma/migrations).

## Konventionen

- **Geld:** `Int` in Cent + `currency`. Steuersätze in Basispunkten (`1900` = 19 %). Keine Fließkommazahlen für Preise. Hilfsfunktionen: `src/lib/money.ts`.
- **Zeit:** `timestamp(3)` in UTC; Anzeige in Europe/Berlin (`src/lib/time.ts`, DST-sicher).
- **IDs:** `cuid()` für neue Datensätze; migrierte Datensätze dürfen ihre alte UUID behalten. Zuordnung in `LegacyIdMap`.
- **Nummern** (Buchung, Ticket, Rechnung …): `NumberSequence` je Bereich und Jahr, vergeben in der Geschäftstransaktion.

## Bereiche und Kernentitäten

| Bereich | Tabellen |
|---|---|
| Identität | `User`, `UserRole`, `Session`, `PasswordResetToken`, `AuditLog`, `RateLimitBucket`, `IdempotencyKey` |
| Kunden/B2B | `Customer`, `Company`, `CostCenter`, `FrameworkContract`, `FollowUp` |
| Dateien | `StoredFile` (privat/öffentlich, Bucket + Key), `MediaAsset` (inkl. `isAiGenerated`, `rightsConfirmed`) |
| Katalog | `Trip` (Produkt), `TripMedia`, `TripItineraryDay`, `TripInclusion`, `OptionalService`, `Faq` |
| Abfahrten | `TripDeparture` (Termin mit Kapazität, Fristen, Status), `DepartureFare` (Tarife), `Stop`, `DepartureStop` (Zustiege mit Zeit, Aufpreis, Ist-Zeiten) |
| Fuhrpark | `Vehicle`, `VehicleDocument`, `VehicleMedia`, `MaintenanceWindow`, `SeatLayout`, `Seat` |
| Inventar | `CapacityHold`, `SeatReservation` |
| Verkauf | `Order`, `OrderLine`, `Booking`, `BookingPassenger`, `BookingChangeRequest`, `Ticket`, `TicketValidation` |
| Zahlung | `Payment`, `PaymentEvent`, `Refund`, `Voucher`, `VoucherRedemption` |
| Vertrieb/Charter | `Inquiry`, `Quote`, `QuoteVersion`, `CalculationParameterSet`, `CharterOrder`, `CharterStop` |
| Disposition | `Run` (operative Fahrt), `VehicleAssignment`, `DriverAssignment`, `Driver`, `DriverAbsence`, `DriverDocument`, `DriverActivity`, `ComplianceRuleSet` |
| Betrieb | `OperationalEvent`, `VehiclePosition`, `MessageThread`, `Message`, `MessageReceipt` |
| Finanzen | `Invoice`, `InvoiceLine`, `NumberSequence` |
| CMS/SEO | `Page`, `Redirect`, `SiteSetting` |
| Technik | `Notification`, `BackgroundJob`, `LegacyIdMap` |

### Warum Produkt und Abfahrt getrennt sind

Eine Reise „Nizza, 7 Tage“ ist ein `Trip`. Jeder Termin ist eine `TripDeparture` mit eigener Kapazität, eigenen Tarifen, eigenen Zustiegen mit Uhrzeiten, eigener Buchungsfrist und eigenem Fahrzeug. Buchungen hängen immer an der Abfahrt. Das Altsystem mischte beides (`package_tours.departure_date`, `max_participants` …).

### Warum `Run`

Eine **Run** ist die operative Fahrt, die Bus und Fahrer braucht – egal ob aus einer Reiseabfahrt (`departureId`), einem Charterauftrag (`charterOrderId`) oder einer Leerfahrt. Disposition, OPS und Fahrer-App arbeiten nur mit Runs.

### Produkttyp

`ProductType` unterscheidet Pauschalreise, reine Beförderung, Tagesfahrt, Linienticket und Gruppenreise. Daraus folgen Informationspflichten (Formblatt, Sicherungsschein), Steuerlogik und Stornoregeln. Ein Trip vom Typ `PACKAGE_TOUR` darf erst veröffentlicht werden, wenn `insolvencyCertificateRef` gesetzt ist (Prüfung in Phase 3 im Veröffentlichungs-Service).

## Integritätsregeln in der Datenbank

Migration `20261009200000_integrity_constraints`. Diese Regeln gelten auch dann, wenn ein Fehler im Anwendungscode sie umgehen würde.

| Regel | Umsetzung |
|---|---|
| Keine Überbuchung | `CHECK (soldCount + heldCount <= capacity)` + bedingtes UPDATE in `server/inventory/capacity.ts` |
| Ein Sitz nur einmal pro Abfahrt | partieller Unique-Index `SeatReservation(departureId, seatId) WHERE status IN ('HELD','BOOKED')` |
| Bus nicht doppelt belegt | `EXCLUDE USING gist (vehicleId WITH =, tsrange(startsAt, endsAt) WITH &&) WHERE status <> 'CANCELLED'` |
| Fahrer nicht doppelt eingeteilt | dito auf `DriverAssignment` |
| Bestellsumme stimmt | `totalCents = subtotalCents - discountCents + feesCents`, alle ≥ 0 |
| Zahlung/Erstattung plausibel | Betrag > 0, `refundedCents ≤ amountCents` |
| Gutschein-Limit | `redemptionCount ≤ maxRedemptions` |
| Rechnung unveränderlich nach Ausstellung | Trigger: Beträge, Nummer, Adresse, Positionen gesperrt; Korrektur nur per Gutschrift. Ausgestellte Rechnungen nicht löschbar |
| Audit-Log append-only | Trigger verbietet UPDATE/DELETE |
| Ticket-Scans append-only | dito |
| Zahlungs-Events nicht löschbar | Trigger |
| Originalanfrage unverändert | Trigger auf `Inquiry.originalPayload` |
| Zeiträume gültig | `endsAt > startsAt` für Fahrten, Zuweisungen, Wartung, Abwesenheiten |

Alle Regeln sind durch Tests in `tests/db/` belegt (u. a. 40 parallele Checkouts auf 10 Plätze → genau 10 erfolgreich).

## Arbeiten mit Migrationen

```bash
npx prisma migrate dev --name <beschreibung>   # lokal, erzeugt SQL
npx prisma migrate deploy                      # Staging/Production, nur bestehende Migrationen
```

- Raw-SQL-Regeln, die Prisma nicht kennt, in eine **eigene** Migration schreiben (`--create-only`, dann SQL ergänzen).
- `prisma migrate reset` und `db push` **niemals** gegen Staging/Production. Die Testhelfer verweigern jede Datenbank, deren Name nicht auf `_test` endet.
- Keine Demo-Seeds in Production. Ein Entwicklungs-Seed (Phase 2) schreibt nur in Datenbanken mit `_dev`/`_test`.
