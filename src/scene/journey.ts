/**
 * Signature Bus Journey — a side-on travelling shot rendered in Canvas 2D.
 * Every frame is a pure function of progress p ∈ [0, 1] (HANDOVER §6/§7):
 * scrolling back shows exactly the same frames, stopping freezes the picture.
 *
 * Acts
 *   01 Start      0.00–0.12  coach waits at Hannover ZOB, dusk
 *   02 Abfahrt    0.12–0.24  lights on, camera pulls back, coach pulls away
 *   03 Straße     0.24–0.40  out of the city, motorway lights at night
 *   04 Unterwegs  0.40–0.56  north German plain, wind turbines, first light
 *   05 Europa     0.56–0.74  Alps at sunrise
 *   06 Reiseziel  0.74–0.90  Mediterranean coast, arrival in Nice
 *   07 Metropol   0.90–1.00  coach at rest, hand-over to trip selection
 */

import { sceneFont } from "./font";

import { COACH_LENGTH, paintCoach } from "./coach";
import { hex, mix, mulberry32, noise1, ramp, rgba, type RGB } from "./color";

export const ACTS = [
  { id: "01", from: 0.0, to: 0.12 },
  { id: "02", from: 0.12, to: 0.24 },
  { id: "03", from: 0.24, to: 0.4 },
  { id: "04", from: 0.4, to: 0.56 },
  { id: "05", from: 0.56, to: 0.74 },
  { id: "06", from: 0.74, to: 0.9 },
  { id: "07", from: 0.9, to: 1.0 },
] as const;

export interface FilmHandle {
  setProgress(p: number): void;
  setActive(active: boolean): void;
  resize(): void;
  destroy(): void;
}

const WORLD = 2600; // metres of "film road"
const sstep = (a: number, b: number, t: number) => {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

// ── distance from an integrated speed profile (stand → accelerate → cruise → brake → stand)
function speedAt(p: number): number {
  if (p < 0.13) return 0;
  if (p < 0.26) return sstep(0.13, 0.26, p);
  if (p < 0.82) return 1;
  if (p < 0.9) return 1 - sstep(0.82, 0.9, p);
  return 0;
}
const N = 800;
const DIST: number[] = (() => {
  const t = [0];
  let acc = 0;
  for (let i = 1; i <= N; i++) {
    const a = speedAt((i - 1) / N);
    const b = speedAt(i / N);
    acc += (a + b) / 2;
    t.push(acc);
  }
  return t.map((v) => (v / acc) * WORLD);
})();
function distanceAt(p: number): number {
  const f = Math.min(1, Math.max(0, p)) * N;
  const i = Math.floor(f);
  const a = DIST[i] ?? WORLD;
  const b = DIST[Math.min(N, i + 1)] ?? WORLD;
  return a + (b - a) * (f - i);
}

// ── regions along the road (by fraction of WORLD)
type Region = "city" | "motorway" | "plain" | "alps" | "coast";
const REGIONS: { r: Region; from: number; to: number }[] = [
  { r: "city", from: -1, to: 0.06 },
  { r: "motorway", from: 0.06, to: 0.3 },
  { r: "plain", from: 0.3, to: 0.52 },
  { r: "alps", from: 0.52, to: 0.78 },
  { r: "coast", from: 0.78, to: 2 },
];
function regionAt(f: number): Region {
  return (REGIONS.find((x) => f >= x.from && f < x.to) ?? REGIONS[REGIONS.length - 1]!).r;
}
/** soft weight of a region at fraction f (cross-fade width w) */
function weight(region: Region, f: number, w = 0.035): number {
  const def = REGIONS.find((x) => x.r === region)!;
  return sstep(def.from - w, def.from + w, f) * (1 - sstep(def.to - w, def.to + w, f));
}

// ── time of day
const SKY_TOP: [number, RGB][] = [
  [0.0, hex("#1d2348")],
  [0.2, hex("#0b1433")],
  [0.36, hex("#04070f")],
  [0.5, hex("#141c3c")],
  [0.6, hex("#3c5f9e")],
  [0.72, hex("#2c78cc")],
  [1.0, hex("#2f86da")],
];
const SKY_HORIZON: [number, RGB][] = [
  [0.0, hex("#f2884a")],
  [0.2, hex("#39467d")],
  [0.36, hex("#101d3d")],
  [0.5, hex("#b85f6e")],
  [0.6, hex("#ffbe86")],
  [0.72, hex("#bfe2ff")],
  [1.0, hex("#ffe4b0")],
];
function nightAt(p: number): number {
  // 0 = day, 1 = deep night
  if (p < 0.2) return 0.35 + 0.45 * sstep(0, 0.2, p);
  if (p < 0.42) return 0.8 + 0.2 * sstep(0.2, 0.36, p);
  return 1 - sstep(0.42, 0.66, p);
}

interface Layout {
  W: number;
  H: number;
  horizon: number;
  ground: number;
  s: number;
}

export function createJourneyFilm(canvas: HTMLCanvasElement, opts: { maxDpr: number; small: boolean }): FilmHandle {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D not available");
  let L: Layout = { W: 1, H: 1, horizon: 0, ground: 0, s: 1 };
  let progress = 0;
  let active = true;
  let dirty = true;
  let raf = 0;

  const stars = (() => {
    const r = mulberry32(7);
    return Array.from({ length: 140 }, () => ({ x: r(), y: r() * 0.55, a: 0.3 + r() * 0.7, s: r() < 0.1 ? 1.6 : 1 }));
  })();

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const W = Math.max(1, Math.round(rect.width));
    const H = Math.max(1, Math.round(rect.height));
    const area = W * H;
    const budget = opts.small ? 2_000_000 : area > 2_400_000 ? 2_300_000 : 3_200_000;
    const dpr = Math.max(0.75, Math.min(window.devicePixelRatio || 1, opts.maxDpr, Math.sqrt(budget / area)));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    const portrait = H > W * 1.1;
    const s = Math.min(H * (portrait ? 0.034 : 0.05), (W * (portrait ? 0.92 : 0.6)) / COACH_LENGTH);
    L = { W, H, horizon: H * (portrait ? 0.56 : 0.6), ground: H * (portrait ? 0.74 : 0.8), s };
    dirty = true;
    schedule();
  }

  function schedule() {
    if (!raf && active) raf = requestAnimationFrame(draw);
  }

  function draw() {
    raf = 0;
    if (!dirty) return;
    dirty = false;
    render(ctx!, L, progress, stars);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  return {
    setProgress(p) {
      if (p === progress) return;
      progress = p;
      dirty = true;
      schedule();
    },
    setActive(v) {
      active = v;
      if (v) schedule();
    },
    resize,
    destroy() {
      ro.disconnect();
      cancelAnimationFrame(raf);
    },
  };
}

// ── rendering ────────────────────────────────────────────────────────────────

function render(ctx: CanvasRenderingContext2D, L: Layout, p: number, stars: { x: number; y: number; a: number; s: number }[]) {
  const { W, H, horizon, ground } = L;
  const night = nightAt(p);
  const dist = distanceAt(p);
  const f = dist / WORLD; // road fraction under the coach

  // camera: closer at the depot, wider over the Alps, settles at arrival
  const zoom = 1.18 - 0.18 * sstep(0.1, 0.3, p) - 0.1 * sstep(0.5, 0.66, p) + 0.12 * sstep(0.84, 0.97, p);
  const s = L.s * zoom;
  const portrait = H > W * 1.1;
  const busCenterX = portrait
    ? W * (0.5 - 0.04 * sstep(0.12, 0.3, p))
    : W * (0.64 - 0.05 * sstep(0.12, 0.3, p) + 0.03 * sstep(0.86, 0.98, p));
  const camX = dist + COACH_LENGTH / 2; // world x at busCenterX

  // 0 — clear the whole frame. Layers end on fractional pixel rows; without this, anti-aliased edge rows
  //     would keep traces of the previous frame and the picture would depend on scroll history.
  ctx.fillStyle = "#030507";
  ctx.fillRect(0, 0, W, H);

  // 1 — sky
  const top = ramp(SKY_TOP, p);
  const hor = ramp(SKY_HORIZON, p);
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, rgba(top));
  sky.addColorStop(0.75, rgba(mix(top, hor, 0.65)));
  sky.addColorStop(1, rgba(hor));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, horizon + 2);

  // stars
  const starA = Math.max(0, (night - 0.55) / 0.45);
  if (starA > 0.01) {
    ctx.fillStyle = "#fff";
    for (const st of stars) {
      ctx.globalAlpha = st.a * starA;
      ctx.fillRect((st.x * W - camX * 0.02 * s) % W < 0 ? ((st.x * W - camX * 0.02 * s) % W) + W : (st.x * W - camX * 0.02 * s) % W, st.y * horizon, st.s, st.s);
    }
    ctx.globalAlpha = 1;
  }

  // sun / moon
  const sunUp = sstep(0.52, 0.66, p);
  if (sunUp > 0) {
    const sy = horizon - (horizon * 0.55) * sunUp + horizon * 0.08;
    const sx = W * (0.78 - 0.1 * p);
    const r = Math.min(W, H) * 0.06;
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 5);
    sg.addColorStop(0, `rgba(255,240,200,${0.9 * sunUp})`);
    sg.addColorStop(0.2, `rgba(255,214,150,${0.35 * sunUp})`);
    sg.addColorStop(1, "rgba(255,200,140,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(sx - r * 5, sy - r * 5, r * 10, r * 10);
  }
  const moonA = Math.max(0, Math.min(1, (night - 0.6) / 0.3));
  if (moonA > 0) {
    ctx.fillStyle = `rgba(235,238,245,${0.85 * moonA})`;
    ctx.beginPath();
    ctx.arc(W * 0.84, horizon * 0.42, Math.min(W, H) * 0.02, 0, Math.PI * 2);
    ctx.fill();
  }

  const dark = (c: RGB, k = 1) => mix(c, hex("#05070f"), Math.min(0.88, night * 0.82 * k));
  const haze = (c: RGB, k: number) => mix(c, hor, k);

  // 2 — far ridge (factor 0.06). It barely moves, so its character follows the journey (f), not its own
  //     coordinate: flat in the north, a full Alpine range during act 05, headlands at the coast.
  {
    const factor = 0.06;
    const sf = s * 0.11;
    const wAlps = weight("alps", f, 0.07);
    const wCoast = weight("coast", f, 0.06);
    const wCity = weight("city", f, 0.05);
    const ridge = new Path2D();
    ridge.moveTo(0, horizon + 2);
    for (let x = 0; x <= W + 8; x += 6) {
      const u = camX * factor + (x - busCenterX) / sf;
      const h =
        4 +
        noise1(u / 60, 1) * 3 +
        wAlps * (30 + noise1(u / 22, 2) * 20 + Math.abs(noise1(u / 7, 3)) * 12) +
        wCoast * (12 + noise1(u / 34, 4) * 8) +
        wCity * Math.max(0, noise1(u / 4, 5)) * 5;
      ridge.lineTo(x, horizon - h * sf);
    }
    ridge.lineTo(W + 8, horizon + 2);
    ridge.closePath();
    // aerial perspective: peaks crisper, bases dissolve into the haze
    const rg = ctx.createLinearGradient(0, horizon - 70 * sf, 0, horizon);
    rg.addColorStop(0, rgba(dark(haze(hex("#56657f"), 0.3), 0.9)));
    rg.addColorStop(1, rgba(dark(haze(hex("#56657f"), 0.75), 0.9)));
    ctx.fillStyle = rg;
    ctx.fill(ridge);

    if (wAlps > 0.02) {
      // snow above an irregular snow line: the same ridge, clipped
      ctx.save();
      const snow = new Path2D();
      snow.moveTo(0, 0);
      for (let x = 0; x <= W + 8; x += 10) {
        const u = camX * factor + (x - busCenterX) / sf;
        snow.lineTo(x, horizon - (36 + noise1(u / 5, 9) * 5 + noise1(u / 1.7, 10) * 2) * sf);
      }
      snow.lineTo(W + 8, 0);
      snow.closePath();
      ctx.clip(snow);
      ctx.fillStyle = rgba(dark(mix(hex("#f4f7fb"), hor, 0.12), 0.7), 0.92 * wAlps);
      ctx.fill(ridge);
      ctx.restore();
    }
  }

  // 2b — nearer foothills (factor 0.14), darker, for depth in the Alps and at the coast
  {
    const wHills = Math.max(weight("alps", f, 0.07), weight("coast", f, 0.06) * 0.6, weight("plain", f, 0.06) * 0.25);
    if (wHills > 0.02) {
      const factor = 0.14;
      const sf = s * 0.16;
      ctx.fillStyle = rgba(dark(haze(hex("#3d4f4a"), 0.25), 0.95), wHills);
      ctx.beginPath();
      ctx.moveTo(0, horizon + 2);
      for (let x = 0; x <= W + 8; x += 8) {
        const u = camX * factor + (x - busCenterX) / sf;
        const h = (6 + noise1(u / 18, 11) * 6 + Math.abs(noise1(u / 6, 12)) * 4) * wHills;
        ctx.lineTo(x, horizon - h * sf);
      }
      ctx.lineTo(W + 8, horizon + 2);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 3 — sea (coast) between horizon and ground
  const seaW = weight("coast", f, 0.05);
  // 4 — mid layer (factor 0.32): skyline / trees / turbines / pines / town on the hill
  const midTop = horizon;
  const midBase = ground - (ground - horizon) * 0.35;
  {
    const landCol = dark(
      mix(mix(hex("#3f5a3a"), hex("#4f5f45"), weight("alps", f)), hex("#7d7a52"), weight("coast", f)),
      1,
    );
    ctx.fillStyle = rgba(landCol);
    ctx.fillRect(0, midTop, W, ground - midTop);
    if (seaW > 0.01) {
      const seaTop = horizon;
      const seaG = ctx.createLinearGradient(0, seaTop, 0, midBase);
      seaG.addColorStop(0, rgba(dark(mix(hex("#2f7fbf"), hor, 0.35)), seaW));
      seaG.addColorStop(1, rgba(dark(hex("#11507f")), seaW));
      ctx.fillStyle = seaG;
      ctx.fillRect(0, seaTop, W, midBase - seaTop);
      // glints (scroll-driven, deterministic)
      ctx.fillStyle = `rgba(255,240,210,${0.35 * seaW})`;
      const rnd = mulberry32(99);
      for (let i = 0; i < 70; i++) {
        const gx = (rnd() * W * 1.4 - (camX * 0.15 * s) % (W * 1.4) + W * 1.4) % (W * 1.4);
        const gy = seaTop + rnd() * (midBase - seaTop);
        ctx.fillRect(gx, gy, 6 + rnd() * 16, 1);
      }
    }
  }

  paintMidObjects(ctx, L, camX, busCenterX, s, night, dark, p);

  // 5 — road
  const roadTop = ground - 1.0 * s;
  const roadBottom = ground + 1.2 * s;
  ctx.fillStyle = rgba(dark(mix(hex("#3b3f44"), hex("#585a58"), seaW * 0.3), 0.8));
  ctx.fillRect(0, roadTop, W, roadBottom - roadTop);
  ctx.fillStyle = rgba(dark(hex("#8a8f94"), 0.9), 0.9);
  ctx.fillRect(0, roadTop - 0.06 * s, W, 0.06 * s);
  // lane dashes
  ctx.fillStyle = rgba(dark(hex("#e9e6dc"), 0.6));
  const dashLen = 6;
  const gap = 12;
  const period = (dashLen + gap) * s;
  const offset = ((camX * s) % period + period) % period;
  for (let x = -offset; x < W; x += period) ctx.fillRect(x, ground + 0.45 * s, dashLen * s, 0.12 * s);

  // 6 — near objects (factor 1): ZOB canopy, lamps, guard rail, palms, destination sign
  paintNearObjects(ctx, L, camX, busCenterX, s, night, dark, p);

  // 7 — the coach
  const moving = speedAt(p) > 0.01;
  paintCoach(ctx, busCenterX - (COACH_LENGTH / 2) * s, ground, s, {
    wheelAngle: dist / 0.52,
    lights: sstep(0.13, 0.17, p) * (0.35 + 0.65 * night) + (p >= 0.9 ? -sstep(0.94, 0.99, p) * 0.5 : 0),
    interior: Math.max(0, night - 0.15) * (p < 0.12 ? 1 : 1),
    night,
    bounce: moving ? Math.sin(dist * 0.9) * 0.012 + Math.sin(dist * 0.37) * 0.008 : 0,
    glint: (dist / 40) % 1,
    brake: sstep(0.83, 0.86, p) * (1 - sstep(0.9, 0.93, p)),
  });

  // 8 — foreground (factor 1.35): roadside verge / sea wall
  {
    const fgTop = roadBottom;
    const col = dark(mix(mix(hex("#2b3a26"), hex("#c7b98f"), seaW), hex("#3a3d3a"), weight("city", f)), 1.05);
    ctx.fillStyle = rgba(col);
    ctx.fillRect(0, fgTop, W, H - fgTop);
    const rnd = mulberry32(31);
    ctx.fillStyle = rgba(mix(col, hex("#000000"), 0.35));
    const period2 = 2.2 * s * 1.35;
    const off2 = ((camX * s * 1.35) % period2 + period2) % period2;
    for (let x = -off2, i = 0; x < W; x += period2, i++) {
      const h = (0.25 + rnd() * 0.5) * s;
      ctx.fillRect(x, fgTop, 0.06 * s, h);
    }
  }

  // 9 — grading: vignette + bottom fade for typography
  const vg = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.3, W / 2, H * 0.55, Math.max(W, H) * 0.8);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  const bf = ctx.createLinearGradient(0, H * 0.62, 0, H);
  bf.addColorStop(0, "rgba(3,5,7,0)");
  bf.addColorStop(1, "rgba(3,5,7,0.82)");
  ctx.fillStyle = bf;
  ctx.fillRect(0, H * 0.62, W, H * 0.38);
}

type Darken = (c: RGB, k?: number) => RGB;

/** Iterate procedural objects of a layer in fixed-size chunks (deterministic per chunk). */
function forChunks(
  camX: number,
  factor: number,
  sf: number,
  busCenterX: number,
  W: number,
  chunk: number,
  fn: (u0: number, rnd: () => number, toScreen: (u: number) => number) => void,
) {
  const uCenter = camX * factor;
  const half = (W / sf) * 0.75 + chunk;
  const first = Math.floor((uCenter - half) / chunk);
  const last = Math.ceil((uCenter + half) / chunk);
  const toScreen = (u: number) => busCenterX + (u - uCenter) * sf;
  for (let c = first; c <= last; c++) fn(c * chunk, mulberry32(c * 7919 + Math.round(factor * 1000)), toScreen);
}

function paintMidObjects(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  camX: number,
  busCenterX: number,
  s: number,
  night: number,
  dark: Darken,
  p: number,
) {
  const factor = 0.32;
  const sf = s * 0.2;
  const base = L.ground - (L.ground - L.horizon) * 0.32;
  forChunks(camX, factor, sf, busCenterX, L.W, 60, (u0, rnd, toScreen) => {
    const region = regionAt(u0 / factor / WORLD);
    if (region === "city") {
      // skyline incl. a domed town hall silhouette, lit windows at dusk
      for (let i = 0; i < 4; i++) {
        const u = u0 + i * 15 + rnd() * 4;
        const w = (5 + rnd() * 7) * sf;
        const h = (8 + rnd() * 22) * sf;
        const x = toScreen(u);
        ctx.fillStyle = rgba(dark(hex("#3a4152"), 0.95));
        ctx.fillRect(x, base - h, w, h);
        ctx.fillStyle = `rgba(255,205,130,${0.55 * night})`;
        for (let wy = base - h + 2 * sf; wy < base - 2 * sf; wy += 2.6 * sf)
          for (let wx = x + 1 * sf; wx < x + w - 1 * sf; wx += 2.2 * sf) if (rnd() < 0.35) ctx.fillRect(wx, wy, 0.8 * sf, 1.1 * sf);
      }
      if (u0 === 0) {
        const x = toScreen(u0 + 18);
        ctx.fillStyle = rgba(dark(hex("#4a5163"), 0.95));
        ctx.fillRect(x, base - 26 * sf, 14 * sf, 26 * sf);
        ctx.beginPath();
        ctx.arc(x + 7 * sf, base - 26 * sf, 5 * sf, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(x + 6.6 * sf, base - 35 * sf, 0.8 * sf, 4 * sf);
      }
    } else if (region === "motorway" || region === "plain") {
      // tree lines and, on the plain, wind turbines turning with the scroll
      ctx.fillStyle = rgba(dark(hex("#2f4a2e"), 1));
      for (let i = 0; i < 5; i++) {
        const x = toScreen(u0 + rnd() * 60);
        const r = (2 + rnd() * 2.5) * sf;
        ctx.beginPath();
        ctx.arc(x, base - r * 0.8, r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (region === "plain" && rnd() < 0.7) {
        const x = toScreen(u0 + 20);
        const h = (26 + rnd() * 10) * sf;
        ctx.strokeStyle = rgba(dark(hex("#e8ecef"), 0.85));
        ctx.lineWidth = Math.max(1, 0.5 * sf);
        ctx.beginPath();
        ctx.moveTo(x, base);
        ctx.lineTo(x, base - h);
        ctx.stroke();
        const rot = camX * 0.02 + rnd() * 6;
        for (let k = 0; k < 3; k++) {
          const a = rot + (k * Math.PI * 2) / 3;
          ctx.beginPath();
          ctx.moveTo(x, base - h);
          ctx.lineTo(x + Math.cos(a) * 12 * sf, base - h + Math.sin(a) * 12 * sf);
          ctx.stroke();
        }
        if (night > 0.5) {
          ctx.fillStyle = `rgba(255,40,40,${0.8 * night})`;
          ctx.fillRect(x - 0.6 * sf, base - h - 0.8 * sf, 1.2 * sf, 1.2 * sf);
        }
      }
    } else if (region === "alps") {
      ctx.fillStyle = rgba(dark(hex("#26402f"), 1));
      for (let i = 0; i < 7; i++) {
        const x = toScreen(u0 + rnd() * 60);
        const h = (5 + rnd() * 6) * sf;
        ctx.beginPath();
        ctx.moveTo(x - h * 0.35, base);
        ctx.lineTo(x, base - h);
        ctx.lineTo(x + h * 0.35, base);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // coast: pastel old-town houses on the hill near the destination
      if (u0 / factor / WORLD > 0.9) {
        for (let i = 0; i < 8; i++) {
          const x = toScreen(u0 + i * 7.2);
          const h = (4 + rnd() * 6) * sf;
          const pastel = [hex("#e8b48a"), hex("#f0d29a"), hex("#d98f6f"), hex("#efe2c4")][Math.floor(rnd() * 4)]!;
          ctx.fillStyle = rgba(dark(pastel, 0.6));
          ctx.fillRect(x, base - h - 3 * sf, 5.5 * sf, h + 3 * sf);
          ctx.fillStyle = rgba(dark(hex("#b0573c"), 0.6));
          ctx.fillRect(x - 0.3 * sf, base - h - 3.6 * sf, 6.1 * sf, 0.8 * sf);
        }
      }
    }
  });
  void p;
}

function paintNearObjects(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  camX: number,
  busCenterX: number,
  s: number,
  night: number,
  dark: Darken,
  p: number,
) {
  const roadTop = L.ground - 1.0 * s;
  const toScreen = (u: number) => busCenterX + (u - camX) * s;

  // Hannover ZOB: canopy + stop sign around the start position
  const zobX = toScreen(-6);
  if (zobX > -40 * s && zobX < L.W + 10 * s) {
    ctx.fillStyle = rgba(dark(hex("#c9ced3"), 0.8));
    ctx.fillRect(zobX, roadTop - 6.2 * s, 30 * s, 0.35 * s);
    ctx.fillStyle = rgba(dark(hex("#6c737b"), 0.9));
    for (let i = 0; i <= 3; i++) ctx.fillRect(zobX + i * 9.8 * s, roadTop - 6 * s, 0.25 * s, 6 * s);
    if (night > 0.3) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const lg = ctx.createLinearGradient(0, roadTop - 6 * s, 0, roadTop);
      lg.addColorStop(0, `rgba(255,236,200,${0.25 * night})`);
      lg.addColorStop(1, "rgba(255,236,200,0)");
      ctx.fillStyle = lg;
      ctx.fillRect(zobX, roadTop - 5.85 * s, 30 * s, 5.85 * s);
      ctx.restore();
    }
    // stop sign "Hannover ZOB" (green H on yellow per German bus stop sign)
    const sx = zobX + 31.5 * s;
    ctx.fillStyle = rgba(dark(hex("#7b8288"), 0.8));
    ctx.fillRect(sx, roadTop - 3.6 * s, 0.12 * s, 3.6 * s);
    ctx.fillStyle = rgba(dark(hex("#f2c500"), 0.5));
    ctx.beginPath();
    ctx.arc(sx + 0.06 * s, roadTop - 3.7 * s, 0.6 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(dark(hex("#0a7a3a"), 0.5));
    ctx.font = sceneFont(800, Math.max(8, 0.75 * s));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("H", sx + 0.06 * s, roadTop - 3.66 * s);
    ctx.fillStyle = rgba(dark(hex("#ffffff"), 0.5));
    ctx.fillRect(sx - 1.6 * s, roadTop - 2.95 * s, 3.3 * s, 0.7 * s);
    ctx.fillStyle = rgba(dark(hex("#111111"), 0.3));
    ctx.font = sceneFont(700, Math.max(7, 0.42 * s));
    ctx.fillText("Hannover ZOB", sx + 0.05 * s, roadTop - 2.6 * s);
    ctx.textAlign = "start";
  }

  // motorway lamps + guard rail (motorway/plain/alps)
  forChunks(camX, 1, s, busCenterX, L.W, 45, (u0, rnd, toScr) => {
    const region = regionAt(u0 / WORLD);
    const x = toScr(u0);
    if (region === "motorway" || region === "plain" || region === "alps") {
      // guard rail
      ctx.fillStyle = rgba(dark(hex("#a6adb3"), 0.85));
      ctx.fillRect(x, roadTop - 0.75 * s, 45 * s, 0.22 * s);
      for (let k = 0; k < 45; k += 4) ctx.fillRect(toScr(u0 + k), roadTop - 0.75 * s, 0.1 * s, 0.75 * s);
    }
    if (region === "motorway") {
      ctx.fillStyle = rgba(dark(hex("#7d848a"), 0.9));
      ctx.fillRect(x, roadTop - 11 * s, 0.22 * s, 11 * s);
      ctx.fillRect(x, roadTop - 11 * s, 2.2 * s, 0.2 * s);
      const lampOn = Math.max(0, night - 0.25);
      if (lampOn > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const cone = ctx.createLinearGradient(0, roadTop - 10.8 * s, 0, L.ground + s);
        cone.addColorStop(0, `rgba(255,190,110,${0.16 * lampOn})`);
        cone.addColorStop(1, "rgba(255,190,110,0)");
        ctx.fillStyle = cone;
        ctx.beginPath();
        ctx.moveTo(x + 1.6 * s, roadTop - 10.8 * s);
        ctx.lineTo(x + 2.6 * s, roadTop - 10.8 * s);
        ctx.lineTo(x + 7 * s, L.ground + s);
        ctx.lineTo(x - 2.8 * s, L.ground + s);
        ctx.closePath();
        ctx.fill();
        const rg = ctx.createRadialGradient(x + 2.1 * s, roadTop - 10.8 * s, 0, x + 2.1 * s, roadTop - 10.8 * s, 2.4 * s);
        rg.addColorStop(0, `rgba(255,220,160,${0.75 * lampOn})`);
        rg.addColorStop(1, "rgba(255,200,140,0)");
        ctx.fillStyle = rg;
        ctx.fillRect(x - 1 * s, roadTop - 13.5 * s, 6 * s, 6 * s);
        ctx.restore();
      }
    }
    if (region === "coast" && rnd() < 0.8) {
      // palms
      const px = toScr(u0 + rnd() * 30);
      const h = (6 + rnd() * 3) * s;
      ctx.strokeStyle = rgba(dark(hex("#6b5236"), 0.8));
      ctx.lineWidth = Math.max(1, 0.28 * s);
      ctx.beginPath();
      ctx.moveTo(px, roadTop - 0.2 * s);
      ctx.quadraticCurveTo(px + 0.8 * s, roadTop - h / 2, px + 0.4 * s, roadTop - h);
      ctx.stroke();
      ctx.strokeStyle = rgba(dark(hex("#2f6b3a"), 0.8));
      ctx.lineWidth = Math.max(1, 0.32 * s);
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI / 2 + (k - 3) * 0.48;
        ctx.beginPath();
        ctx.moveTo(px + 0.4 * s, roadTop - h);
        ctx.quadraticCurveTo(
          px + 0.4 * s + Math.cos(a) * 2.2 * s,
          roadTop - h + Math.sin(a) * 1.6 * s,
          px + 0.4 * s + Math.cos(a) * 3.4 * s,
          roadTop - h + Math.sin(a) * 1.2 * s + 1.4 * s,
        );
        ctx.stroke();
      }
    }
  });

  // destination sign "Nice / Nizza" ahead of the stopping point
  const signX = toScreen(WORLD + COACH_LENGTH + 8);
  if (signX > -6 * s && signX < L.W + 6 * s) {
    ctx.fillStyle = rgba(dark(hex("#8a9096"), 0.6));
    ctx.fillRect(signX, roadTop - 4.2 * s, 0.14 * s, 4.2 * s);
    ctx.fillRect(signX + 3.1 * s, roadTop - 4.2 * s, 0.14 * s, 4.2 * s);
    ctx.fillStyle = rgba(dark(hex("#ffffff"), 0.4));
    ctx.fillRect(signX - 0.4 * s, roadTop - 5.6 * s, 4.1 * s, 1.7 * s);
    ctx.strokeStyle = rgba(dark(hex("#c8102e"), 0.4));
    ctx.lineWidth = Math.max(1, 0.12 * s);
    ctx.strokeRect(signX - 0.25 * s, roadTop - 5.45 * s, 3.8 * s, 1.4 * s);
    ctx.fillStyle = rgba(dark(hex("#111111"), 0.3));
    ctx.font = sceneFont(800, Math.max(8, 0.62 * s));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("NICE", signX + 1.65 * s, roadTop - 4.95 * s);
    ctx.font = sceneFont(600, Math.max(6, 0.32 * s));
    ctx.fillText("Nizza", signX + 1.65 * s, roadTop - 4.45 * s);
    ctx.textAlign = "start";
  }
  void p;
}
