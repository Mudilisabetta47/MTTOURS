# Destination Explorer („Entdecke dein Reiseziel.“)

Ersatz und Ausbau des alten Lovable-Bereichs „Was ist in der Umgebung?“ auf den Reiseseiten.

## Was der Besucher sieht

- Abschnitt **Umgebung** in der Reiseseite (Tab „Umgebung“, Sprungmarke `#umgebung`).
- **Unsere Highlights vor Ort**: 3–5 redaktionell markierte Orte als Karten.
- **Kategorien-Chips** (nur Kategorien mit Orten): Sehenswürdigkeiten, Strände & Natur, Restaurants & Cafés, Shopping & Freizeit, Öffentlicher Verkehr, Flughäfen.
- **Liste** gruppiert nach Kategorie mit semantischen Überschriften („Sehenswürdigkeiten in Nizza“, „Strände und Natur“, „Anreise und Mobilität“ …). Alles ist serverseitig gerendertes HTML – auch ohne Karte und ohne JavaScript lesbar.
- **Interaktive Mapbox-Karte** (rechts, ca. 50 %): lädt **erst nach Klick** auf „Interaktive Karte laden“. Eigene Marker je Kategorie (weiß/grün), ausgewählter Marker größer in Metropol-Grün, Popup, Clustering, Zoom per Strg/⌘ + Scrollen bzw. zwei Fingern (blockiert das Scrollen der Seite nicht).
- **Route** zu einem Ort (zu Fuß / Fahrrad / Auto – nur sinnvolle Modi je Entfernung) über das Mapbox-Routing; ÖPNV wird nicht angeboten (keine verlässliche Datenquelle).
- **Mobil**: Chips + Liste; Button „Karte ansehen“ öffnet eine Vollbild-Karte mit Detailkarte unten und „← Zur Liste“.
- **Fehlerzustände**: kein Token → „Interaktive Karte noch nicht eingerichtet“; Mapbox nicht erreichbar → „Die interaktive Karte ist gerade nicht verfügbar.“; keine Orte → Hinweis „Der Ortsführer … entsteht gerade.“ Es gibt nie Beispieldaten.

## Entfernungen

| Angabe | Quelle | Kennzeichnung |
|---|---|---|
| Entfernung in der Liste, Popup, Highlights | Großkreisdistanz (Haversine), serverseitig | immer „Luftlinie ab *Bezugspunkt*“ |
| Weg zu Fuß / Fahrrad / Auto | Mapbox Directions API, nur auf Klick | „Zu Fuß: 1,2 km · ca. 16 Min. (Mapbox-Routing ab …)“ |

**Bezugspunkt**: die Unterkunft nur, wenn sie an der Reise mit Namen **und** Koordinaten hinterlegt ist; sonst der redaktionell benannte Referenzpunkt der Destination (z. B. „Stadtzentrum (Place Masséna)“). Die Liste sagt ausdrücklich „die Unterkunft steht noch nicht fest“. Die alten Lovable-Werte (300 m, 700 m …) wurden **nicht** übernommen.

Rundung: unter 1 km auf 50 m, unter 10 km auf 0,1 km, darüber auf ganze km. Lange Objekte (Promenade, Einkaufsstraße) stehen am nächstgelegenen Punkt der Linie zum Bezugspunkt.

## Mapbox-APIs

| API | Verwendung | Token |
|---|---|---|
| Mapbox GL JS 3.31.0 (`mapbox-gl`) | Karte, Stil `mapbox/light-v11`, Marker als Symbol-Layer, Clustering über GeoJSON-Quelle | öffentlich (`pk.`) |
| Directions API v5 (`walking`, `cycling`, `driving`) | Route auf Klick, `geometries=geojson` | öffentlich (`pk.`) |
| Search Box API | **nicht** für veröffentlichte Orte verwendet – Ergebnisse dürfen laut Mapbox nur temporär genutzt werden („only available for temporary use“, dauerhafte Speicherung nur nach Absprache mit Mapbox). | – |

Geprüfte Orte stammen deshalb aus **OpenStreetMap** (Nominatim-Abgleich, ODbL – speicherbar mit Namensnennung „© OpenStreetMap-Mitwirkende“) oder sind redaktionell eingetragen.

## Umgebungsvariablen

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.…   # öffentliches Token, Scopes: styles:read, styles:tiles, fonts:read
```

- Im Mapbox-Konto auf die Website-URLs beschränken (URL restrictions).
- Kein `sk.`-Token im Client; der Code akzeptiert nur Werte mit `pk.`.
- Ohne Token bleibt alles außer Karte/Route voll funktionsfähig.

## Datenmodell (Prisma)

- `Destination` – Name, Land, Region, Stadt, Mittelpunkt, **Referenzpunkt** (Bezeichnung + Koordinaten), Einleitung, Start-Zoom, SEO, Status.
- `DestinationPoi` – Name, Kategorie (`PoiCategory`), Beschreibung, Koordinaten, Adresse, **Quelle** (`osm:way/…` | `editorial`), Namensnennung, **Prüfstatus** (`DRAFT` / `VERIFIED` / `REJECTED`, wer/wann), sichtbar, Highlight + Highlight-Text, optionales Foto (`MediaAsset`, Rechte-Flag gilt), Sortierung.
- `Trip.guideId` → Destination (eine Reise, ein Ortsführer).
- Fotos über das vorhandene `MediaAsset`; keine neue Medientabelle.

Öffentlich erscheinen nur Orte mit `isActive = true` **und** `review = VERIFIED` einer veröffentlichten Destination.

## Pflege (Admin → Reisen → Destinationen)

- Übersicht aller Destinationen mit Anzahl öffentlicher / zu prüfender Orte und zugeordneten Reisen.
- Pro Destination: Stammdaten, Referenzpunkt, SEO, Status; Vorschau exakt wie auf der Reiseseite; Orte je Kategorie mit Quelle (Link zu OpenStreetMap), Prüfstatus, Freigeben/Ablehnen, Bearbeiten (Kategorie, Text, Koordinaten, Sortierung, sichtbar, Highlight).
- **Ort hinzufügen**: Name + optional Suchbegriff → Abgleich mit OpenStreetMap im Umkreis → wird als „zu prüfen“ angelegt, erst nach Freigabe öffentlich.
- Wird ein Marker manuell verschoben, gilt die Position als redaktionell geprüft („manuell: Name“).
- Jede Änderung steht im Protokoll (Audit-Log). Rechte: `cms.read` / `cms.write`.

Startbestand: `npx tsx scripts/migrate/seed-destinations.ts` (nur *_dev/*_test-Datenbanken; Liste in `scripts/migrate/destination-curation.ts`). Ergebnis am 10.10.2026: Nizza 14, Lloret de Mar 11, Kopenhagen 12 geprüfte Orte, Prag ohne Orte. Zwei Fehltreffer wurden durch die Namensprüfung verhindert (ein Geschäft „Astralis Flagship Store Tivoli“ statt Tivoli; „Strøget“ als Einzelpunkt – entfernt).

## Datenschutz & Lizenz – offen / zu klären

1. **Einwilligung**: Die Karte lädt erst nach Klick. Beim Laden überträgt der Browser u. a. IP-Adresse, User-Agent und Token an Mapbox Inc. (USA); Mapbox GL sendet ein Kartenlade-Ereignis an `events.mapbox.com` und eine Sitzung an `api.mapbox.com/map-sessions` (Abrechnung). Leistungsmetriken sind abgeschaltet (`performanceMetricsCollection: false`). Die Wahl wird nur im Browser gemerkt (`localStorage`, Schlüssel `mt-map-consent`).
2. **Datenschutzerklärung** (liegt noch auf der alten Seite): Abschnitt zu Mapbox ergänzen (Zweck, Rechtsgrundlage Einwilligung Art. 6 Abs. 1 lit. a DSGVO / § 25 TDDDG, Drittlandübermittlung USA – prüfen, ob Mapbox unter dem EU-US Data Privacy Framework zertifiziert ist, sonst Standardvertragsklauseln), Widerruf.
3. **AVV / DPA** mit Mapbox abschließen (im Mapbox-Konto verfügbar) – durch die Geschäftsführung.
4. **Kosten**: Abrechnung je Kartenladung und je Routenanfrage; Freikontingente laut aktueller Mapbox-Preisliste prüfen. Die Einwilligungsschranke reduziert Kartenladungen deutlich.
5. **OpenStreetMap**: Namensnennung steht unter der Liste; Nominatim nur für die Redaktion (max. 1 Anfrage/s, kein Massenabruf).
6. **Fotos** für Highlights: nur mit geklärten Rechten (gleiche Regel wie Reisefotos).

## Tests

- Unit: Luftlinie, Rundung, Dauer (`tests/unit/destinations.test.ts`).
- DB: OSM-Abgleich nur im Umkreis, Entwurf → Freigabe, manuelle Korrektur, Hotel als Bezugspunkt, Audit (`tests/db/destinations.test.ts`).
- E2E (Desktop 1440 + Mobil 390, Mapbox-Antworten simuliert): SEO-HTML ohne Karte, keine ungeprüften/ausgeblendeten Orte, keine Mapbox-Anfrage vor Einwilligung, Filter, Karte initialisiert, Liste ↔ Marker/Popup, Route mit korrektem Start/Ziel und Profil, Beschriftung „Luftlinie“, Vollbild mobil, kein Overflow, keine JS-Fehler, Destination ohne Orte (`tests/e2e/explorer.spec.ts`).
- Nicht getestet: echte Mapbox-Kacheln/Stile und echte Routen (kein Token vorhanden).
