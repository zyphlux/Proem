/**
 * pnpm screens [baseUrl] [outDir] [paths...]
 * Full-page screenshots at the acceptance widths in light and dark, plus a horizontal
 * overflow check. Used to verify layout changes (P2+).
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const [base = "http://localhost:3000", out = ".screens", ...rest] = process.argv.slice(2);
const paths = rest.length ? rest : ["/"];
const WIDTHS = [360, 390, 768, 1024, 1440];
const THEMES = ["light", "dark"] as const;

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  let problems = 0;
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
      await ctx.addInitScript((t) => {
        try { localStorage.setItem("theme", t); } catch {}
      }, theme);
      const page = await ctx.newPage();
      for (const p of paths) {
        await page.goto(base + p, { waitUntil: "networkidle" });
        // reveal everything so full-page shots are complete
        await page.evaluate(() => document.querySelectorAll("[data-reveal]").forEach((el) => el.setAttribute("data-revealed", "")));
        await page.waitForTimeout(900);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (overflow > 0) {
          problems++;
          console.log(`✗ ${p} @${width} ${theme}: horizontal overflow ${overflow}px`);
        }
        const name = `${p === "/" ? "home" : p.replace(/\//g, "_").replace(/^_|_$/g, "")}-${width}-${theme}.png`;
        // Grow the viewport instead of fullPage capture (headless full-page capture
        // composites some layers incorrectly).
        const h = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewportSize({ width, height: h });
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(out, name) });
        await page.setViewportSize({ width, height: 900 });
      }
      await ctx.close();
    }
  }
  await browser.close();
  console.log(problems ? `✗ ${problems} problem(s)` : `✓ no horizontal overflow; screenshots in ${out}`);
  process.exit(problems ? 1 : 0);
}

main();
