/**
 * Motion engine (client only), after HANDOVER §6:
 * - one requestAnimationFrame loop for the whole page, paused while the tab is hidden
 * - scroll timelines: every movement is a pure function of progress 0..1
 * - layout is measured in one batch (refreshAll) — never per frame
 * Native scrolling is kept on purpose: sticky, anchors, find-in-page and assistive tech stay intact.
 */

export const clamp = (v: number, min = 0, max = 1) => (v < min ? min : v > max ? max : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Progress of t inside [a, b], clamped. */
export const norm = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
/** 0 → 1 → 0 window: fade in over [a,b], hold, fade out over [c,d]. */
export const window01 = (t: number, a: number, b: number, c: number, d: number) =>
  t <= a || t >= d ? 0 : t < b ? norm(t, a, b) : t <= c ? 1 : 1 - norm(t, c, d);
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const smoothstep = (t: number) => t * t * (3 - 2 * t);

export interface MotionEnv {
  reduced: boolean;
  finePointer: boolean;
  small: boolean;
  maxDpr: number;
}

let envCache: MotionEnv | null = null;

export function motionEnv(): MotionEnv {
  if (envCache) return envCache;
  const mm = (q: string) => typeof window !== "undefined" && window.matchMedia(q).matches;
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
  envCache = {
    reduced: mm("(prefers-reduced-motion: reduce)"),
    finePointer: mm("(hover: hover) and (pointer: fine)"),
    small: typeof window !== "undefined" && window.innerWidth <= 860,
    maxDpr: cores <= 4 ? 1.5 : 2,
  };
  return envCache;
}

// ── rAF loop ──────────────────────────────────────────────────────────────────
type Tick = (dt: number, now: number) => void;
const ticks: { order: number; fn: Tick }[] = [];
let rafId = 0;
let last = 0;

function frame(now: number) {
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
  last = now;
  for (const t of ticks) t.fn(dt, now);
  rafId = ticks.length ? requestAnimationFrame(frame) : 0;
}

export function onTick(fn: Tick, order = 10): () => void {
  const entry = { order, fn };
  ticks.push(entry);
  ticks.sort((a, b) => a.order - b.order);
  if (!rafId && !document.hidden) {
    last = 0;
    rafId = requestAnimationFrame(frame);
  }
  return () => {
    const i = ticks.indexOf(entry);
    if (i >= 0) ticks.splice(i, 1);
  };
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    } else if (ticks.length && !rafId) {
      last = 0;
      rafId = requestAnimationFrame(frame);
    }
  });
}

// ── Scroll timelines ─────────────────────────────────────────────────────────
type Edge = "top" | "center" | "bottom";

export interface TrackOptions {
  /** "<element edge> <viewport edge>", e.g. "top top" (default) or "top bottom". */
  start?: `${Edge} ${Edge}`;
  /** default "bottom bottom" — progress 1 when the element's bottom meets the viewport bottom. */
  end?: `${Edge} ${Edge}`;
  onUpdate: (p: number) => void;
}

interface Track extends TrackOptions {
  el: Element;
  startY: number;
  endY: number;
  last: number;
}

const tracks: Track[] = [];

function edgeOffset(edge: Edge, size: number) {
  return edge === "top" ? 0 : edge === "center" ? size / 2 : size;
}

function measure(t: Track) {
  const r = t.el.getBoundingClientRect();
  const top = r.top + window.scrollY;
  const vh = window.innerHeight;
  const [se, sv] = (t.start ?? "top top").split(" ") as [Edge, Edge];
  const [ee, ev] = (t.end ?? "bottom bottom").split(" ") as [Edge, Edge];
  t.startY = top + edgeOffset(se, r.height) - edgeOffset(sv, vh);
  t.endY = top + edgeOffset(ee, r.height) - edgeOffset(ev, vh);
  if (t.endY <= t.startY) t.endY = t.startY + 1;
}

/** The only place where positions are measured — all tracks in one pass. */
export function refreshAll() {
  for (const t of tracks) measure(t);
  update(true);
}

function update(force = false) {
  const y = window.scrollY;
  for (const t of tracks) {
    const p = clamp((y - t.startY) / (t.endY - t.startY));
    if (force || p !== t.last) {
      t.last = p;
      t.onUpdate(p);
    }
  }
}

let scrollBound = false;
let resizeTimer = 0;

function bindScroll() {
  if (scrollBound) return;
  scrollBound = true;
  onTick(() => update(), 0);
  window.addEventListener(
    "resize",
    () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(refreshAll, 180);
    },
    { passive: true },
  );
  window.addEventListener("load", refreshAll, { once: true });
  // late fonts/images
  window.setTimeout(refreshAll, 600);
  if (document.fonts?.ready) void document.fonts.ready.then(refreshAll);
}

export function track(el: Element, opts: TrackOptions): () => void {
  const t: Track = { ...opts, el, startY: 0, endY: 1, last: -1 };
  tracks.push(t);
  bindScroll();
  measure(t);
  update(true);
  return () => {
    const i = tracks.indexOf(t);
    if (i >= 0) tracks.splice(i, 1);
  };
}

/** Run `fn` only while `el` is (nearly) in view — scenes outside the viewport do not render. */
export function whileInView(el: Element, fn: (inView: boolean) => void, rootMargin = "15% 0px"): () => void {
  const io = new IntersectionObserver((entries) => fn(entries.some((e) => e.isIntersecting)), { rootMargin });
  io.observe(el);
  return () => io.disconnect();
}
