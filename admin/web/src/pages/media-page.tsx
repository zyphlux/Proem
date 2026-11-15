import { useRef, useState } from "react";
import { api } from "../api";
import { Fields } from "../fields";
import { mediaFields } from "../modules";
import { useContent } from "../store";
import { ItemChips, PageHeader, SaveBar, same, useSaver, useUnloadGuard } from "../ui";

type M = Record<string, unknown> & { id: string; file: string; focal?: { x: number; y: number } };

/** Upload images, edit alt text / captions / albums, set the crop focus. */
export function MediaPage() {
  const { data } = useContent();
  const original = (Array.isArray(data?.json.media) ? data!.json.media : []) as M[];
  const [items, setItems] = useState(original);
  const [base, setBase] = useState(original);
  const [sel, setSel] = useState<string | null>(original[0]?.id ?? null);
  const [drag, setDrag] = useState(false);
  if (!same(base, original)) {
    setBase(original);
    setItems(original);
  }
  const dirty = !same(items, original);
  useUnloadGuard(dirty);
  const saver = useSaver();
  const input = useRef<HTMLInputElement>(null);
  const current = items.find((m) => m.id === sel);

  const upload = async (files: FileList | File[]) => {
    if (dirty && !confirm("Uploading reloads the list. Discard unsaved edits?")) return;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("alt", "");
      await saver.run(() => api.post("/api/media", fd), `Uploaded ${file.name}. Add alt text, then save.`);
    }
  };
  const update = (v: Record<string, unknown>) => setItems(items.map((m) => (m.id === sel ? ({ ...m, ...v } as M) : m)));

  return (
    <>
      <PageHeader title="Media" intro="Images are re-encoded on upload and their location data is removed. Photos with an album appear on /life.">
        <span>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} />
          <button className="btn btn-primary" onClick={() => input.current?.click()}>
            Upload images
          </button>
        </span>
      </PageHeader>
      <div
        className={`mb-6 rounded-lg border-2 border-dashed p-4 text-center text-muted ${drag ? "border-accent text-accent" : ""}`}
        onDragOver={(e) => (e.preventDefault(), setDrag(true))}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => (e.preventDefault(), setDrag(false), upload(e.dataTransfer.files))}
      >
        Drop images here
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <ul className="grid h-fit grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((m) => (
            <li key={m.id}>
              <button className={`block w-full overflow-hidden rounded-lg border-2 text-left ${m.id === sel ? "border-accent" : "border-transparent"}`} onClick={() => setSel(m.id)}>
                <img src={`/api/media-file/${m.id}?w=320`} alt="" className="aspect-[4/3] w-full bg-panel object-cover" loading="lazy" style={{ objectPosition: `${m.focal?.x ?? 50}% ${m.focal?.y ?? 50}%` }} />
                <span className="flex items-center justify-between gap-1 bg-panel px-2 py-1.5 text-xs">
                  <span className="truncate">{m.id}</span>
                  <ItemChips item={m} />
                </span>
              </button>
            </li>
          ))}
        </ul>
        {current && (
          <div>
            <p className="mb-2 text-xs text-muted">Click the image to set the crop focus.</p>
            <div
              className="relative mb-4 cursor-crosshair overflow-hidden rounded-lg border"
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                update({ focal: { x: Math.round(((e.clientX - r.left) / r.width) * 100), y: Math.round(((e.clientY - r.top) / r.height) * 100) } });
              }}
            >
              <img src={`/api/media-file/${current.id}?w=840`} alt={String(current.alt ?? "")} className="w-full" />
              <span className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.5)]" style={{ left: `${current.focal?.x ?? 50}%`, top: `${current.focal?.y ?? 50}%` }} />
            </div>
            <p className="mb-4 font-mono text-xs text-muted">
              {current.id} · media/{current.file}
            </p>
            <Fields fields={mediaFields} value={current} onChange={(v) => setItems(items.map((m) => (m.id === sel ? (v as M) : m)))} issues={saver.issues.filter((i) => i.path.startsWith(`${items.indexOf(current)}.`)).map((i) => ({ ...i, path: i.path.replace(/^\d+\./, "") }))} />
            <button
              className="btn btn-danger mt-6"
              onClick={() => {
                if (!confirm(`Remove “${current.id}” from the library? The file stays in the content folder.`)) return;
                setItems(items.filter((m) => m.id !== sel));
                setSel(null);
              }}
            >
              Remove from library
            </button>
          </div>
        )}
      </div>
      <SaveBar dirty={dirty} saving={saver.saving} message={saver.message} onReset={() => setItems(original)} onSave={() => saver.run(() => api.put("/api/json/media", items))} />
    </>
  );
}
