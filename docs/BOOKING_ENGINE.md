# Booking Engine

> Status: **Datenmodell und Inventar-Kern umgesetzt (Phase 1)**, Checkout folgt in Phase 3. Dieses Dokument ist die verbindliche Spezifikation.

## Ablauf

```
Reise → Abfahrt → Zustieg → Reisende → (Sitzplätze) → Zusatzleistungen → Preisprüfung → Zahlung → Bestätigung → Ticket
```

1. **Checkout starten** (Server Action, eine Transaktion):
   - Abfahrt `ON_SALE`, Buchungsfrist nicht abgelaufen, Trip `PUBLISHED`.
   - `Order` (`PENDING_PAYMENT`, `expiresAt = now + 20 min`) anlegen.
   - `reserveCapacity(tx, departureId, n)` → bei Fehlschlag „ausverkauft“, **keine** Bestellung.
   - Bei Sitzplatzwahl: `SeatReservation(status HELD)` je Sitz; Unique-Index verhindert Doppelvergabe.
   - `CapacityHold` mit Ablaufzeit.
2. **Preis** wird **ausschließlich serverseitig** aus `DepartureFare`, `DepartureStop.surchargeCents`, `OptionalService` und Gutschein berechnet und als `OrderLine`s gespeichert. Der Browser sendet nur IDs und Mengen.
3. **Zahlung**: siehe [PAYMENTS.md](PAYMENTS.md). Der Betrag der Zahlungssitzung = `Order.totalCents`.
4. **Bestätigung** nur durch verifizierten Webhook (`payment_intent.succeeded` / `checkout.session.completed` bzw. PayPal `PAYMENT.CAPTURE.COMPLETED`), in einer Transaktion:
   `Payment SUCCEEDED` → `convertHeldToSold` → `SeatReservation BOOKED` → `Booking CONFIRMED` → `Ticket` je Reisendem → `Notification` (Bestätigung + Ticket-PDF) → `AuditLog`.
5. **Abbruch/Ablauf**: Job `expire-holds` (jede Minute) setzt abgelaufene Holds auf `EXPIRED`, gibt Kapazität und Sitze frei, `Order EXPIRED`. Kommt ein Zahlungs-Webhook für eine abgelaufene Bestellung, wird versucht neu zu reservieren; gelingt das nicht, folgt eine automatische Erstattung mit Hinweis an das Büro.

## Preisberechnung

```
Grundpreis       Σ Reisende × Tarifpreis
+ Zustiegsaufpreis Σ Reisende × surchargeCents
+ Zusatzleistungen Σ (PER_PERSON × Personen | PER_BOOKING)
− Rabatt         Gutschein (Prozent in Basispunkten oder Betrag), höchstens bis 0
+ Gebühren       nur wenn rechtlich zulässig ausgewiesen
= Gesamtpreis (brutto)
  davon USt      je Position nach Steuersatz (Steuerlogik: siehe Rechnungen; Pauschalreise → § 25 UStG Margenbesteuerung, mit Steuerberater festzulegen)
```

Rundung einmal pro Position; Rabatte werden mit `allocate()` cent-genau auf Positionen verteilt.

## Teilstrecken (Kontingente zwischen Halten)

`BookingPassenger.boardingStopId`/`alightingStopId` verweisen auf `DepartureStop` mit Reihenfolge. Für Linien mit Teilstrecken wird in Phase 3 eine Segment-Inventur ergänzt (`DepartureSegment` je Haltepaar mit Kapazitätszähler; Reservierung sperrt alle Segmente zwischen Ein- und Ausstieg in fester Reihenfolge, um Deadlocks zu vermeiden). Für Pauschalreisen genügt die Abfahrtskapazität.

## Gastbuchung

Keine Kontopflicht. Nach der Buchung erhält der Gast eine E-Mail mit einem zufälligen Zugriffslink (`Order.accessTokenHash`). Die Buchungsnummer allein öffnet nichts.

## Nicht erlaubt

Keine Buchung ohne Persistenz, keine Bestätigung auf Basis der Browser-Rückleitung, keine 0-€-Buchungen außer mit ausdrücklich freigegebenem 100-%-Gutschein, keine „freien Plätze“ außer `capacity − soldCount − heldCount`.
