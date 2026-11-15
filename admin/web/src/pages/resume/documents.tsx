import { useState } from "react";
import { api } from "../../api";
import { Fields, swap, type Field } from "../../fields";
import { useContent } from "../../store";
import { Chip, SaveBar, same, useSaver, useUnloadGuard } from "../../ui";
import { PreviewPane } from "./preview-pane";
import { SECTION_TYPES, label, newDocument, newSection, uniqueId, type Doc, type ResumeFile, type Section, type TemplateInfo } from "./shared";

type Opt = { value: string; label: string; bullets: string[] };

/** Modular resume editor: documents built from shared site content. */
export function ResumeDocuments({ templates }: { templates: TemplateInfo[] }) {
  const { data } = useContent();
  const original = normalize(data?.json.resume);
  const [value, setValue] = useState<ResumeFile>(original);
  const [base, setBase] = useState(original);
  const [sel, setSel] = useState<string | null>(original.documents[0]?.id ?? null);
  const [open, setOpen] = useState<string | null>(null);
  if (!same(base, original)) {
    setBase(original);
    setValue(original);
  }
  const dirty = !same(value, original);
  useUnloadGuard(dirty);
  const saver = useSaver();

  const doc = value.documents.find((d) => d.id === sel) ?? null;
  const docIndex = value.documents.findIndex((d) => d.id === sel);
  const setDoc = (next: Doc) => {
    setValue({ ...value, documents: value.documents.map((d) => (d.id === sel ? next : d)), publicDocument: value.publicDocument === sel ? next.id : value.publicDocument });
    if (next.id !== sel) setSel(next.id);
  };
  const template = templates.find((t) => t.id === doc?.template);

  const add = (from?: Doc) => {
    const id = uniqueId(from ? `${from.id}-copy` : "resume", value.documents.map((d) => d.id));
    const d = from ? { ...structuredClone(from), id, name: `${from.name} (copy)`, downloadName: undefined } : newDocument(id);
    setValue({ ...value, documents: [...value.documents, d] });
    setSel(id);
  };
  const remove = () => {
    if (!doc || !confirm(`Delete “${doc.name}”?`)) return;
    setValue({ ...value, documents: value.documents.filter((d) => d.id !== doc.id), publicDocument: value.publicDocument === doc.id ? null : value.publicDocument });
    setSel(value.documents.find((d) => d.id !== doc.id)?.id ?? null);
  };

  // Shared-content options for the item pickers.
  const arr = <T,>(x: unknown) => (Array.isArray(x) ? (x as T[]) : []);
  type Exp = { id: string; role: string; organization: string; responsibilities?: string[] };
  type Edu = { id: string; degree: string; institution: string; notes?: string[] };
  type Pub = { id: string; title: string; year: number };
  const options: Record<"experience" | "education" | "projects" | "publications", Opt[]> = {
    experience: arr<Exp>(data?.json.experience).map((x) => ({ value: x.id, label: `${x.role} — ${x.organization}`, bullets: x.responsibilities ?? [] })),
    education: arr<Edu>(data?.json.education).map((x) => ({ value: x.id, label: `${x.degree} — ${x.institution}`, bullets: x.notes ?? [] })),
    projects: (data?.docs.projects ?? []).map((d) => ({ value: d.slug, label: String(d.meta.title ?? d.slug), bullets: [] })),
    publications: arr<Pub>(data?.json.publications).map((x) => ({ value: x.id, label: `${x.title} (${x.year})`, bullets: [] })),
  };
  const socials = arr<{ id: string; label: string }>((data?.json.profile as { socials?: unknown })?.socials);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className="input w-auto min-w-64" value={sel ?? ""} onChange={(e) => setSel(e.target.value)} aria-label="Resume document">
          {value.documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
              {value.publicDocument === d.id ? " — public" : ""}
            </option>
          ))}
          {!value.documents.length && <option value="">No resumes yet</option>}
        </select>
        <button className="btn" onClick={() => add()}>
          + New resume
        </button>
        {doc && (
          <>
            <button className="btn" onClick={() => add(doc)}>
              Duplicate
            </button>
            <button className="btn btn-danger" onClick={remove}>
              Delete
            </button>
          </>
        )}
      </div>

      {doc ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,480px)_1fr]">
          <div className="space-y-6">
            <Panel title="Document">
              <label className="flex items-center gap-2 font-medium">
                <input type="checkbox" checked={value.publicDocument === doc.id} onChange={(e) => setValue({ ...value, publicDocument: e.target.checked ? doc.id : null })} />
                Show this resume on the website (/resume)
              </label>
              {value.publicDocument === doc.id && value.current && <p className="text-xs text-muted">This replaces the uploaded PDF on /resume.</p>}
              <Fields
                fields={[
                  { k: "text", name: "name", label: "Name (internal)", required: true },
                  { k: "text", name: "id", label: "ID", required: true },
                  { k: "text", name: "downloadName", label: "PDF file name", placeholder: "Firstname-Lastname-Resume.pdf" },
                ]}
                value={doc as unknown as Record<string, unknown>}
                onChange={(v) => setDoc(v as unknown as Doc)}
                issues={issuesFor(saver.issues, docIndex)}
              />
            </Panel>

            <Panel title="Template">
              <div className="grid grid-cols-2 gap-2">
                {templates.map((t) => (
                  <button key={t.id} className={`rounded-lg border-2 p-3 text-left ${doc.template === t.id ? "border-accent" : "border-line"}`} onClick={() => setDoc({ ...doc, template: t.id, style: { ...doc.style, layout: t.layouts.includes(doc.style.layout ?? "single") ? doc.style.layout : undefined } })}>
                    <span className="flex items-center gap-1.5 font-semibold">
                      {t.name} {!t.builtin && <Chip tone="info">Custom</Chip>}
                    </span>
                    <span className="mt-1 block text-xs text-muted">{t.description}</span>
                  </button>
                ))}
              </div>
              <StyleEditor doc={doc} layouts={template?.layouts ?? ["single"]} onChange={(style) => setDoc({ ...doc, style })} />
            </Panel>

            <Panel title="Header">
              <Fields
                fields={[
                  { k: "text", name: "name", label: "Name", help: "Empty = your profile name." },
                  { k: "text", name: "headline", label: "Headline", help: "Empty = your current role." },
                  { k: "bool", name: "location", label: "Show location", def: true },
                  { k: "bool", name: "email", label: "Show email", def: true },
                  { k: "bool", name: "phone", label: "Show phone (resume only — the website still hides it)", def: false },
                  { k: "bool", name: "website", label: "Show website URL", def: true },
                ]}
                value={doc.header as Record<string, unknown>}
                onChange={(header) => setDoc({ ...doc, header: header as Doc["header"] })}
              />
              <fieldset>
                <legend className="mb-1 text-[13px] font-medium">Links</legend>
                <label className="mr-4 inline-flex items-center gap-1.5 text-[13px]">
                  <input type="checkbox" checked={!doc.header.links} onChange={(e) => setDoc({ ...doc, header: { ...doc.header, links: e.target.checked ? undefined : socials.map((s) => s.id) } })} /> All social links
                </label>
                {doc.header.links &&
                  socials.map((s) => (
                    <label key={s.id} className="mr-4 inline-flex items-center gap-1.5 text-[13px]">
                      <input
                        type="checkbox"
                        checked={doc.header.links!.includes(s.id)}
                        onChange={(e) => setDoc({ ...doc, header: { ...doc.header, links: e.target.checked ? [...doc.header.links!, s.id] : doc.header.links!.filter((x) => x !== s.id) } })}
                      />
                      {s.label}
                    </label>
                  ))}
              </fieldset>
            </Panel>

            <Panel title="Sections">
              <ul className="space-y-2">
                {doc.sections.map((s, i) => (
                  <li key={s.key} className="rounded-lg border bg-bg/50">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <input type="checkbox" aria-label={`Include ${s.title ?? label(s.type)}`} checked={s.enabled !== false} onChange={(e) => setSections(i, { ...s, enabled: e.target.checked })} />
                      <button className="grow text-left font-medium" onClick={() => setOpen(open === s.key ? null : s.key)} aria-expanded={open === s.key}>
                        {s.title ?? label(s.type)} <span className="text-xs font-normal text-muted">{label(s.type)}</span>
                      </button>
                      {template?.layouts.some((l) => l !== "single") && doc.style.layout !== "single" && (
                        <select className="input w-auto py-0.5 text-xs" value={s.column ?? "main"} onChange={(e) => setSections(i, { ...s, column: e.target.value as "main" | "side" })} aria-label="Column">
                          <option value="main">Main</option>
                          <option value="side">Sidebar</option>
                        </select>
                      )}
                      <button className="btn px-2 py-0.5" disabled={i === 0} onClick={() => setDoc({ ...doc, sections: swap(doc.sections, i, i - 1) })} aria-label="Move up">
                        ↑
                      </button>
                      <button className="btn px-2 py-0.5" disabled={i === doc.sections.length - 1} onClick={() => setDoc({ ...doc, sections: swap(doc.sections, i, i + 1) })} aria-label="Move down">
                        ↓
                      </button>
                      <button className="btn btn-danger px-2 py-0.5" onClick={() => setDoc({ ...doc, sections: doc.sections.filter((_, k) => k !== i) })} aria-label="Remove section">
                        ×
                      </button>
                    </div>
                    {open === s.key && (
                      <div className="border-t p-3">
                        <SectionEditor s={s} onChange={(n) => setSections(i, n)} options={options} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <select className="input mt-3 w-auto" value="" onChange={(e) => e.target.value && (setDoc({ ...doc, sections: [...doc.sections, newSection(e.target.value as Section["type"], doc.sections.map((x) => x.key))] }), setOpen(null))}>
                <option value="">+ Add section…</option>
                {SECTION_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.label} — {t.help}
                  </option>
                ))}
              </select>
            </Panel>
          </div>
          <div className="xl:sticky xl:top-4 xl:h-[calc(100vh-7rem)]">
            <PreviewPane doc={doc} />
          </div>
        </div>
      ) : (
        <p className="text-muted">Create a resume from your site content with “+ New resume”.</p>
      )}
      <SaveBar dirty={dirty} saving={saver.saving} message={saver.message} onReset={() => setValue(original)} onSave={() => saver.run(() => api.put("/api/json/resume", value))} />
    </>
  );

  function setSections(i: number, s: Section) {
    if (!doc) return;
    setDoc({ ...doc, sections: doc.sections.map((x, k) => (k === i ? s : x)) });
  }
}

function normalize(raw: unknown): ResumeFile {
  const r = (raw ?? {}) as Partial<ResumeFile>;
  return { current: r.current ?? null, versions: r.versions ?? [], documents: (r.documents ?? []) as Doc[], publicDocument: r.publicDocument ?? null };
}

function issuesFor(issues: { path: string; message: string }[], i: number) {
  return issues.filter((x) => x.path.startsWith(`documents.${i}.`)).map((x) => ({ ...x, path: x.path.replace(`documents.${i}.`, "") }));
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border bg-panel p-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function StyleEditor({ doc, layouts, onChange }: { doc: Doc; layouts: string[]; onChange: (s: Doc["style"]) => void }) {
  const s = doc.style;
  const seg = <K extends keyof Doc["style"]>(key: K, opts: { v: Doc["style"][K]; l: string }[]) => (
    <span className="inline-flex overflow-hidden rounded-md border">
      {opts.map((o) => (
        <button key={String(o.v)} className={`px-2.5 py-1 text-[13px] ${s[key] === o.v ? "bg-fg text-bg" : "bg-panel"}`} onClick={() => onChange({ ...s, [key]: o.v })}>
          {o.l}
        </button>
      ))}
    </span>
  );
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 pt-2 text-[13px]">
      {layouts.length > 1 && (
        <>
          <span className="font-medium">Layout</span>
          <span>{seg("layout", layouts.map((l) => ({ v: l as Doc["style"]["layout"], l: l === "single" ? "Single" : l === "sidebar-left" ? "Sidebar left" : "Sidebar right" })))}</span>
        </>
      )}
      <span className="font-medium">Accent</span>
      <span className="flex items-center gap-2">
        <input type="color" value={s.accent ?? "#245BE5"} onChange={(e) => onChange({ ...s, accent: e.target.value.toUpperCase() })} className="h-7 w-9 rounded border" aria-label="Accent colour" />
        <code className="text-xs">{s.accent ?? "#245BE5"}</code>
        {s.accent && (
          <button className="text-xs text-accent" onClick={() => onChange({ ...s, accent: undefined })}>
            Reset
          </button>
        )}
      </span>
      <span className="font-medium">Font</span>
      <span>{seg("font", [{ v: "sans", l: "Sans" }, { v: "serif", l: "Serif" }])}</span>
      <span className="font-medium">Density</span>
      <span>{seg("density", [{ v: "compact", l: "Compact" }, { v: "normal", l: "Normal" }, { v: "airy", l: "Airy" }])}</span>
      <span className="font-medium">Paper</span>
      <span>{seg("page", [{ v: "A4", l: "A4" }, { v: "Letter", l: "Letter" }])}</span>
      <span className="font-medium">Margins</span>
      <span className="flex items-center gap-2">
        <input type="range" min={6} max={30} value={s.margin} onChange={(e) => onChange({ ...s, margin: Number(e.target.value) })} aria-label="Margins in millimetres" />
        <span>{s.margin} mm</span>
      </span>
    </div>
  );
}

const listFields: Field[] = [
  { k: "text", name: "title", label: "Title", required: true },
  { k: "text", name: "subtitle", label: "Subtitle" },
  { k: "text", name: "date", label: "Date" },
  { k: "text", name: "detail", label: "Detail" },
  { k: "url", name: "url", label: "Link" },
];

function SectionEditor({ s, onChange, options }: { s: Section; onChange: (s: Section) => void; options: Record<"experience" | "education" | "projects" | "publications", Opt[]> }) {
  const title = (
    <label className="mb-3 block">
      <span className="mb-1 block text-[13px] font-medium">Section title</span>
      <input className="input" placeholder={label(s.type)} value={s.title ?? ""} onChange={(e) => onChange({ ...s, title: e.target.value || undefined })} />
    </label>
  );
  switch (s.type) {
    case "summary":
      return (
        <>
          {title}
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium">Text</span>
            <textarea className="input" rows={4} placeholder="Empty = the About paragraph from your site" value={s.text ?? ""} onChange={(e) => onChange({ ...s, text: e.target.value || undefined })} />
          </label>
        </>
      );
    case "text":
      return (
        <>
          {title}
          <textarea className="input" rows={5} value={s.text} onChange={(e) => onChange({ ...s, text: e.target.value })} aria-label="Text" />
        </>
      );
    case "skills":
      return (
        <>
          {title}
          <Fields
            fields={[{ k: "repeat", name: "groups", label: "Groups", fields: [{ k: "text", name: "label", label: "Label" }, { k: "lines", name: "items", label: "Skills" }], itemLabel: (v) => String(v.label ?? ""), newItem: () => ({ label: "", items: [] }) }]}
            value={{ groups: s.groups }}
            onChange={(v) => onChange({ ...s, groups: (v.groups as typeof s.groups) ?? [] })}
          />
        </>
      );
    case "list":
      return (
        <>
          {title}
          <Fields fields={[{ k: "repeat", name: "entries", label: "Entries", fields: listFields, itemLabel: (v) => String(v.title ?? ""), newItem: () => ({ title: "" }) }]} value={{ entries: s.entries }} onChange={(v) => onChange({ ...s, entries: (v.entries as typeof s.entries) ?? [] })} />
        </>
      );
    default:
      return (
        <>
          {title}
          <RefItems key={s.key} s={s} options={options[s.type]} onChange={onChange} />
        </>
      );
  }
}

type RefSection = Extract<Section, { items?: unknown }>;

/** Choose which shared items appear, in what order, and override their bullets for this resume. */
function RefItems({ s, options, onChange }: { s: RefSection; options: Opt[]; onChange: (s: Section) => void }) {
  const items = s.items;
  // Raw textarea text while typing (keyed by section, so it resets per section).
  const [draft, setDraft] = useState<Record<string, string>>({});
  return (
    <div className="space-y-2 text-[13px]">
      <label className="flex items-center gap-2">
        <input type="radio" checked={!items} onChange={() => onChange({ ...s, items: undefined })} /> Everything, updated automatically from the site
      </label>
      <label className="flex items-center gap-2">
        <input type="radio" checked={Boolean(items)} onChange={() => onChange({ ...s, items: options.map((o) => ({ ref: o.value })) })} /> Choose items and wording
      </label>
      {items && (
        <ul className="mt-2 space-y-2">
          {items.map((it, i) => {
            const o = options.find((x) => x.value === it.ref);
            const custom = it.bullets !== undefined;
            return (
              <li key={it.ref} className="rounded-md border bg-panel p-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked onChange={() => onChange({ ...s, items: items.filter((x) => x.ref !== it.ref) })} aria-label={`Remove ${o?.label ?? it.ref}`} />
                  <span className="grow">{o?.label ?? <span className="text-danger">{it.ref} (missing)</span>}</span>
                  <button className="btn px-1.5 py-0" disabled={i === 0} onClick={() => onChange({ ...s, items: swap(items, i, i - 1) })} aria-label="Move up">
                    ↑
                  </button>
                  <button className="btn px-1.5 py-0" disabled={i === items.length - 1} onClick={() => onChange({ ...s, items: swap(items, i, i + 1) })} aria-label="Move down">
                    ↓
                  </button>
                </div>
                <label className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                  <input type="checkbox" checked={custom} onChange={(e) => onChange({ ...s, items: items.map((x) => (x.ref === it.ref ? { ref: x.ref, bullets: e.target.checked ? (o?.bullets.length ? o.bullets : [""]) : undefined } : x)) })} />
                  Custom bullet points for this resume {o?.bullets.length ? "(site text is used otherwise)" : ""}
                </label>
                {custom && (
                  <textarea
                    className="input mt-1.5"
                    rows={Math.max(2, (it.bullets?.length ?? 1) + 1)}
                    value={draft[it.ref] ?? it.bullets!.join("\n")}
                    placeholder="One bullet per line"
                    onChange={(e) => {
                      setDraft({ ...draft, [it.ref]: e.target.value });
                      onChange({ ...s, items: items.map((x) => (x.ref === it.ref ? { ref: x.ref, bullets: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean) } : x)) });
                    }}
                  />
                )}
              </li>
            );
          })}
          {options
            .filter((o) => !items.some((x) => x.ref === o.value))
            .map((o) => (
              <li key={o.value} className="flex items-center gap-2 px-2 text-muted">
                <input type="checkbox" checked={false} onChange={() => onChange({ ...s, items: [...items, { ref: o.value }] })} aria-label={`Add ${o.label}`} />
                {o.label}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
