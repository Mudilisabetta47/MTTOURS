# Fahrer-App

> Status: Phase 1 – Route `/fahrer` mit Login und Liste der eigenen kommenden Einsätze (serverseitig auf den angemeldeten Fahrer gefiltert). Vollausbau Phase 6.

**Form:** installierbare PWA (Manifest, Service Worker), mobile first, große Bedienelemente, Hell/Dunkel. Keine App-Store-Pflicht.

**Funktionen (Phase 6):** Einsätze heute/kommend · Fahrtdetail mit Halten, Zeiten, Navigation (Deep Link zu Google/Apple Maps mit Koordinaten) · Abfahrt/Ankunft je Halt bestätigen · Verspätung/Problem melden (Vorlagen + Freitext + Foto) · Nachrichten mit Disposition · Ticket-Scan per Kamera (`BarcodeDetector`, Fallback-Bibliothek) · Fahrt abschließen.

**Offline:** Beim Öffnen einer Fahrt lädt die App ein Paket: Fahrt, Halte, Zeiten und je Ticket nur `qrTokenId`, Nachname-Initial, Zustieg, Sitz. Gespeichert verschlüsselt in IndexedDB, gelöscht 24 h nach Fahrtende bzw. beim Abmelden. Ereignisse und Scans werden mit `clientEventId` in einer Warteschlange gehalten und bei Verbindung idempotent übertragen. Konflikte (z. B. Ticket wurde inzwischen storniert) werden serverseitig als `TicketValidation` mit dem echten Ergebnis protokolliert und dem Fahrer angezeigt.

**Ticket-QR:** HMAC-signiertes Token (`TICKET_SIGNING_SECRET`) mit `qrTokenId` und Abfahrt; offline prüfbar auf Signatur und Abfahrt, „bereits gescannt“ zunächst gerätelokal, endgültig beim Sync.

**Datenschutz:** Fahrer sehen nur eigene Fahrten und nur die für den Zustieg nötigen Passagierdaten.
