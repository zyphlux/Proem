import fs from "node:fs";
import path from "node:path";

export const MEDIA_WIDTHS = [640, 1280, 1920] as const;

export type MediaVariant = { width: number; src: string };
export type MediaManifest = Record<string, { width: number; height: number; variants: MediaVariant[] }>;

let cached: MediaManifest | null = null;

/** Sizes and URLs produced by `pnpm content:sync`. */
export function mediaManifest(): MediaManifest {
  if (cached) return cached;
  const file = path.resolve(".content-cache/media.json");
  cached = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as MediaManifest) : {};
  return cached;
}

export function mediaSource(id: string) {
  const m = mediaManifest()[id];
  if (!m) return null;
  const largest = m.variants.at(-1)!;
  return {
    src: largest.src,
    srcSet: m.variants.map((v) => `${v.src} ${v.width}w`).join(", "),
    width: m.width,
    height: m.height,
  };
}
