import type { Content } from "@/content/load";
import type { Project } from "@/content/schema";
import { mediaSource } from "@/content/media-manifest";
import { ProjectPreview } from "./project-preview";

/**
 * A project's cover image, or its labelled concept preview.
 * `transitionName` links the card and the story header for the page-to-page morph (M-10).
 */
export function ProjectMedia({ c, p, sizes, className = "", priority = false }: { c: Content; p: Project; sizes: string; className?: string; priority?: boolean }) {
  const cover = p.cover ? mediaSource(p.cover) : null;
  const meta = p.cover ? c.media.find((m) => m.id === p.cover) : undefined;
  const concept = !cover || meta?.concept;
  return (
    <div className={`project-preview relative overflow-hidden rounded-xl border bg-fg/[0.04] ${className}`} style={{ viewTransitionName: `project-media-${p.slug}` }}>
      <div className="h-full w-full transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] motion-safe:group-hover:scale-[1.02]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.src} srcSet={cover.srcSet} sizes={sizes} width={cover.width} height={cover.height} alt={meta?.alt ?? ""} loading={priority ? "eager" : "lazy"} className="h-full w-full object-cover" />
        ) : (
          <ProjectPreview slug={p.slug} kind={p.preview} />
        )}
      </div>
      {concept && <span className="label absolute right-2 bottom-2 rounded bg-band/80 px-1.5 py-0.5 text-[10px] text-white/85">Concept</span>}
    </div>
  );
}

const PUB_TYPE: Record<string, string> = { demo: "Demo", poster: "Poster", workshop: "Workshop", journal: "Journal", preprint: "Preprint", thesis: "Thesis", conference: "" };

export function projectMeta(c: Content, p: Project, years: string | null): string[] {
  const pub = p.publications.map((id) => c.publications.find((x) => x.id === id)).find(Boolean);
  return [p.role, years, pub ? [`${pub.venueShort} ${pub.year}`, PUB_TYPE[pub.type]].filter(Boolean).join(" ") : null].filter(
    (x): x is string => Boolean(x),
  );
}
