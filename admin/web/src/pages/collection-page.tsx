import { useState } from "react";
import { api } from "../api";
import { Fields, swap } from "../fields";
import type { CollectionModule } from "../modules";
import { useContent } from "../store";
import { ItemChips, PageHeader, SaveBar, same, useSaver, useUnloadGuard } from "../ui";

type Item = Record<string, unknown>;

/** List + form editor for array files (experience, education, publications, courses). */
export function CollectionPage({ m }: { m: CollectionModule }) {
  const { data } = useContent();
  const original = (Array.isArray(data?.json[m.name]) ? data!.json[m.name] : []) as Item[];
  const [items, setItems] = useState<Item[]>(original);
  const [base, setBase] = useState(original);
  const [sel, setSel] = useState(0);
  if (!same(base, original)) {
    setBase(original);
    setItems(original);
  }
  const dirty = !same(items, original);
  useUnloadGuard(dirty);
  const saver = useSaver();
  const fileChanged = Boolean(data?.changed.some((c) => c.file.endsWith(`${m.name}.json`)));
  const current = items[sel];

  const add = () => {
    setItems([...items, m.newItem()]);
    setSel(items.length);
  };
  const remove = () => {
    if (!current || !confirm(`Delete “${m.label(current)}”? You can still discard before saving.`)) return;
    setItems(items.filter((_, i) => i !== sel));
    setSel(Math.max(0, sel - 1));
  };

  return (
    <>
      <PageHeader title={m.title} intro={fileChanged ? "This list has changes that are not published yet." : undefined}>
        <button className="btn" onClick={add}>
          + Add
        </button>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <ul className="h-fit overflow-hidden rounded-lg border bg-panel">
          {items.map((it, i) => (
            <li key={i}>
              <button className={`block w-full border-b px-3 py-2.5 text-left last:border-b-0 hover:bg-bg ${i === sel ? "bg-bg font-medium" : ""}`} onClick={() => setSel(i)} aria-current={i === sel}>
                <span className="block truncate">{m.label(it)}</span>
                <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted">
                  <span className="truncate">{m.sub(it)}</span>
                  <ItemChips item={it} />
                </span>
              </button>
            </li>
          ))}
          {!items.length && <li className="p-4 text-muted">Nothing yet.</li>}
        </ul>
        {current ? (
          <div className="max-w-3xl">
            <div className="mb-4 flex gap-2">
              <button className="btn" disabled={sel === 0} onClick={() => (setItems(swap(items, sel, sel - 1)), setSel(sel - 1))}>
                ↑ Move up
              </button>
              <button className="btn" disabled={sel === items.length - 1} onClick={() => (setItems(swap(items, sel, sel + 1)), setSel(sel + 1))}>
                ↓ Move down
              </button>
              <button className="btn btn-danger ml-auto" onClick={remove}>
                Delete
              </button>
            </div>
            <Fields
              fields={m.fields}
              value={current}
              onChange={(v) => setItems(items.map((x, i) => (i === sel ? v : x)))}
              issues={saver.issues.filter((i) => i.path.startsWith(`${sel}.`)).map((i) => ({ ...i, path: i.path.slice(String(sel).length + 1) }))}
            />
          </div>
        ) : (
          <p className="text-muted">Select or add an item.</p>
        )}
      </div>
      <SaveBar dirty={dirty} saving={saver.saving} message={saver.message} onReset={() => setItems(original)} onSave={() => saver.run(() => api.put(`/api/json/${m.name}`, items))} />
    </>
  );
}
