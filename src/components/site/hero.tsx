import { Orbit } from "@/components/motion/orbit";
import { Parallax } from "@/components/motion/parallax";
import type { Content } from "@/content/load";
import { mediaSource } from "@/content/media-manifest";
import { nowLine } from "@/content/view";
import { GraphPortrait } from "./graph-portrait";

/** Hero (§2.0): name and introduction first, the portrait (or graph) as support. */
export function Hero({ c, firstSection }: { c: Content; firstSection?: string }) {
  const { profile } = c;
  const portrait = profile.portrait ? mediaSource(profile.portrait) : null;
  const portraitAlt = profile.portrait ? c.media.find((m) => m.id === profile.portrait)?.alt ?? "" : "";
  const now = nowLine(c);
  const [first, second] = profile.orbitLabels;
  const graphProjects = c.projects.filter((p) => !p.archived).map((p) => ({ id: p.slug, publications: p.publications }));

  return (
    <section aria-labelledby="hero-title" className="pt-10 md:pt-14">
      <div className="grid-site items-center gap-y-10">
        <div className="col-span-4 md:col-span-5 lg:col-span-7">
          {profile.location && (
            <p className="label enter text-accent" style={{ ["--i" as string]: 0 }}>
              Based in {profile.location}
            </p>
          )}
          <h1 id="hero-title" className="enter mt-4 text-display" style={{ ["--i" as string]: 1 }}>
            {profile.greeting}
            <br />
            {profile.name}.
          </h1>
          <p className="enter mt-6 max-w-[34ch] text-lead" style={{ ["--i" as string]: 2 }}>
            {profile.intro}
          </p>
          <ul className="enter mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] sm:gap-x-0" style={{ ["--i" as string]: 3 }}>
            {firstSection && (
              <li className="sm:pr-6">
                <a href={`#${firstSection}`} className="hover:text-accent">
                  A little about me <span aria-hidden="true">↓</span>
                </a>
              </li>
            )}
            {profile.socials.map((s) => (
              <li key={s.id} className="sm:border-l sm:px-6 sm:first:border-l-0 sm:first:pl-0">
                <a href={s.url} className="hover:text-accent" rel="me noopener">
                  {s.label} <span className="arrow-nudge" aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="enter col-span-3 hidden md:col-start-6 md:block lg:col-span-5 lg:col-start-8" style={{ ["--i" as string]: 2 }}>
          <Parallax strength={4} className="mx-auto lg:w-[86%]">
            <Orbit
              rx={175}
              ry={112}
              tilt={-24}
              nodes={[{ at: 0.3 }, { at: 0.78 }]}
              anchors={[
                ...(first ? [{ at: 0.6, label: first }] : []),
                ...(second ? [{ at: 0.1, label: second }] : []),
              ]}
            >
              <Parallax strength={2} className="w-[58%]">
                <div
                  className="aspect-[4/5] overflow-hidden rounded-[28px] border border-fg/12"
                  style={{ background: "linear-gradient(150deg, color-mix(in srgb, var(--fg) 12%, var(--surface)) 0%, var(--surface) 45%, color-mix(in srgb, var(--fg) 6%, var(--bg)) 100%)" }}
                >
                  {portrait ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={portrait.src} srcSet={portrait.srcSet} sizes="300px" width={portrait.width} height={portrait.height} alt={portraitAlt} className="h-full w-full object-cover" fetchPriority="high" />
                  ) : (
                    <GraphPortrait projects={graphProjects} publications={c.publications} />
                  )}
                </div>
              </Parallax>
            </Orbit>
          </Parallax>
        </div>
      </div>

      {(now || profile.interests.length > 0) && (
        <div className="enter mt-12 grid border-y py-3.5 text-sm md:mt-16 md:grid-cols-2" style={{ ["--i" as string]: 4 }}>
          {now && (
            <p className="py-1 md:pr-6">
              <span className="label mr-2 text-accent">Now /</span>
              {now}
            </p>
          )}
          {profile.interests.length > 0 && (
            <p className="py-1 md:border-l md:pl-6">
              <span className="label mr-2 text-accent">Interests /</span>
              {profile.interests.join(" · ")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
