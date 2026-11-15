/**
 * HTML → PDF with headless Chromium (Playwright, Apache-2.0). Node only.
 * JavaScript is disabled and every network request is blocked: the document must be
 * self-contained (fonts are inlined by fontFaceCss("inline")).
 */
import type { Browser } from "playwright";

let browser: Browser | null = null;

export class PdfUnavailableError extends Error {}

async function getBrowser(): Promise<Browser> {
  if (browser?.isConnected()) return browser;
  const { chromium } = await import("playwright");
  try {
    browser = await chromium.launch();
  } catch (e) {
    throw new PdfUnavailableError(`Chromium is not available for PDF export (${(e as Error).message.split("\n")[0]}). Install it with: pnpm exec playwright install --with-deps chromium`);
  }
  return browser;
}

export async function htmlToPdf(html: string, page: "A4" | "Letter"): Promise<{ pdf: Buffer; pages: number }> {
  const b = await getBrowser();
  const ctx = await b.newContext({ javaScriptEnabled: false });
  try {
    const p = await ctx.newPage();
    await p.route("**/*", (route) => (route.request().url().startsWith("data:") ? route.continue() : route.abort()));
    await p.setContent(html, { waitUntil: "load" });
    await p.emulateMedia({ media: "print" });
    const pdf = await p.pdf({ format: page, printBackground: true, preferCSSPageSize: true, tagged: true });
    const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
    return { pdf, pages };
  } finally {
    await ctx.close();
  }
}

export async function closePdfBrowser() {
  await browser?.close();
  browser = null;
}
