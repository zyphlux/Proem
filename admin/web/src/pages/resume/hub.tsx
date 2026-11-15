import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { PageHeader } from "../../ui";
import { ResumeDocuments } from "./documents";
import type { TemplateInfo } from "./shared";
import { ResumeTemplates } from "./templates";
import { ResumeUploads } from "./uploads";

type TemplatesResponse = { templates: TemplateInfo[]; partials: { section: string; contact: string } };

const TABS = [
  { id: "documents", label: "Resumes" },
  { id: "templates", label: "Templates" },
  { id: "uploads", label: "Uploaded PDFs" },
] as const;

export function ResumeHub({ tab }: { tab: string }) {
  const [t, setT] = useState<TemplatesResponse | null>(null);
  const load = useCallback(() => {
    api.get<TemplatesResponse>("/api/resume/templates").then(setT).catch(() => {});
  }, []);
  useEffect(load, [load]);
  const current = TABS.some((x) => x.id === tab) ? tab : "documents";

  return (
    <>
      <PageHeader title="Resume" intro="Build resumes from your site content, pick a template, and export to PDF. The public one appears on /resume with a download.">
        <nav className="flex gap-1 rounded-lg border bg-panel p-1" aria-label="Resume sections">
          {TABS.map((x) => (
            <a key={x.id} href={`#/resume/${x.id}`} aria-current={current === x.id ? "page" : undefined} className="rounded-md px-3 py-1.5 aria-[current]:bg-fg aria-[current]:text-bg">
              {x.label}
            </a>
          ))}
        </nav>
      </PageHeader>
      {current === "uploads" ? <ResumeUploads /> : !t ? <p className="text-muted">Loading templates…</p> : current === "templates" ? <ResumeTemplates templates={t.templates} partials={t.partials} reload={load} /> : <ResumeDocuments templates={t.templates} />}
    </>
  );
}
