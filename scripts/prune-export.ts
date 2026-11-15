/**
 * Runs after `next build`. Removes exported pages that rendered the 404 view because
 * their feature is empty or disabled (no resume, no photos, dev-only pages …), so the
 * web server answers them with a real 404 instead of a 200 page that says "not found".
 */
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("out");
const KEEP = new Set(["404.html", "404/index.html", "_not-found/index.html", "_not-found.html"]);
const removed: string[] = [];

/**
 * In a static export, a page that called notFound() is written with `noindex` and an
 * empty body (the 404 view is rendered from the RSC payload). A real page always has
 * a <main> element in its HTML. (Every page's payload mentions the 404 tree, so the
 * text alone is not a reliable signal.)
 */
function isNotFoundPage(html: string): boolean {
  if (!/<meta name="robots" content="noindex"\/?>/.test(html)) return false;
  const body = html.slice(html.indexOf("<body")).replace(/<script[\s\S]*?<\/script>/g, "");
  return !/<main[\s>]/.test(body) || /<main[^>]*\sdata-not-found=""/.test(body);
}

function walk(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "_next" || entry.name === "_content") continue;
      walk(full);
    } else if (entry.name.endsWith(".html")) {
      const rel = path.relative(OUT, full);
      if (KEEP.has(rel)) continue;
      if (isNotFoundPage(fs.readFileSync(full, "utf8"))) {
        // remove the page's directory (index.html plus its RSC payload files)
        const target = entry.name === "index.html" && dir !== OUT ? dir : full;
        fs.rmSync(target, { recursive: true, force: true });
        removed.push("/" + path.relative(OUT, target));
        return;
      }
    }
  }
}

if (fs.existsSync(OUT)) walk(OUT);
console.log(removed.length ? `✓ pruned ${removed.length} disabled page(s): ${removed.join(", ")}` : "✓ no disabled pages to prune");
