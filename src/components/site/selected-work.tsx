import { Reveal } from "@/components/motion/reveal";
import type { Content } from "@/content/load";
import { hasProjectStory, projectHref, projectYears } from "@/content/view";
import Link from "next/link";
import { ProjectMedia, projectMeta } from "./project-media";


/** 03 / Selected work (§2.3): two featured projects on the always-dark band. */
export function SelectedWork({ c }: { c: Content }) {
  const projects = c.home.featuredProjects.map((id) => c.projects.find((p) => p.slug === id)!);
  const moreWork = c.projects.length > projects.length;

  return (
    <>
      <ul className="grid gap-10 lg:grid-cols-2 lg:gap-0">
        {projects.map((p, i) => {
          const story = hasProjectStory(p);
          const meta = projectMeta(c, p, projectYears(p));
          const href = story ? projectHref(p) : p.links.code ?? p.links.demo ?? p.links.website;
          const external = !story && Boolean(href);

          const body = (
            <>
              <ProjectMedia c={c} p={p} sizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw" className="aspect-[16/10] sm:w-[52%] sm:shrink-0" />
              <div className="min-w-0">
                <h3 className="text-h3" style={{ viewTransitionName: `project-title-${p.slug}` }}>
                  {p.title}
                </h3>
                <p className="mt-2 max-w-[30ch] text-fg-muted">{p.summary}</p>
                {meta.length > 0 && <p className="label mt-3 text-[11px] text-fg-muted">{meta.join(" · ")}</p>}
                {href && (
                  <p className="mt-4 text-[15px] text-accent">
                    {story ? "Read the story" : "View the code"} <span className="arrow-nudge" aria-hidden="true">{external ? "↗" : "→"}</span>
                  </p>
                )}
              </div>
            </>
          );

          const cls = "group flex flex-col gap-5 sm:flex-row sm:items-center";
          return (
            <Reveal as="li" key={p.slug} index={i} className={i > 0 ? "lg:border-l lg:pl-10" : "lg:pr-10"}>
              {href ? (
                // A plain link (full navigation) so the card morphs into the story header.
                <a href={href} className={cls} rel={external ? "noopener" : undefined}>
                  {body}
                </a>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </Reveal>
          );
        })}
      </ul>
      {moreWork && (
        <p className="mt-10 text-[15px]">
          <Link href="/work/" className="text-accent hover:underline">
            All work <span className="arrow-nudge" aria-hidden="true">→</span>
          </Link>
        </p>
      )}
    </>
  );
}
