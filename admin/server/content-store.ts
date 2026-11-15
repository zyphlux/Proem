/**
 * Reads and writes CONTENT_DIR for the admin.
 *
 * - Everything is returned raw (even invalid files) so the owner can fix problems.
 * - Every write is validated with the same zod schemas the site uses, and refused if it
 *   would introduce a new error (e.g. deleting a project that the home page features).
 * - Writes are atomic (temp file + rename).
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { z } from "zod";
import { checkContent, readContent, type Issue } from "../../src/content/load";
import * as S from "../../src/content/schema";
import { config } from "./config";

export const JSON_FILES = {
  site: { file: "site.json", schema: S.Site },
  profile: { file: "profile.json", schema: S.Profile },
  experience: { file: "experience.json", schema: S.Experience.array() },
  education: { file: "education.json", schema: S.Education.array() },
  publications: { file: "publications.json", schema: S.Publication.array() },
  courses: { file: "courses.json", schema: S.Course.array() },
  home: { file: "home.json", schema: S.Home },
  theme: { file: "theme.json", schema: S.Theme },
  media: { file: "media/media.json", schema: S.Media.array() },
  resume: { file: "resume/resume.json", schema: S.Resume },
} as const;
export type JsonName = keyof typeof JSON_FILES;

export const DOC_KINDS = {
  projects: S.ProjectMeta,
  notes: S.NoteMeta,
} as const;
export type DocKind = keyof typeof DOC_KINDS;

const dir = () => config.contentDir;

function atomicWrite(file: string, data: string | Buffer) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

/* ------------------------------------------------------------------ read */

export type RawDoc = { slug: string; meta: Record<string, unknown>; body: string };
export type RawContent = {
  dir: string;
  json: Record<JsonName, unknown>;
  parseErrors: Partial<Record<JsonName, string>>;
  docs: Record<DocKind, RawDoc[]>;
  issues: Issue[];
};

function readJsonRaw(name: JsonName): { value: unknown; error?: string } {
  const full = path.join(dir(), JSON_FILES[name].file);
  if (!fs.existsSync(full)) return { value: null };
  try {
    return { value: JSON.parse(fs.readFileSync(full, "utf8")) };
  } catch (e) {
    return { value: null, error: (e as Error).message };
  }
}

function readDocs(kind: DocKind): RawDoc[] {
  const folder = path.join(dir(), kind);
  if (!fs.existsSync(folder)) return [];
  return fs
    .readdirSync(folder)
    .filter((n) => n.endsWith(".md"))
    .sort()
    .map((n) => {
      const { data, content } = matter(fs.readFileSync(path.join(folder, n), "utf8"));
      return { slug: n.replace(/\.md$/, ""), meta: normalizeYaml(data) as Record<string, unknown>, body: content.replace(/^\n+/, "") };
    });
}

/** YAML gives Dates and numbers where the schema wants strings; hand the UI strings. */
function normalizeYaml(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (Array.isArray(v)) return v.map(normalizeYaml);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, normalizeYaml(x)]));
  return v;
}

export function allIssues(): Issue[] {
  const { content, issues } = readContent(dir());
  return content ? [...issues, ...checkContent(content)] : issues;
}

export function readRaw(): RawContent {
  const json = {} as Record<JsonName, unknown>;
  const parseErrors: Partial<Record<JsonName, string>> = {};
  for (const name of Object.keys(JSON_FILES) as JsonName[]) {
    const r = readJsonRaw(name);
    json[name] = r.value;
    if (r.error) parseErrors[name] = r.error;
  }
  return {
    dir: dir(),
    json,
    parseErrors,
    docs: { projects: readDocs("projects"), notes: readDocs("notes") },
    issues: allIssues(),
  };
}

/* ------------------------------------------------------------------ write */

export class ValidationError extends Error {
  constructor(public issues: { path: string; message: string }[]) {
    super("Validation failed");
  }
}

const key = (i: Issue) => `${i.file}|${i.message}`;

/**
 * Applies `write`, then re-validates the whole content directory. If the change
 * introduced errors that were not there before, the previous files are restored.
 */
function guarded(files: string[], write: () => void): Issue[] {
  const before = new Set(allIssues().filter((i) => i.level === "error").map(key));
  const backup = new Map(files.map((f) => [f, fs.existsSync(f) ? fs.readFileSync(f) : null]));
  write();
  const after = allIssues();
  const introduced = after.filter((i) => i.level === "error" && !before.has(key(i)));
  if (introduced.length) {
    for (const [f, data] of backup) {
      if (data === null) fs.rmSync(f, { force: true });
      else atomicWrite(f, data);
    }
    throw new ValidationError(introduced.map((i) => ({ path: i.file, message: i.message })));
  }
  return after;
}

function zodIssues(error: z.ZodError) {
  return error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

export function writeJson(name: JsonName, value: unknown): Issue[] {
  const spec = JSON_FILES[name];
  const parsed = spec.schema.safeParse(value);
  if (!parsed.success) throw new ValidationError(zodIssues(parsed.error));
  const file = path.join(dir(), spec.file);
  return guarded([file], () => atomicWrite(file, JSON.stringify(value, null, 2) + "\n"));
}

export function writeDoc(kind: DocKind, slug: string, meta: Record<string, unknown>, body: string, previousSlug?: string): Issue[] {
  if (!S.Id.safeParse(slug).success) throw new ValidationError([{ path: "slug", message: "use lowercase letters, digits and dashes" }]);
  const parsed = DOC_KINDS[kind].safeParse(meta);
  if (!parsed.success) throw new ValidationError(zodIssues(parsed.error));
  const file = path.join(dir(), kind, `${slug}.md`);
  const old = previousSlug && previousSlug !== slug ? path.join(dir(), kind, `${previousSlug}.md`) : null;
  if (old && !S.Id.safeParse(previousSlug).success) throw new ValidationError([{ path: "slug", message: "invalid previous slug" }]);
  if (old && fs.existsSync(file)) throw new ValidationError([{ path: "slug", message: `"${slug}" already exists` }]);
  const text = matter.stringify(body.endsWith("\n") ? body : body + "\n", stripEmpty(meta) as Record<string, unknown>);
  return guarded(old ? [file, old] : [file], () => {
    atomicWrite(file, text);
    if (old) fs.rmSync(old, { force: true });
  });
}

export function deleteDoc(kind: DocKind, slug: string): Issue[] {
  if (!S.Id.safeParse(slug).success) throw new ValidationError([{ path: "slug", message: "invalid slug" }]);
  const file = path.join(dir(), kind, `${slug}.md`);
  return guarded([file], () => fs.rmSync(file, { force: true }));
}

/** Remove empty strings / undefined so files stay tidy and optional fields stay optional. */
export function stripEmpty(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stripEmpty);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v)
        .filter(([, x]) => x !== undefined && x !== "")
        .map(([k, x]) => [k, stripEmpty(x)]),
    );
  }
  return v;
}

/** Write a binary asset inside CONTENT_DIR (used by uploads). Path must stay inside. */
export function writeAsset(rel: string, data: Buffer) {
  const full = path.resolve(dir(), rel);
  if (!full.startsWith(path.resolve(dir()) + path.sep)) throw new Error("path escapes content dir");
  atomicWrite(full, data);
}

export function assetPath(rel: string): string {
  const full = path.resolve(dir(), rel);
  if (!full.startsWith(path.resolve(dir()) + path.sep)) throw new Error("path escapes content dir");
  return full;
}

/* ------------------------------------------------------------------ resume templates */

export function writeResumeTemplate(id: string, meta: unknown, html: string, css: string): Issue[] {
  if (!S.Id.safeParse(id).success) throw new ValidationError([{ path: "id", message: "use lowercase letters, digits and dashes" }]);
  const parsed = S.ResumeTemplateMeta.safeParse(meta);
  if (!parsed.success) throw new ValidationError(zodIssues(parsed.error));
  const folder = path.join(dir(), "resume-templates", id);
  const files = ["template.json", "template.html", "style.css"].map((f) => path.join(folder, f));
  return guarded(files, () => {
    atomicWrite(files[0], JSON.stringify(stripEmpty(meta), null, 2) + "\n");
    atomicWrite(files[1], html);
    atomicWrite(files[2], css);
  });
}

export function deleteResumeTemplate(id: string): Issue[] {
  if (!S.Id.safeParse(id).success) throw new ValidationError([{ path: "id", message: "invalid id" }]);
  const folder = path.join(dir(), "resume-templates", id);
  const files = ["template.json", "template.html", "style.css"].map((f) => path.join(folder, f));
  const issues = guarded(files, () => files.forEach((f) => fs.rmSync(f, { force: true })));
  fs.rmSync(folder, { recursive: true, force: true });
  return issues;
}
