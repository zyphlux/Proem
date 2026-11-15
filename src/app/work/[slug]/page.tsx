import { ProjectMedia, projectMeta } from "@/components/site/project-media";
import { getContent } from "@/content/load";
import { hasProjectStory, isSelf, projectYears } from "@/content/view";
import { markdownToHTML, tableOfContents } from "@/lib/markdown";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamicParams = false;

function storyProjects() {
  return getContent()
    .projects.filter(hasProjectStory)
    .sort((a, b) => Number(a.archived) - Number(b.archived) || a.order - b.order);
}

export function generateStaticParams() {
  const list = storyProjects();
  // Static export needs at least one param; a placeholder renders a 404 that the prune step removes.
  return list.length ? list.map((p) => ({ slug: p.slug })) : [{ slug: "_none" }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = storyProjects().find((x) => x.slug === slug);
  return p ? { title: p.title, description: p.summary } : {};
}

/** Project story (§2.3): context → role → approach → results → reflection, then papers and code. */
export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getContent();
  const list = storyProjects();
  const i = list.findIndex((p) => p.slug === slug);
  if (i < 0) notFound();
  const p = list[i];
  const html = await markdownToHTML(p.body);
  const toc = tableOfContents(p.body);
  const pubs = p.publications.map((id) => c.publications.find((x) => x.id === id)).filter((x) => x !== undefined);
  const next = list[(i + 1) % list.length];
  const links = [
    p.links.code && { href: p.links.code, label: "Code" },
    p.links.demo && { href: p.links.demo, label: "Demo" },
    p.links.website && { href: p.links.website, label: "Website" },
  ].filter((x): x is { href: string; label: string } => Boolean(x));

  return (
    <main className="container-site pb-10">
      <p className="pt-10">
        <Link href="/work/" className="label text-fg-muted hover:text-fg">
          <span aria-hidden="true">←</span> Work
        </Link>
      </p>

      <header className="grid gap-8 pt-6 pb-10 md:grid-cols-[1fr_minmax(0,420px)] md:items-end md:gap-12">
        <div>
          <h1 className="text-[clamp(2.5rem,1.6rem+3vw,4rem)] leading-[1.02] font-bold tracking-[-0.035em]" style={{ viewTransitionName: `project-title-${p.slug}` }}>
            {p.title}
          </h1>
          <p className="mt-4 max-w-[40ch] text-lead text-fg-muted">{p.summary}</p>
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            {projectMeta(c, p, projectYears(p)).length > 0 && (
              <>
                <dt className="label pt-0.5 text-[11px] text-fg-muted">Overview</dt>
                <dd>{projectMeta(c, p, projectYears(p)).join(" · ")}</dd>
              </>
            )}
            {p.tech.length > 0 && (
              <>
                <dt className="label pt-0.5 text-[11px] text-fg-muted">Built with</dt>
                <dd>{p.tech.join(" · ")}</dd>
              </>
            )}
          </dl>
          {links.length > 0 && (
            <p className="mt-6 flex flex-wrap gap-2">
              {links.map((l) => (
                <a key={l.href} href={l.href} rel="noopener" className="inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-sm hover:border-fg">
                  {l.label} <span className="arrow-nudge" aria-hidden="true">↗</span>
                </a>
              ))}
            </p>
          )}
        </div>
        <ProjectMedia c={c} p={p} sizes="(min-width: 768px) 420px, 100vw" className="aspect-[16/10]" priority />
      </header>

      <div className="grid gap-10 border-t pt-10 lg:grid-cols-[1fr_220px]">
        <article className="prose prose-site" dangerouslySetInnerHTML={{ __html: html }} />
        {toc.length > 1 && (
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-24">
              <p className="label mb-3 text-fg-muted">On this page</p>
              <ol className="space-y-2 border-l text-sm">
                {toc.map((t) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`} className="-ml-px block border-l border-transparent pl-4 text-fg-muted hover:border-fg hover:text-fg">
                      {t.text}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>
        )}
      </div>

      {pubs.length > 0 && (
        <section aria-labelledby="papers" className="mt-16 border-t pt-8">
          <h2 id="papers" className="label mb-4 text-fg-muted">
            Related {pubs.length > 1 ? "papers" : "paper"}
          </h2>
          <ul className="space-y-4">
            {pubs.map((x) => (
              <li key={x.id}>
                <Link href={`/research/#${x.id}`} className="font-semibold hover:text-accent">
                  {x.title}
                </Link>
                <p className="text-sm text-fg-muted">
                  {x.authors.map((a, k) => (
                    <span key={a}>
                      {k > 0 && ", "}
                      {isSelf(c, a) ? <strong className="text-fg">{a}</strong> : a}
                    </span>
                  ))}{" "}
                  · {x.venueShort} {x.year}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label="More work" className="mt-16 flex items-center justify-between border-t pt-6 text-[15px]">
        <Link href="/work/" className="hover:text-accent">
          <span aria-hidden="true">←</span> All work
        </Link>
        {list.length > 1 && (
          <a href={`/work/${next.slug}/`} className="text-right hover:text-accent">
            <span className="label block text-[11px] text-fg-muted">Next project</span>
            {next.title} <span className="arrow-nudge" aria-hidden="true">→</span>
          </a>
        )}
      </nav>
    </main>
  );
}
