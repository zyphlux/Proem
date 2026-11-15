import { Reveal } from "@/components/motion/reveal";
import type { Content } from "@/content/load";

/** 01 / About (§2.1): one statement, one paragraph, and the "threads" that connect them. */
export function About({ c }: { c: Content }) {
  const { about } = c.profile;
  return (
    <div className="grid-site gap-y-8">
      <Reveal as="p" className="col-span-4 text-statement md:col-span-4 lg:col-span-6 lg:pr-10">
        {about.statement}
      </Reveal>
      <Reveal index={1} className="col-span-4 md:col-span-4 md:border-l md:pl-8 lg:col-span-6 lg:pl-10">
        <p className="max-w-[56ch] text-[17px] leading-relaxed text-fg-muted">{about.body}</p>
        {about.threads.length > 1 && <Threads items={about.threads} />}
      </Reveal>
    </div>
  );
}

/**
 * M-6: nodes joined by a line that draws left → right when the block is revealed,
 * then each node lights up in turn. Static (fully drawn) without JS or with reduced motion.
 */
function Threads({ items }: { items: string[] }) {
  return (
    <ol className="threads relative mt-8 grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }} aria-label="Threads">
      <span aria-hidden="true" className="threads-line absolute top-[5px] left-[5px] right-[calc(100%/var(--n)-5px)] h-px origin-left bg-line" style={{ ["--n" as string]: items.length }} />
      {items.map((t, i) => (
        <li key={t} className="relative pr-3" style={{ ["--k" as string]: i }}>
          <span aria-hidden="true" className="threads-node relative block size-[11px] rounded-full border-2 border-accent bg-bg" />
          <span className="mt-3 block text-sm leading-snug">{t}</span>
        </li>
      ))}
    </ol>
  );
}
