"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

export type Photo = {
  id: string;
  title?: string;
  alt: string;
  caption?: string;
  meta?: string;
  src: string;
  srcSet: string;
  width: number;
  height: number;
  focal: { x: number; y: number };
  concept: boolean;
};

type VTDocument = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

function transition(cb: () => void) {
  const doc = document as VTDocument;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (doc.startViewTransition && !reduce) doc.startViewTransition(() => flushSync(cb));
  else cb();
}

/**
 * Photo row + lightbox (§2.5, M-12, M-13).
 * - Thumbnails are buttons; the lightbox is a native <dialog> (focus trap, Escape).
 * - Opening morphs the thumbnail into the large image with a View Transition.
 * - Arrow keys move between photos; swipe down closes on touch; focus returns to the thumbnail.
 * - On phones the row scrolls horizontally with snap points.
 */
export function PhotoGallery({ photos, sizes }: { photos: Photo[]; sizes: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const thumbs = useRef<(HTMLButtonElement | null)[]>([]);
  const [index, setIndex] = useState<number | null>(null);
  const touchY = useRef<number | null>(null);

  const open = (i: number) => {
    const t = thumbs.current[i]?.querySelector("img");
    if (t) t.style.viewTransitionName = "lightbox-photo";
    transition(() => {
      if (t) t.style.viewTransitionName = "";
      setIndex(i);
      dialog.current?.showModal();
    });
  };

  const close = () => {
    if (index === null) return;
    const i = index;
    transition(() => {
      dialog.current?.close();
      setIndex(null);
      const t = thumbs.current[i]?.querySelector("img");
      if (t) t.style.viewTransitionName = "lightbox-photo";
    });
    // restore focus and clear the transition name afterwards
    setTimeout(() => {
      const t = thumbs.current[i];
      t?.focus();
      const img = t?.querySelector("img");
      if (img) img.style.viewTransitionName = "";
    }, 400);
  };

  const step = (d: number) => setIndex((i) => (i === null ? i : (i + d + photos.length) % photos.length));

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      close();
    };
    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
  });

  const current = index === null ? null : photos[index];

  return (
    <>
      <ul className="-mx-[var(--gutter)] flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--gutter)] pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0">
        {photos.map((p, i) => (
          <li key={p.id} className="w-[78%] shrink-0 snap-start md:w-auto" data-reveal="" style={{ ["--i" as string]: i }}>
            {p.title && <p className="mb-2 text-[15px] font-semibold">{p.title}</p>}
            <button
              ref={(el) => {
                thumbs.current[i] = el;
              }}
              type="button"
              onClick={() => open(i)}
              aria-label={`Open photo: ${p.alt}`}
              className="group relative block w-full overflow-hidden rounded-lg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.src}
                srcSet={p.srcSet}
                sizes={sizes}
                width={p.width}
                height={p.height}
                alt={p.alt}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full object-cover transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] motion-safe:group-hover:scale-[1.03]"
                style={{ objectPosition: `${p.focal.x}% ${p.focal.y}%` }}
              />
              {p.concept && <span className="label absolute right-2 bottom-2 rounded bg-band/80 px-1.5 py-0.5 text-[10px] text-white/85">Concept</span>}
            </button>
            {(p.meta || p.caption) && (
              <p className="mt-2 text-fg-muted transition-colors duration-[var(--dur-base)]">
                {p.meta && <span className="label block text-[11px]">{p.meta}</span>}
                {p.caption && <span className="mt-1 block text-sm">{p.caption}</span>}
              </p>
            )}
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label={current ? current.alt : "Photo"}
        className="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/85 open:flex"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        onTouchStart={(e) => (touchY.current = e.touches[0].clientY)}
        onTouchEnd={(e) => {
          if (touchY.current !== null && e.changedTouches[0].clientY - touchY.current > 80) close();
          touchY.current = null;
        }}
      >
        {current && (
          <figure className="flex h-[100dvh] w-[100vw] flex-col items-center justify-center gap-4 p-4 md:p-10" onClick={(e) => e.target === e.currentTarget && close()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.src}
              srcSet={current.srcSet}
              sizes="100vw"
              width={current.width}
              height={current.height}
              alt={current.alt}
              className="max-h-[80dvh] w-auto max-w-full rounded-md object-contain"
              style={{ viewTransitionName: "lightbox-photo" }}
            />
            <figcaption className="text-center text-sm text-white/80">
              {current.title && <span className="font-semibold text-white">{current.title}</span>}
              {current.meta && <span className="label ml-3 text-[11px]">{current.meta}</span>}
              {current.caption && <span className="mt-1 block">{current.caption}</span>}
            </figcaption>
          </figure>
        )}
        <div className="fixed top-4 right-4 flex gap-2">
          {photos.length > 1 && (
            <>
              <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
                ←
              </button>
              <button type="button" onClick={() => step(1)} aria-label="Next photo" className="grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
                →
              </button>
            </>
          )}
          <button type="button" onClick={close} aria-label="Close" className="grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
            ✕
          </button>
        </div>
      </dialog>
    </>
  );
}
