/**
 * Admin configuration from the environment. Defaults are the safe choice:
 * local-only listening, data kept outside the repository.
 */
import os from "node:os";
import path from "node:path";

const expand = (p: string) => (p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p);

const host = process.env.ADMIN_HOST || "127.0.0.1";
const port = Number(process.env.ADMIN_PORT || 4310);
const dataDir = path.resolve(expand(process.env.ADMIN_DATA_DIR || "~/.portfolio-data"));

export const config = {
  /** The template checkout (where `next build` runs). */
  root: process.cwd(),
  contentDir: path.resolve(expand(process.env.CONTENT_DIR || "content.example")),
  dataDir,
  host,
  port,
  previewPort: Number(process.env.ADMIN_PREVIEW_PORT || port + 1),
  /** Extra Host header values to accept, e.g. "admin.lan:4310" (only when exposing on a LAN). */
  extraHosts: (process.env.ADMIN_ALLOWED_HOSTS || "").split(",").map((s) => s.trim()).filter(Boolean),
  /** Where releases/ and the `current` symlink live. The web server serves `current`. */
  publishDir: path.resolve(expand(process.env.PUBLISH_DIR || path.join(dataDir, "site"))),
  keepReleases: Number(process.env.KEEP_RELEASES || 10),
  sessionHours: Number(process.env.ADMIN_SESSION_HOURS || 12),
  maxImageBytes: 25 * 1024 * 1024,
  maxPdfBytes: 10 * 1024 * 1024,
};

export const paths = {
  passwordFile: path.join(dataDir, "admin.json"),
  previewDir: path.join(dataDir, "preview"),
  backupsDir: path.join(dataDir, "backups"),
  releasesDir: path.join(config.publishDir, "releases"),
  currentLink: path.join(config.publishDir, "current"),
  webDist: path.join(config.root, "admin", "web", "dist"),
};

export const isLoopback = (h: string) => h === "127.0.0.1" || h === "::1" || h === "localhost";

/** Host header values this server answers to (guards against DNS rebinding). */
export function allowedHosts(p: number): Set<string> {
  const set = new Set([`127.0.0.1:${p}`, `localhost:${p}`, `[::1]:${p}`, ...config.extraHosts]);
  if (!isLoopback(config.host)) set.add(`${config.host}:${p}`);
  return set;
}
