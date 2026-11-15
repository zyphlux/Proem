/**
 * Admin server (pnpm admin).
 *
 *   127.0.0.1:4310  admin UI + JSON API (login required)
 *   127.0.0.1:4311  preview of the last preview build (same login cookie)
 *
 * Remote maintenance: ssh -L 4310:127.0.0.1:4310 -L 4311:127.0.0.1:4311 you@server
 */
import fs from "node:fs";
import path from "node:path";
import { serve } from "@hono/node-server";
import { getConnInfo } from "@hono/node-server/conninfo";
import { Hono, type Context, type Next } from "hono";
import { bodyLimit } from "hono/body-limit";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import sharp from "sharp";
import * as S from "../../src/content/schema";
import { COOKIE, endSession, getSession, hasPassword, login, safeEqual } from "./auth";
import { exportBackup, restoreBackup } from "./backup";
import { getJob, listJobs, listReleases, startPreview, startPublish, startRollback } from "./builder";
import { allowedHosts, config, isLoopback, paths } from "./config";
import { DOC_KINDS, JSON_FILES, ValidationError, assetPath, deleteDoc, deleteResumeTemplate, readRaw, writeDoc, writeJson, writeResumeTemplate, type DocKind, type JsonName } from "./content-store";
import { changedFiles, head } from "./git";
import { resolveStatic, sendFile } from "./http";
import { uploadImage, uploadResume } from "./uploads";
import { readContent } from "../../src/content/load";
import { buildResume, defaultDownloadName, toDocument } from "../../src/resume/build";
import { fontFaceCss, fontFile, type FontName } from "../../src/resume/fonts";
import { PdfUnavailableError, htmlToPdf } from "../../src/resume/pdf";
import { allTemplates, checkTemplateSyntax } from "../../src/resume/render";
import { BASE_CSS, CONTACT_PARTIAL, SECTION_PARTIAL } from "../../src/resume/templates/shared";
import type { ResumeTemplate } from "../../src/resume/templates/builtin";

type Env = { Variables: { session: { csrf: string } } };

const ADMIN_HOSTS = allowedHosts(config.port);
const PREVIEW_HOSTS = allowedHosts(config.previewPort);
const DEV_ORIGINS = process.env.ADMIN_DEV === "1" ? ["http://localhost:5173", "http://127.0.0.1:5173"] : [];

/* ------------------------------------------------------------------ shared middleware */

function hostGuard(hosts: Set<string>) {
  // Reject requests whose Host header isn't ours (DNS-rebinding protection).
  return async (c: Context, next: Next) => {
    if (!hosts.has(c.req.header("host") ?? "")) return c.text("Unknown host", 421);
    await next();
  };
}

// CSP source lists can't contain IPv6 literals, so [::1] is left out (it still works for the Host check).
const cspList = (hosts: Set<string>) => [...hosts].filter((h) => !h.startsWith("[")).map((h) => `http://${h}`).join(" ");
const previewOrigins = cspList(PREVIEW_HOSTS);

/* ------------------------------------------------------------------ admin app */

const app = new Hono<Env>();
app.use("*", hostGuard(ADMIN_HOSTS));
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Frame-Options", "DENY");
  c.header(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src ${previewOrigins} blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`,
  );
  if (c.req.path.startsWith("/api/")) c.header("Cache-Control", "no-store");
});

// Authentication for the API (except session/login).
app.use("/api/*", async (c, next) => {
  if (c.req.path === "/api/session" || c.req.path === "/api/login") return next();
  const session = getSession(getCookie(c, COOKIE));
  if (!session) return c.json({ error: "Not signed in" }, 401);
  c.set("session", session);
  if (!["GET", "HEAD"].includes(c.req.method)) {
    // CSRF: per-session token header + same-origin check.
    const origin = c.req.header("origin");
    const okOrigin = !origin || [...ADMIN_HOSTS].some((h) => origin === `http://${h}`) || DEV_ORIGINS.includes(origin);
    const site = c.req.header("sec-fetch-site");
    if (!okOrigin || (site && site !== "same-origin" && !DEV_ORIGINS.length)) return c.json({ error: "Cross-site request refused" }, 403);
    if (!safeEqual(c.req.header("x-csrf-token") ?? "", session.csrf)) return c.json({ error: "Missing or invalid CSRF token" }, 403);
  }
  await next();
});

app.onError((err, c) => {
  if (err instanceof ValidationError) return c.json({ error: "Validation failed", issues: err.issues }, 422);
  console.error(err);
  return c.json({ error: err.message }, 500);
});

/* --- session --- */

app.get("/api/session", (c) => {
  const s = getSession(getCookie(c, COOKIE));
  return c.json({ authenticated: Boolean(s), csrf: s?.csrf ?? null });
});

app.post("/api/login", bodyLimit({ maxSize: 4096 }), async (c) => {
  const origin = c.req.header("origin");
  if (origin && ![...ADMIN_HOSTS].some((h) => origin === `http://${h}`) && !DEV_ORIGINS.includes(origin)) return c.json({ error: "Cross-site request refused" }, 403);
  const { password } = (await c.req.json().catch(() => ({}))) as { password?: string };
  const ip = getConnInfo(c).remote.address ?? "unknown";
  const r = await login(password ?? "", ip);
  if (!r.ok) {
    if (r.retryAfter) c.header("Retry-After", String(r.retryAfter));
    return c.json({ error: r.status === 429 ? "Too many attempts. Try again later." : "Wrong password" }, r.status);
  }
  setCookie(c, COOKIE, r.token, { httpOnly: true, sameSite: "Strict", path: "/", maxAge: config.sessionHours * 3600 });
  return c.json({ authenticated: true, csrf: r.csrf });
});

app.post("/api/logout", (c) => {
  endSession(getCookie(c, COOKIE));
  deleteCookie(c, COOKIE, { path: "/" });
  return c.json({ ok: true });
});

/* --- content --- */

app.get("/api/content", async (c) => {
  const raw = readRaw();
  return c.json({ ...raw, changed: await changedFiles(config.contentDir), previewPort: config.previewPort });
});

app.put("/api/json/:name", bodyLimit({ maxSize: 2 * 1024 * 1024 }), async (c) => {
  const name = c.req.param("name") as JsonName;
  if (!(name in JSON_FILES)) return c.json({ error: "Unknown file" }, 404);
  const issues = writeJson(name, await c.req.json());
  return c.json({ ok: true, issues });
});

app.put("/api/doc/:kind/:slug", bodyLimit({ maxSize: 2 * 1024 * 1024 }), async (c) => {
  const kind = c.req.param("kind") as DocKind;
  if (!(kind in DOC_KINDS)) return c.json({ error: "Unknown kind" }, 404);
  const { meta, body, previousSlug } = (await c.req.json()) as { meta: Record<string, unknown>; body: string; previousSlug?: string };
  const issues = writeDoc(kind, c.req.param("slug"), meta ?? {}, typeof body === "string" ? body : "", previousSlug);
  return c.json({ ok: true, issues });
});

app.delete("/api/doc/:kind/:slug", (c) => {
  const kind = c.req.param("kind") as DocKind;
  if (!(kind in DOC_KINDS)) return c.json({ error: "Unknown kind" }, 404);
  return c.json({ ok: true, issues: deleteDoc(kind, c.req.param("slug")) });
});

/* --- uploads --- */

app.post("/api/media", bodyLimit({ maxSize: config.maxImageBytes + 64 * 1024 }), async (c) => {
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) return c.json({ error: "No file" }, 400);
  const item = await uploadImage(file, { id: String(form.id ?? ""), alt: String(form.alt ?? ""), album: String(form.album ?? "") });
  return c.json({ ok: true, item });
});

app.post("/api/resume", bodyLimit({ maxSize: config.maxPdfBytes + 64 * 1024 }), async (c) => {
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) return c.json({ error: "No file" }, 400);
  return c.json({ ok: true, id: await uploadResume(file, String(form.downloadName ?? "")) });
});

app.post("/api/import/:kind", bodyLimit({ maxSize: 2 * 1024 * 1024 }), async (c) => {
  // Markdown import: a .md file with frontmatter becomes a project or note.
  const kind = c.req.param("kind") as DocKind;
  if (!(kind in DOC_KINDS)) return c.json({ error: "Unknown kind" }, 404);
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File) || !file.name.endsWith(".md")) return c.json({ error: "Upload a .md file" }, 400);
  const matter = (await import("gray-matter")).default;
  const { data, content } = matter(await file.text());
  const slug = file.name.replace(/\.md$/, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  return c.json({ ok: true, slug, issues: writeDoc(kind, slug, data, content) });
});

/** Thumbnails / originals for the admin UI (never the public site). */
app.get("/api/media-file/:id", async (c) => {
  const list = (readRaw().json.media ?? []) as S.Media[];
  const m = Array.isArray(list) ? list.find((x) => x.id === c.req.param("id")) : undefined;
  if (!m) return c.json({ error: "Not found" }, 404);
  const file = assetPath(path.join("media", m.file));
  if (!fs.existsSync(file)) return c.json({ error: "File missing" }, 404);
  const w = Math.min(Number(c.req.query("w") || 480), 1600);
  if (file.endsWith(".svg")) return sendFile(c, file, 200, { "Content-Security-Policy": "script-src 'none'" });
  const buf = await sharp(file).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 75 }).toBuffer();
  return c.body(new Uint8Array(buf), 200, { "Content-Type": "image/webp", "Cache-Control": "private, max-age=60" });
});

app.get("/api/resume-file/:id", (c) => {
  const r = S.Resume.safeParse(readRaw().json.resume ?? {});
  const v = r.success ? r.data.versions.find((x) => x.id === c.req.param("id")) : undefined;
  if (!v) return c.json({ error: "Not found" }, 404);
  return sendFile(c, assetPath(path.join("resume", v.file)), 200, { "Content-Disposition": `inline; filename="${v.downloadName}"` });
});

/* --- resume builder --- */

app.get("/api/resume/templates", (c) => {
  const { content } = readContent(config.contentDir);
  return c.json({ templates: allTemplates(content?.resumeTemplates ?? []), partials: { section: SECTION_PARTIAL, contact: CONTACT_PARTIAL }, baseCss: BASE_CSS });
});

app.put("/api/resume/templates/:id", bodyLimit({ maxSize: 512 * 1024 }), async (c) => {
  const { meta, html, css } = (await c.req.json()) as { meta: unknown; html: string; css: string };
  const syntax = checkTemplateSyntax(String(html ?? ""));
  if (syntax) throw new ValidationError([{ path: "html", message: syntax }]);
  return c.json({ ok: true, issues: writeResumeTemplate(c.req.param("id"), meta, String(html ?? ""), String(css ?? "")) });
});

app.delete("/api/resume/templates/:id", (c) => c.json({ ok: true, issues: deleteResumeTemplate(c.req.param("id")) }));

type RenderBody = { doc: unknown; includeHidden?: boolean; template?: { html: string; css: string; layouts?: ResumeTemplate["layouts"] } };

/** Resolve + render with the saved content and an (unsaved) document / template from the editor. */
function prepareResume(body: RenderBody) {
  const { content, issues } = readContent(config.contentDir);
  if (!content) throw new ValidationError(issues.map((i) => ({ path: i.file, message: i.message })));
  const doc = S.ResumeDocument.safeParse(body.doc);
  if (!doc.success) throw new ValidationError(doc.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  let override: ResumeTemplate | undefined;
  if (body.template) {
    const err = checkTemplateSyntax(body.template.html);
    if (err) throw new ValidationError([{ path: "html", message: err }]);
    override = { id: "custom:editing", name: "Editing", description: "", layouts: body.template.layouts?.length ? body.template.layouts : ["single"], html: body.template.html, css: body.template.css, builtin: false };
  }
  return { content, built: buildResume(content, doc.data, { includeHidden: Boolean(body.includeHidden), templateOverride: override }) };
}

app.post("/api/resume/render", bodyLimit({ maxSize: 1024 * 1024 }), async (c) => {
  const { built } = prepareResume(await c.req.json());
  return c.json({ html: toDocument(built, fontFaceCss({ baseUrl: "/api/resume/fonts" })), cssWarnings: built.rendered.cssWarnings });
});

app.post("/api/resume/pdf", bodyLimit({ maxSize: 1024 * 1024 }), async (c) => {
  const { content, built } = prepareResume(await c.req.json());
  try {
    const { pdf, pages } = await htmlToPdf(toDocument(built, fontFaceCss("inline")), built.doc.style.page);
    return c.body(new Uint8Array(pdf), 200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${defaultDownloadName(content, built.doc)}"`,
      "X-Page-Count": String(pages),
    });
  } catch (e) {
    if (e instanceof PdfUnavailableError) return c.json({ error: e.message }, 503);
    throw e;
  }
});

app.get("/api/resume/fonts/:file", (c) => {
  const name = c.req.param("file").replace(/\.woff2$/, "") as FontName;
  if (!["inter", "serif", "mono"].includes(name)) return c.json({ error: "Not found" }, 404);
  return sendFile(c, fontFile(name), 200, { "Content-Type": "font/woff2", "Cache-Control": "private, max-age=86400" });
});

/* --- build / publish --- */

app.get("/api/status", async (c) =>
  c.json({ changed: await changedFiles(config.contentDir), releases: listReleases(), jobs: listJobs(), contentHead: await head(config.contentDir) }),
);
app.get("/api/releases", (c) => c.json(listReleases()));
app.get("/api/jobs/:id", (c) => {
  const j = getJob(c.req.param("id"));
  return j ? c.json(j) : c.json({ error: "Not found" }, 404);
});
app.post("/api/preview", (c) => c.json(startPreview()));
app.post("/api/publish", async (c) => {
  const { summary } = (await c.req.json().catch(() => ({}))) as { summary?: string };
  return c.json(startPublish(String(summary ?? "").slice(0, 200)));
});
app.post("/api/rollback/:id", (c) => c.json(startRollback(c.req.param("id"))));

/* --- backup --- */

app.get("/api/backup", (c) => {
  const { name, data } = exportBackup();
  return c.body(data as Uint8Array<ArrayBuffer>, 200, { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${name}"` });
});
app.post("/api/restore", bodyLimit({ maxSize: 500 * 1024 * 1024 }), async (c) => {
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) return c.json({ error: "No file" }, 400);
  return c.json({ ok: true, ...restoreBackup(new Uint8Array(await file.arrayBuffer())) });
});

app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

/* --- the admin web app (built with Vite) --- */

app.get("*", (c) => {
  const file = resolveStatic(paths.webDist, c.req.path) ?? resolveStatic(paths.webDist, "/index.html");
  if (!file) return c.text("Admin UI not built. Run: pnpm admin:build", 503);
  const immutable = c.req.path.startsWith("/assets/");
  return sendFile(c, file, 200, { "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-cache" });
});

/* ------------------------------------------------------------------ preview app */

const preview = new Hono();
preview.use("*", hostGuard(PREVIEW_HOSTS));
preview.use("*", async (c, next) => {
  if (!getSession(getCookie(c, COOKIE))) return c.text("Sign in to the admin first.", 401);
  await next();
  c.header("Content-Security-Policy", `frame-ancestors ${cspList(ADMIN_HOSTS)}`);
  c.header("Cache-Control", "no-store");
  c.header("X-Robots-Tag", "noindex");
});
preview.get("*", (c) => {
  if (!fs.existsSync(paths.previewDir)) return c.text("No preview yet. Build one from the admin.", 404);
  const file = resolveStatic(paths.previewDir, c.req.path);
  if (file) return sendFile(c, file);
  const nf = path.join(paths.previewDir, "404.html");
  return fs.existsSync(nf) ? sendFile(c, nf, 404) : c.text("Not found", 404);
});

/* ------------------------------------------------------------------ start */

if (!hasPassword()) {
  console.error("✗ No admin password set. Run: pnpm admin:passwd");
  process.exit(1);
}
if (!fs.existsSync(config.contentDir)) {
  console.error(`✗ CONTENT_DIR not found: ${config.contentDir}`);
  process.exit(1);
}
if (!isLoopback(config.host)) {
  console.warn(`\n⚠  ADMIN_HOST=${config.host}: the admin is reachable from other machines.`);
  console.warn("   Prefer 127.0.0.1 with an SSH tunnel or VPN. Make sure a firewall limits who can connect.\n");
}

serve({ fetch: app.fetch, port: config.port, hostname: config.host });
serve({ fetch: preview.fetch, port: config.previewPort, hostname: config.host });
console.log(`Admin    http://${isLoopback(config.host) ? "127.0.0.1" : config.host}:${config.port}`);
console.log(`Preview  http://${isLoopback(config.host) ? "127.0.0.1" : config.host}:${config.previewPort}`);
console.log(`Content  ${config.contentDir}`);
console.log(`Publish  ${config.publishDir}/current`);
