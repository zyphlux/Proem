import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader, type NavItem } from "@/components/site/site-header";
import { currentResume, homeSections } from "@/content/view";
import { ThemeProvider } from "@/components/theme-provider";
import { getContent } from "@/content/load";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { RevealObserver } from "@/components/motion/reveal-observer";
import { resolveTheme, themeCss } from "@/theme/theme";
import { inter, jetbrainsMono, sourceSerif } from "./fonts";
import "./globals.css";

export function generateMetadata(): Metadata {
  const { site, profile } = getContent();
  return {
    metadataBase: site.url ? new URL(site.url) : undefined,
    title: { default: site.title, template: `%s | ${site.title}` },
    description: site.description,
    openGraph: {
      title: site.title,
      description: site.description,
      url: site.url,
      siteName: profile.name,
      locale: site.locale,
      type: "website",
    },
    twitter: { title: site.title, card: "summary_large_image" },
  };
}

const NAV_PAGE: Partial<Record<string, string>> = { work: "/work/", research: "/research/" };
const NAV_LABEL = { about: "About", journey: "Journey", work: "Work", research: "Research", life: "Life" } as const;

const THEME_PARAM = `try{var t=new URLSearchParams(location.search).get("theme");if(t==="light"||t==="dark"||t==="system")localStorage.setItem("theme",t)}catch(e){}`;

/** Build time stands in for the last publish time until the admin records publishes (P5). */
const BUILT_AT = new Date();

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const c = getContent();
  const { site, theme } = c;
  const nav: NavItem[] = homeSections(c)
    .filter((s) => s.id !== "life")
    .map((s) => ({ id: s.id, label: NAV_LABEL[s.id], href: `/#${s.id}`, page: NAV_PAGE[s.id] }));
  return (
    <html lang={site.locale} suppressHydrationWarning className={cn(inter.variable, jetbrainsMono.variable, sourceSerif.variable)}>
      <head>
        {/* Colours from content/theme.json (validated hex values only). */}
        <style id="theme-tokens" dangerouslySetInnerHTML={{ __html: themeCss(resolveTheme(theme)) }} />
        {/* ?theme=light|dark|system sets the visitor preference (used by the admin preview). Runs before next-themes. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_PARAM }} />
      </head>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded focus:bg-fg focus:px-3 focus:py-2 focus:text-bg">
            Skip to content
          </a>
          <SiteHeader name={c.profile.name} items={nav} resume={currentResume(c) ? { href: "/resume/" } : null} />
          <div id="main">{children}</div>
          <div className="container-site">
            <SiteFooter c={c} updated={BUILT_AT} />
          </div>
          <RevealObserver />
          {process.env.CONTENT_PREVIEW === "1" && (
            <p className="label fixed bottom-3 left-3 z-50 rounded-full bg-accent px-3 py-1.5 text-[10px] text-white shadow-lg">Preview · drafts included</p>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
