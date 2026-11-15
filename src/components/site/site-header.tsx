"use client";

import { ThemeSwitch } from "@/components/theme/theme-switch";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

function subscribeScroll(cb: () => void) {
  window.addEventListener("scroll", cb, { passive: true });
  return () => window.removeEventListener("scroll", cb);
}

export type NavItem = {
  id: string;
  label: string;
  /** Anchor on the home page. */
  href: string;
  /** Dedicated page used when not on the home page (e.g. /work/). */
  page?: string;
};

type Props = { name: string; items: NavItem[]; resume: { href: string } | null };

/**
 * Site header (§1). Transparent at the top of the page, compact with a surface
 * background after scrolling (M-15). On the home page the current section is
 * underlined (scroll-spy). Below 768px, nav links fold into a menu but Resume stays visible.
 */
export function SiteHeader({ name, items, resume }: Props) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const scrolled = useSyncExternalStore(subscribeScroll, () => window.scrollY > 24, () => false);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Scroll-spy: the section crossing the upper third of the viewport is current.
  useEffect(() => {
    if (!isHome) return;
    const sections = items.map((i) => document.getElementById(i.id)).filter((x): x is HTMLElement => Boolean(x));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-30% 0px -65% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [isHome, items]);

  // Menu: Escape closes and returns focus; focus moves into the panel on open.
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);
  const hrefOf = (i: NavItem) => (!isHome && i.page ? i.page : i.href);
  const currentOf = (i: NavItem) =>
    isHome ? (active === i.id ? ("location" as const) : undefined) : i.page && pathname.startsWith(i.page) ? ("page" as const) : undefined;

  return (
    <header
      data-scrolled={scrolled || open ? "" : undefined}
      className="group/header sticky top-0 z-40 transition-[background-color,backdrop-filter] duration-[var(--dur-base)] data-[scrolled]:bg-bg/85 data-[scrolled]:backdrop-blur-md"
    >
      <div className="container-site">
        <div className="flex h-16 items-center justify-between gap-6 border-b transition-[height] duration-[var(--dur-base)] group-data-[scrolled]/header:h-14">
          <Link href="/" className="text-[17px] font-semibold tracking-tight" onClick={close}>
            {name}
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-8 text-sm md:flex">
            {items.map((i) => (
              <Link
                key={i.id}
                href={hrefOf(i)}
                aria-current={currentOf(i)}
                className="relative py-1 text-fg/80 transition-colors hover:text-fg aria-[current]:text-fg after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-[var(--dur-base)] aria-[current]:after:scale-x-100"
              >
                {i.label}
              </Link>
            ))}
            {resume && <ResumeLink href={resume.href} />}
            <span aria-hidden="true" className="h-5 w-px bg-line" />
            <ThemeSwitch />
          </nav>

          <div className="flex items-center gap-3 md:hidden">
            {resume && <ResumeLink href={resume.href} />}
            <button
              ref={menuButton}
              type="button"
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
              className="grid size-9 place-items-center rounded-full border"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                {open ? <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" strokeLinecap="round" /> : <path d="M2.5 5.5h11M2.5 10.5h11" strokeLinecap="round" />}
              </svg>
            </button>
          </div>
        </div>

        <div id="site-menu" ref={panel} hidden={!open} className="border-b py-4 md:hidden">
          <nav aria-label="Primary" className="flex flex-col">
            {items.map((i) => (
              <Link key={i.id} href={hrefOf(i)} aria-current={currentOf(i)} onClick={close} className="py-2.5 text-lg aria-[current]:text-accent">
                {i.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex items-center justify-between">
            <span className="label text-fg-muted">Theme</span>
            <ThemeSwitch />
          </div>
        </div>
      </div>
    </header>
  );
}

function ResumeLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1 rounded-full border border-fg/70 px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-fg hover:text-bg"
    >
      Resume <span className="arrow-nudge" aria-hidden="true">↗</span>
    </a>
  );
}
