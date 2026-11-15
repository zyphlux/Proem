import type { ResumeDocument, ResumeSection } from "@/content/schema";

export type Doc = ResumeDocument;
export type Section = ResumeSection;
export type TemplateInfo = { id: string; name: string; description: string; layouts: ("single" | "sidebar-left" | "sidebar-right")[]; html: string; css: string; builtin: boolean };
export type ResumeFile = { current: string | null; versions: { id: string; file: string; downloadName: string; uploadedAt: string }[]; documents: Doc[]; publicDocument: string | null };

export const SECTION_TYPES: { type: Section["type"]; label: string; help: string }[] = [
  { type: "summary", label: "Summary", help: "Defaults to the About paragraph on your site." },
  { type: "experience", label: "Experience", help: "From Experience." },
  { type: "education", label: "Education", help: "From Education." },
  { type: "projects", label: "Projects", help: "From Projects." },
  { type: "publications", label: "Publications", help: "From Publications, full author lists." },
  { type: "skills", label: "Skills", help: "Groups of skills (resume only)." },
  { type: "list", label: "List", help: "Awards, certifications, languages, service…" },
  { type: "text", label: "Text", help: "Free text. Lines starting with “- ” become bullets." },
];

export const label = (t: Section["type"]) => SECTION_TYPES.find((x) => x.type === t)?.label ?? t;

export function newSection(type: Section["type"], taken: string[]): Section {
  let key: string = type;
  for (let i = 2; taken.includes(key); i++) key = `${type}-${i}`;
  const base = { key, enabled: true, column: "main" as const };
  switch (type) {
    case "skills":
      return { ...base, type, groups: [] };
    case "list":
      return { ...base, type, entries: [] };
    case "text":
      return { ...base, type, text: "" };
    default:
      return { ...base, type } as Section;
  }
}

export function newDocument(id: string): Doc {
  const keys: string[] = [];
  const sec = (t: Section["type"]) => {
    const s = newSection(t, keys);
    keys.push(s.key);
    return s;
  };
  return {
    id,
    name: "New resume",
    template: "classic",
    style: { font: "sans", density: "normal", page: "A4", margin: 14 },
    header: { location: true, email: true, phone: false, website: true },
    sections: [sec("summary"), sec("experience"), sec("education"), sec("projects"), sec("publications"), sec("skills")],
  };
}

export function uniqueId(base: string, taken: string[]) {
  let id = base;
  for (let i = 2; taken.includes(id); i++) id = `${base}-${i}`;
  return id;
}
