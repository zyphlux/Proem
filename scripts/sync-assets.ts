/**
 * pnpm content:sync — copies publishable assets from CONTENT_DIR into public/_content/.
 *
 * - Raster images are re-encoded to WebP at a few widths; metadata (EXIF, GPS) is stripped.
 * - SVGs are copied as-is.
 * - Only the *current* resume is copied, under its download name. Older versions never
 *   reach the public output, so they cannot be fetched by guessing a URL.
 * - Anything in public/_content that is no longer expected is removed.
 *
 * Writes .content-cache/media.json with intrinsic sizes for layout (no CLS).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { checkContent, publicView, readContent } from "../src/content/load";
import { MEDIA_WIDTHS, type MediaManifest } from "../src/content/media-manifest";
import { buildResume, defaultDownloadName, toDocument } from "../src/resume/build";
import { fontFaceCss, fontFile, type FontName } from "../src/resume/fonts";
import { writeResumeManifest } from "../src/resume/manifest";
import { closePdfBrowser, htmlToPdf } from "../src/resume/pdf";

const OUT = path.resolve("public/_content");
const CACHE = path.resolve(".content-cache");

async function main() {
  const { content: raw, issues } = readContent();
  const errors = raw ? [...issues, ...checkContent(raw)].filter((i) => i.level === "error") : issues;
  if (!raw || errors.length) {
    for (const e of errors) console.error(`  ✗ ${e.file}: ${e.message}`);
    throw new Error("content is invalid; run pnpm content:check");
  }
  const c = process.env.CONTENT_PREVIEW === "1" ? raw : publicView(raw);

  const expected = new Set<string>();
  const manifest: MediaManifest = {};
  fs.mkdirSync(path.join(OUT, "media"), { recursive: true });

  for (const m of c.media) {
    const src = path.join(c.dir, "media", m.file);
    const srcTime = fs.statSync(src).mtimeMs;
    if (/\.svg$/i.test(m.file)) {
      const rel = `media/${m.id}.svg`;
      expected.add(rel);
      const dest = path.join(OUT, rel);
      if (!fs.existsSync(dest) || fs.statSync(dest).mtimeMs < srcTime) fs.copyFileSync(src, dest);
      const meta = await sharp(src).metadata();
      manifest[m.id] = { width: meta.width ?? 0, height: meta.height ?? 0, variants: [{ width: meta.width ?? 0, src: `/_content/${rel}` }] };
      continue;
    }
    const image = sharp(src).rotate(); // apply EXIF orientation before metadata is stripped
    const meta = await image.metadata();
    const swap = (meta.orientation ?? 1) >= 5;
    const width = (swap ? meta.height : meta.width) ?? 0;
    const height = (swap ? meta.width : meta.height) ?? 0;
    const widths: number[] = [...MEDIA_WIDTHS.filter((w) => w < width), Math.min(width, MEDIA_WIDTHS.at(-1)!)];
    const variants = [];
    for (const w of [...new Set(widths)]) {
      const rel = `media/${m.id}-${w}.webp`;
      expected.add(rel);
      const dest = path.join(OUT, rel);
      if (!fs.existsSync(dest) || fs.statSync(dest).mtimeMs < srcTime) {
        await sharp(src).rotate().resize({ width: w }).webp({ quality: 80 }).toFile(dest);
      }
      variants.push({ width: w, src: `/_content/${rel}` });
    }
    manifest[m.id] = { width, height, variants };
  }

  fs.mkdirSync(path.join(OUT, "resume", "fonts"), { recursive: true });
  let resumeNote = "";
  const doc = c.resume.documents.find((d) => d.id === c.resume.publicDocument);
  const upload = c.resume.versions.find((v) => v.id === c.resume.current);
  if (doc) {
    // Built resume: web fragment, printable HTML (fonts as files) and a PDF (fonts inlined).
    const built = buildResume(raw, doc, { includeHidden: process.env.CONTENT_PREVIEW === "1" });
    for (const w of built.rendered.cssWarnings) console.warn(`  ! resume template CSS: removed ${w}`);
    for (const n of ["inter", "serif", "mono"] as FontName[]) {
      expected.add(`resume/fonts/${n}.woff2`);
      fs.copyFileSync(fontFile(n), path.join(OUT, "resume", "fonts", `${n}.woff2`));
    }
    const htmlRel = `resume/${doc.id}.html`;
    expected.add(htmlRel);
    fs.writeFileSync(path.join(OUT, htmlRel), toDocument(built, fontFaceCss({ baseUrl: "/_content/resume/fonts" })));
    const pdfName = defaultDownloadName(raw, doc);
    let pdf: string | null = null;
    let pages: number | null = null;
    try {
      const out = await htmlToPdf(toDocument(built, fontFaceCss("inline")), doc.style.page);
      expected.add(`resume/${pdfName}`);
      fs.writeFileSync(path.join(OUT, "resume", pdfName), out.pdf);
      pdf = `/_content/resume/${pdfName}`;
      pages = out.pages;
      resumeNote = ` and resume "${doc.name}" (${pages} page${pages === 1 ? "" : "s"})`;
    } catch (e) {
      console.warn(`  ! resume PDF not generated: ${(e as Error).message}`);
      console.warn("    The site still offers the web version and a print button.");
      resumeNote = ` and resume "${doc.name}" (no PDF)`;
    } finally {
      await closePdfBrowser();
    }
    writeResumeManifest({ docId: doc.id, fragment: built.rendered.fragment, css: built.rendered.css, html: `/_content/${htmlRel}`, pdf, pdfName, pages, updated: new Date().toISOString().slice(0, 10) });
  } else {
    writeResumeManifest(null);
    if (upload) {
      const rel = `resume/${upload.downloadName}`;
      expected.add(rel);
      fs.copyFileSync(path.join(c.dir, "resume", upload.file), path.join(OUT, rel));
      resumeNote = " and the current resume";
    }
  }

  // remove stale files
  for (const sub of ["media", "resume", "resume/fonts"]) {
    for (const name of fs.readdirSync(path.join(OUT, sub))) {
      const full = path.join(OUT, sub, name);
      if (fs.statSync(full).isDirectory()) continue;
      if (!expected.has(`${sub}/${name}`)) fs.rmSync(full);
    }
  }

  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(path.join(CACHE, "media.json"), JSON.stringify(manifest, null, 2));
  console.log(`✓ synced ${c.media.length} media item(s)${resumeNote} → public/_content`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
