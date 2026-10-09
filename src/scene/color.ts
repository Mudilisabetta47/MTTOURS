export type RGB = readonly [number, number, number];

export function hex(h: string): RGB {
  const v = h.replace("#", "");
  const n = parseInt(v.length === 3 ? v.replace(/./g, (c) => c + c) : v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function rgba(c: RGB, alpha = 1): string {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;
}

/** Interpolate a list of [position, colour] stops at t. */
export function ramp(stops: readonly (readonly [number, RGB])[], t: number): RGB {
  const first = stops[0]!;
  if (t <= first[0]) return first[1];
  for (let i = 1; i < stops.length; i++) {
    const b = stops[i]!;
    if (t <= b[0]) {
      const a = stops[i - 1]!;
      const k = (t - a[0]) / (b[0] - a[0]);
      return mix(a[1], b[1], k * k * (3 - 2 * k));
    }
  }
  return stops[stops.length - 1]![1];
}

/** Deterministic PRNG. Same seed → same scene, every time. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 1D value noise in [-1, 1]. */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const h = (n: number) => {
    const s = Math.sin((n + seed * 101.3) * 127.1) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };
  const u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
}
