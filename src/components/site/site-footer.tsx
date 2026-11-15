import { ThemeSwitch } from "@/components/theme/theme-switch";
import type { Content } from "@/content/load";
import { currentResume, formatMonthYear, lifePhotos } from "@/content/view";
import Link from "next/link";
import { CopyLink } from "./copy-button";

/** Contact + footer (§2.6). Phone only when the owner opted in. */
export function SiteFooter({ c, updated }: { c: Content; updated: Date }) {
  const { contact, socials, name } = c.profile;
  const resume = currentResume(c);
  const link = "inline-flex items-center gap-1 hover:text-accent";
  const pages = [
    c.projects.length > 0 && { href: "/work/", label: "Work" },
    c.publications.length > 0 && { href: "/research/", label: "Research" },
    (c.notes.length > 0 || c.courses.length > 0) && { href: "/notes/", label: "Notes" },
    lifePhotos(c).length > 0 && { href: "/life/", label: "Life" },
  ].filter((x): x is { href: string; label: string } => Boolean(x));

  return (
    <footer id="contact" className="mt-20 border-t">
      <div className="flex flex-col gap-6 py-10 lg:flex-row lg:items-center lg:gap-10">
        <p className="text-h2 shrink-0">{contact.title}</p>
        {contact.blurb && <p className="text-sm text-fg-muted lg:border-l lg:pl-10">{contact.blurb}</p>}
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[15px] lg:ml-auto">
          {contact.email && (
            <li className="flex items-center gap-2">
              <a href={`mailto:${contact.email}`} className={link}>
                Email <span className="arrow-nudge" aria-hidden="true">↗</span>
              </a>
              <CopyLink text={contact.email} fallbackHref={`mailto:${contact.email}`} label="Copy" className="label rounded border px-1.5 py-0.5 text-[10px] text-fg-muted hover:text-fg" />
            </li>
          )}
          {contact.phone && (
            <li>
              <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className={link}>
                {contact.phone}
              </a>
            </li>
          )}
          {socials.map((s) => (
            <li key={s.id}>
              <a href={s.url} className={link} rel="me noopener">
                {s.label} <span className="arrow-nudge" aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
          {resume && (
            <li>
              <a href={resume.href} className="inline-flex items-center gap-1 rounded-full border border-fg/70 px-4 py-2 text-sm font-medium transition-colors hover:bg-fg hover:text-bg">
                Resume <span className="arrow-nudge" aria-hidden="true">↗</span>
              </a>
            </li>
          )}
        </ul>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t py-5 text-xs text-fg-muted">
        <p>
          © {updated.getFullYear()} {name} · Last updated {formatMonthYear(updated)}
        </p>
        {pages.length > 0 && (
          <nav aria-label="Pages" className="flex gap-5">
            {pages.map((p) => (
              <Link key={p.href} href={p.href} className="hover:text-fg">
                {p.label}
              </Link>
            ))}
          </nav>
        )}
        <ThemeSwitch />
      </div>
    </footer>
  );
}
