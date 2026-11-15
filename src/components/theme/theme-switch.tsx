"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

const OPTIONS = [
  { value: "light", label: "Light", icon: <SunIcon /> },
  { value: "system", label: "System", icon: <SystemIcon /> },
  { value: "dark", label: "Dark", icon: <MoonIcon /> },
] as const;

/**
 * Light / System / Dark (M-14). A radio group, so arrow keys work.
 * The visitor's choice is stored by next-themes in localStorage and only affects them.
 * The switch cross-fades with the View Transitions API where available.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // false on the server and during hydration, true afterwards — the stored theme is only known on the client.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const current = mounted ? (theme ?? "system") : null;

  function choose(value: string) {
    if (value === current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !reduce) doc.startViewTransition(() => setTheme(value));
    else setTheme(value);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={`inline-flex items-center gap-0.5 rounded-full border border-line p-0.5 ${className ?? ""}`}
    >
      {OPTIONS.map((o) => {
        const checked = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={o.label}
            title={o.label}
            tabIndex={checked || (current === null && o.value === "system") ? 0 : -1}
            onClick={() => choose(o.value)}
            onKeyDown={(e) => {
              const i = OPTIONS.findIndex((x) => x.value === o.value);
              const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
              if (!next) return;
              e.preventDefault();
              const target = OPTIONS[(i + next + OPTIONS.length) % OPTIONS.length];
              choose(target.value);
              (e.currentTarget.parentElement?.children[OPTIONS.indexOf(target)] as HTMLElement | undefined)?.focus();
            }}
            className={`grid size-7 place-items-center rounded-full transition-colors duration-[var(--dur-fast)] ${
              checked ? "bg-fg text-bg" : "text-fg-muted hover:text-fg"
            }`}
          >
            {o.icon}
          </button>
        );
      })}
    </div>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M3 13l1-1M12 4l1-1" strokeLinecap="round" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" strokeLinejoin="round" />
    </svg>
  );
}
function SystemIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <rect x="2" y="3" width="12" height="8" rx="1.2" />
      <path d="M6 14h4M8 11v3" strokeLinecap="round" />
    </svg>
  );
}
