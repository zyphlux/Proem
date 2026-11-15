import { getContent } from "@/content/load";
import { currentResume, hasProjectStory, lifePhotos } from "@/content/view";
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/** Only pages that actually exist for this content. Needs site.url. */
export default function sitemap(): MetadataRoute.Sitemap {
  const c = getContent();
  if (!c.site.url) return [];
  const base = c.site.url.replace(/\/$/, "");
  const paths = [
    "/",
    c.projects.length && "/work/",
    ...c.projects.filter(hasProjectStory).map((p) => `/work/${p.slug}/`),
    c.publications.length && "/research/",
    (c.notes.length || c.courses.length) && "/notes/",
    ...c.notes.map((n) => `/notes/${n.slug}/`),
    lifePhotos(c).length && "/life/",
    currentResume(c) && "/resume/",
  ].filter((x): x is string => typeof x === "string");
  return paths.map((p) => ({ url: base + p }));
}
