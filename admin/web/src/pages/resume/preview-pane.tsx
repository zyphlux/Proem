import { useEffect, useRef, useState } from "react";
import { ApiError, api, getCsrf } from "../../api";
import type { Doc } from "./shared";

type Props = { doc: Doc | null; template?: { html: string; css: string; layouts: string[] }; onWarnings?: (w: string[]) => void };

/**
 * Live HTML preview (re-rendered on the server as you type) and on-demand PDF.
 * The preview iframe has no script permission.
 */
export function PreviewPane({ doc, template, onWarnings }: Props) {
  const [html, setHtml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [mode, setMode] = useState<"html" | "pdf">("html");
  const [pdf, setPdf] = useState<{ url: string; pages: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const warn = useRef(onWarnings);
  useEffect(() => {
    warn.current = onWarnings;
  });

  const body = JSON.stringify({ doc, includeHidden, template });
  useEffect(() => {
    if (!doc) return;
    const t = window.setTimeout(async () => {
      try {
        const r = await api.post<{ html: string; cssWarnings: string[] }>("/api/resume/render", JSON.parse(body));
        setHtml(r.html);
        setError(null);
        warn.current?.(r.cssWarnings);
      } catch (e) {
        setError(e instanceof ApiError ? `${e.message}${e.issues.length ? ": " + e.issues.map((i) => `${i.path} — ${i.message}`).join("; ") : ""}` : String(e));
      }
    }, 350);
    return () => window.clearTimeout(t);
  }, [body, doc]);

  useEffect(
    () => () => {
      if (pdf) URL.revokeObjectURL(pdf.url);
    },
    [pdf],
  );

  const makePdf = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/resume/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrf() ?? "" },
        body,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: res.statusText }))).error);
      const blob = await res.blob();
      setPdf({ url: URL.createObjectURL(blob), pages: Number(res.headers.get("X-Page-Count") ?? 0) });
      setMode("pdf");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-[70vh] flex-col">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button className={`btn ${mode === "html" ? "btn-primary" : ""}`} onClick={() => setMode("html")}>
          Live preview
        </button>
        <button className={`btn ${mode === "pdf" ? "btn-primary" : ""}`} onClick={makePdf} disabled={busy || !doc}>
          {busy ? "Rendering PDF…" : pdf ? "Refresh PDF" : "Render PDF"}
        </button>
        {pdf && mode === "pdf" && (
          <>
            <span className={`chip ${pdf.pages > 1 ? "text-warn" : "text-ok"}`}>
              {pdf.pages} page{pdf.pages === 1 ? "" : "s"}
            </span>
            <a className="btn" href={pdf.url} download={doc?.downloadName ?? "Resume.pdf"}>
              Download
            </a>
          </>
        )}
        <label className="ml-auto flex items-center gap-1.5 text-[13px]">
          <input type="checkbox" checked={includeHidden} onChange={(e) => setIncludeHidden(e.target.checked)} /> Include drafts &amp; unconfirmed
        </label>
      </div>
      {error && <p className="mb-2 rounded border border-danger p-2 text-[13px] text-danger">{error}</p>}
      {mode === "html" ? (
        <iframe title="Resume preview" sandbox="allow-same-origin" srcDoc={html} className="w-full grow rounded-lg border bg-[#e9ebef]" />
      ) : (
        pdf && <iframe title="Resume PDF" src={pdf.url} className="w-full grow rounded-lg border" />
      )}
    </div>
  );
}
