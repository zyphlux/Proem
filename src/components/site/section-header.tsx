import type { HomeSection } from "@/content/view";
import { Reveal } from "@/components/motion/reveal";

/** "01 / About" + optional title and right-aligned aside. Numbering is computed (§2). */
export function SectionHeader({ s }: { s: HomeSection }) {
  return (
    <Reveal as="header" className="mb-8 md:mb-10">
      <div className="flex items-baseline justify-between gap-6">
        <p className="label">
          {s.number} <span className="text-fg-muted">/</span> {s.label}
        </p>
        {s.aside && <p className="label hidden text-fg-muted sm:block">{s.aside}</p>}
      </div>
      {s.title && (
        <h2 id={`${s.id}-title`} className="mt-3 text-h2">
          {s.title}
        </h2>
      )}
    </Reveal>
  );
}
