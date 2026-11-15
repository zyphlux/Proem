/**
 * Declarative form fields. Each module describes its fields; values are plain JSON.
 * Server-side zod validation is the source of truth; its issue paths are shown inline.
 */
import { useState } from "react";
import type { FieldIssue } from "./api";
import { refOptions, useContent } from "./store";

type Base = { name: string; label: string; help?: string; required?: boolean };
export type Field =
  | (Base & { k: "text" | "textarea" | "url" | "email" | "date" | "ym" | "number" | "code"; rows?: number; placeholder?: string })
  | (Base & { k: "ym-or-now"; nowLabel?: string; optional?: boolean })
  | (Base & { k: "select"; options: string[]; optional?: boolean })
  | (Base & { k: "bool"; def?: boolean })
  | (Base & { k: "lines"; max?: number })
  | (Base & { k: "refs" | "ref"; source: "projects" | "publications" | "media" })
  | (Base & { k: "color" })
  | (Base & { k: "group"; fields: Field[] })
  | (Base & { k: "repeat"; fields: Field[]; itemLabel?: (v: Record<string, unknown>) => string; newItem?: () => Record<string, unknown> });

type Obj = Record<string, unknown>;

export const visibilityFields: Field[] = [
  { k: "select", name: "status", label: "Status", options: ["published", "draft"], help: "Drafts never appear on the public site." },
  { k: "bool", name: "verified", label: "Facts confirmed", def: true, help: "Unconfirmed items are hidden from the public site." },
];

function issuesFor(issues: FieldIssue[], path: string) {
  return issues.filter((i) => i.path === path || i.path.startsWith(path + "."));
}

function Label({ f, path, children }: { f: Field; path: string; children: React.ReactNode }) {
  return (
    <label className="block" htmlFor={path}>
      <span className="mb-1 block text-[13px] font-medium">
        {f.label}
        {f.required && (
          <span className="text-danger" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </span>
      {children}
      {f.help && <span className="mt-1 block text-xs text-muted">{f.help}</span>}
    </label>
  );
}

export function Fields({ fields, value, onChange, issues = [], prefix = "" }: { fields: Field[]; value: Obj; onChange: (v: Obj) => void; issues?: FieldIssue[]; prefix?: string }) {
  const set = (name: string, v: unknown) => {
    const next = { ...value };
    if (v === undefined || v === "") delete next[name];
    else next[name] = v;
    onChange(next);
  };
  return (
    <div className="space-y-4">
      {fields.map((f) => {
        const path = prefix ? `${prefix}.${f.name}` : f.name;
        const errs = issuesFor(issues, path);
        return (
          <div key={f.name}>
            <FieldInput f={f} path={path} value={value[f.name]} set={(v) => set(f.name, v)} issues={issues} />
            {errs
              .filter((e) => f.k !== "group" && f.k !== "repeat" || e.path === path)
              .map((e, i) => (
                <p key={i} className="mt-1 text-xs text-danger">
                  {e.message}
                </p>
              ))}
          </div>
        );
      })}
    </div>
  );
}

function FieldInput({ f, path, value, set, issues }: { f: Field; path: string; value: unknown; set: (v: unknown) => void; issues: FieldIssue[] }) {
  const { data } = useContent();
  const str = typeof value === "string" ? value : value === undefined || value === null ? "" : String(value);

  switch (f.k) {
    case "text":
    case "url":
    case "email":
    case "date":
      return (
        <Label f={f} path={path}>
          <input id={path} className="input" type={f.k === "text" ? "text" : f.k} value={str} placeholder={f.placeholder} onChange={(e) => set(e.target.value)} />
        </Label>
      );
    case "ym":
      return (
        <Label f={f} path={path}>
          <input id={path} className="input max-w-40 font-mono" placeholder="YYYY or YYYY-MM" value={str} onChange={(e) => set(e.target.value)} />
        </Label>
      );
    case "number":
      return (
        <Label f={f} path={path}>
          <input id={path} className="input max-w-40" type="number" value={str} onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value))} />
        </Label>
      );
    case "textarea":
    case "code":
      return (
        <Label f={f} path={path}>
          <textarea id={path} className={`input ${f.k === "code" ? "font-mono text-[12.5px]" : ""}`} rows={f.rows ?? 3} value={str} onChange={(e) => set(e.target.value)} />
        </Label>
      );
    case "ym-or-now": {
      const now = value === null;
      return (
        <Label f={f} path={path}>
          <span className="flex items-center gap-3">
            <input id={path} className="input max-w-40 font-mono" placeholder="YYYY or YYYY-MM" disabled={now} value={now ? "" : str} onChange={(e) => set(e.target.value)} />
            <span className="flex items-center gap-1.5 text-[13px]">
              <input type="checkbox" checked={now} onChange={(e) => set(e.target.checked ? null : undefined)} /> {f.nowLabel ?? "Ongoing"}
            </span>
          </span>
        </Label>
      );
    }
    case "select":
      return (
        <Label f={f} path={path}>
          <select id={path} className="input max-w-64" value={str} onChange={(e) => set(e.target.value || undefined)}>
            {(f.optional || !str) && <option value="">—</option>}
            {f.options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Label>
      );
    case "bool":
      return (
        <label className="flex items-start gap-2">
          <input id={path} type="checkbox" className="mt-0.5" checked={value === undefined ? (f.def ?? false) : Boolean(value)} onChange={(e) => set(e.target.checked === (f.def ?? false) ? undefined : e.target.checked)} />
          <span>
            <span className="text-[13px] font-medium">{f.label}</span>
            {f.help && <span className="block text-xs text-muted">{f.help}</span>}
          </span>
        </label>
      );
    case "lines":
      return (
        <Label f={f} path={path}>
          <LinesInput id={path} value={Array.isArray(value) ? (value as string[]) : []} onChange={(v) => set(v.length ? v : undefined)} />
          <span className="mt-1 block text-xs text-muted">One per line{f.max ? `, at most ${f.max}` : ""}.</span>
        </Label>
      );
    case "color":
      return (
        <Label f={f} path={path}>
          <span className="flex items-center gap-2">
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(str) ? str : "#000000"} onChange={(e) => set(e.target.value.toUpperCase())} className="h-8 w-10 rounded border" />
            <input id={path} className="input max-w-28 font-mono" value={str} onChange={(e) => set(e.target.value)} />
          </span>
        </Label>
      );
    case "ref": {
      const opts = data ? refOptions(data, f.source) : [];
      return (
        <Label f={f} path={path}>
          <select id={path} className="input max-w-96" value={str} onChange={(e) => set(e.target.value || undefined)}>
            <option value="">— none —</option>
            {opts.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Label>
      );
    }
    case "refs": {
      const opts = data ? refOptions(data, f.source) : [];
      const list = Array.isArray(value) ? (value as string[]) : [];
      const move = (i: number, d: number) => {
        const next = [...list];
        [next[i], next[i + d]] = [next[i + d], next[i]];
        set(next);
      };
      return (
        <Label f={f} path={path}>
          <span className="flex flex-wrap items-center gap-1.5">
            {list.map((id, i) => (
              <span key={id} className="inline-flex items-center gap-1 rounded-full border bg-panel py-0.5 pr-1 pl-2.5 text-[13px]">
                {opts.find((o) => o.value === id)?.label ?? <span className="text-danger">{id} (missing)</span>}
                {i > 0 && (
                  <button type="button" className="px-1 text-muted hover:text-fg" aria-label="Move left" onClick={() => move(i, -1)}>
                    ‹
                  </button>
                )}
                <button type="button" className="px-1 text-muted hover:text-danger" aria-label={`Remove ${id}`} onClick={() => set(list.filter((x) => x !== id).length ? list.filter((x) => x !== id) : undefined)}>
                  ×
                </button>
              </span>
            ))}
            <select id={path} className="input w-auto" value="" onChange={(e) => e.target.value && set([...list, e.target.value])}>
              <option value="">+ Add…</option>
              {opts
                .filter((o) => !list.includes(o.value))
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </select>
          </span>
        </Label>
      );
    }
    case "group":
      return (
        <fieldset className="rounded-lg border p-4">
          <legend className="px-1 text-[13px] font-semibold">{f.label}</legend>
          <Fields fields={f.fields} value={(value as Obj) ?? {}} onChange={(v) => set(Object.keys(v).length ? v : undefined)} issues={issues} prefix={path} />
        </fieldset>
      );
    case "repeat": {
      const list = Array.isArray(value) ? (value as Obj[]) : [];
      const update = (next: Obj[]) => set(next.length ? next : undefined);
      return (
        <fieldset className="rounded-lg border p-4">
          <legend className="px-1 text-[13px] font-semibold">{f.label}</legend>
          {f.help && <p className="mb-3 text-xs text-muted">{f.help}</p>}
          <div className="space-y-3">
            {list.map((item, i) => (
              <div key={i} className="rounded-md border bg-bg/50 p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-muted">
                  <span>{f.itemLabel?.(item) || `#${i + 1}`}</span>
                  <span className="flex gap-1">
                    <button type="button" className="btn px-2 py-0.5" disabled={i === 0} onClick={() => update(swap(list, i, i - 1))}>
                      ↑
                    </button>
                    <button type="button" className="btn px-2 py-0.5" disabled={i === list.length - 1} onClick={() => update(swap(list, i, i + 1))}>
                      ↓
                    </button>
                    <button type="button" className="btn btn-danger px-2 py-0.5" onClick={() => update(list.filter((_, k) => k !== i))}>
                      Remove
                    </button>
                  </span>
                </div>
                <Fields fields={f.fields} value={item} onChange={(v) => update(list.map((x, k) => (k === i ? v : x)))} issues={issues} prefix={`${path}.${i}`} />
              </div>
            ))}
          </div>
          <button type="button" className="btn mt-3" onClick={() => update([...list, f.newItem?.() ?? {}])}>
            + Add
          </button>
        </fieldset>
      );
    }
  }
}

function LinesInput({ id, value, onChange }: { id: string; value: string[]; onChange: (v: string[]) => void }) {
  // Keep the raw text while typing so blank lines don't vanish under the cursor.
  const [text, setText] = useState(value.join("\n"));
  const [last, setLast] = useState(value);
  if (value !== last && value.join("\n") !== text.split("\n").filter((l) => l.trim()).join("\n")) {
    setLast(value);
    setText(value.join("\n"));
  }
  return (
    <textarea
      id={id}
      className="input"
      rows={Math.min(Math.max(value.length + 1, 3), 12)}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const v = e.target.value.split("\n").map((l) => l.trim()).filter(Boolean);
        setLast(v);
        onChange(v);
      }}
    />
  );
}

export function swap<T>(list: T[], a: number, b: number): T[] {
  const next = [...list];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}
