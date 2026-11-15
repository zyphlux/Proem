import { PageIntro } from "@/components/site/page-intro";
import { PrintResume, ResumeShadow } from "@/components/site/resume-view";
import { getContent } from "@/content/load";
import { currentResume } from "@/content/view";
import { readResumeManifest } from "@/resume/manifest";
import { notFound } from "next/navigation";

export const metadata = { title: "Resume" };

const primary = "inline-flex items-center gap-1 rounded-full bg-fg px-4 py-2 text-sm font-medium text-bg hover:opacity-90";
const secondary = "inline-flex items-center gap-1 rounded-full border px-4 py-2 text-sm hover:border-fg";

/**
 * /resume (§6). A built resume document shows its web version, a generated PDF and a
 * print option; otherwise an uploaded PDF is embedded. 404 when nothing is public.
 */
export default function ResumePage() {
  const c = getContent();
  const r = currentResume(c);
  if (!r) notFound();

  if (r.kind === "document") {
    const m = readResumeManifest();
    if (!m) notFound();
    return (
      <main className="container-site pb-10">
        <div data-print-hide="">
          <PageIntro label="Resume" title={`${c.profile.name} — Resume`}>
            <p className="enter mt-6 flex flex-wrap items-center gap-3" style={{ ["--i" as string]: 2 }}>
              {m.pdf && (
                <a href={m.pdf} download={m.pdfName} className={primary}>
                  Download PDF <span aria-hidden="true">↓</span>
                </a>
              )}
              <PrintResume href={m.html} className={m.pdf ? secondary : primary} />
              <span className="label text-[11px] text-fg-muted">
                Updated {m.updated}
                {m.pages ? ` · ${m.pages} page${m.pages === 1 ? "" : "s"}` : ""}
              </span>
            </p>
          </PageIntro>
        </div>
        <div className="mx-auto max-w-[min(100%,860px)]">
          <ResumeShadow html={m.fragment} css={m.css} />
        </div>
      </main>
    );
  }

  return (
    <main className="container-site pb-10">
      <PageIntro label="Resume" title={`${c.profile.name} — Resume`}>
        <p className="enter mt-6 flex flex-wrap items-center gap-3" style={{ ["--i" as string]: 2 }}>
          <a href={r.file} download={r.name} className={primary}>
            Download PDF <span aria-hidden="true">↓</span>
          </a>
          <a href={r.file} className={secondary}>
            Open in a new tab <span className="arrow-nudge" aria-hidden="true">↗</span>
          </a>
          <span className="label text-[11px] text-fg-muted">Updated {r.updated}</span>
        </p>
      </PageIntro>
      {/* Embedded preview for larger screens; phones get the buttons above (inline PDF support varies). */}
      <object data={`${r.file}#view=FitH`} type="application/pdf" aria-label="Resume preview" className="hidden h-[80vh] w-full rounded-xl border bg-surface md:block">
        <p className="p-6 text-sm">
          Your browser can’t show PDFs inline. <a href={r.file}>Open the resume</a>.
        </p>
      </object>
    </main>
  );
}
