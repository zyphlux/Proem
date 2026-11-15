import { getContent } from "@/content/load";
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const { site } = getContent();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/styleguide/"] },
    ...(site.url ? { sitemap: `${site.url.replace(/\/$/, "")}/sitemap.xml` } : {}),
  };
}
