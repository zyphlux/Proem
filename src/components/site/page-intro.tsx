import type { ReactNode } from "react";

/** Top of a sub-page: small label, title, optional lead. Uses the hero entrance. */
export function PageIntro({ label, title, lead, children }: { label: string; title: string; lead?: string; children?: ReactNode }) {
  return (
    <header className="pt-12 pb-10 md:pt-16 md:pb-14">
      <p className="label enter text-accent">{label}</p>
      <h1 className="enter mt-3 text-h2 md:text-[clamp(2.5rem,1.6rem+3vw,4rem)]" style={{ ["--i" as string]: 1 }}>
        {title}
      </h1>
      {lead && (
        <p className="enter mt-4 max-w-[52ch] text-lead text-fg-muted" style={{ ["--i" as string]: 2 }}>
          {lead}
        </p>
      )}
      {children}
    </header>
  );
}
