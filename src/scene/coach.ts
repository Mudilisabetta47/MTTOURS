/**
 * Side view of the Metropol Tours coach (MAN Lion's Coach, three axles, lime livery),
 * modelled after the company's own photo. Units: metres, scaled by `s` (px per metre).
 * Facing right. (x, groundY) = rear wheel-contact line at the rear bumper.
 */

import { sceneFont } from "./font";

export const COACH_LENGTH = 13.9;
export const COACH_HEIGHT = 3.8;
const WHEEL_R = 0.52;
const AXLES = [2.35, 3.75, 11.2]; // rear drive, tag axle, front

export interface CoachState {
  /** wheel rotation in radians (derived from distance travelled) */
  wheelAngle: number;
  /** 0..1 headlights / taillights */
  lights: number;
  /** 0..1 warm interior light */
  interior: number;
  /** 0..1 how dark the scene is (affects body shading) */
  night: number;
  /** vertical suspension offset in metres */
  bounce: number;
  /** 0..1 position of the light streak travelling over the glass */
  glint: number;
  /** brake light intensity 0..1 */
  brake: number;
}

const LIME = [140, 198, 63] as const;
const LIME_DARK = [92, 140, 34] as const;
const GLASS = "#0a1012";

function shade(c: readonly [number, number, number], k: number) {
  return `rgb(${(c[0] * k) | 0},${(c[1] * k) | 0},${(c[2] * k) | 0})`;
}

export function paintCoach(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  s: number,
  st: CoachState,
): void {
  const L = COACH_LENGTH;
  const X = (m: number) => x + m * s;
  const Y = (m: number) => groundY - (m + st.bounce) * s;
  const light = 1 - st.night * 0.62;

  // contact shadow
  ctx.save();
  const sh = ctx.createRadialGradient(X(L / 2), groundY, 0, X(L / 2), groundY, (L / 2 + 1) * s);
  sh.addColorStop(0, "rgba(0,0,0,0.55)");
  sh.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.ellipse(X(L / 2), groundY + 0.05 * s, (L / 2 + 0.8) * s, 0.35 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // headlight beam: a soft elongated pool of light on the road ahead
  if (st.lights > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const cx = X(L + 7);
    const cy = groundY + 0.15 * s;
    ctx.translate(cx, cy);
    ctx.scale(1, 0.16);
    const r = 9 * s;
    const pool = ctx.createRadialGradient(-5 * s, 0, 0, 0, 0, r);
    pool.addColorStop(0, `rgba(255,236,190,${0.28 * st.lights})`);
    pool.addColorStop(0.55, `rgba(255,236,190,${0.1 * st.lights})`);
    pool.addColorStop(1, "rgba(255,236,190,0)");
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // body silhouette
  const bottom = 0.38;
  const top = COACH_HEIGHT;
  const body = new Path2D();
  body.moveTo(X(0.15), Y(bottom));
  body.lineTo(X(L - 0.35), Y(bottom));
  body.quadraticCurveTo(X(L), Y(bottom), X(L), Y(bottom + 0.4));
  body.lineTo(X(L), Y(1.55));
  body.bezierCurveTo(X(L + 0.05), Y(2.6), X(L - 0.05), Y(3.3), X(L - 0.55), Y(top - 0.05));
  body.quadraticCurveTo(X(L - 0.9), Y(top), X(L - 1.4), Y(top));
  body.lineTo(X(0.5), Y(top));
  body.quadraticCurveTo(X(0), Y(top), X(0), Y(top - 0.45));
  body.lineTo(X(0), Y(bottom + 0.3));
  body.quadraticCurveTo(X(0), Y(bottom), X(0.15), Y(bottom));
  body.closePath();

  const g = ctx.createLinearGradient(0, Y(top), 0, Y(bottom));
  g.addColorStop(0, shade(LIME, 1.08 * light));
  g.addColorStop(0.55, shade(LIME, 0.98 * light));
  g.addColorStop(1, shade(LIME_DARK, 0.85 * light));
  ctx.fillStyle = g;
  ctx.fill(body);

  ctx.save();
  ctx.clip(body);

  // dark roof edge
  ctx.fillStyle = shade([24, 30, 28], 1);
  ctx.fillRect(X(-1), Y(top + 1), (L + 2) * s, (0.32 + 1) * s);

  // window band (side glazing) + windscreen
  const glass = new Path2D();
  glass.moveTo(X(0.35), Y(1.72));
  glass.lineTo(X(L - 2.0), Y(1.72));
  glass.lineTo(X(L - 1.25), Y(0.55));
  glass.lineTo(X(L + 0.2), Y(0.55));
  glass.lineTo(X(L + 0.2), Y(top - 0.33));
  glass.lineTo(X(0.35), Y(top - 0.33));
  glass.closePath();
  ctx.fillStyle = GLASS;
  ctx.fill(glass);
  const sheen = ctx.createLinearGradient(0, Y(top - 0.33), 0, Y(1.72));
  sheen.addColorStop(0, `rgba(170,200,230,${0.22 * (1 - st.night)})`);
  sheen.addColorStop(1, "rgba(170,200,230,0)");
  ctx.fillStyle = sheen;
  ctx.fill(glass);

  // interior light + passengers
  if (st.interior > 0.01) {
    ctx.save();
    ctx.clip(glass);
    const warm = ctx.createLinearGradient(0, Y(top - 0.33), 0, Y(1.72));
    warm.addColorStop(0, `rgba(255,214,150,${0.55 * st.interior})`);
    warm.addColorStop(1, `rgba(255,190,120,${0.28 * st.interior})`);
    ctx.fillStyle = warm;
    ctx.fillRect(X(0.35), Y(top), (L - 0.3) * s, (top - 1.6) * s);
    ctx.fillStyle = `rgba(20,16,12,${0.75 * st.interior})`;
    for (let i = 0; i < 12; i++) {
      const hx = 0.9 + i * 0.86;
      if (hx > L - 2.6) break;
      const hh = 2.22 + ((i * 37) % 5) * 0.03;
      ctx.beginPath();
      ctx.ellipse(X(hx), Y(hh), 0.13 * s, 0.17 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(X(hx - 0.2), Y(hh - 0.12), 0.4 * s, 0.5 * s);
    }
    // driver
    ctx.beginPath();
    ctx.ellipse(X(L - 1.9), Y(2.05), 0.13 * s, 0.17 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // window pillars
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  for (let px = 1.85; px < L - 2.6; px += 1.6) ctx.fillRect(X(px), Y(top - 0.33), 0.09 * s, (top - 0.33 - 1.72) * s);

  // travelling reflection on the glass
  ctx.save();
  ctx.clip(glass);
  const gx = X(-2 + st.glint * (L + 4));
  const streak = ctx.createLinearGradient(gx - 1.2 * s, 0, gx + 1.2 * s, 0);
  streak.addColorStop(0, "rgba(255,255,255,0)");
  streak.addColorStop(0.5, `rgba(255,255,255,${0.16 * (1 - st.night * 0.6)})`);
  streak.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = streak;
  ctx.fillRect(gx - 1.2 * s, Y(top), 2.4 * s, top * s);
  ctx.restore();

  // front door (glass) just ahead of the front axle
  ctx.fillStyle = GLASS;
  ctx.fillRect(X(L - 1.3), Y(1.72), 0.85 * s, 1.2 * s);
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = Math.max(1, 0.03 * s);
  ctx.strokeRect(X(L - 1.3), Y(1.72), 0.85 * s, 1.2 * s);

  // baggage doors (panel lines)
  ctx.strokeStyle = `rgba(0,0,0,${0.22 * light + 0.1})`;
  for (const [a, b] of [
    [4.4, 6.9],
    [6.95, 9.45],
  ] as const) {
    ctx.strokeRect(X(a), Y(1.45), (b - a) * s, (1.45 - bottom - 0.05) * s);
  }

  // belt line
  ctx.fillStyle = `rgba(0,0,0,${0.18 * light + 0.12})`;
  ctx.fillRect(X(0), Y(1.66), L * s, 0.05 * s);

  // lettering on the rear panel, as on the real bus
  const fs = Math.max(8, 0.4 * s);
  ctx.font = sceneFont(800, fs);
  ctx.fillStyle = `rgba(12,18,10,${0.9})`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("METROPOL TOURS", X(0.42), Y(1.22));

  // front corner shading
  const fc = ctx.createLinearGradient(X(L - 0.6), 0, X(L), 0);
  fc.addColorStop(0, "rgba(0,0,0,0)");
  fc.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = fc;
  ctx.fillRect(X(L - 0.6), Y(top), 0.6 * s, top * s);
  ctx.restore();

  // lights
  const head = st.lights;
  ctx.fillStyle = head > 0.05 ? `rgba(255,244,215,${0.6 + 0.4 * head})` : "rgba(220,226,226,0.8)";
  ctx.fillRect(X(L - 0.18), Y(0.98), 0.16 * s, 0.22 * s);
  const tail = Math.max(st.lights * 0.7, st.brake);
  ctx.fillStyle = `rgba(${170 + 85 * tail},${25 + 20 * tail},${20},${0.75 + 0.25 * tail})`;
  ctx.fillRect(X(0.0), Y(1.55), 0.1 * s, 0.6 * s);
  if (head > 0.05 || tail > 0.05) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = (gx: number, gy: number, r: number, c: string) => {
      const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
      rg.addColorStop(0, c);
      rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
    };
    if (head > 0.05) glow(X(L - 0.05), Y(1.08), 1.4 * s, `rgba(255,236,190,${0.55 * head})`);
    if (tail > 0.05) glow(X(0.02), Y(1.25), 0.9 * s, `rgba(255,40,30,${0.45 * tail})`);
    ctx.restore();
  }

  // wheel arches + wheels
  for (const ax of AXLES) {
    ctx.fillStyle = "#050607";
    ctx.beginPath();
    ctx.arc(X(ax), Y(WHEEL_R - st.bounce), (WHEEL_R + 0.1) * s, Math.PI, 0);
    ctx.lineTo(X(ax + WHEEL_R + 0.1), groundY);
    ctx.lineTo(X(ax - WHEEL_R - 0.1), groundY);
    ctx.closePath();
    ctx.fill();
    paintWheel(ctx, X(ax), groundY - WHEEL_R * s, WHEEL_R * s, st.wheelAngle, light);
  }
}

function paintWheel(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, angle: number, light: number) {
  ctx.fillStyle = "#111416";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  const rim = r * 0.6;
  const rg = ctx.createRadialGradient(cx - rim * 0.3, cy - rim * 0.3, rim * 0.1, cx, cy, rim);
  rg.addColorStop(0, `rgba(235,238,240,${0.95 * light + 0.05})`);
  rg.addColorStop(1, `rgba(120,126,130,${0.95 * light + 0.05})`);
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(cx, cy, rim, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(40,44,46,0.7)";
  ctx.lineWidth = Math.max(1, r * 0.06);
  for (let i = 0; i < 8; i++) {
    const a = angle + (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * rim * 0.28, cy + Math.sin(a) * rim * 0.28);
    ctx.lineTo(cx + Math.cos(a) * rim * 0.88, cy + Math.sin(a) * rim * 0.88);
    ctx.stroke();
  }
  ctx.fillStyle = "#2a2e31";
  ctx.beginPath();
  ctx.arc(cx, cy, rim * 0.22, 0, Math.PI * 2);
  ctx.fill();
}
