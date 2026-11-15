"use client";

import { useState } from "react";

/**
 * Copies `text` to the clipboard and shows "Copied" for 1.5s.
 * Rendered as a link to `fallbackHref`, so it still does something useful without JS.
 */
export function CopyLink({ text, fallbackHref, label, className }: { text: string; fallbackHref: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <a
      href={fallbackHref}
      className={className}
      onClick={async (e) => {
        if (!navigator.clipboard) return;
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          window.location.href = fallbackHref;
        }
      }}
    >
      {copied ? "Copied" : label}
      <span className="sr-only" aria-live="polite">
        {copied ? `${label}: copied to clipboard` : ""}
      </span>
    </a>
  );
}
