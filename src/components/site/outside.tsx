import type { Content } from "@/content/load";
import { mediaSource } from "@/content/media-manifest";
import { lifePhotos } from "@/content/view";
import Link from "next/link";
import { PhotoGallery, type Photo } from "./photo-gallery";

export function toPhoto(c: Content, id: string): Photo | null {
  const m = c.media.find((x) => x.id === id);
  const src = mediaSource(id);
  if (!m || !src) return null;
  const year = m.date?.slice(0, 4);
  return {
    id,
    title: m.title,
    alt: m.alt,
    caption: m.caption,
    meta: [m.location, year].filter(Boolean).join(" · ") || undefined,
    src: src.src,
    srcSet: src.srcSet,
    width: src.width,
    height: src.height,
    focal: m.focal,
    concept: m.concept,
  };
}

/** 05 / Outside the screen (§2.5): a few real photos with context, and hand-picked interests. */
export function Outside({ c }: { c: Content }) {
  const photos = c.home.featuredPhotos.map((id) => toPhoto(c, id)).filter((p): p is Photo => p !== null);
  const more = lifePhotos(c).length > photos.length;
  return (
    <>
      <PhotoGallery photos={photos} sizes="(min-width: 768px) 33vw, 78vw" />
      {(c.profile.currently.length > 0 || more) && (
        <div className="mt-8 flex flex-wrap items-baseline justify-between gap-4 text-sm">
          {c.profile.currently.length > 0 && (
            <p className="text-fg-muted">
              {c.profile.currently.map((x, i) => (
                <span key={x.label}>
                  {i > 0 && <span className="mx-3 text-line">|</span>}
                  <span className="label mr-2 text-[11px] text-fg">{x.label}</span>
                  {x.value}
                </span>
              ))}
            </p>
          )}
          {more && (
            <Link href="/life/" className="text-accent hover:underline">
              More moments <span className="arrow-nudge" aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      )}
    </>
  );
}
