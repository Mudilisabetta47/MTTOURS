export type Tone = "ok" | "warn" | "danger" | "info" | "neutral";

export function StatusPill({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={tone === "neutral" ? "pill" : `pill pill--${tone}`}>{children}</span>;
}
