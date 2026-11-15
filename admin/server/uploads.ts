/**
 * Upload handling. Files are checked by content, not by name or MIME header:
 * - images must decode with sharp; they are re-encoded, auto-rotated and stripped of
 *   metadata (EXIF, GPS) before being stored, and capped at 4000px;
 * - PDFs must start with %PDF- and stay under the size limit.
 * SVG is not accepted from the admin (it can carry scripts).
 */
import sharp, { type Metadata } from "sharp";
import * as S from "../../src/content/schema";
import { config } from "./config";
import { ValidationError, readRaw, writeAsset, writeJson } from "./content-store";

const IMAGE_FORMATS = new Set(["jpeg", "png", "webp", "avif", "gif", "heif"]);

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, "")
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "file"
  );
}

function uniqueId(base: string, taken: Set<string>): string {
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
  return id;
}

export async function uploadImage(file: File, fields: { id?: string; alt?: string; album?: string }) {
  if (file.size > config.maxImageBytes) throw new ValidationError([{ path: "file", message: `image is larger than ${config.maxImageBytes / 1048576} MB` }]);
  const input = Buffer.from(await file.arrayBuffer());
  let meta: Metadata;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new ValidationError([{ path: "file", message: "not a readable image" }]);
  }
  if (!meta.format || !IMAGE_FORMATS.has(meta.format)) {
    throw new ValidationError([{ path: "file", message: `unsupported image format${meta.format ? ` (${meta.format})` : ""}; use JPEG, PNG, WebP, AVIF or GIF` }]);
  }

  const raw = readRaw();
  const media = (Array.isArray(raw.json.media) ? raw.json.media : []) as S.Media[];
  const taken = new Set(media.map((m) => m.id));
  const id = uniqueId(fields.id && S.Id.safeParse(fields.id).success ? fields.id : slugify(file.name), taken);

  // Re-encode: applies orientation, drops all metadata, limits size.
  const pipeline = sharp(input).rotate().resize({ width: 4000, height: 4000, fit: "inside", withoutEnlargement: true });
  const [out, ext] =
    meta.format === "png"
      ? [await pipeline.png().toBuffer(), "png"]
      : meta.format === "gif"
        ? [await pipeline.gif().toBuffer(), "gif"]
        : meta.format === "webp"
          ? [await pipeline.webp({ quality: 90 }).toBuffer(), "webp"]
          : [await pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer(), "jpg"];

  const rel = `uploads/${id}.${ext}`;
  writeAsset(`media/${rel}`, out);
  const item = {
    id,
    file: rel,
    alt: fields.alt?.trim() || "Describe this image",
    albums: fields.album ? [fields.album] : [],
  };
  writeJson("media", [...media, item]);
  return item;
}

export async function uploadResume(file: File, downloadName?: string) {
  if (file.size > config.maxPdfBytes) throw new ValidationError([{ path: "file", message: `PDF is larger than ${config.maxPdfBytes / 1048576} MB` }]);
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new ValidationError([{ path: "file", message: "not a PDF file" }]);

  const raw = readRaw();
  const resume = S.Resume.parse(raw.json.resume ?? {});
  const date = new Date().toISOString().slice(0, 10);
  const id = uniqueId(date, new Set(resume.versions.map((v) => v.id)));
  const name = (downloadName?.trim() || file.name || "Resume.pdf").replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "-");
  writeAsset(`resume/${id}.pdf`, buf);
  writeJson("resume", {
    current: resume.current,
    versions: [...resume.versions, { id, file: `${id}.pdf`, downloadName: name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`, uploadedAt: date }],
  });
  return id;
}
