import { useState } from "react";
import { api } from "../../api";
import { useContent } from "../../store";
import { Chip, SaveBar, useSaver } from "../../ui";
import { PreviewPane } from "./preview-pane";
import { newDocument, uniqueId, type Doc, type TemplateInfo } from "./shared";

const LAYOUTS = ["single", "sidebar-left", "sidebar-right"] as const;

/** View built-in templates, duplicate them, and edit custom templates (HTML placeholders + CSS). */
export function ResumeTemplates({ templates, partials, reload }: { templates: TemplateInfo[]; partials: { section: string; contact: string }; reload: () => void }) {
  const { data } = useContent();
  const [sel, setSel] = useState(templates[0]?.id ?? "");
  const [edit, setEdit] = useState<{ id: string; isNew: boolean; name: string; description: string; layouts: string[]; html: string; css: string } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const saver = useSaver();
  const docs = ((data?.json.resume as { documents?: Doc[] })?.documents ?? []) as Doc[];
  const [docId, setDocId] = useState(docs[0]?.id ?? "");
  const t = templates.find((x) => x.id === sel);
  const previewDoc: Doc = { ...(docs.find((d) => d.id === docId) ?? newDocument("preview")), template: "custom:editing" };
  const customId = (id: string) => id.replace(/^custom:/, "");

  const start = (tpl: TemplateInfo, duplicate: boolean) => {
    if (duplicate) {
      const id = uniqueId(`my-${tpl.id.replace(/^custom:/, "")}`, templates.map((x) => customId(x.id)));
      // Built-in CSS is scoped to .r-tpl-<id>; make the copy apply to its own wrapper.
      const css = tpl.css.replaceAll(`.r-tpl-${tpl.id}`, ".resume");
      setEdit({ id, isNew: true, name: `${tpl.name} (custom)`, description: tpl.description, layouts: [...tpl.layouts], html: tpl.html.trim(), css: css.trim() });
    } else {
      setEdit({ id: customId(tpl.id), isNew: false, name: tpl.name, description: tpl.description, layouts: [...tpl.layouts], html: tpl.html, css: tpl.css });
    }
  };

  const select = (id: string) => {
    setSel(id);
    setEdit(null);
    setWarnings([]);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_minmax(0,1fr)]">
      <ul className="h-fit overflow-hidden rounded-lg border bg-panel">
        {templates.map((x) => (
          <li key={x.id}>
            <button className={`block w-full border-b px-3 py-2.5 text-left last:border-b-0 hover:bg-bg ${x.id === sel ? "bg-bg font-medium" : ""}`} onClick={() => select(x.id)}>
              <span className="flex items-center gap-1.5">
                {x.name} {x.builtin ? <Chip tone="draft">Built-in</Chip> : <Chip tone="info">Custom</Chip>}
              </span>
              <span className="mt-0.5 block text-xs text-muted">{x.description}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="min-w-0 space-y-4">
        {t && !edit && (
          <>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={() => start(t, true)}>
                Duplicate as custom template
              </button>
              {!t.builtin && (
                <>
                  <button className="btn" onClick={() => start(t, false)}>
                    Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => confirm(`Delete template “${t.name}”?`) && saver.run(() => api.del(`/api/resume/templates/${customId(t.id)}`), "Template deleted.").then((ok) => ok && reload())}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
            {saver.message && <p className={`text-[13px] ${saver.message.tone === "ok" ? "text-ok" : "text-danger"}`}>{saver.message.text}</p>}
            <Code label="template.html" value={t.html} readOnly />
            <Code label="style.css" value={t.css} readOnly />
          </>
        )}
        {edit && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-[13px] font-medium">Folder (ID)</span>
                <input className="input font-mono" value={edit.id} disabled={!edit.isNew} onChange={(e) => setEdit({ ...edit, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
              </label>
              <label>
                <span className="mb-1 block text-[13px] font-medium">Name</span>
                <input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium">Description</span>
              <input className="input" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
            </label>
            <fieldset className="text-[13px]">
              <legend className="mb-1 font-medium">Supported layouts (first is the default)</legend>
              {LAYOUTS.map((l) => (
                <label key={l} className="mr-4 inline-flex items-center gap-1.5">
                  <input type="checkbox" checked={edit.layouts.includes(l)} onChange={(e) => setEdit({ ...edit, layouts: e.target.checked ? [...edit.layouts, l] : edit.layouts.filter((x) => x !== l) })} /> {l}
                </label>
              ))}
            </fieldset>
            <Code label="template.html (Mustache)" value={edit.html} onChange={(html) => setEdit({ ...edit, html })} rows={16} />
            <Code label="style.css" value={edit.css} onChange={(css) => setEdit({ ...edit, css })} rows={16} />
            {warnings.length > 0 && (
              <p className="rounded border border-warn p-2 text-[13px] text-warn">
                Removed from CSS (external resources aren’t allowed): {warnings.join(", ")}
              </p>
            )}
            <details className="rounded-lg border bg-panel p-3 text-[13px]">
              <summary className="cursor-pointer font-medium">Template reference</summary>
              <div className="mt-2 space-y-2 text-muted">
                <p>
                  Values: <code>name</code>, <code>headline</code>, <code>contact[]</code> (kind, text, url), <code>sections[]</code>, <code>main[]</code>, <code>side[]</code>, <code>hasSide</code>, <code>layout</code>.
                </p>
                <p>
                  Each section: <code>type</code>, <code>title</code>, <code>entries[]</code> (title, url, subtitle, location, date, meta, authors[] with name/self/last, bullets[], tech), <code>blocks[]</code> (isList, text, items[]), <code>groups[]</code> (label, itemsText), plus <code>hasEntries</code>, <code>hasBlocks</code>, <code>hasGroups</code>.
                </p>
                <p>
                  Partials: <code>{"{{> section}}"}</code> renders a section, <code>{"{{> contact}}"}</code> the contact list. Output is wrapped in <code>.resume</code>; CSS variables: <code>--r-accent --r-font --r-serif --r-size --r-gap --r-muted --r-line</code>.
                </p>
                <p>No scripts, no external resources (url(), @import), no inline style attributes. Links must be http(s), mailto or tel.</p>
                <Code label="section partial" value={partials.section.trim()} readOnly rows={10} />
              </div>
            </details>
            <SaveBar
              dirty
              saving={saver.saving}
              message={saver.message}
              onReset={() => setEdit(null)}
              onSave={() =>
                saver
                  .run(() => api.put(`/api/resume/templates/${edit.id}`, { meta: { name: edit.name, description: edit.description, layouts: edit.layouts.length ? edit.layouts : ["single"] }, html: edit.html, css: edit.css }), "Template saved. Choose it in a resume to use it.")
                  .then((ok) => {
                    if (ok) {
                      reload();
                      setSel(`custom:${edit.id}`);
                      setEdit(null);
                    }
                  })
              }
            />
          </>
        )}
      </div>

      <div className="min-w-0 xl:sticky xl:top-4 xl:h-[calc(100vh-7rem)]">
        <label className="mb-2 flex items-center gap-2 text-[13px]">
          Preview with
          <select className="input w-auto" value={docId} onChange={(e) => setDocId(e.target.value)}>
            {docs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
            {!docs.length && <option value="">Default sections</option>}
          </select>
        </label>
        {(edit || t) && <PreviewPane doc={previewDoc} template={edit ? { html: edit.html, css: edit.css, layouts: edit.layouts } : { html: t!.html, css: t!.css, layouts: t!.layouts }} onWarnings={setWarnings} />}
      </div>
    </div>
  );
}

function Code({ label, value, onChange, readOnly, rows = 12 }: { label: string; value: string; onChange?: (v: string) => void; readOnly?: boolean; rows?: number }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium">{label}</span>
      <textarea className="input font-mono text-[12px] leading-relaxed" rows={rows} value={value} readOnly={readOnly} spellCheck={false} onChange={(e) => onChange?.(e.target.value)} />
    </label>
  );
}
