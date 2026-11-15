import { useState } from "react";
import { JobLog, useJob } from "../jobs";
import { useContent } from "../store";
import { PageHeader } from "../ui";

const WIDTHS = [
  { label: "Phone", w: 390 },
  { label: "Tablet", w: 768 },
  { label: "Desktop", w: 1280 },
];

/** Builds a private preview (drafts included) and shows it at different sizes and themes. */
export function PreviewPage() {
  const { data } = useContent();
  const [width, setWidth] = useState(1280);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [path, setPath] = useState("/");
  const [stamp, setStamp] = useState(0);
  const { job, start, running } = useJob((j) => j.status === "succeeded" && setStamp(Date.now()));
  const src = `http://${location.hostname}:${data?.previewPort ?? 4311}${path.startsWith("/") ? path : "/" + path}?theme=${theme}&v=${stamp}`;

  return (
    <>
      <PageHeader title="Preview" intro="The preview is built from your saved drafts (including unpublished and unconfirmed items). It’s only visible to you.">
        <button className="btn btn-primary" disabled={running} onClick={() => start("/api/preview")}>
          {running ? "Building…" : "Build preview"}
        </button>
      </PageHeader>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {WIDTHS.map((x) => (
          <button key={x.w} className={`btn ${width === x.w ? "btn-primary" : ""}`} onClick={() => setWidth(x.w)}>
            {x.label}
          </button>
        ))}
        <span className="mx-2 h-5 w-px bg-line" />
        {(["light", "dark"] as const).map((t) => (
          <button key={t} className={`btn capitalize ${theme === t ? "btn-primary" : ""}`} onClick={() => setTheme(t)}>
            {t}
          </button>
        ))}
        <span className="mx-2 h-5 w-px bg-line" />
        <input className="input max-w-56 font-mono" value={path} onChange={(e) => setPath(e.target.value)} aria-label="Path" />
        <a className="text-accent" href={src} target="_blank" rel="noreferrer">
          Open in new tab ↗
        </a>
      </div>
      {running || job?.status === "failed" ? <JobLog job={job} /> : null}
      <div className="overflow-auto rounded-lg border bg-panel p-3">
        <iframe key={`${theme}-${stamp}`} title="Site preview" src={src} className="mx-auto block h-[75vh] rounded border bg-white" style={{ width }} />
      </div>
    </>
  );
}
