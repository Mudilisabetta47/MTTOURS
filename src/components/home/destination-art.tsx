import type { Destination } from "@/content/places";

/**
 * Hand-built SVG illustrations per destination (no stock or AI imagery).
 * Simple, recognisable silhouettes on the card's colour tone. Decorative only.
 */

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const SKY_Y = 238; // horizon in a 300×400 viewBox

function Sea({ tone }: { tone: string }) {
  return (
    <g>
      <rect x="0" y={SKY_Y} width="300" height={400 - SKY_Y} fill={tone} opacity="0.85" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={40 + ((i * 53) % 200)} y={SKY_Y + 10 + i * 13} width={30 + ((i * 17) % 50)} height="1.6" fill="#fff" opacity={0.35 - i * 0.03} />
      ))}
    </g>
  );
}

function Hills({ seed, color, base, amp }: { seed: string; color: string; base: number; amp: number }) {
  const r = rng(seed);
  let d = `M0 ${base}`;
  for (let x = 0; x <= 300; x += 20) d += ` L${x} ${base - amp * (0.4 + r() * 0.6)}`;
  d += ` L300 ${base + 2} L0 ${base + 2} Z`;
  return <path d={d} fill={color} />;
}

function Palm({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke="#10241a" strokeLinecap="round">
      <path d="M0 0 C 4 -30, -2 -60, 6 -92" strokeWidth="4" />
      {[-70, -35, 0, 35, 70, 110, -110].map((a) => (
        <path key={a} d={`M6 -92 q ${Math.cos(((a - 90) * Math.PI) / 180) * 26} ${Math.sin(((a - 90) * Math.PI) / 180) * 18 - 4} ${Math.cos(((a - 90) * Math.PI) / 180) * 40} ${Math.sin(((a - 90) * Math.PI) / 180) * 18 + 12}`} strokeWidth="3.5" />
      ))}
    </g>
  );
}

function Skyline({ seed, color, base, gables = false }: { seed: string; color: string; base: number; gables?: boolean }) {
  const r = rng(seed);
  const items = [];
  for (let x = -6; x < 306; ) {
    const w = 16 + r() * 18;
    const h = 30 + r() * 46;
    if (gables) {
      items.push(<path key={x} d={`M${x} ${base} L${x} ${base - h} L${x + w / 2} ${base - h - 14} L${x + w} ${base - h} L${x + w} ${base} Z`} fill={color} />);
    } else {
      items.push(<rect key={x} x={x} y={base - h} width={w} height={h} fill={color} />);
    }
    for (let wy = base - h + 8; wy < base - 6; wy += 11)
      for (let wx = x + 4; wx < x + w - 4; wx += 7) if (r() < 0.32) items.push(<rect key={`${x}-${wx}-${wy}`} x={wx} y={wy} width="2.4" height="3.6" fill="#ffe2a8" opacity="0.75" />);
    x += w + 1;
  }
  return <g>{items}</g>;
}

export function DestinationArt({ d }: { d: Destination }) {
  const [a, b] = d.tone;
  const dark = "#0d1b24";
  return (
    <svg className="dest__art" viewBox="0 0 300 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`sun-${d.slug}`}>
          <stop offset="0" stopColor="#fff6dd" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff6dd" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="210" cy="120" r="70" fill={`url(#sun-${d.slug})`} />
      <circle cx="210" cy="120" r="22" fill="#fff4d6" opacity="0.9" />

      {d.motif === "riviera" ? (
        <>
          <Hills seed={d.slug} color={b} base={SKY_Y} amp={70} />
          <Sea tone={b} />
          <Skyline seed={d.slug + "t"} color="#f3c9a1" base={SKY_Y - 8} />
          <Palm x={52} y={392} s={1.1} />
        </>
      ) : null}
      {d.motif === "beach" ? (
        <>
          <Hills seed={d.slug} color={b} base={SKY_Y} amp={40} />
          <Sea tone={b} />
          <path d="M0 330 Q 150 300 300 340 L300 400 L0 400 Z" fill="#f4dcae" />
          <Palm x={250} y={380} s={1.2} />
          <Palm x={40} y={396} s={0.8} />
        </>
      ) : null}
      {d.motif === "island" ? (
        <>
          <Sea tone={b} />
          <path d={`M60 ${SKY_Y} Q 110 ${SKY_Y - 40} 170 ${SKY_Y - 18} Q 220 ${SKY_Y - 34} 260 ${SKY_Y} Z`} fill="#d9d2b4" />
          <path d={`M0 ${SKY_Y} Q 30 ${SKY_Y - 22} 70 ${SKY_Y} Z`} fill="#c9c2a4" />
          <path d="M120 330 l18 -40 l18 40 Z" fill="#fff" opacity="0.9" />
          <rect x="136" y="330" width="3" height="12" fill={dark} />
        </>
      ) : null}
      {d.motif === "paris" ? (
        <>
          <Skyline seed={d.slug} color={b} base={300} />
          <g fill={dark}>
            <path d="M150 110 L156 110 L176 300 L166 300 L153 190 L140 300 L130 300 Z" />
            <rect x="136" y="232" width="34" height="5" />
            <rect x="143" y="180" width="20" height="4" />
            <rect x="152" y="96" width="2" height="16" />
          </g>
          <rect x="0" y="300" width="300" height="100" fill={dark} />
          <rect x="0" y="312" width="300" height="3" fill="#ffffff" opacity="0.25" />
        </>
      ) : null}
      {d.motif === "prag" ? (
        <>
          <Skyline seed={d.slug} color={b} base={300} />
          <g fill={dark}>
            <rect x="96" y="190" width="110" height="110" />
            <path d="M118 190 L128 120 L138 190 Z" />
            <path d="M164 190 L174 112 L184 190 Z" />
            <path d="M140 190 L151 150 L162 190 Z" />
          </g>
          <path d="M0 320 L300 320 L300 400 L0 400 Z" fill={dark} />
          {[30, 80, 130, 180, 230, 280].map((x) => (
            <path key={x} d={`M${x - 25} 320 Q ${x} 296 ${x + 25} 320`} fill="none" stroke={a} strokeWidth="5" />
          ))}
        </>
      ) : null}
      {d.motif === "amsterdam" || d.motif === "kopenhagen" ? (
        <>
          <Skyline seed={d.slug} color={d.motif === "kopenhagen" ? "#c9583c" : b} base={310} gables />
          {d.motif === "kopenhagen" ? <path d="M226 310 L226 210 L232 160 L238 210 L238 310 Z" fill={dark} /> : null}
          <rect x="0" y="310" width="300" height="90" fill={dark} />
          {Array.from({ length: 6 }, (_, i) => (
            <rect key={i} x={20 + i * 48} y={322 + (i % 2) * 14} width="26" height="2" fill="#fff" opacity="0.3" />
          ))}
        </>
      ) : null}
    </svg>
  );
}
