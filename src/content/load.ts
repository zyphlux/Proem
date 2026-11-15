/**
 * Reads, validates and links everything under CONTENT_DIR.
 *
 * - `readContent()`   parses every file and reports schema problems.
 * - `checkContent()`  reports broken references and missing files.
 * - `publicView()`    drops drafts / unverified items and references to them.
 * - `getContent()`    what pages use: cached, throws on any error.
 *
 * Long-form content is plain Markdown (GFM). Raw HTML and JSX are not executed,
 * so content can never inject scripts into the template.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { z } from "zod";
import * as S from "./schema";
import { contrastChecks, resolveTheme } from "../theme/theme";
import { allTemplates, checkTemplateSyntax, type CustomTemplate } from "../resume/render";

export type Issue = { level: "error" | "warning"; file: string; message: string };

export type Content = {
  dir: string;
  site: S.Site;
  profile: S.Profile;
  experience: S.Experience[];
  education: S.Education[];
  publications: S.Publication[];
  projects: S.Project[];
  notes: S.Note[];
  courses: S.Course[];
  media: S.Media[];
  resume: S.Resume;
  home: S.Home;
  theme: S.Theme;
  /** Custom resume templates from resume-templates/<id>/. */
  resumeTemplates: CustomTemplate[];
};

export function contentDir(): string {
  return path.resolve(process.cwd(), process.env.CONTENT_DIR || "content.example");
}

/* ------------------------------------------------------------------ reading */

function formatZod(error: z.ZodError): string[] {
  return error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
}

export function readContent(dir = contentDir()): { content: Content | null; issues: Issue[] } {
  const issues: Issue[] = [];
  if (!fs.existsSync(dir)) {
    return { content: null, issues: [{ level: "error", file: dir, message: "content directory not found" }] };
  }

  function json<T extends z.ZodType>(file: string, schema: T, fallback?: unknown): z.infer<T> | null {
    const full = path.join(dir, file);
    if (!fs.existsSync(full)) {
      if (fallback === undefined) {
        issues.push({ level: "error", file, message: "required file is missing" });
        return null;
      }
      return schema.parse(fallback);
    }
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(full, "utf8"));
    } catch (e) {
      issues.push({ level: "error", file, message: `invalid JSON: ${(e as Error).message}` });
      return null;
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      for (const m of formatZod(parsed.error)) issues.push({ level: "error", file, message: m });
      return null;
    }
    return parsed.data;
  }

  function markdown<T extends z.ZodType>(sub: string, schema: T): (z.infer<T> & { slug: string; body: string })[] {
    const folder = path.join(dir, sub);
    if (!fs.existsSync(folder)) return [];
    const out: (z.infer<T> & { slug: string; body: string })[] = [];
    for (const name of fs.readdirSync(folder).sort()) {
      if (!name.endsWith(".md")) continue;
      const file = `${sub}/${name}`;
      const slug = name.replace(/\.md$/, "");
      if (!S.Id.safeParse(slug).success) {
        issues.push({ level: "error", file, message: "file name must be lowercase letters, digits and dashes" });
        continue;
      }
      const { data, content } = matter(fs.readFileSync(path.join(folder, name), "utf8"));
      const parsed = schema.safeParse(data);
      if (!parsed.success) {
        for (const m of formatZod(parsed.error)) issues.push({ level: "error", file, message: m });
        continue;
      }
      out.push({ ...(parsed.data as object), slug, body: content.trim() } as z.infer<T> & { slug: string; body: string });
    }
    return out;
  }

  const list = <T extends z.ZodType>(s: T) => s.array();

  const site = json("site.json", S.Site);
  const profile = json("profile.json", S.Profile);
  const experience = json("experience.json", list(S.Experience), []);
  const education = json("education.json", list(S.Education), []);
  const publications = json("publications.json", list(S.Publication), []);
  const courses = json("courses.json", list(S.Course), []);
  const media = json("media/media.json", list(S.Media), []);
  const resume = json("resume/resume.json", S.Resume, {});
  const home = json("home.json", S.Home, {});
  const theme = json("theme.json", S.Theme, {});
  const resumeTemplates: CustomTemplate[] = [];
  const tplRoot = path.join(dir, "resume-templates");
  if (fs.existsSync(tplRoot)) {
    for (const id of fs.readdirSync(tplRoot).sort()) {
      const folder = path.join(tplRoot, id);
      if (!fs.statSync(folder).isDirectory()) continue;
      const file = `resume-templates/${id}`;
      if (!S.Id.safeParse(id).success) {
        issues.push({ level: "error", file, message: "folder name must be lowercase letters, digits and dashes" });
        continue;
      }
      const read = (n: string) => (fs.existsSync(path.join(folder, n)) ? fs.readFileSync(path.join(folder, n), "utf8") : null);
      const html = read("template.html");
      const css = read("style.css") ?? "";
      let metaRaw: unknown = {};
      try {
        metaRaw = JSON.parse(read("template.json") ?? "{}");
      } catch (e) {
        issues.push({ level: "error", file: `${file}/template.json`, message: `invalid JSON: ${(e as Error).message}` });
        continue;
      }
      const meta = S.ResumeTemplateMeta.safeParse({ name: id, ...(metaRaw as object) });
      if (!meta.success) {
        for (const m of formatZod(meta.error)) issues.push({ level: "error", file: `${file}/template.json`, message: m });
        continue;
      }
      if (html === null) {
        issues.push({ level: "error", file, message: "template.html is missing" });
        continue;
      }
      resumeTemplates.push({ id, meta: meta.data, html, css });
    }
  }
  const projects = markdown("projects", S.ProjectMeta);
  const notes = markdown("notes", S.NoteMeta);

  if (!site || !profile || !experience || !education || !publications || !courses || !media || !resume || !home || !theme) {
    return { content: null, issues };
  }
  return {
    content: { dir, site, profile, experience, education, publications, projects, notes, courses, media, resume, home, theme, resumeTemplates },
    issues,
  };
}

/* ------------------------------------------------------------------ references */

const isPublic = (x: { status: string; verified: boolean }) => x.status === "published" && x.verified;

export function checkContent(c: Content): Issue[] {
  const issues: Issue[] = [];
  const err = (file: string, message: string) => issues.push({ level: "error", file, message });
  const warn = (file: string, message: string) => issues.push({ level: "warning", file, message });

  const dupes = (file: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) err(file, `duplicate id "${id}"`);
      seen.add(id);
    }
  };
  dupes("experience.json", c.experience.map((x) => x.id));
  dupes("education.json", c.education.map((x) => x.id));
  dupes("publications.json", c.publications.map((x) => x.id));
  dupes("media/media.json", c.media.map((x) => x.id));
  dupes("resume/resume.json", c.resume.versions.map((x) => x.id));
  dupes("profile.json (socials)", c.profile.socials.map((x) => x.id));

  const projects = new Map(c.projects.map((p) => [p.slug, p]));
  const pubs = new Map(c.publications.map((p) => [p.id, p]));
  const media = new Map(c.media.map((m) => [m.id, m]));

  // A published item that points at something hidden is not an error (the link is
  // simply dropped), but the owner should know.
  function ref<T extends { status: string; verified: boolean }>(
    file: string,
    from: { status: string; verified: boolean } | null,
    kind: string,
    id: string,
    map: Map<string, T>,
  ) {
    const target = map.get(id);
    if (!target) return err(file, `unknown ${kind} "${id}"`);
    if ((from === null || isPublic(from)) && !isPublic(target)) {
      warn(file, `${kind} "${id}" is draft or unverified, so the link will be hidden`);
    }
  }

  for (const x of c.experience) for (const p of x.relatedProjects) ref("experience.json", x, "project", p, projects);
  for (const x of c.education) for (const p of x.relatedProjects) ref("education.json", x, "project", p, projects);
  for (const x of c.publications) {
    for (const p of x.relatedProjects) ref("publications.json", x, "project", p, projects);
    if (c.profile.authorNames.length && !x.authors.some((a) => c.profile.authorNames.includes(a))) {
      warn("publications.json", `"${x.id}": none of profile.authorNames appears in the author list`);
    }
  }
  for (const p of c.projects) {
    const file = `projects/${p.slug}.md`;
    for (const id of p.publications) ref(file, p, "publication", id, pubs);
    if (p.cover) ref(file, p, "media", p.cover, media);
    if (isPublic(p) && (!p.role || !p.body)) {
      warn(file, "no role or no body yet: the card is shown but the detail page is not published");
    }
  }
  if (c.profile.portrait) ref("profile.json", null, "media", c.profile.portrait, media);
  for (const id of c.home.featuredProjects) {
    ref("home.json", null, "project", id, projects);
    if (projects.get(id)?.archived) err("home.json", `project "${id}" is archived and cannot be featured`);
  }
  for (const id of c.home.featuredPhotos) ref("home.json", null, "media", id, media);
  for (const s of c.profile.socials) if (!s.verified) warn("profile.json", `social "${s.id}" is unverified and hidden`);

  for (const m of c.media) {
    if (!fs.existsSync(path.join(c.dir, "media", m.file))) err("media/media.json", `"${m.id}": file media/${m.file} not found`);
  }

  // Resume documents
  const templates = allTemplates(c.resumeTemplates);
  for (const t of c.resumeTemplates) {
    const err = checkTemplateSyntax(t.html);
    if (err) issues.push({ level: "error", file: `resume-templates/${t.id}/template.html`, message: err });
  }
  dupes("resume/resume.json (documents)", c.resume.documents.map((d) => d.id));
  const expIds = new Map(c.experience.map((x) => [x.id, x]));
  const eduIds = new Map(c.education.map((x) => [x.id, x]));
  const socials = new Set(c.profile.socials.map((x) => x.id));
  for (const d of c.resume.documents) {
    const file = `resume/resume.json → ${d.id}`;
    const t = templates.find((x) => x.id === d.template);
    if (!t) err(file, `unknown template "${d.template}"`);
    else if (d.style.layout && !t.layouts.includes(d.style.layout)) warn(file, `template "${t.name}" has no ${d.style.layout} layout; using ${t.layouts[0]}`);
    dupes(file + " (sections)", d.sections.map((x) => x.key));
    for (const id of d.header.links ?? []) if (!socials.has(id)) err(file, `unknown social link "${id}"`);
    for (const sec of d.sections) {
      if (!("items" in sec) || !sec.items) continue;
      const map: Map<string, { status: string; verified: boolean }> =
        sec.type === "experience" ? expIds : sec.type === "education" ? eduIds : sec.type === "projects" ? projects : pubs;
      const kind = sec.type === "publications" ? "publication" : sec.type === "projects" ? "project" : sec.type;
      for (const it of sec.items) ref(file, null, kind, it.ref, map);
    }
  }
  if (c.resume.publicDocument && !c.resume.documents.some((d) => d.id === c.resume.publicDocument)) {
    err("resume/resume.json", `public document "${c.resume.publicDocument}" does not exist`);
  }

  if (c.resume.current) {
    const v = c.resume.versions.find((x) => x.id === c.resume.current);
    if (!v) err("resume/resume.json", `current version "${c.resume.current}" does not exist`);
    else if (!fs.existsSync(path.join(c.dir, "resume", v.file))) err("resume/resume.json", `file resume/${v.file} not found`);
  }

  for (const r of contrastChecks(resolveTheme(c.theme))) {
    if (!r.ok) warn("theme.json", `${r.mode}: ${r.pair} contrast ${r.ratio.toFixed(2)} is below ${r.min} (${r.fg} on ${r.bg})`);
  }

  const sectionIds = c.home.sections.map((s) => s.id);
  if (new Set(sectionIds).size !== sectionIds.length) err("home.json", "a section is listed twice");

  return issues;
}

/* ------------------------------------------------------------------ public view */

/** Removes drafts and unverified items, and any reference to them. */
export function publicView(c: Content): Content {
  const projects = c.projects.filter(isPublic);
  const publications = c.publications.filter(isPublic);
  const media = c.media.filter(isPublic);
  const P = new Set(projects.map((p) => p.slug));
  const B = new Set(publications.map((p) => p.id));
  const M = new Set(media.map((m) => m.id));
  const keepP = (ids: string[]) => ids.filter((id) => P.has(id));

  return {
    ...c,
    profile: {
      ...c.profile,
      portrait: c.profile.portrait && M.has(c.profile.portrait) ? c.profile.portrait : undefined,
      socials: c.profile.socials.filter((s) => s.verified),
      contact: { ...c.profile.contact, phone: c.profile.contact.showPhone ? c.profile.contact.phone : undefined },
    },
    experience: c.experience.filter(isPublic).map((x) => ({ ...x, relatedProjects: keepP(x.relatedProjects) })),
    education: c.education.filter(isPublic).map((x) => ({ ...x, relatedProjects: keepP(x.relatedProjects) })),
    publications: publications.map((x) => ({ ...x, relatedProjects: keepP(x.relatedProjects) })),
    projects: projects.map((p) => ({
      ...p,
      publications: p.publications.filter((id) => B.has(id)),
      cover: p.cover && M.has(p.cover) ? p.cover : undefined,
    })),
    notes: c.notes.filter(isPublic),
    courses: c.courses.filter(isPublic),
    media,
    home: {
      ...c.home,
      featuredProjects: c.home.featuredProjects.filter((id) => P.has(id)),
      featuredPhotos: c.home.featuredPhotos.filter((id) => M.has(id)),
    },
  };
}

/* ------------------------------------------------------------------ for pages */

let cached: Content | null = null;

/**
 * Validated content for rendering. Set CONTENT_PREVIEW=1 (admin preview) to include drafts.
 * Throws with a readable report when anything is invalid, which fails the build.
 */
export function getContent(): Content {
  if (cached) return cached;
  const { content, issues } = readContent();
  const all = content ? [...issues, ...checkContent(content)] : issues;
  const errors = all.filter((i) => i.level === "error");
  if (!content || errors.length) {
    const report = errors.map((e) => `  ✗ ${e.file}: ${e.message}`).join("\n");
    throw new Error(`Content in ${contentDir()} is invalid:\n${report}\nRun "pnpm content:check" for details.`);
  }
  cached = process.env.CONTENT_PREVIEW === "1" ? content : publicView(content);
  return cached;
}
