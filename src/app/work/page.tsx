import { Reveal } from "@/components/motion/reveal";
import { PageIntro } from "@/components/site/page-intro";
import { ProjectMedia, projectMeta } from "@/components/site/project-media";
import { getContent } from "@/content/load";
import type { Project } from "@/content/schema";
import { hasProjectStory, projectYears } from "@/content/view";
import { notFound } from "next/navigation";

export const metadata = { title: "Work", description: "Projects, with the story behind each one." };

export default function WorkPage() {
  const c = getContent();
  if (!c.projects.length) notFound();
  const sorted = [...c.projects].sort((a, b) => a.order - b.order);
  const current = sorted.filter((p) => !p.archived);
  const earlier = sorted.filter((p) => p.archived);

  const row = (p: Project, i: number) => {
    const story = hasProjectStory(p);
    const meta = projectMeta(c, p, projectYears(p));
    const links = [
      story && { href: `/work/${p.slug}/`, label: "Read the story", arrow: "→" },
      p.links.code && { href: p.links.code, label: "Code", arrow: "↗" },
      p.links.demo && { href: p.links.demo, label: "Demo", arrow: "↗" },
      p.links.website && { href: p.links.website, label: "Website", arrow: "↗" },
    ].filter((x): x is { href: string; label: string; arrow: string } => Boolean(x));
    const media = <ProjectMedia c={c} p={p} sizes="(min-width: 768px) 320px, 100vw" className="aspect-[16/10]" />;

    return (
      <Reveal as="li" key={p.slug} index={i} id={p.slug} className="grid scroll-mt-20 gap-6 border-t py-8 md:grid-cols-[320px_1fr] md:gap-10">
        {story ? (
          <a href={`/work/${p.slug}/`} className="group block" tabIndex={-1} aria-hidden="true">
            {media}
          </a>
        ) : (
          media
        )}
        <div className="min-w-0">
          <h2 className="text-h3" style={{ viewTransitionName: `project-title-${p.slug}` }}>
            {p.title}
          </h2>
          <p className="mt-2 max-w-[52ch] text-fg-muted">{p.summary}</p>
          {meta.length > 0 && <p className="label mt-3 text-[11px] text-fg-muted">{meta.join(" · ")}</p>}
          {p.tech.length > 0 && <p className="mt-3 text-sm text-fg-muted">{p.tech.join(" · ")}</p>}
          {links.length > 0 && (
            <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
              {links.map((l) => (
                <a key={l.href} href={l.href} className="text-accent hover:underline" rel={l.arrow === "↗" ? "noopener" : undefined}>
                  {l.label} <span className="arrow-nudge" aria-hidden="true">{l.arrow}</span>
                </a>
              ))}
            </p>
          )}
        </div>
      </Reveal>
    );
  };

  return (
    <main className="container-site pb-10">
      <PageIntro label="Work" title="Things I’ve built and studied." lead="Each project has a short story: the problem, my role, how it works and what I learned." />
      <ul className="border-b">{current.map(row)}</ul>
      {earlier.length > 0 && (
        <section aria-labelledby="earlier" className="mt-16">
          <h2 id="earlier" className="label mb-4 text-fg-muted">
            Earlier work
          </h2>
          <ul className="border-b">{earlier.map(row)}</ul>
        </section>
      )}
    </main>
  );
}
