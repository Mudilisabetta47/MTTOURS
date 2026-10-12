# Live-Tracking

## Ablauf

1. **Leitstelle** (`/admin/leitstelle`): Für einen Termin wird eine Fahrt mit Fahrzeug und Fahrer angelegt
   (Fahrzeug muss mindestens so viele Plätze haben wie der Termin; Doppelbelegung verhindert die Datenbank).
2. **Fahrer-App** (`/fahrer` → Fahrt): „Fahrt starten und Standort teilen“. Das Telefon sendet alle 15 Sekunden
   den GPS-Standort, solange die Seite geöffnet ist (Bildschirm bleibt an, wo unterstützt). „Fahrt beenden“ stoppt.
3. **Fahrgäste** sehen auf ihrem persönlichen Buchungslink (`/buchung/status?o=…&t=…`):
   „Ihr Bus ist unterwegs“, Zeitpunkt des letzten Standorts, Geschwindigkeit, Entfernung **Luftlinie** zum eigenen
   Zustieg und einen Link zur Karte. **Keine Ankunftszeit** – die würde eine Verkehrsberechnung erfordern.
4. **Leitstelle** sieht alle laufenden Fahrten mit „live“/„veraltet“ (älter als 10 Minuten), Genauigkeit und Kartenlink.

## Regeln im Code (`src/server/live/tracking.ts`)

- Positionen nimmt nur der **zugeordnete Fahrer** an, nur bei Fahrtstatus „unterwegs“, nur für das zugeordnete Fahrzeug.
- Zeitstempel des Geräts muss plausibel sein (max. 10 Minuten alt, max. 1 Minute in der Zukunft); höchstens ein Punkt je 5 Sekunden.
- `/api/fahrer/position`: Sitzungs-Cookie + gleiche Herkunft (Origin-Prüfung).
- `/api/live`: nur mit gültigem Gast-Token einer **bezahlten** Buchung; sonst `{ state: "none" }`.
- Es gibt keine simulierten Positionen. Quelle wird gespeichert (`DRIVER_APP`; später `TELEMATICS`).

## Grenzen

- Browser senden nur, solange die Seite im Vordergrund ist (insbesondere iOS). Für lückenlose Daten ist später
  ein Telematik-Anschluss des Busses vorgesehen (`VehiclePosition.source = TELEMATICS`, gleiche Anzeige).
- Kartenansicht mit Mapbox folgt, sobald `NEXT_PUBLIC_MAPBOX_TOKEN` gesetzt ist; bis dahin Link zu OpenStreetMap
  (öffnet erst auf Klick, keine eingebundenen Drittdienste).

## Datenschutz – offen / mit der Geschäftsführung zu klären

- Der Standort während der Fahrt ist ein personenbezogenes Datum des Fahrers (Beschäftigtendaten, § 26 BDSG /
  Art. 88 DSGVO). Fahrer vorab schriftlich informieren; falls ein Betriebsrat besteht: Mitbestimmung (§ 87 Abs. 1 Nr. 6 BetrVG).
- Zweck: Fahrgastinformation und Disposition während der Fahrt; keine Leistungs- oder Verhaltenskontrolle.
- **Aufbewahrung:** Vorschlag 30 Tage, danach löschen bzw. anonymisieren. Eine automatische Löschung ist noch nicht
  eingerichtet (bewusst – Löschregeln erst nach Freigabe).
- Datenschutzerklärung (Fahrgäste) um „Live-Standort der gebuchten Fahrt“ ergänzen.

## Tests

- DB: Fahrzeug zu klein, fremder Fahrer, vor Start, falscher Zeitstempel, Drosselung, unbezahlt/falscher Token,
  „veraltet“ nach 10 Minuten, beendete Fahrt (`tests/db/live.test.ts`).
- E2E (Handy-Profil): Fahrer meldet sich an, startet, Telefon sendet (simulierter GPS-Standort des Test-Browsers),
  Fahrgast sieht „unterwegs“ mit Entfernung, falscher Token sieht nichts, Leitstelle zeigt „live“, Fahrt beenden
  (`tests/e2e/live.spec.ts`).
