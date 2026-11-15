/**
 * Derived, presentation-ready views over the content model.
 * Shared by the home page, detail pages and (later) the admin preview.
 */
import type { Content } from "./load";
import type { Education, Experience, Publication, SectionId } from "./schema";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatYearMonth(v: string, withMonth = false): string {
  const [y, m] = v.split("-");
  return withMonth && m ? `${MONTHS[Number(m) - 1]} ${y}` : y;
}

export function formatRange(start: string, end: string | null): string {
  return `${formatYearMonth(start)} – ${end ? formatYearMonth(end) : "Now"}`;
}

/* ------------------------------------------------------------------ journey */

export type JourneyItem =
  | { kind: "work"; key: string; current: boolean; item: Experience }
  | { kind: "study"; key: string; current: boolean; item: Education };

/** Work and study on one timeline: ongoing first, then by end date, then by start date (newest first). */
export function journey(c: Content): JourneyItem[] {
  const items: JourneyItem[] = [
    ...c.experience.map((item) => ({ kind: "work" as const, key: `work-${item.id}`, current: item.end === null, item })),
    ...c.education.map((item) => ({ kind: "study" as const, key: `study-${item.id}`, current: item.end === null, item })),
  ];
  const endKey = (x: JourneyItem) => x.item.end ?? "9999";
  return items.sort(
    (a, b) => endKey(b).localeCompare(endKey(a)) || b.item.start.localeCompare(a.item.start),
  );
}

/** The NOW line: explicit override, else the most recent ongoing job. */
export function nowLine(c: Content): string | null {
  if (c.profile.now) return c.profile.now;
  const job = c.experience
    .filter((x) => x.end === null)
    .sort((a, b) => b.start.localeCompare(a.start))[0];
  return job ? `${job.role} at ${job.organization}` : null;
}

/* ------------------------------------------------------------------ research */

export function isSelf(c: Content, author: string): boolean {
  return c.profile.authorNames.includes(author);
}

/** "First author" or null — other positions are shown only through the bolded author list. */
export function authorRole(c: Content, p: Publication): string | null {
  return isSelf(c, p.authors[0]) ? "First author" : null;
}

const TYPE_LABEL: Record<Publication["type"], string | null> = {
  conference: null,
  journal: "Journal",
  workshop: "Workshop",
  demo: "Demo",
  poster: "Poster",
  preprint: "Preprint",
  thesis: "Thesis",
};

export function publicationMeta(c: Content, p: Publication): string[] {
  return [`${p.venueShort} ${p.year}`, TYPE_LABEL[p.type], authorRole(c, p)].filter(
    (x): x is string => Boolean(x),
  );
}

/* ------------------------------------------------------------------ home sections */

export type HomeSection = { id: SectionId; number: string; label: string; title?: string; aside?: string };

const DEFAULT_LABEL: Record<SectionId, string> = {
  about: "About",
  journey: "Journey",
  work: "Selected work",
  research: "Research",
  life: "Outside the screen",
};

/** Whether a section has anything to show. Empty sections are hidden and numbering closes up. */
function hasContent(c: Content, id: SectionId): boolean {
  switch (id) {
    case "about":
      return Boolean(c.profile.about.statement || c.profile.about.body);
    case "journey":
      return c.experience.length + c.education.length > 0;
    case "work":
      return c.home.featuredProjects.length > 0;
    case "research":
      return c.publications.length > 0;
    case "life":
      return c.home.featuredPhotos.length > 0;
  }
}

export function homeSections(c: Content): HomeSection[] {
  return c.home.sections
    .filter((s) => s.enabled && hasContent(c, s.id))
    .map((s, i) => ({
      id: s.id,
      number: String(i + 1).padStart(2, "0"),
      label: s.label ?? DEFAULT_LABEL[s.id],
      title: s.title,
      aside: s.aside,
    }));
}

/* ------------------------------------------------------------------ misc */

/**
 * The public resume. A built document takes precedence over an uploaded PDF.
 * For documents, the generated files are described by the resume manifest.
 */
export function currentResume(c: Content) {
  const doc = c.resume.documents.find((d) => d.id === c.resume.publicDocument);
  if (doc) return { kind: "document" as const, href: "/resume/", docId: doc.id };
  const v = c.resume.versions.find((x) => x.id === c.resume.current);
  return v ? { kind: "upload" as const, href: "/resume/", file: `/_content/resume/${v.downloadName}`, name: v.downloadName, updated: v.uploadedAt } : null;
}

export function hasProjectStory(p: { role?: string; body: string }): boolean {
  return Boolean(p.role && p.body);
}

/* ------------------------------------------------------------------ projects & media */

export function projectYears(p: { start?: string; end?: string | null }): string | null {
  if (!p.start) return null;
  const s = p.start.slice(0, 4);
  if (p.end === undefined) return s;
  const e = p.end === null ? "Now" : p.end.slice(0, 4);
  return s === e ? s : `${s} – ${e}`;
}

/** Where a project link should go: its story page, or its entry on /work. */
export function projectHref(p: { slug: string; role?: string; body: string }): string {
  return hasProjectStory(p) ? `/work/${p.slug}/` : `/work/#${p.slug}`;
}

/** Photos that belong to "life" (have at least one album). */
export function lifePhotos(c: Content) {
  return c.media.filter((m) => m.albums.length > 0);
}

export function formatMonthYear(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
