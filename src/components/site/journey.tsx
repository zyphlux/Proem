import { Reveal } from "@/components/motion/reveal";
import type { Content } from "@/content/load";
import { formatRange, formatYearMonth, journey, projectHref, type JourneyItem } from "@/content/view";
import Link from "next/link";

const EMPLOYMENT: Record<string, string | null> = {
  "full-time": null,
  "part-time": "Part-time",
  casual: "Casual",
  contract: "Contract",
  internship: "Internship",
  volunteer: "Volunteer",
};

/**
 * 02 / Journey (§2.2): work and study on one timeline.
 * Rows with confirmed details expand (<details>, works without JS). The rail grows
 * with scroll where scroll-driven animations are supported (M-7).
 */
export function Journey({ c }: { c: Content }) {
  const items = journey(c);
  return (
    <div className="relative">
      <span aria-hidden="true" className="journey-rail absolute top-3 bottom-3 left-[5px] w-px origin-top bg-line md:left-[calc(2rem+5px)]" />
      <ol>
        {items.map((j, i) => (
          <Reveal as="li" key={j.key} index={i} className="journey-row relative">
            <Row c={c} j={j} />
          </Reveal>
        ))}
      </ol>
    </div>
  );
}

function Row({ c, j }: { c: Content; j: JourneyItem }) {
  const org = j.kind === "work" ? j.item.organization : j.item.institution;
  const title = j.kind === "work" ? j.item.role : j.item.degree;
  const tag = j.kind === "work" ? EMPLOYMENT[j.item.employment] : j.item.kind ?? null;

  const details: React.ReactNode[] = [];
  if (j.kind === "study" && j.item.end === null && j.item.expectedEnd) {
    details.push(<li key="exp">Expected completion {formatYearMonth(j.item.expectedEnd)}</li>);
  }
  if (j.kind === "work" && j.item.location) details.push(<li key="loc">{j.item.location}</li>);
  const notes = j.kind === "work" ? j.item.responsibilities : j.item.notes;
  notes.forEach((n, k) => details.push(<li key={`n${k}`}>{n}</li>));
  const related = j.item.relatedProjects.map((id) => c.projects.find((p) => p.slug === id)).filter((p) => p !== undefined);
  if (related.length) {
    details.push(
      <li key="rel">
        Related work:{" "}
        {related.map((p, k) => (
          <span key={p.slug}>
            {k > 0 && ", "}
            <Link href={projectHref(p)} className="text-accent hover:underline">
              {p.title} <span aria-hidden="true">→</span>
            </Link>
          </span>
        ))}
      </li>,
    );
  }

  const summary = (
    <div className="relative grid grid-cols-[22px_1fr] items-baseline gap-x-4 py-4 md:grid-cols-[calc(2rem+22px)_9rem_4.5rem_1fr_24px] md:gap-x-6">
      <span aria-hidden="true" className="relative self-center md:pl-8">
        <span className={`journey-node block size-[11px] rounded-full border-2 border-accent ${j.current ? "bg-accent" : "bg-bg"}`} />
      </span>
      <span className="label tracking-[0.06em] text-fg md:border-r md:pr-6">{formatRange(j.item.start, j.item.end)}</span>
      <span className="label col-start-2 mt-1 text-fg-muted md:col-start-auto md:mt-0">{j.kind === "work" ? "Work" : "Study"}</span>
      <span className="col-start-2 mt-1 text-[15px] md:col-start-auto md:mt-0">
        <strong className="font-semibold">{org}</strong>
        <span className="text-fg-muted"> / </span>
        {title}
        {tag && <span className="text-fg-muted"> · {tag}</span>}
      </span>
      {details.length > 0 && (
        <span aria-hidden="true" className="journey-plus absolute top-4 right-0 text-lg leading-none text-fg-muted md:static md:justify-self-end">
          +
        </span>
      )}
    </div>
  );

  if (!details.length) return <div className="border-b border-line/60">{summary}</div>;

  return (
    <details className="journey-details group border-b border-line/60">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">{summary}</summary>
      <ul className="space-y-1.5 pb-5 pl-[38px] text-sm text-fg-muted md:pl-[calc(2rem+22px+1.5rem+9rem+1.5rem+4.5rem+1.5rem)]">
        {details}
      </ul>
    </details>
  );
}
