/** Canvas cannot resolve CSS variables; the page passes the real (self-hosted) family name once. */
let family = '"DM Sans", system-ui, sans-serif';

export function setSceneFont(f: string | undefined | null): void {
  if (f && f.trim()) family = f;
}

export function sceneFont(weight: number, px: number): string {
  return `${weight} ${Math.round(px * 10) / 10}px ${family}`;
}
