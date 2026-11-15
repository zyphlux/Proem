/** Small HTTP helpers shared by the admin and preview servers. */
import fs from "node:fs";
import path from "node:path";
import type { Context } from "hono";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

export function contentType(file: string) {
  return TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
}

/** Resolve a URL path inside `root` like a static host: file, dir/index.html, file.html. */
export function resolveStatic(root: string, urlPath: string): string | null {
  let rel: string;
  try {
    rel = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null;
  }
  const base = path.resolve(root);
  const full = path.resolve(base, "." + rel);
  if (full !== base && !full.startsWith(base + path.sep)) return null;
  for (const candidate of [full, path.join(full, "index.html"), full.replace(/\/$/, "") + ".html"]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export function sendFile(c: Context, file: string, status: 200 | 404 = 200, extra: Record<string, string> = {}) {
  const data = fs.readFileSync(file);
  return c.body(new Uint8Array(data), status, { "Content-Type": contentType(file), ...extra });
}
