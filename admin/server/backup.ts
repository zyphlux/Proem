/**
 * Backup and restore of CONTENT_DIR (content, theme, media, resumes) as a zip.
 * Restore validates the archive before touching anything and keeps a copy of the
 * replaced content in ADMIN_DATA_DIR/backups.
 */
import fs from "node:fs";
import path from "node:path";
import { unzipSync, zipSync, type Zippable } from "fflate";
import { checkContent, readContent } from "../../src/content/load";
import { config, paths } from "./config";
import { ValidationError } from "./content-store";

const SKIP = new Set([".git", "node_modules", ".DS_Store"]);

function collect(dir: string, base = ""): Zippable {
  const out: Zippable = {};
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const rel = base ? `${base}/${e.name}` : e.name;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) Object.assign(out, collect(full, rel));
    else if (e.isFile()) out[rel] = new Uint8Array(fs.readFileSync(full));
  }
  return out;
}

export function exportBackup(): { name: string; data: Uint8Array } {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  return { name: `portfolio-content-${stamp}.zip`, data: zipSync(collect(config.contentDir), { level: 6 }) };
}

export function restoreBackup(zip: Uint8Array) {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(zip);
  } catch {
    throw new ValidationError([{ path: "file", message: "not a valid zip archive" }]);
  }
  const names = Object.keys(files).filter((n) => !n.endsWith("/"));
  // Accept archives with a single top-level folder too.
  const prefix = names.every((n) => n.includes("/")) && new Set(names.map((n) => n.split("/")[0])).size === 1 ? names[0].split("/")[0] + "/" : "";

  const stamp = new Date().toISOString().replace(/[-:.]/g, "");
  const staging = path.join(paths.backupsDir, `restore-${stamp}`);
  fs.mkdirSync(staging, { recursive: true });
  for (const n of names) {
    const rel = n.slice(prefix.length);
    if (!rel || rel.split("/").some((part) => part === ".." || part === "" || SKIP.has(part)) || path.isAbsolute(rel)) continue;
    const dest = path.resolve(staging, rel);
    if (!dest.startsWith(staging + path.sep)) continue; // zip-slip guard
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, files[n]);
  }

  const { content, issues } = readContent(staging);
  const errors = content ? [...issues, ...checkContent(content)].filter((i) => i.level === "error") : issues;
  if (!content || errors.length) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw new ValidationError(errors.map((e) => ({ path: e.file, message: e.message })));
  }

  // Keep a copy of what we replace, then swap contents (the content dir's .git stays).
  const keep = path.join(paths.backupsDir, `before-restore-${stamp}`);
  fs.cpSync(config.contentDir, keep, { recursive: true, filter: (src) => !src.split(path.sep).includes(".git") });
  for (const e of fs.readdirSync(config.contentDir)) {
    if (e !== ".git") fs.rmSync(path.join(config.contentDir, e), { recursive: true, force: true });
  }
  fs.cpSync(staging, config.contentDir, { recursive: true });
  fs.rmSync(staging, { recursive: true, force: true });
  return { previousCopy: keep };
}
