"use client";

import { useEffect, useRef } from "react";

/**
 * Shows the rendered resume inside a Shadow DOM so its template CSS can't affect the
 * site (and vice versa). The server HTML uses a declarative shadow root, which works
 * without JavaScript; after client-side navigation the root is attached here.
 */
export function ResumeShadow({ html, css }: { html: string; css: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || el.shadowRoot) return;
    const root = el.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${css}</style>${html}`;
  }, [html, css]);
  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-xl border shadow-[0_1px_2px_rgba(0,0,0,.06),0_12px_32px_-12px_rgba(0,0,0,.18)]"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: `<template shadowrootmode="open"><style>${css}</style>${html}</template>` }}
    />
  );
}

/** Prints the standalone resume (correct page size and margins) via a hidden iframe. */
export function PrintResume({ href, className }: { href: string; className?: string }) {
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        const frame = document.createElement("iframe");
        frame.style.cssText = "position:fixed;width:0;height:0;border:0;opacity:0";
        frame.src = href;
        frame.onload = () => {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
          setTimeout(() => frame.remove(), 60_000);
        };
        document.body.appendChild(frame);
      }}
    >
      Print / Save as PDF
    </a>
  );
}
