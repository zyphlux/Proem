/** What each admin module edits, and which fields it shows. Mirrors src/content/schema.ts. */
import { visibilityFields, type Field } from "./fields";

const idField = (help = "Lowercase letters, digits and dashes. Used in links; avoid changing it later."): Field => ({ k: "text", name: "id", label: "ID", required: true, help });

export const siteFields: Field[] = [
  { k: "text", name: "title", label: "Site title", required: true },
  { k: "url", name: "url", label: "Canonical URL", help: "e.g. https://example.com — needed for the sitemap and social previews." },
  { k: "textarea", name: "description", label: "Description", required: true, help: "Used by search engines and link previews." },
  { k: "text", name: "locale", label: "Language", placeholder: "en" },
];

export const profileFields: Field[] = [
  { k: "text", name: "name", label: "Name", required: true },
  { k: "lines", name: "authorNames", label: "Names in author lists", help: "Highlighted in publications, e.g. “Alex Rivera” and “A. Rivera”." },
  { k: "text", name: "location", label: "Location" },
  { k: "text", name: "greeting", label: "Greeting", placeholder: "Hi, I’m" },
  { k: "textarea", name: "intro", label: "Introduction", required: true, help: "The first thing visitors read. One or two sentences." },
  { k: "ref", name: "portrait", label: "Portrait", source: "media", help: "Leave empty to use the graph composition." },
  { k: "lines", name: "orbitLabels", label: "Orbit labels", max: 2 },
  { k: "text", name: "now", label: "NOW line (override)", help: "Empty = your current job from Experience." },
  { k: "lines", name: "interests", label: "Interests" },
  {
    k: "group",
    name: "about",
    label: "About",
    fields: [
      { k: "textarea", name: "statement", label: "Statement", required: true },
      { k: "textarea", name: "body", label: "Paragraph", required: true, rows: 4 },
      { k: "lines", name: "threads", label: "Threads", max: 4, help: "2–4 short labels joined by a line." },
    ],
  },
  { k: "repeat", name: "currently", label: "Currently", help: "Hand-picked lines such as Reading / Playing.", fields: [{ k: "text", name: "label", label: "Label" }, { k: "text", name: "value", label: "Value" }], itemLabel: (v) => String(v.label ?? "") },
  {
    k: "group",
    name: "contact",
    label: "Contact",
    fields: [
      { k: "text", name: "title", label: "Heading", placeholder: "Say hello." },
      { k: "text", name: "blurb", label: "Line" },
      { k: "email", name: "email", label: "Email" },
      { k: "text", name: "phone", label: "Phone" },
      { k: "bool", name: "showPhone", label: "Show phone number publicly", def: false },
    ],
  },
  {
    k: "repeat",
    name: "socials",
    label: "Social links",
    fields: [idField("e.g. github"), { k: "text", name: "label", label: "Label", required: true }, { k: "url", name: "url", label: "URL", required: true }, { k: "bool", name: "verified", label: "Link checked", def: true }],
    itemLabel: (v) => String(v.label ?? v.id ?? ""),
    newItem: () => ({ id: "", label: "", url: "" }),
  },
];

export const homeFields: Field[] = [
  {
    k: "repeat",
    name: "sections",
    label: "Home sections (in order)",
    help: "Numbers are assigned automatically; sections without content are hidden.",
    fields: [
      { k: "select", name: "id", label: "Section", options: ["about", "journey", "work", "research", "life"] },
      { k: "bool", name: "enabled", label: "Show", def: true },
      { k: "text", name: "label", label: "Label" },
      { k: "text", name: "title", label: "Title" },
      { k: "text", name: "aside", label: "Side note" },
    ],
    itemLabel: (v) => String(v.id ?? ""),
    newItem: () => ({ id: "about" }),
  },
  { k: "refs", name: "featuredProjects", label: "Featured projects", source: "projects", help: "Two works best. Archived projects can’t be featured." },
  { k: "refs", name: "featuredPhotos", label: "Featured photos", source: "media" },
];

export type CollectionModule = {
  name: "experience" | "education" | "publications" | "courses";
  title: string;
  keyField: string;
  label: (v: Record<string, unknown>) => string;
  sub: (v: Record<string, unknown>) => string;
  fields: Field[];
  newItem: () => Record<string, unknown>;
};

export const collections: Record<string, CollectionModule> = {
  experience: {
    name: "experience",
    title: "Experience",
    keyField: "id",
    label: (v) => `${v.organization ?? "New"} — ${v.role ?? ""}`,
    sub: (v) => `${v.start ?? "?"} – ${v.end === null ? "now" : (v.end ?? "?")}`,
    newItem: () => ({ id: "", organization: "", role: "", start: "", end: null }),
    fields: [
      idField(),
      { k: "text", name: "organization", label: "Organization", required: true },
      { k: "url", name: "organizationUrl", label: "Organization website" },
      { k: "text", name: "role", label: "Role", required: true },
      { k: "select", name: "employment", label: "Type", options: ["full-time", "part-time", "casual", "contract", "internship", "volunteer"] },
      { k: "ym", name: "start", label: "Start", required: true },
      { k: "ym-or-now", name: "end", label: "End", nowLabel: "Current" },
      { k: "text", name: "location", label: "Location" },
      { k: "lines", name: "responsibilities", label: "Responsibilities", help: "Only confirmed facts. Shown when the row is expanded." },
      { k: "refs", name: "relatedProjects", label: "Related projects", source: "projects" },
      ...visibilityFields,
    ],
  },
  education: {
    name: "education",
    title: "Education",
    keyField: "id",
    label: (v) => `${v.institution ?? "New"} — ${v.degree ?? ""}`,
    sub: (v) => `${v.start ?? "?"} – ${v.end === null ? "now" : (v.end ?? "?")}`,
    newItem: () => ({ id: "", institution: "", degree: "", start: "", end: null, state: "in-progress" }),
    fields: [
      idField(),
      { k: "text", name: "institution", label: "Institution", required: true },
      { k: "url", name: "institutionUrl", label: "Institution website" },
      { k: "text", name: "degree", label: "Degree", required: true },
      { k: "text", name: "kind", label: "Kind", help: "e.g. Research" },
      { k: "ym", name: "start", label: "Start", required: true },
      { k: "ym-or-now", name: "end", label: "End", nowLabel: "In progress" },
      { k: "ym", name: "expectedEnd", label: "Expected completion" },
      { k: "select", name: "state", label: "State", options: ["in-progress", "completed"] },
      { k: "lines", name: "notes", label: "Notes" },
      { k: "refs", name: "relatedProjects", label: "Related projects", source: "projects" },
      ...visibilityFields,
    ],
  },
  publications: {
    name: "publications",
    title: "Publications",
    keyField: "id",
    label: (v) => String(v.title ?? "New publication"),
    sub: (v) => `${v.venueShort ?? ""} ${v.year ?? ""}`,
    newItem: () => ({ id: "", title: "", authors: [], venue: "", venueShort: "", year: new Date().getFullYear(), type: "conference" }),
    fields: [
      idField(),
      { k: "textarea", name: "title", label: "Title", required: true, rows: 2 },
      { k: "lines", name: "authors", label: "Authors (in published order)", required: true },
      { k: "text", name: "venue", label: "Venue (full)", required: true },
      { k: "text", name: "venueShort", label: "Venue (short)", required: true, placeholder: "CHI" },
      { k: "number", name: "year", label: "Year", required: true },
      { k: "select", name: "type", label: "Type", options: ["conference", "journal", "workshop", "demo", "poster", "preprint", "thesis"] },
      {
        k: "group",
        name: "links",
        label: "Links (empty ones are hidden)",
        fields: ["paper", "doi", "code", "demo", "slides", "video", "page"].map((n) => ({ k: "url" as const, name: n, label: n === "page" ? "Details page" : n[0].toUpperCase() + n.slice(1) })),
      },
      { k: "code", name: "bibtex", label: "BibTeX", rows: 8 },
      { k: "refs", name: "relatedProjects", label: "Related projects", source: "projects" },
      ...visibilityFields,
    ],
  },
  courses: {
    name: "courses",
    title: "Courses",
    keyField: "code",
    label: (v) => `${v.code ?? "NEW"} ${v.name ?? ""}`,
    sub: (v) => String(v.institution ?? ""),
    newItem: () => ({ code: "", name: "", institution: "" }),
    fields: [
      { k: "text", name: "code", label: "Code", required: true },
      { k: "text", name: "name", label: "Name", required: true },
      { k: "text", name: "institution", label: "Institution", required: true },
      { k: "textarea", name: "description", label: "Description" },
      { k: "lines", name: "tags", label: "Tags" },
      { k: "url", name: "repo", label: "Coursework repository" },
      { k: "url", name: "handbookUrl", label: "Handbook" },
      ...visibilityFields,
    ],
  },
};

export const projectMetaFields: Field[] = [
  { k: "text", name: "title", label: "Title", required: true },
  { k: "text", name: "summary", label: "One-line summary", required: true },
  { k: "text", name: "role", label: "My role", help: "Required for the story page to be published." },
  { k: "ym", name: "start", label: "Start" },
  { k: "ym-or-now", name: "end", label: "End", optional: true },
  { k: "lines", name: "tech", label: "Built with" },
  { k: "ref", name: "cover", label: "Cover image", source: "media", help: "Without one, a labelled concept preview is drawn." },
  { k: "select", name: "preview", label: "Concept preview style", options: ["graph", "dashboard"], optional: true },
  { k: "group", name: "links", label: "Links", fields: [{ k: "url", name: "code", label: "Code" }, { k: "url", name: "demo", label: "Demo" }, { k: "url", name: "website", label: "Website" }] },
  { k: "refs", name: "publications", label: "Related publications", source: "publications" },
  { k: "bool", name: "archived", label: "Earlier work (listed on /work only)", def: false },
  { k: "number", name: "order", label: "Order" },
  ...visibilityFields,
];

export const noteMetaFields: Field[] = [
  { k: "text", name: "title", label: "Title", required: true },
  { k: "text", name: "summary", label: "Summary" },
  { k: "date", name: "date", label: "Date", required: true },
  { k: "lines", name: "tags", label: "Tags" },
  ...visibilityFields,
];

export const mediaFields: Field[] = [
  { k: "textarea", name: "alt", label: "Alt text", required: true, rows: 2, help: "Describe what is in the picture for people who can’t see it." },
  { k: "text", name: "title", label: "Title" },
  { k: "textarea", name: "caption", label: "Caption", rows: 2 },
  { k: "text", name: "location", label: "Location" },
  { k: "ym", name: "date", label: "Date" },
  { k: "lines", name: "albums", label: "Albums", help: "Photos with an album appear on /life." },
  { k: "bool", name: "concept", label: "Illustration / mock-up (shows a “Concept” badge)", def: false },
  ...visibilityFields,
];
