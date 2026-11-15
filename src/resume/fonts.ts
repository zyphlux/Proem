/** @font-face rules for standalone resume documents (PDF / print). Node only. */
import fs from "node:fs";
import path from "node:path";

const FILES = {
  inter: { family: "R Inter", weight: "100 900", file: "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2" },
  serif: { family: "R Serif", weight: "200 900", file: "@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2" },
  mono: { family: "R Mono", weight: "100 800", file: "@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2" },
} as const;
export type FontName = keyof typeof FILES;

export function fontFile(name: FontName): string {
  return path.join(process.cwd(), "node_modules", FILES[name].file);
}

let inlineCache: string | null = null;

/** `inline` embeds the fonts (for PDF); otherwise `baseUrl/<name>.woff2` is referenced. */
export function fontFaceCss(mode: "inline" | { baseUrl: string }): string {
  if (mode === "inline" && inlineCache) return inlineCache;
  const css = (Object.keys(FILES) as FontName[])
    .map((n) => {
      const f = FILES[n];
      const src = mode === "inline" ? `data:font/woff2;base64,${fs.readFileSync(fontFile(n)).toString("base64")}` : `${mode.baseUrl}/${n}.woff2`;
      return `@font-face{font-family:"${f.family}";src:url(${src}) format("woff2");font-weight:${f.weight};font-style:normal;font-display:block}`;
    })
    .join("\n");
  if (mode === "inline") inlineCache = css;
  return css;
}
