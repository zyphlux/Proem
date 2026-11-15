/**
 * Turns the owner's theme config (preset + overrides) into CSS custom properties,
 * and checks readability. Shared by the site, content:check and the admin.
 *
 * Only structured colour values are accepted — never free-form CSS.
 */
import type { Theme, ThemeTokens } from "@/content/schema";
import { PRESETS } from "./presets";

export type ResolvedTheme = { light: ThemeTokens; dark: ThemeTokens };

export function resolveTheme(theme: Theme): ResolvedTheme {
  const preset = PRESETS[theme.preset];
  return {
    light: { ...preset.light, ...theme.light },
    dark: { ...preset.dark, ...theme.dark },
  };
}

/* ------------------------------------------------------------------ contrast (WCAG 2.x) */

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

export type ContrastCheck = { mode: "light" | "dark"; pair: string; fg: string; bg: string; ratio: number; min: number; ok: boolean };

/**
 * Pairs that carry text. The project band always uses the dark text colours
 * (it is dark in both modes), so it is checked against the dark palette.
 */
export function contrastChecks(t: ResolvedTheme): ContrastCheck[] {
  const rows: Omit<ContrastCheck, "ratio" | "ok">[] = [];
  for (const mode of ["light", "dark"] as const) {
    const p = t[mode];
    rows.push(
      { mode, pair: "text / background", fg: p.text, bg: p.background, min: 4.5 },
      { mode, pair: "text / surface", fg: p.text, bg: p.surface, min: 4.5 },
      { mode, pair: "muted text / background", fg: p.textMuted, bg: p.background, min: 4.5 },
      { mode, pair: "muted text / surface", fg: p.textMuted, bg: p.surface, min: 4.5 },
      { mode, pair: "accent / background", fg: p.accent, bg: p.background, min: 4.5 },
      { mode, pair: "accent / surface", fg: p.accent, bg: p.surface, min: 4.5 },
      { mode, pair: "band text / band", fg: t.dark.text, bg: p.band, min: 4.5 },
      { mode, pair: "band muted / band", fg: t.dark.textMuted, bg: p.band, min: 4.5 },
      { mode, pair: "band accent / band", fg: t.dark.accent, bg: p.band, min: 4.5 },
    );
  }
  return rows.map((r) => {
    const ratio = contrast(r.fg, r.bg);
    return { ...r, ratio, ok: ratio >= r.min };
  });
}

/* ------------------------------------------------------------------ CSS */

const VARS: Record<keyof ThemeTokens, string> = {
  background: "--bg",
  surface: "--surface",
  text: "--fg",
  textMuted: "--fg-muted",
  accent: "--accent",
  border: "--line",
  band: "--band",
};

function block(tokens: ThemeTokens, prefix = ""): string {
  return (Object.keys(VARS) as (keyof ThemeTokens)[])
    .map((k) => `${VARS[k].replace("--", `--${prefix}`)}:${tokens[k]};`)
    .join("");
}

/**
 * CSS for the resolved theme.
 * - `[data-theme]` is set before first paint by next-themes (Light / Dark / System).
 * - Without JavaScript, the OS preference still applies via the media query.
 * - `--on-band-*` hold the dark palette for the always-dark project band.
 */
export function themeCss(t: ResolvedTheme): string {
  const onBand = `--on-band-fg:${t.dark.text};--on-band-fg-muted:${t.dark.textMuted};--on-band-accent:${t.dark.accent};--on-band-line:${t.dark.border};`;
  return [
    `:root,[data-theme=light]{${block(t.light)}${onBand}color-scheme:light}`,
    `[data-theme=dark]{${block(t.dark)}${onBand}color-scheme:dark}`,
    `@media (prefers-color-scheme:dark){:root:not([data-theme]){${block(t.dark)}color-scheme:dark}}`,
  ].join("\n");
}
