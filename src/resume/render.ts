/**
 * Renders a resume view with a template into sanitised HTML + CSS.
 *
 * Safety: values are escaped by Mustache; the rendered HTML is then filtered to a
 * small allow-list (no scripts, frames, forms, event handlers or non-http links);
 * CSS loses @import, url() (except data:), and legacy script hooks. The PDF renderer
 * additionally runs with JavaScript disabled and all network requests blocked.
 */
import Mustache from "mustache";
import sanitizeHtml from "sanitize-html";
import type { ResumeStyle } from "../content/schema";
import type { ResumeView } from "./model";
import { BASE_CSS, CONTACT_PARTIAL, SECTION_PARTIAL } from "./templates/shared";
import { BUILTIN_TEMPLATES, type ResumeTemplate } from "./templates/builtin";

export type CustomTemplate = { id: string; meta: { name: string; description?: string; layouts: ResumeTemplate["layouts"] }; html: string; css: string };

export function allTemplates(custom: CustomTemplate[]): ResumeTemplate[] {
  return [
    ...BUILTIN_TEMPLATES,
    ...custom.map((t) => ({ id: `custom:${t.id}`, name: t.meta.name, description: t.meta.description ?? "", layouts: t.meta.layouts, html: t.html, css: t.css, builtin: false })),
  ];
}

export function findTemplate(id: string, custom: CustomTemplate[]): ResumeTemplate | null {
  return allTemplates(custom).find((t) => t.id === id) ?? null;
}

/* ------------------------------------------------------------------ sanitising */

const ALLOWED_TAGS = ["div", "span", "p", "br", "hr", "section", "article", "header", "footer", "main", "aside", "nav", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "dl", "dt", "dd", "a", "strong", "em", "b", "i", "u", "small", "sup", "sub", "time", "address", "abbr", "table", "thead", "tbody", "tr", "th", "td", "blockquote", "figure", "figcaption"];

export function sanitizeFragment(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { "*": ["class", "id", "title", "role", "lang", "dir", "aria-*", "data-*"], a: ["href", "rel"], time: ["datetime"], abbr: ["title"], td: ["colspan", "rowspan"], th: ["colspan", "rowspan", "scope"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
  });
}

export function sanitizeCss(css: string): { css: string; removed: string[] } {
  const removed: string[] = [];
  // Comments first, so text inside them can't confuse the rules below.
  let out = css.replace(/\/\*[\s\S]*?\*\//g, "");
  out = out.replace(/@import[^;]*;?/gi, (m) => (removed.push(m.trim()), ""));
  out = out.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (m, _q, u: string) => (u.trim().startsWith("data:") ? m : (removed.push(`url(${u})`), "none")));
  out = out.replace(/expression\s*\(|-moz-binding|behavior\s*:|javascript:/gi, (m) => (removed.push(m), "/*removed*/"));
  out = out.replace(/</g, "\\3c ");
  return { css: out, removed };
}

/** Mustache syntax check for template editors. */
export function checkTemplateSyntax(html: string): string | null {
  try {
    Mustache.parse(html);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

/* ------------------------------------------------------------------ render */

const SANS = `var(--font-inter, "R Inter"), "R Inter", "Inter Variable", Inter, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`;
const SERIF = `var(--font-serif, "R Serif"), "R Serif", "Source Serif 4", Georgia, "Songti SC", "Noto Serif CJK SC", serif`;
const SIZE = { compact: "9.2pt", normal: "10pt", airy: "10.8pt" } as const;
const GAP = { compact: ".55em", normal: ".8em", airy: "1.05em" } as const;
const PAGE_WIDTH = { A4: "210mm", Letter: "8.5in" } as const;

export function styleVars(style: ResumeStyle): string {
  return `.resume{--r-accent:${style.accent ?? "#245BE5"};--r-font:${style.font === "serif" ? SERIF : SANS};--r-serif:${SERIF};--r-head-font:var(--r-font);--r-size:${SIZE[style.density]};--r-gap:${GAP[style.density]};--r-margin:${style.margin}mm;--r-page-width:${PAGE_WIDTH[style.page]}}`;
}

export type Rendered = { fragment: string; css: string; cssWarnings: string[] };

export function renderResume(view: ResumeView, template: ResumeTemplate, style: ResumeStyle): Rendered {
  const inner = Mustache.render(template.html, view, { section: SECTION_PARTIAL, contact: CONTACT_PARTIAL });
  const id = template.id.replace(/[^a-z0-9-]/gi, "-");
  const wrapper = `<div class="resume r-tpl-${id} r-layout-${view.layout} r-density-${style.density} r-font-${style.font}" lang="${view.lang}">${inner}</div>`;
  const { css, removed } = sanitizeCss(template.css);
  return { fragment: sanitizeFragment(wrapper), css: `${BASE_CSS}\n${styleVars(style)}\n${css}`, cssWarnings: removed };
}

/** A complete HTML document for printing / PDF. `fontCss` supplies @font-face rules. */
export function standaloneDocument(r: Rendered, opts: { title: string; lang: string; style: ResumeStyle; fontCss: string }): string {
  const page = `@page{size:${opts.style.page};margin:${opts.style.margin}mm}html,body{margin:0;background:#fff}@media screen{body{background:#e9ebef;padding:24px 0}}`;
  const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
  return `<!doctype html><html lang="${esc(opts.lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(opts.title)}</title><style>${opts.fontCss}\n${page}\n${r.css}</style></head><body>${r.fragment}</body></html>`;
}
