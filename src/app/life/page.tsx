import { PageIntro } from "@/components/site/page-intro";
import { toPhoto } from "@/components/site/outside";
import { PhotoGallery, type Photo } from "@/components/site/photo-gallery";
import { getContent } from "@/content/load";
import { lifePhotos } from "@/content/view";
import { notFound } from "next/navigation";

export const metadata = { title: "Life", description: "Photos from outside the screen." };

/** /life (§2.5): every life photo, grouped by album. 404 (and no links to it) when there are none. */
export default function LifePage() {
  const c = getContent();
  const media = lifePhotos(c);
  if (!media.length) notFound();
  const albums = [...new Set(media.flatMap((m) => m.albums))];

  return (
    <main className="container-site pb-10">
      <PageIntro label="Life" title="Outside the screen" lead="Places, small moments and the occasional fish." />
      {albums.map((album) => {
        const photos = media
          .filter((m) => m.albums.includes(album))
          .map((m) => toPhoto(c, m.id))
          .filter((p): p is Photo => p !== null);
        return (
          <section key={album} aria-labelledby={`album-${album}`} className="border-t py-8">
            <h2 id={`album-${album}`} className="label mb-5 text-fg-muted">
              {album}
            </h2>
            <PhotoGallery photos={photos} sizes="(min-width: 768px) 33vw, 78vw" />
          </section>
        );
      })}
    </main>
  );
}
