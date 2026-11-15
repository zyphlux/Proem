/**
 * Content model shared by the public site, the validation script and (from P5) the admin.
 *
 * Every file under CONTENT_DIR is parsed with these schemas. Anything that fails
 * validation stops the build — a broken publish must never replace a working site.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ primitives */

export const Id = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, "use lowercase letters, digits and dashes");

/** YAML frontmatter turns `2026` into a number and `2026-01-15` into a Date. */
const fromYaml = (v: unknown) =>
  v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === "number" ? String(v) : v;

/** "2026" or "2026-07". */
export const YearMonth = z.preprocess(
  fromYaml,
  z.string().regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, 'use "YYYY" or "YYYY-MM"'),
);

/** "2026-01-15". */
export const IsoDate = z.preprocess(fromYaml, z.iso.date());

export const Url = z.url();
export const HexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "use #RRGGBB");

/**
 * `draft` items never reach the public build.
 * `verified: false` marks facts the owner has not confirmed yet; they are treated like drafts.
 */
const visibility = {
  status: z.enum(["draft", "published"]).default("published"),
  verified: z.boolean().default(true),
};

const relatedProjects = z.array(Id).default([]);

/* ------------------------------------------------------------------ site & profile */

export const Site = z.object({
  title: z.string(),
  /** Canonical origin, e.g. https://example.com. Optional until a domain exists. */
  url: Url.optional(),
  description: z.string(),
  locale: z.string().default("en"),
});

export const Social = z.object({
  id: Id,
  label: z.string(),
  url: Url,
  verified: z.boolean().default(true),
});

export const Profile = z.object({
  name: z.string(),
  /** Names as they appear in author lists, used to highlight the owner. */
  authorNames: z.array(z.string()).default([]),
  location: z.string().optional(),
  greeting: z.string().default("Hi, I’m"),
  intro: z.string(),
  /** Media id. When absent the hero uses the portrait-free graph composition. */
  portrait: Id.optional(),
  /** Two short labels placed on the hero orbit. */
  orbitLabels: z.array(z.string()).max(2).default([]),
  /** Overrides the NOW line, which otherwise comes from the current experience entry. */
  now: z.string().optional(),
  interests: z.array(z.string()).default([]),
  about: z.object({
    statement: z.string(),
    body: z.string(),
    /** 2–4 short labels drawn as the connected "threads" diagram. */
    threads: z.array(z.string()).max(4).default([]),
  }),
  /** Hand-picked "currently" lines (reading, playing …). No external APIs. */
  currently: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  contact: z.object({
    title: z.string().default("Say hello."),
    blurb: z.string().optional(),
    email: z.email().optional(),
    phone: z.string().optional(),
    showPhone: z.boolean().default(false),
  }),
  socials: z.array(Social).default([]),
});

/* ------------------------------------------------------------------ timeline */

export const Experience = z.object({
  id: Id,
  organization: z.string(),
  organizationUrl: Url.optional(),
  role: z.string(),
  employment: z
    .enum(["full-time", "part-time", "casual", "contract", "internship", "volunteer"])
    .default("full-time"),
  start: YearMonth,
  /** null = current. */
  end: YearMonth.nullable(),
  location: z.string().optional(),
  responsibilities: z.array(z.string()).default([]),
  relatedProjects,
  ...visibility,
});

export const Education = z.object({
  id: Id,
  institution: z.string(),
  institutionUrl: Url.optional(),
  degree: z.string(),
  /** Free label such as "Research". */
  kind: z.string().optional(),
  start: YearMonth,
  end: YearMonth.nullable(),
  expectedEnd: YearMonth.optional(),
  state: z.enum(["in-progress", "completed"]),
  notes: z.array(z.string()).default([]),
  relatedProjects,
  ...visibility,
});

/* ------------------------------------------------------------------ research */

export const Publication = z.object({
  id: Id,
  title: z.string(),
  /** Full author list in published order. */
  authors: z.array(z.string()).min(1),
  venue: z.string(),
  venueShort: z.string(),
  year: z.number().int(),
  type: z.enum(["conference", "journal", "workshop", "demo", "poster", "preprint", "thesis"]),
  links: z
    .object({
      paper: Url.optional(),
      doi: Url.optional(),
      code: Url.optional(),
      demo: Url.optional(),
      slides: Url.optional(),
      video: Url.optional(),
      page: Url.optional(),
    })
    .default({}),
  bibtex: z.string().optional(),
  relatedProjects,
  ...visibility,
});

/* ------------------------------------------------------------------ long-form (Markdown frontmatter) */

export const ProjectMeta = z.object({
  title: z.string(),
  summary: z.string(),
  /** Required for the detail page to be published. */
  role: z.string().optional(),
  start: YearMonth.optional(),
  end: YearMonth.nullable().optional(),
  tech: z.array(z.string()).default([]),
  cover: Id.optional(),
  /** Style of the abstract concept preview used when there is no cover image. */
  preview: z.enum(["graph", "dashboard"]).optional(),
  links: z
    .object({ code: Url.optional(), demo: Url.optional(), website: Url.optional() })
    .default({}),
  publications: z.array(Id).default([]),
  /** Earlier work: listed on /work, never featured on the home page. */
  archived: z.boolean().default(false),
  order: z.number().default(0),
  ...visibility,
});

export const NoteMeta = z.object({
  title: z.string(),
  summary: z.string().optional(),
  date: IsoDate,
  tags: z.array(z.string()).default([]),
  ...visibility,
});

export const Course = z.object({
  code: z.string(),
  name: z.string(),
  institution: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  repo: Url.optional(),
  handbookUrl: Url.optional(),
  ...visibility,
});

/* ------------------------------------------------------------------ media & resume */

export const Media = z.object({
  id: Id,
  /** Path relative to CONTENT_DIR/media. */
  file: z.string(),
  alt: z.string().min(1, "alt text is required"),
  title: z.string().optional(),
  caption: z.string().optional(),
  location: z.string().optional(),
  date: YearMonth.optional(),
  /** Crop focus in percent. */
  focal: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).default({ x: 50, y: 50 }),
  albums: z.array(z.string()).default([]),
  /** Illustrations / mock-ups get a visible "Concept" badge. */
  concept: z.boolean().default(false),
  ...visibility,
});

/* Resume documents: built from shared site content, rendered with a template. */

const resumeSectionBase = {
  /** Unique within the document. */
  key: Id,
  title: z.string().optional(),
  enabled: z.boolean().default(true),
  /** Only used by sidebar layouts. */
  column: z.enum(["main", "side"]).default("main"),
};

/**
 * Items picked from shared content. Omitted = include everything (new items appear
 * automatically). `bullets` replaces the site text for this resume only.
 */
const resumeRefItems = z
  .array(z.object({ ref: Id, bullets: z.array(z.string()).optional() }))
  .optional();

export const ResumeSection = z.discriminatedUnion("type", [
  z.object({ type: z.literal("summary"), ...resumeSectionBase, text: z.string().optional() }),
  z.object({ type: z.literal("experience"), ...resumeSectionBase, items: resumeRefItems }),
  z.object({ type: z.literal("education"), ...resumeSectionBase, items: resumeRefItems }),
  z.object({ type: z.literal("projects"), ...resumeSectionBase, items: resumeRefItems }),
  z.object({ type: z.literal("publications"), ...resumeSectionBase, items: resumeRefItems }),
  z.object({
    type: z.literal("skills"),
    ...resumeSectionBase,
    groups: z.array(z.object({ label: z.string(), items: z.array(z.string()) })).default([]),
  }),
  z.object({
    type: z.literal("list"),
    ...resumeSectionBase,
    entries: z
      .array(
        z.object({
          title: z.string(),
          subtitle: z.string().optional(),
          date: z.string().optional(),
          detail: z.string().optional(),
          url: Url.optional(),
        }),
      )
      .default([]),
  }),
  z.object({ type: z.literal("text"), ...resumeSectionBase, text: z.string().default("") }),
]);

/** Structured customisation available for every template. */
export const ResumeStyle = z.object({
  accent: HexColor.optional(),
  font: z.enum(["sans", "serif"]).default("sans"),
  density: z.enum(["compact", "normal", "airy"]).default("normal"),
  page: z.enum(["A4", "Letter"]).default("A4"),
  /** Page margin in millimetres. */
  margin: z.number().min(6).max(30).default(14),
  layout: z.enum(["single", "sidebar-left", "sidebar-right"]).optional(),
});

export const ResumeDocument = z.object({
  id: Id,
  /** Internal name, e.g. "English · one page". */
  name: z.string(),
  /** Built-in template id, or "custom:<id>" for CONTENT_DIR/resume-templates/<id>. */
  template: z.string().default("classic"),
  style: ResumeStyle.default({ font: "sans", density: "normal", page: "A4", margin: 14 }),
  header: z
    .object({
      name: z.string().optional(),
      /** Defaults to the current role. */
      headline: z.string().optional(),
      location: z.boolean().default(true),
      email: z.boolean().default(true),
      /** The resume may show a phone number even when the website doesn't. */
      phone: z.boolean().default(false),
      website: z.boolean().default(true),
      /** Social link ids; omitted = all. */
      links: z.array(Id).optional(),
    })
    .default({ location: true, email: true, phone: false, website: true }),
  sections: z.array(ResumeSection).default([]),
  downloadName: z.string().regex(/\.pdf$/i, "must end in .pdf").optional(),
});

export const Resume = z.object({
  /** Uploaded PDF offered to visitors (when no document is public), or null. */
  current: Id.nullable().default(null),
  versions: z
    .array(
      z.object({
        id: Id,
        /** Path relative to CONTENT_DIR/resume. */
        file: z.string().regex(/\.pdf$/i, "must be a PDF"),
        downloadName: z.string().regex(/\.pdf$/i),
        uploadedAt: IsoDate,
      }),
    )
    .default([]),
  documents: z.array(ResumeDocument).default([]),
  /** Document shown on /resume (web version + generated PDF). Takes precedence over `current`. */
  publicDocument: Id.nullable().default(null),
});

/** A custom template from CONTENT_DIR/resume-templates/<id>/. */
export const ResumeTemplateMeta = z.object({
  name: z.string(),
  description: z.string().optional(),
  layouts: z.array(z.enum(["single", "sidebar-left", "sidebar-right"])).default(["single"]),
});

/* ------------------------------------------------------------------ home & theme */

export const SectionId = z.enum(["about", "journey", "work", "research", "life"]);

export const Home = z.object({
  sections: z
    .array(
      z.object({
        id: SectionId,
        enabled: z.boolean().default(true),
        /** Short label next to the number, e.g. "About". */
        label: z.string().optional(),
        title: z.string().optional(),
        /** Small right-aligned note, e.g. "Learning through doing." */
        aside: z.string().optional(),
      }),
    )
    .default([]),
  featuredProjects: z.array(Id).max(4).default([]),
  featuredPhotos: z.array(Id).max(6).default([]),
});

export const ThemeTokens = z.object({
  background: HexColor,
  surface: HexColor,
  text: HexColor,
  textMuted: HexColor,
  accent: HexColor,
  border: HexColor,
  band: HexColor,
});

export const Theme = z.object({
  preset: z.enum(["silver-charcoal"]).default("silver-charcoal"),
  light: ThemeTokens.partial().default({}),
  dark: ThemeTokens.partial().default({}),
});

/* ------------------------------------------------------------------ types */

export type Site = z.infer<typeof Site>;
export type Social = z.infer<typeof Social>;
export type Profile = z.infer<typeof Profile>;
export type Experience = z.infer<typeof Experience>;
export type Education = z.infer<typeof Education>;
export type Publication = z.infer<typeof Publication>;
export type ProjectMeta = z.infer<typeof ProjectMeta>;
export type NoteMeta = z.infer<typeof NoteMeta>;
export type Course = z.infer<typeof Course>;
export type Media = z.infer<typeof Media>;
export type Resume = z.infer<typeof Resume>;
export type ResumeDocument = z.infer<typeof ResumeDocument>;
export type ResumeSection = z.infer<typeof ResumeSection>;
export type ResumeStyle = z.infer<typeof ResumeStyle>;
export type ResumeTemplateMeta = z.infer<typeof ResumeTemplateMeta>;
export type SectionId = z.infer<typeof SectionId>;
export type Home = z.infer<typeof Home>;
export type ThemeTokens = z.infer<typeof ThemeTokens>;
export type Theme = z.infer<typeof Theme>;

export type Project = ProjectMeta & { slug: string; body: string };
export type Note = NoteMeta & { slug: string; body: string };
