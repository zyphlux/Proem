/**
 * Turns a resume document + the shared site content into the data a template renders.
 * Facts come from the site (experience, education, projects, publications); the
 * document chooses which ones, in what order, and may override the bullet points.
 */
import type { Content } from "../content/load";
import type { ResumeDocument, ResumeSection } from "../content/schema";
import type { Layout, ResumeTemplate } from "./templates/builtin";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ym = (v: string) => {
  const [y, m] = v.split("-");
  return m ? `${MONTHS[Number(m) - 1]} ${y}` : y;
};
const range = (start: string, end: string | null | undefined) => `${ym(start)} – ${end ? ym(end) : "Present"}`;
const isPublic = (x: { status?: string; verified?: boolean }) => x.status !== "draft" && x.verified !== false;
const display = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

export type Entry = {
  title: string;
  url?: string;
  subtitle?: string;
  location?: string;
  date?: string;
  meta?: string;
  authors: { name: string; self: boolean; last: boolean }[];
  hasAuthors: boolean;
  bullets: string[];
  hasBullets: boolean;
  tech?: string;
};
export type Block = { isList: boolean; text?: string; items?: string[] };
export type SectionView = {
  key: string;
  type: ResumeSection["type"];
  title?: string;
  column: "main" | "side";
  entries: Entry[];
  hasEntries: boolean;
  blocks: Block[];
  hasBlocks: boolean;
  groups: { label: string; itemsText: string }[];
  hasGroups: boolean;
};
export type ResumeView = {
  name: string;
  headline?: string;
  contact: { kind: string; text: string; url?: string }[];
  sections: SectionView[];
  main: SectionView[];
  side: SectionView[];
  hasSide: boolean;
  layout: Layout;
  lang: string;
};

const DEFAULT_TITLES: Record<ResumeSection["type"], string | undefined> = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  projects: "Projects",
  publications: "Publications",
  skills: "Skills",
  list: undefined,
  text: undefined,
};

export function textBlocks(text: string): Block[] {
  return text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((lines) => lines.length)
    .map((lines) =>
      lines.every((l) => /^[-•*]\s+/.test(l))
        ? { isList: true, items: lines.map((l) => l.replace(/^[-•*]\s+/, "")) }
        : { isList: false, text: lines.join(" ") },
    );
}

const entry = (e: Partial<Entry> & { title: string }): Entry => {
  const bullets = (e.bullets ?? []).filter((b) => b.trim());
  const authors = e.authors ?? [];
  return { ...e, bullets, hasBullets: bullets.length > 0, authors, hasAuthors: authors.length > 0 };
};

/** Picks items: an explicit list (in its order) or everything (in the given default order). */
function pick<T>(items: { ref: string; bullets?: string[] }[] | undefined, all: T[], id: (x: T) => string) {
  if (!items) return all.map((x) => ({ item: x, bullets: undefined as string[] | undefined }));
  return items.flatMap((it) => {
    const x = all.find((a) => id(a) === it.ref);
    return x ? [{ item: x, bullets: it.bullets }] : [];
  });
}

export function resolveResume(c: Content, doc: ResumeDocument, template: ResumeTemplate, opts: { includeHidden?: boolean } = {}): ResumeView {
  const ok = <T extends { status?: string; verified?: boolean }>(x: T) => opts.includeHidden || isPublic(x);
  const p = c.profile;
  const h = doc.header;

  const contact: ResumeView["contact"] = [];
  if (h.location && p.location) contact.push({ kind: "location", text: p.location });
  if (h.email && p.contact.email) contact.push({ kind: "email", text: p.contact.email, url: `mailto:${p.contact.email}` });
  if (h.phone && p.contact.phone) contact.push({ kind: "phone", text: p.contact.phone, url: `tel:${p.contact.phone.replace(/\s/g, "")}` });
  if (h.website && c.site.url) contact.push({ kind: "website", text: display(c.site.url), url: c.site.url });
  for (const s of p.socials.filter((s) => (opts.includeHidden || s.verified) && (!h.links || h.links.includes(s.id)))) {
    contact.push({ kind: s.id, text: display(s.url), url: s.url });
  }

  const experience = c.experience.filter(ok).sort((a, b) => (b.end ?? "9999").localeCompare(a.end ?? "9999") || b.start.localeCompare(a.start));
  const education = c.education.filter(ok).sort((a, b) => (b.end ?? "9999").localeCompare(a.end ?? "9999") || b.start.localeCompare(a.start));
  const projects = c.projects.filter((x) => ok(x) && !x.archived).sort((a, b) => a.order - b.order);
  const allProjects = c.projects.filter(ok);
  const publications = c.publications.filter(ok).sort((a, b) => b.year - a.year);
  const job = experience.find((x) => x.end === null);

  const sections: SectionView[] = [];
  for (const s of doc.sections) {
    if (s.enabled === false) continue;
    let entries: Entry[] = [];
    let blocks: Block[] = [];
    let groups: SectionView["groups"] = [];

    switch (s.type) {
      case "summary":
        blocks = textBlocks(s.text ?? p.about.body ?? p.intro);
        break;
      case "text":
        blocks = textBlocks(s.text);
        break;
      case "experience":
        entries = pick(s.items, experience, (x) => x.id).map(({ item: x, bullets }) =>
          entry({
            title: x.role,
            subtitle: x.organization + (x.employment !== "full-time" ? ` · ${x.employment[0].toUpperCase()}${x.employment.slice(1)}` : ""),
            location: x.location,
            date: range(x.start, x.end),
            bullets: bullets ?? x.responsibilities,
          }),
        );
        break;
      case "education":
        entries = pick(s.items, education, (x) => x.id).map(({ item: x, bullets }) =>
          entry({
            title: x.degree,
            subtitle: x.institution + (x.kind ? ` · ${x.kind}` : ""),
            date: x.end === null && x.expectedEnd ? `${ym(x.start)} – Expected ${ym(x.expectedEnd)}` : range(x.start, x.end),
            bullets: bullets ?? x.notes,
          }),
        );
        break;
      case "projects":
        entries = pick(s.items, s.items ? allProjects : projects, (x) => x.slug).map(({ item: x, bullets }) =>
          entry({
            title: x.title,
            url: x.links.code ?? x.links.demo ?? x.links.website ?? (c.site.url && x.role && x.body ? `${c.site.url.replace(/\/$/, "")}/work/${x.slug}/` : undefined),
            subtitle: x.summary,
            meta: x.role,
            date: x.start ? (x.end === undefined ? ym(x.start).slice(-4) : `${x.start.slice(0, 4)} – ${x.end === null ? "Present" : x.end.slice(0, 4)}`) : undefined,
            bullets: bullets ?? [],
            tech: x.tech.length ? x.tech.join(" · ") : undefined,
          }),
        );
        break;
      case "publications":
        entries = pick(s.items, publications, (x) => x.id).map(({ item: x, bullets }) =>
          entry({
            title: x.title,
            url: x.links.doi ?? x.links.paper ?? x.links.page,
            authors: x.authors.map((name, i) => ({ name, self: p.authorNames.includes(name), last: i === x.authors.length - 1 })),
            subtitle: [x.venue, /demonstration|demo/i.test(x.venue) ? undefined : { demo: "Demo", poster: "Poster", workshop: "Workshop paper", journal: undefined, preprint: "Preprint", thesis: "Thesis", conference: undefined }[x.type]]
              .filter(Boolean)
              .join(" · "),
            date: String(x.year),
            bullets: bullets ?? [],
          }),
        );
        break;
      case "skills":
        groups = s.groups.filter((g) => g.items.length).map((g) => ({ label: g.label, itemsText: g.items.join(", ") }));
        break;
      case "list":
        entries = s.entries.map((e) => entry({ title: e.title, subtitle: e.subtitle, date: e.date, url: e.url, meta: e.detail }));
        break;
    }

    if (!entries.length && !blocks.length && !groups.length) continue;
    sections.push({
      key: s.key,
      type: s.type,
      title: s.title ?? DEFAULT_TITLES[s.type],
      column: s.column ?? "main",
      entries,
      hasEntries: entries.length > 0,
      blocks,
      hasBlocks: blocks.length > 0,
      groups,
      hasGroups: groups.length > 0,
    });
  }

  const layout: Layout = doc.style.layout && template.layouts.includes(doc.style.layout) ? doc.style.layout : template.layouts[0];
  const sidebar = layout !== "single";
  const main = sidebar ? sections.filter((s) => s.column !== "side") : sections;
  const side = sidebar ? sections.filter((s) => s.column === "side") : [];
  // Templates whose sidebar also holds the contact block need it even with no side sections.
  return {
    name: h.name ?? p.name,
    headline: h.headline ?? job?.role,
    contact,
    sections,
    main,
    side,
    hasSide: sidebar,
    layout,
    lang: c.site.locale,
  };
}
