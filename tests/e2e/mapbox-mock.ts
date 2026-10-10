import type { Page } from "@playwright/test";

/** Answers every Mapbox request locally: no real key, no traffic to Mapbox, deterministic routes. */
export async function mockMapbox(page: Page) {
  const calls = { directions: [] as string[] };
  await page.route(/api\.mapbox\.com\/styles\/v1\//, (r) =>
    r.fulfill({
      json: { version: 8, sources: {}, glyphs: "https://api.mapbox.com/fonts/v1/mapbox/{fontstack}/{range}.pbf", layers: [{ id: "bg", type: "background", paint: { "background-color": "#eef0ec" } }] },
    }),
  );
  await page.route(/api\.mapbox\.com\/fonts\//, (r) => r.fulfill({ status: 200, body: Buffer.alloc(0), contentType: "application/x-protobuf" }));
  await page.route(/api\.mapbox\.com\/map-sessions\//, (r) => r.fulfill({ status: 204, body: "" }));
  await page.route(/events\.mapbox\.com/, (r) => r.fulfill({ status: 204, body: "" }));
  await page.route(/api\.mapbox\.com\/directions\//, (r) => {
    const url = r.request().url();
    calls.directions.push(url);
    const m = url.match(/\/(-?[\d.]+),(-?[\d.]+);(-?[\d.]+),(-?[\d.]+)/)!;
    const [a, b, c, d] = m.slice(1).map(Number) as [number, number, number, number];
    return r.fulfill({ json: { code: "Ok", routes: [{ distance: 1234, duration: 960, geometry: { type: "LineString", coordinates: [[a, b], [c, d]] } }] } });
  });
  return calls;
}
