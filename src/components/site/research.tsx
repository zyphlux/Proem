import { Reveal } from "@/components/motion/reveal";
import type { Content } from "@/content/load";
import type { Publication } from "@/content/schema";
import { isSelf, publicationMeta } from "@/content/view";
import Link from "next/link";
import { CopyLink } from "./copy-button";

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

/**
 * 04 / Research (§2.4). One row per paper; expanding shows the full author list in
 * published order (owner in bold) and only the resource buttons that exist.
 */
export function Research({ c, limit = 4 }: { c: Content; limit?: number }) {
  const pubs = [...c.publications].sort((a, b) => b.year - a.year);
  const shown = pubs.slice(0, limit);

  return (
    <>
      <ul className="border-t">
        {shown.map((p, i) => (
          <Reveal as="li" key={p.id} index={i} id={`pub-${p.id}`}>
            <details className="journey-details group border-b">
              <summary className="grid cursor-pointer list-none gap-x-8 gap-y-1 py-4 transition-colors hover:bg-surface/60 md:grid-cols-[1fr_auto_16rem_24px] md:items-baseline md:px-3 [&::-webkit-details-marker]:hidden">
                <span className="font-semibold leading-snug transition-transform duration-[var(--dur-fast)] motion-safe:group-hover:translate-x-0.5">{p.title}</span>
                <span aria-hidden="true" className="hidden h-4 w-px self-center bg-line md:block" />
                <span className="text-sm text-fg-muted">{publicationMeta(c, p).join(" · ")}</span>
                <span aria-hidden="true" className="journey-plus hidden text-lg leading-none text-fg-muted md:block">
                  +
                </span>
              </summary>
              <div className="space-y-4 pb-5 md:px-3">
                <p className="text-sm text-fg-muted">
                  {p.authors.map((a, k) => (
                    <span key={a}>
                      {k > 0 && ", "}
                      {isSelf(c, a) ? <strong className="font-semibold text-fg">{a}</strong> : a}
                    </span>
                  ))}
                  <span className="block pt-1">{p.venue}</span>
                </p>
                <p className="flex flex-wrap gap-2">
                  {LINKS.filter((l) => p.links[l.key]).map((l) => (
                    <a key={l.key} href={p.links[l.key]} className={pill} rel="noopener">
                      {l.label} <span className="arrow-nudge" aria-hidden="true">↗</span>
                    </a>
                  ))}
                  {p.bibtex && <CopyLink text={p.bibtex} fallbackHref={`/research/#${p.id}`} label="Copy BibTeX" className={pill} />}
                </p>
              </div>
            </details>
          </Reveal>
        ))}
      </ul>
      {pubs.length > limit && (
        <p className="mt-8 text-[15px]">
          <Link href="/research/" className="text-accent hover:underline">
            All publications <span className="arrow-nudge" aria-hidden="true">→</span>
          </Link>
        </p>
      )}
    </>
  );
}
