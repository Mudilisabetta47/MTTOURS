# Datenmigration Lovable/Supabase → neue Plattform

Grundsätze: **Nichts im Altsystem löschen oder ändern.** Jede Migration ist wiederholbar, prüfbar und erzeugt einen Bericht. Produktive Kundendaten gelangen nur in die isolierte Migrations-/Staging-Datenbank, nie in Entwickler- oder Testdatenbanken.

## 1. Zugänge und Export

| Was | Woher | Format |
|---|---|---|
| Datenbank inkl. `auth`-Schema | Supabase-Dashboard → Database → Connection string (Session-Pooler) bzw. bei Lovable Cloud: Export über Lovable/Support anfordern | `pg_dump -Fc --no-owner` |
| Storage-Buckets | Supabase Storage (S3-Schnittstelle) | Dateien + Liste mit SHA-256 |
| Lovable-Assets (`/__l5e/assets-v1/…`) | über die Live-URL je Asset-JSON im Code (`src/assets/*.asset.json`) | Dateien |
| Edge-Function-Secrets | **nicht** exportieren, neu ausstellen (Stripe/PayPal-Webhooks, Resend, Mapbox) | – |
| Stripe/PayPal | Zahlungs- und Erstattungsexport des betroffenen Zeitraums | CSV |

Der Dump wird verschlüsselt abgelegt, Zugriff nur für die Migration, Löschung nach Abschluss dokumentiert.

## 2. Bestandsaufnahme (vor jedem Import)

Skript `scripts/migrate/inventory.ts` (Phase 9) erzeugt je Tabelle: Datensatzanzahl, Min/Max-Zeitstempel, Fremdschlüssel-Waisen, Dubletten (z. B. Zustiege „HAMBURG ZOB “ vs. „Hamburg ZOB“), Pflichtfelder leer, Beträge ≤ 0, Status-Verteilung. Ergebnis als Markdown + CSV.

## 3. Zuordnung alt → neu (Auszug)

| Alt | Neu | Hinweise |
|---|---|---|
| `auth.users` + `profiles` + `user_roles` | `User`, `UserRole`, `Customer` | `agent` → `OFFICE` (prüfen), `admin` → `ADMIN`, `driver` → `DRIVER`, `customer` → `CUSTOMER`. OWNER wird bewusst neu vergeben |
| `package_tours` | `Trip` | `productType` aus Inhalt bestimmen (Pauschalreise vs. nur Fahrt) – **manuelle Freigabe je Reise**. Entwürfe/Testreisen (`tedt`, `Neue Reise`) nicht übernehmen |
| `tour_dates` + `tour_tariffs` | `TripDeparture` + `DepartureFare` | Tarifpreise je Termin aus `price_basic/smart/flex/business`; 0-€-Tarife nicht als aktiv übernehmen |
| `tour_pickup_stops` | `Stop` (dedupliziert) + `DepartureStop` | Normalisierung von Namen/Adressen |
| `weekend_trips` | `Trip` (`TRANSPORT_ONLY`) | Termine fehlen im Altsystem → mit Disposition anlegen |
| `tour_bookings` | `Order` + `Booking` + `BookingPassenger` + `OrderLine` | Preis wie bezahlt übernehmen, **nicht** neu berechnen; Abweichung zum Tarif im Bericht ausweisen |
| `bookings` + `tickets` | `Booking`, `Ticket` | Ticketnummern (`TKT-YYYY-######`) beibehalten, damit gedruckte QR-Codes gültig bleiben (Phase 3: Legacy-QR-Validierung) |
| Stripe-/PayPal-Felder | `Payment` (+ `PaymentEvent` als Importereignis) | Abgleich gegen Provider-Export |
| `package_tour_inquiries`, `admin_bookings`, `dispatch_orders` | `Inquiry`, `CharterOrder`, `Run` | Originalanfrage als `originalPayload` |
| `tour_offers`, `tour_offer_items` | `Quote`, `QuoteVersion` | |
| `buses`, `fleet_*`, `bus_maintenance` | `Vehicle`, `MaintenanceWindow`, `VehicleDocument` | Nur mit Bestätigung der Disposition (echte Fahrzeuge) |
| `driver_*`, `employment_contracts` | `Driver`, `DriverDocument`, `DriverAbsence` | Sensible Dokumente in privaten Bucket |
| `tour_invoices` | `Invoice` (Status ISSUED) | Nummern und Beträge unverändert; PDFs übernehmen |
| `customer_reviews` | **nicht** übernehmen, bis Herkunft belegt | siehe Audit Abschnitt 5 |
| `audit_log`, `payment_audit_log` | Archiv-Export (CSV) | nicht in neues Audit-Log mischen |

Jeder importierte Datensatz erhält einen Eintrag in `LegacyIdMap(source, legacyTable, legacyId → entityId, runId)`. Ein erneuter Lauf aktualisiert statt zu duplizieren.

## 4. Passwörter und Sessions

Supabase/GoTrue speichert bcrypt-Hashes (`auth.users.encrypted_password`). Plan:

1. Hash unverändert in `User.passwordHash` übernehmen (Präfix `$2a$`/`$2b$`).
2. `verifyPassword` erkennt bcrypt, prüft, und schreibt bei Erfolg sofort einen argon2id-Hash (transparentes Rehash).
3. Konten ohne Passwort (Magic Link/OAuth) bzw. ungültige Hashes erhalten beim ersten Login einen Passwort-Reset-Link.
4. Sessions werden **nicht** übernommen; alle Nutzer melden sich nach dem Cutover neu an.

(Die bcrypt-Prüfung wird in Phase 9 ergänzt; aktuell akzeptiert die Plattform nur argon2id.)

## 5. Ablauf

1. **Probelauf** in die Staging-DB → Bericht (Anzahl je Entität alt/neu, Summen der Zahlbeträge alt/neu, Waisen, Abweichungen).
2. Fachliche Abnahme durch Büro/Disposition anhand von Stichproben (10 Buchungen, 5 Angebote, 3 Rechnungen, alle künftigen Abfahrten).
3. Korrekturen im Skript, erneuter Lauf auf leerer Staging-DB, bis der Bericht ohne unerklärte Abweichung ist.
4. **Restore-Test** der neuen Produktions-DB aus Backup.
5. **Cutover-Fenster** (Vorschlag: nachts, Dienstag–Donnerstag, keine Abfahrt in den folgenden 12 h):
   - Online-Buchung im Altsystem auf „Wartung“ (wie aktuell 09.–11.10.)
   - finaler Dump → Import → Abgleich
   - DNS umstellen, Weiterleitungen aktiv, Stripe/PayPal-Webhooks auf neue Endpunkte
   - Smoke-Test: Startseite, Suche, Testbuchung mit echter Karte (sofort erstattet), Ticket-Scan, Admin-Login, Anfrageformular
6. **Rollback:** DNS zurück auf Lovable (TTL vorher auf 300 s senken); im neuen System entstandene Buchungen werden aus dem Audit-/Order-Bestand manuell nachgetragen. Rollback-Entscheidung spätestens 2 h nach Umstellung.
7. Lovable bleibt mindestens 30 Tage lesend erreichbar, bis keine Daten mehr ausschließlich dort liegen. Erst dann Kündigung.

## 6. Prüfsummen

Pro Lauf: Anzahl Buchungen je Status, Summe `totalCents` je Monat, Anzahl Tickets je Abfahrt, Summe Zahlungen/Erstattungen je Provider. Alt und neu müssen übereinstimmen oder die Abweichung ist im Bericht begründet.
