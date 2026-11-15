/**
 * Builds, previews, publishes and rolls back — one job at a time.
 *
 * Publish: validate → commit content (git) → static build → copy to releases/<id> →
 * smoke + link check → atomically point `current` at it → prune old releases.
 * Any failure leaves `current` untouched, so the live site never breaks.
 */
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { config, paths } from "./config";
import { allIssues } from "./content-store";
import { commitAll, head } from "./git";

export type Job = {
  id: string;
  kind: "preview" | "publish" | "rollback";
  status: "queued" | "running" | "succeeded" | "failed";
  log: string[];
  createdAt: string;
  finishedAt?: string;
  result?: unknown;
  error?: string;
};

const jobs = new Map<string, Job>();
let queue: Promise<unknown> = Promise.resolve();

export function getJob(id: string) {
  return jobs.get(id) ?? null;
}
export function listJobs() {
  return [...jobs.values()].slice(-20).reverse();
}

function enqueue(kind: Job["kind"], work: (log: (s: string) => void) => Promise<unknown>): Job {
  const job: Job = { id: crypto.randomUUID(), kind, status: "queued", log: [], createdAt: new Date().toISOString() };
  jobs.set(job.id, job);
  const log = (s: string) => {
    for (const line of s.split("\n")) if (line.trim()) job.log.push(line.replace(/\x1b\[[0-9;]*m/g, ""));
    if (job.log.length > 2000) job.log.splice(0, job.log.length - 2000);
  };
  queue = queue.then(async () => {
    job.status = "running";
    try {
      job.result = await work(log);
      job.status = "succeeded";
    } catch (e) {
      job.status = "failed";
      job.error = (e as Error).message;
      log(`✗ ${(e as Error).message}`);
    } finally {
      job.finishedAt = new Date().toISOString();
    }
  });
  return job;
}

/* ------------------------------------------------------------------ build */

function step(cmd: string, args: string[], env: NodeJS.ProcessEnv, log: (s: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    log(`$ ${path.basename(cmd)} ${args.join(" ")}`);
    const child = spawn(cmd, args, { cwd: config.root, env, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (d) => log(String(d)));
    child.stderr.on("data", (d) => log(String(d)));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${path.basename(cmd)} exited with code ${code}`))));
  });
}

async function buildSite(preview: boolean, log: (s: string) => void): Promise<string> {
  const bin = (n: string) => path.join(config.root, "node_modules", ".bin", n);
  const env: NodeJS.ProcessEnv = { ...process.env, CONTENT_DIR: config.contentDir, NEXT_TELEMETRY_DISABLED: "1" };
  if (preview) env.CONTENT_PREVIEW = "1";
  else delete env.CONTENT_PREVIEW;
  await step(bin("tsx"), ["scripts/content-check.ts"], env, log);
  await step(bin("tsx"), ["scripts/sync-assets.ts"], env, log);
  await step(bin("next"), ["build"], env, log);
  await step(bin("tsx"), ["scripts/prune-export.ts"], env, log);
  return path.join(config.root, "out");
}

/** Copies a finished export to `dest` via a temp dir, so `dest` is never half-written. */
function install(from: string, dest: string) {
  const tmp = `${dest}.tmp-${Date.now()}`;
  fs.cpSync(from, tmp, { recursive: true });
  if (fs.existsSync(dest)) {
    const old = `${dest}.old-${Date.now()}`;
    fs.renameSync(dest, old);
    fs.renameSync(tmp, dest);
    fs.rmSync(old, { recursive: true, force: true });
  } else {
    fs.renameSync(tmp, dest);
  }
}

/* ------------------------------------------------------------------ checks */

/** Every internal href/src in the export must resolve to a file. */
export function checkLinks(root: string): string[] {
  const broken = new Set<string>();
  const exists = (p: string) => {
    const clean = decodeURIComponent(p.split(/[?#]/)[0]);
    const full = path.join(root, clean);
    if (!full.startsWith(root)) return false;
    return (
      (fs.existsSync(full) && fs.statSync(full).isFile()) ||
      fs.existsSync(path.join(full, "index.html")) ||
      fs.existsSync(full.replace(/\/$/, "") + ".html")
    );
  };
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== "_next") walk(full);
      } else if (e.name.endsWith(".html")) {
        const html = fs.readFileSync(full, "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
        for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
          const url = m[1];
          if (url.startsWith("//") || url === "/") continue;
          if (!exists(url)) broken.add(`${url}  (in /${path.relative(root, full)})`);
        }
      }
    }
  };
  walk(root);
  return [...broken];
}

/* ------------------------------------------------------------------ releases */

export type Release = { id: string; createdAt: string; summary: string; contentCommit: string | null; templateCommit: string | null; current: boolean };

function currentReleaseId(): string | null {
  try {
    return path.basename(fs.readlinkSync(paths.currentLink));
  } catch {
    return null;
  }
}

export function listReleases(): Release[] {
  if (!fs.existsSync(paths.releasesDir)) return [];
  const cur = currentReleaseId();
  return fs
    .readdirSync(paths.releasesDir)
    .filter((d) => fs.existsSync(path.join(paths.releasesDir, d, "release.json")))
    .map((d) => ({ ...(JSON.parse(fs.readFileSync(path.join(paths.releasesDir, d, "release.json"), "utf8")) as Omit<Release, "current">), current: d === cur }))
    .sort((a, b) => b.id.localeCompare(a.id));
}

/** Atomic switch: create a new symlink beside `current`, then rename over it. */
function pointCurrentAt(id: string) {
  const target = path.join("releases", id);
  const tmp = `${paths.currentLink}.tmp-${Date.now()}`;
  fs.symlinkSync(target, tmp);
  fs.renameSync(tmp, paths.currentLink);
}

function prune() {
  const keep = new Set(listReleases().slice(0, config.keepReleases).map((r) => r.id));
  const cur = currentReleaseId();
  for (const d of fs.readdirSync(paths.releasesDir)) {
    if (!keep.has(d) && d !== cur) fs.rmSync(path.join(paths.releasesDir, d), { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------------ jobs */

export function startPreview(): Job {
  return enqueue("preview", async (log) => {
    const out = await buildSite(true, log);
    install(out, paths.previewDir);
    log("✓ Preview ready (includes drafts and unverified items).");
  });
}

export function startPublish(summary: string): Job {
  return enqueue("publish", async (log) => {
    const errors = allIssues().filter((i) => i.level === "error");
    if (errors.length) throw new Error(`Fix ${errors.length} content error(s) first:\n` + errors.map((e) => `  ${e.file}: ${e.message}`).join("\n"));

    const msg = `publish: ${summary.trim() || "update"}`;
    const contentCommit = await commitAll(config.contentDir, msg);
    log(`✓ Content committed (${contentCommit ?? "no git"})`);

    const out = await buildSite(false, log);
    const id = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
    fs.mkdirSync(paths.releasesDir, { recursive: true });
    const dest = path.join(paths.releasesDir, id);
    install(out, dest);

    if (!fs.existsSync(path.join(dest, "index.html"))) throw new Error("smoke check failed: index.html missing");
    const broken = checkLinks(dest);
    if (broken.length) {
      fs.rmSync(dest, { recursive: true, force: true });
      throw new Error(`link check failed — ${broken.length} broken link(s):\n  ${broken.slice(0, 20).join("\n  ")}`);
    }
    log("✓ Smoke and link checks passed");

    const release = { id, createdAt: new Date().toISOString(), summary: summary.trim() || "update", contentCommit, templateCommit: await head(config.root) };
    fs.writeFileSync(path.join(dest, "release.json"), JSON.stringify(release, null, 2));
    pointCurrentAt(id);
    prune();
    log(`✓ Published ${id}. The live site now serves this release.`);
    return release;
  });
}

export function startRollback(id: string): Job {
  return enqueue("rollback", async (log) => {
    if (!/^[0-9]{8}-[0-9]{6}$/.test(id) || !fs.existsSync(path.join(paths.releasesDir, id, "index.html"))) throw new Error("unknown release");
    pointCurrentAt(id);
    log(`✓ The live site now serves release ${id}.`);
    log("Note: content files are unchanged. Edit and publish again to make this permanent.");
  });
}
