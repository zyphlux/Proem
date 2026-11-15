"use client";

import { useEffect } from "react";

/**
 * Mounted once in the root layout. Watches every [data-reveal] element and marks it
 * [data-revealed] when it scrolls into view (M-5, M-7).
 *
 * Elements are only hidden after this runs (html.reveal-ready), and anything already
 * on screen is marked first, so nothing flashes and nothing stays hidden without JS.
 */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    if (!("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute("data-revealed", "");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0.01 },
    );

    const seen = new WeakSet<Element>();
    const scan = () => {
      const vh = window.innerHeight;
      document.querySelectorAll("[data-reveal]:not([data-revealed])").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        const r = el.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) el.setAttribute("data-revealed", "");
        else io.observe(el);
      });
    };

    scan();
    root.classList.add("reveal-ready");

    // Client-side navigation adds new elements.
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      root.classList.remove("reveal-ready");
    };
  }, []);

  return null;
}
