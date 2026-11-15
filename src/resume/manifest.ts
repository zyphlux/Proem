/** What the build produced for the public resume document (read by the /resume page). Node only. */
import fs from "node:fs";
import path from "node:path";

export type ResumeManifest = {
  docId: string;
  fragment: string;
  css: string;
  /** Printable standalone HTML. */
  html: string;
  /** Generated PDF, or null when Chromium was unavailable. */
  pdf: string | null;
  pdfName: string;
  pages: number | null;
  updated: string;
};

const FILE = path.resolve(".content-cache/resume.json");

export function writeResumeManifest(m: ResumeManifest | null) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  if (m) fs.writeFileSync(FILE, JSON.stringify(m));
  else fs.rmSync(FILE, { force: true });
}

export function readResumeManifest(): ResumeManifest | null {
  return fs.existsSync(FILE) ? (JSON.parse(fs.readFileSync(FILE, "utf8")) as ResumeManifest) : null;
}
