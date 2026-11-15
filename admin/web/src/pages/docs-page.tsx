import { useRef, useState } from "react";
import { api } from "../api";
import { Fields, type Field } from "../fields";
import { useContent } from "../store";
import { ItemChips, PageHeader, SaveBar, same, useSaver, useUnloadGuard } from "../ui";

type Doc = { slug: string; meta: Record<string, unknown>; body: string };

const TEMPLATES: Record<string, string> = {
  projects: "## Context\n\n\n## My role\n\n\n## Approach\n\n\n## Demo & results\n\n\n## Reflection\n",
  notes: "",
};

/** Markdown documents with frontmatter (projects, notes). */
export function DocsPage({ kind, title, fields, intro }: { kind: "projects" | "notes"; title: string; fields: Field[]; intro?: string }) {
  const { data } = useContent();
  const docs = data?.docs[kind] ?? [];
  const [slug, setSlug] = useState<string | null>(docs[0]?.slug ?? null);
  const [draft, setDraft] = useState<(Doc & { isNew?: boolean; previousSlug?: string }) | null>(null);
  const saver = useSaver();
  const importRef = useRef<HTMLInputElement>(null);

  const saved = docs.find((d) => d.slug === slug) ?? null;
  const doc = draft ?? (saved ? { ...saved, previousSlug: saved.slug } : null);
  const dirty = Boolean(draft) && !same(draft, saved ? { ...saved, previousSlug: saved.slug } : null);
  useUnloadGuard(dirty);

  const select = (s: string) => {
    if (dirty && !confirm("Discard unsaved changes?")) return;
    setDraft(null);
    setSlug(s);
  };
  const create = () => {
    if (dirty && !confirm("Discard unsaved changes?")) return;
    let n = 1;
    while (docs.some((d) => d.slug === `untitled-${n}`)) n++;
    const meta: Record<string, unknown> = kind === "notes" ? { title: "Untitled", date: new Date().toISOString().slice(0, 10), status: "draft" } : { title: "Untitled", summary: "", status: "draft" };
    setDraft({ slug: `untitled-${n}`, meta, body: TEMPLATES[kind], isNew: true });
    setSlug(null);
  };
  const save = async () => {
    if (!doc) return;
    const ok = await saver.run(() => api.put(`/api/doc/${kind}/${doc.slug}`, { meta: doc.meta, body: doc.body, previousSlug: doc.isNew ? undefined : doc.previousSlug }));
    if (ok) {
      setSlug(doc.slug);
      setDraft(null);
    }
  };
  const remove = async () => {
    if (!doc || doc.isNew) return setDraft(null);
    if (!confirm(`Delete “${String(doc.meta.title ?? doc.slug)}”?`)) return;
    const ok = await saver.run(() => api.del(`/api/doc/${kind}/${doc.slug}`), "Deleted. Publish to remove it from the live site.");
    if (ok) {
      setDraft(null);
      setSlug(docs.find((d) => d.slug !== doc.slug)?.slug ?? null);
    }
  };
  const importMd = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    await saver.run(() => api.post(`/api/import/${kind}`, fd), `Imported ${file.name}.`);
  };
  const edit = (patch: Partial<Doc>) => doc && setDraft({ ...doc, ...patch });

  return (
    <>
      <PageHeader title={title} intro={intro}>
        <span className="flex gap-2">
          <input ref={importRef} type="file" accept=".md" className="hidden" onChange={(e) => e.target.files?.[0] && importMd(e.target.files[0])} />
          <button className="btn" onClick={() => importRef.current?.click()}>
            Import .md
          </button>
          <button className="btn" onClick={create}>
            + New
          </button>
        </span>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <ul className="h-fit overflow-hidden rounded-lg border bg-panel">
          {draft?.isNew && <li className="border-b bg-bg px-3 py-2.5 font-medium">{String(draft.meta.title)} (new)</li>}
          {docs.map((d) => (
            <li key={d.slug}>
              <button className={`block w-full border-b px-3 py-2.5 text-left last:border-b-0 hover:bg-bg ${d.slug === slug ? "bg-bg font-medium" : ""}`} onClick={() => select(d.slug)}>
                <span className="block truncate">{String(d.meta.title ?? d.slug)}</span>
                <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted">
                  <span className="truncate">{d.slug}</span>
                  <ItemChips item={d.meta} changed={data?.changed.some((c) => c.file === `${kind}/${d.slug}.md`)} />
                </span>
              </button>
            </li>
          ))}
          {!docs.length && !draft && <li className="p-4 text-muted">Nothing yet.</li>}
        </ul>
        {doc ? (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,420px)_1fr]">
            <div>
              <label className="mb-4 block">
                <span className="mb-1 block text-[13px] font-medium">URL slug</span>
                <input className="input font-mono" value={doc.slug} onChange={(e) => edit({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
                <span className="mt-1 block text-xs text-muted">/{kind === "projects" ? "work" : "notes"}/{doc.slug}/</span>
              </label>
              <Fields fields={fields} value={doc.meta} onChange={(meta) => edit({ meta })} issues={saver.issues} />
              <button className="btn btn-danger mt-6" onClick={remove}>
                Delete
              </button>
            </div>
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium">Story (Markdown)</span>
              <textarea className="input min-h-[60vh] font-mono text-[13px] leading-relaxed" value={doc.body} onChange={(e) => edit({ body: e.target.value })} spellCheck />
              <span className="mt-1 block text-xs text-muted">
                {kind === "projects" ? "Use ## headings; they become the page’s table of contents. " : ""}Raw HTML is not rendered. Check the result in Preview.
              </span>
            </label>
          </div>
        ) : (
          <p className="text-muted">Select or create an item.</p>
        )}
      </div>
      <SaveBar dirty={dirty || Boolean(draft?.isNew)} saving={saver.saving} message={saver.message} onReset={() => setDraft(null)} onSave={save} />
    </>
  );
}
