# OPS Center

> Status: Datenmodell umgesetzt (Phase 1: `Run`, `OperationalEvent`, `VehiclePosition`, Nachrichten). Oberfläche Phase 6.

Route `/ops` (Berechtigung `ops.view`), dunkles Thema, für große Bildschirme und Laptop.

**Ansichten:** Fahrten heute (Zeitleiste je Fahrzeug) · Fahrtdetail (Halte mit Soll/Ist, gescannte Tickets, Ereignisse) · Karte · Meldungen (Verspätung, Panne, Problem) mit Quittierung · Nachrichten an Fahrer.

**Live-Positionen:** Eine Position gilt nur als „live“, wenn sie jünger als 2 Minuten ist; 2–10 Minuten = „verzögert“, älter = „veraltet“ mit Zeitstempel. Jede Position zeigt Quelle (Fahrer-App, Telematik, manuell), Zeit und Genauigkeit. Es gibt keine interpolierte oder simulierte Bewegung.

**Aktualisierung:** Server-Sent Events aus `OperationalEvent` (ein Endpunkt, Berechtigung geprüft); Fallback Polling alle 15 s.

**Eskalation:** Verspätung > 30 min an einem Halt mit Zustiegen → Hinweis an Büro mit Liste der betroffenen Buchungen (Kontakt per E-Mail/SMS nur nach Freigabe).
