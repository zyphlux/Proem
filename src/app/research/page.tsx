import { CopyLink } from "@/components/site/copy-button";
import { PageIntro } from "@/components/site/page-intro";
import { getContent } from "@/content/load";
import type { Publication } from "@/content/schema";
import { isSelf, projectHref, publicationMeta } from "@/content/view";
import { notFound } from "next/navigation";

export const metadata = { title: "Research", description: "Publications with full author lists, links and citations." };

const LINKS: { key: keyof Publication["links"]; label: string }[] = [
  { key: "paper", label: "Paper" },
  { key: "doi", label: "DOI" },
  { key: "code", label: "Code" },
  { key: "demo", label: "Demo" },
  { key: "slides", label: "Slides" },
  { key: "video", label: "Video" },
  { key: "page", label: "Details" },
];
const pill = "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[13px] transition-colors hover:border-fg";

export default function ResearchPage() {
  const c = getContent();
  if (!c.publications.length) notFound();
  const years = [...new Set(c.publications.map((p) => p.year))].sort((a, b) => b - a);

  const jsonLd = c.publications.map((p) => ({
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: p.title,
    author: p.authors.map((name) => ({ "@type": "Person", name })),
    datePublished: String(p.year),
    isPartOf: p.venue,
    ...(p.links.doi ? { sameAs: p.links.doi } : {}),
  }));

  return (
    <main className="container-site pb-10">
      <PageIntro label="Research" title="Publications" lead="Full author lists in published order." />
      {years.map((y) => (
        <section key={y} aria-labelledby={`y${y}`} className="grid gap-4 border-t py-8 md:grid-cols-[120px_1fr]">
          <h2 id={`y${y}`} className="label text-fg-muted">
            {y}
          </h2>
          <ol className="space-y-10">
            {c.publications
              .filter((p) => p.year === y)
              .map((p) => {
                const related = p.relatedProjects.map((id) => c.projects.find((x) => x.slug === id)).filter((x) => x !== undefined);
                return (
                  <li key={p.id} id={p.id} className="scroll-mt-24">
                    <h3 className="text-[1.1875rem] leading-snug font-semibold">{p.title}</h3>
                    <p className="mt-2 text-[15px] text-fg-muted">
                      {p.authors.map((a, k) => (
                        <span key={a}>
                          {k > 0 && ", "}
                          {isSelf(c, a) ? <strong className="font-semibold text-fg">{a}</strong> : a}
                        </span>
                      ))}
                    </p>
                    <p className="mt-1 text-sm text-fg-muted">{p.venue}</p>
                    <p className="label mt-2 text-[11px]">{publicationMeta(c, p).join(" · ")}</p>
                    <p className="mt-4 flex flex-wrap gap-2">
                      {LINKS.filter((l) => p.links[l.key]).map((l) => (
                        <a key={l.key} href={p.links[l.key]} className={pill} rel="noopener">
                          {l.label} <span className="arrow-nudge" aria-hidden="true">↗</span>
                        </a>
                      ))}
                      {related.map((r) => (
                        <a key={r.slug} href={projectHref(r)} className={pill}>
                          Project: {r.title} <span aria-hidden="true">→</span>
                        </a>
                      ))}
                      {p.bibtex && <CopyLink text={p.bibtex} fallbackHref={`#bib-${p.id}`} label="Copy BibTeX" className={pill} />}
                    </p>
                    {p.bibtex && (
                      <details id={`bib-${p.id}`} className="mt-3">
                        <summary className="label cursor-pointer text-[11px] text-fg-muted hover:text-fg">Show BibTeX</summary>
                        <pre className="mt-2 overflow-x-auto rounded-lg border bg-surface p-4 font-mono text-xs leading-relaxed">{p.bibtex}</pre>
                      </details>
                    )}
                  </li>
                );
              })}
          </ol>
        </section>
      ))}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </main>
  );
}
