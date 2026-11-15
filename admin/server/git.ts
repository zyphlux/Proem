/** Minimal git wrapper for the content directory (version history of published content). */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await run("git", args, { cwd, maxBuffer: 16 * 1024 * 1024 });
  return stdout.trim();
}

export function isRepo(dir: string): boolean {
  return fs.existsSync(path.join(dir, ".git"));
}

export async function ensureRepo(dir: string) {
  if (isRepo(dir)) return;
  await git(dir, ["init", "-q"]);
  // A local identity so commits work on a fresh server; owners can change it.
  await git(dir, ["config", "user.name", "Portfolio admin"]);
  await git(dir, ["config", "user.email", "admin@localhost"]);
}

/** Files changed since the last commit (= since the last publish). */
export async function changedFiles(dir: string): Promise<{ status: string; file: string }[]> {
  if (!isRepo(dir)) return [];
  const out = await git(dir, ["status", "--porcelain", "-uall"]);
  return out
    .split("\n")
    .filter(Boolean)
    .map((l) => ({ status: l.slice(0, 2).trim(), file: l.slice(3).replace(/^"|"$/g, "") }));
}

/** Commits everything; returns the new HEAD, or the existing HEAD if nothing changed. */
export async function commitAll(dir: string, message: string): Promise<string | null> {
  await ensureRepo(dir);
  await git(dir, ["add", "-A"]);
  const staged = await git(dir, ["diff", "--cached", "--name-only"]);
  if (staged) await git(dir, ["commit", "-q", "-m", message]);
  return head(dir);
}

export async function head(dir: string): Promise<string | null> {
  if (!isRepo(dir)) return null;
  try {
    return await git(dir, ["rev-parse", "--short", "HEAD"]);
  } catch {
    return null;
  }
}
