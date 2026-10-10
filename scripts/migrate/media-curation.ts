/**
 * Editorial notes for photos from the old site, keyed by their original file name.
 * Alt texts describe what is visible – no claims about hotels, services or places that are not certain.
 * `exclude` keeps a file out entirely (visible third-party watermark or signature).
 */
export const MEDIA_NOTES: Record<string, { alt?: string; exclude?: string; hero?: true }> = {
  // Lloret de Mar
  "hero-1774093493528-8dc31bf3.jpg": { exclude: "Fotografen-Signatur im Bild – Fremdrechte" },
  "gallery-1774093660318-44819549.jpg": { alt: "Palmengesäumte Strandpromenade an der Costa Brava bei blauem Himmel", hero: true },
  "gallery-1774093466142-467cbe37.jpg": { alt: "Zwei Reisende formen Herzen vor dem Schriftzug „I love Lloret“" },
  "gallery-1774093593609-8500e545.jpg": { alt: "Abendstimmung mit Palmen und Menschen an der Strandpromenade bei Sonnenuntergang" },
  // Nizza
  "hero-1774094935696-71a5e350.jpg": { alt: "Blick über die Baie des Anges und die Promenade des Anglais in Nizza" },
  "preview-1774094948411-9d0b1e34.jpg": { alt: "Gelber Schriftzug „NICE“ unter Palmen am Meer" },
  "gallery-1774094955544-5f01d8ce.jpg": { alt: "Promenade des Anglais mit Palmen bei Sonnenuntergang" },
  "gallery-1774094958306-be5102c2.jpg": { alt: "Place Masséna in Nizza mit Apollo-Brunnen und roten Fassaden" },
  "gallery-1774094960985-154e2e83.jpg": { alt: "Belebte Altstadtgasse mit Palmen, im Hintergrund das Meer" },
  // Novalja (Pag)
  "preview-1774093761204-6292c58b.jpg": { alt: "Schwimmende Bar mit weißen Sonnensegeln in türkisem Wasser" },
  "gallery-1774093799057-d17d881c.jpg": { alt: "Holzschild „Zrće“ am Strand mit Sonnenschirmen" },
  "gallery-1774094147734-8d90f947.jpg": { alt: "Gut besuchter Kiesstrand mit klarem Wasser und Sonnenschirmen" },
  "gallery-1774094025933-31dc3aea.jpg": { alt: "Strandparty am Abend unter bunten Lampions" },
  // Sanremo – the harbour picture shows Menton (France), not Sanremo
  "gallery-1774092449010-f50a44a4.jpg": { alt: "Gepflasterte Uferpromenade mit Palmen im Abendlicht" },
  "gallery-1774092452944-21e43782.jpg": { alt: "Palmen an einer Uferstraße an der Riviera" },
  "gallery-1774092456947-0486c78e.jpg": { exclude: "zeigt Menton (Frankreich), nicht Sanremo – irreführend" },
  // Paris
  "hero-1789389555117-7a9b8f60.jpeg": { alt: "Eiffelturm bei Sonnenuntergang, davor ein Ausflugsschiff auf der Seine" },
  "preview-1789389668415-50a2ea9e.jpg": { alt: "Beleuchtete Glaspyramide vor dem Louvre am Abend" },
  "gallery-1789389698957-039a5d0d.jpg": { alt: "Ausflugsschiff auf der Seine in der Abenddämmerung" },
  "hero-1775038262888.jpg": { alt: "Eiffelturm in der Abendsonne über der Seine" },
  // Weekend trips
  "hero-1775038362770.jpg": { alt: "Amsterdamer Gracht mit Hausbooten in der Dämmerung" },
  "hero-1775038412645.jpg": { exclude: "Wasserzeichen eines Fotografen im Bild – Fremdrechte" },
  "preview-1775038414370.jpg": { exclude: "Wasserzeichen eines Fotografen im Bild – Fremdrechte" },
  "hero-1775038325613.jpg": { alt: "Prager Altstadt und Karlsbrücke an der Moldau bei Sonnenuntergang" },
};
