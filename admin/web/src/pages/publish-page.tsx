import { useEffect, useRef, useState } from "react";
import type { Release } from "../../../server/builder";
import { api } from "../api";
import { JobLog, useJob } from "../jobs";
import { useContent } from "../store";
import { Chip, PageHeader, useSaver } from "../ui";

/** Publish, history and rollback, backup and restore. */
export function PublishPage() {
  const { data, reload } = useContent();
  const [releases, setReleases] = useState<Release[]>([]);
  const [summary, setSummary] = useState("");
  const loadReleases = () => api.get<Release[]>("/api/releases").then(setReleases).catch(() => {});
  useEffect(() => {
    void loadReleases();
  }, []);
  const { job, start, running } = useJob(() => {
    void loadReleases();
    void reload();
  });
  const restore = useSaver();
  const file = useRef<HTMLInputElement>(null);
  const errors = data?.issues.filter((i) => i.level === "error") ?? [];
  const changed = data?.changed ?? [];

  return (
    <>
      <PageHeader title="Publishing" intro="Publishing builds the site from your saved content, checks it, and switches the live site to the new version in one step. If anything fails, the live site stays as it was." />

      <section className="mb-8 max-w-3xl rounded-lg border bg-panel p-4">
        <h2 className="mb-2 font-semibold">Unpublished changes</h2>
        {changed.length ? (
          <ul className="mb-4 space-y-0.5 font-mono text-xs">
            {changed.map((c) => (
              <li key={c.file}>
                <span className="inline-block w-6 text-muted">{c.status}</span>
                {c.file}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-muted">{releases.length ? "Everything saved is published." : "Nothing has been published yet."}</p>
        )}
        {errors.length > 0 && (
          <div className="mb-4 rounded border border-danger p-3 text-[13px] text-danger">
            <p className="font-semibold">Fix these before publishing:</p>
            <ul className="mt-1 list-disc pl-5">
              {errors.map((e, i) => (
                <li key={i}>
                  {e.file}: {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <label className="grow">
            <span className="mb-1 block text-[13px] font-medium">What changed? (kept in the history)</span>
            <input className="input" value={summary} maxLength={200} onChange={(e) => setSummary(e.target.value)} placeholder="e.g. Add a project story" />
          </label>
          <button className="btn btn-primary" disabled={running || errors.length > 0} onClick={() => start("/api/publish", { summary })}>
            {running && job?.kind === "publish" ? "Publishing…" : "Publish"}
          </button>
        </div>
        <JobLog job={job} />
      </section>

      <section className="mb-8 max-w-3xl">
        <h2 className="mb-2 font-semibold">History</h2>
        <ul className="overflow-hidden rounded-lg border bg-panel">
          {releases.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-b-0">
              <span className="font-mono text-[13px]">{new Date(r.createdAt).toLocaleString()}</span>
              <span className="grow">{r.summary}</span>
              {r.contentCommit && <span className="font-mono text-xs text-muted">{r.contentCommit}</span>}
              {r.current ? (
                <Chip tone="ok">Live</Chip>
              ) : (
                <button className="btn px-2 py-0.5" disabled={running} onClick={() => confirm(`Make the release from ${new Date(r.createdAt).toLocaleString()} live again?`) && start(`/api/rollback/${r.id}`)}>
                  Roll back to this
                </button>
              )}
            </li>
          ))}
          {!releases.length && <li className="p-4 text-muted">No releases yet.</li>}
        </ul>
      </section>

      <section className="max-w-3xl rounded-lg border bg-panel p-4">
        <h2 className="mb-2 font-semibold">Backup</h2>
        <p className="mb-3 text-muted">Download everything you’ve written and uploaded (content, theme, media, resumes) as a zip. Restoring replaces your current content; a copy of it is kept on the server first.</p>
        <div className="flex flex-wrap gap-3">
          <a className="btn" href="/api/backup">
            Download backup
          </a>
          <input ref={file} type="file" accept=".zip,application/zip" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f || !confirm("Replace the current content with this backup?")) return;
            const fd = new FormData();
            fd.append("file", f);
            void restore.run(() => api.post("/api/restore", fd), "Restored. Review the content, then publish.");
          }} />
          <button className="btn" onClick={() => file.current?.click()}>
            Restore from backup…
          </button>
        </div>
        {restore.message && <p className={`mt-2 text-[13px] ${restore.message.tone === "ok" ? "text-ok" : "text-danger"}`}>{restore.message.text}</p>}
      </section>
    </>
  );
}
