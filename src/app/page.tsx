import { About } from "@/components/site/about";
import { Hero } from "@/components/site/hero";
import { Journey } from "@/components/site/journey";
import { Outside } from "@/components/site/outside";
import { Research } from "@/components/site/research";
import { SectionHeader } from "@/components/site/section-header";
import { SelectedWork } from "@/components/site/selected-work";
import { getContent } from "@/content/load";
import { homeSections, type HomeSection } from "@/content/view";

const BODY: Record<HomeSection["id"], (props: { c: ReturnType<typeof getContent> }) => React.ReactNode> = {
  about: About,
  journey: Journey,
  work: SelectedWork,
  research: Research,
  life: Outside,
};

function personJsonLd(c: ReturnType<typeof getContent>) {
  const job = c.experience.find((x) => x.end === null);
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: c.profile.name,
    description: c.profile.intro,
    ...(c.site.url ? { url: c.site.url } : {}),
    ...(c.profile.location ? { homeLocation: c.profile.location } : {}),
    ...(job ? { jobTitle: job.role, worksFor: { "@type": "Organization", name: job.organization } } : {}),
    alumniOf: c.education.filter((e) => e.state === "completed").map((e) => ({ "@type": "EducationalOrganization", name: e.institution })),
    sameAs: c.profile.socials.map((s) => s.url),
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default function Home() {
  const c = getContent();
  const sections = homeSections(c);

  return (
    <main>
      <div className="container-site">
        <Hero c={c} firstSection={sections[0]?.id} />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: personJsonLd(c) }} />
      {sections.map((s, i) => {
        const Body = BODY[s.id];
        const band = s.id === "work";
        // Hairline above a section, except right after the hero's status bar or the band.
        const rule = !band && i > 0 && sections[i - 1].id !== "work";
        return (
          <section
            key={s.id}
            id={s.id}
            aria-labelledby={s.title ? `${s.id}-title` : undefined}
            aria-label={s.title ? undefined : s.label}
            className={`scroll-mt-14 ${band ? "band mt-4 py-14 md:py-16" : "pt-12 md:pt-14"}`}
          >
            <div className="container-site">
              <div className={rule ? "border-t pt-10 md:pt-12" : ""}>
                <SectionHeader s={s} />
                <Body c={c} />
              </div>
            </div>
          </section>
        );
      })}
    </main>
  );
}
