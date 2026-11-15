import { useState, type ReactNode } from "react";
import { ApiError, type FieldIssue } from "./api";
import { useContent } from "./store";

export function PageHeader({ title, intro, children }: { title: string; intro?: string; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {intro && <p className="mt-1 max-w-2xl text-muted">{intro}</p>}
      </div>
      {children}
    </header>
  );
}

export function Chip({ tone, children }: { tone: "draft" | "warn" | "danger" | "ok" | "info"; children: ReactNode }) {
  const color = { draft: "text-muted", warn: "text-warn", danger: "text-danger", ok: "text-ok", info: "text-accent" }[tone];
  return <span className={`chip ${color}`}>{children}</span>;
}

/** Status chips for one item: draft / unconfirmed / changed since publish. */
export function ItemChips({ item, changed }: { item: Record<string, unknown>; changed?: boolean }) {
  return (
    <span className="flex flex-wrap gap-1">
      {item.status === "draft" && <Chip tone="draft">Draft</Chip>}
      {item.verified === false && <Chip tone="warn">Unconfirmed</Chip>}
      {changed && <Chip tone="info">Not published</Chip>}
    </span>
  );
}

/** Save state for a form: saving, field issues, messages, and a reload afterwards. */
export function useSaver() {
  const { reload } = useContent();
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const [message, setMessage] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);
  async function run(fn: () => Promise<unknown>, okText = "Saved as draft. Publish when ready.") {
    setSaving(true);
    setMessage(null);
    try {
      await fn();
      setIssues([]);
      setMessage({ tone: "ok", text: okText });
      await reload();
      return true;
    } catch (e) {
      if (e instanceof ApiError) {
        setIssues(e.issues);
        setMessage({ tone: "danger", text: e.issues.length ? `${e.message}: ${e.issues.map((i) => `${i.path ? i.path + " — " : ""}${i.message}`).join("; ")}` : e.message });
      } else setMessage({ tone: "danger", text: (e as Error).message });
      return false;
    } finally {
      setSaving(false);
    }
  }
  return { saving, issues, message, run, setMessage };
}

export function SaveBar({ dirty, saving, onSave, onReset, message, extra }: { dirty: boolean; saving: boolean; onSave: () => void; onReset?: () => void; message: { tone: "ok" | "danger"; text: string } | null; extra?: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-6 mt-8 flex flex-wrap items-center gap-3 border-t bg-bg/95 px-6 py-3 backdrop-blur">
      <button className="btn btn-primary" disabled={!dirty || saving} onClick={onSave}>
        {saving ? "Saving…" : "Save draft"}
      </button>
      {onReset && (
        <button className="btn" disabled={!dirty || saving} onClick={onReset}>
          Discard changes
        </button>
      )}
      {dirty && !saving && <Chip tone="warn">Unsaved changes</Chip>}
      {message && <p className={`text-[13px] ${message.tone === "ok" ? "text-ok" : "text-danger"}`}>{message.text}</p>}
      <span className="ml-auto">{extra}</span>
    </div>
  );
}

export const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Warn before leaving with unsaved changes. */
export function useUnloadGuard(dirty: boolean) {
  if (typeof window !== "undefined") window.onbeforeunload = dirty ? () => true : null;
}
