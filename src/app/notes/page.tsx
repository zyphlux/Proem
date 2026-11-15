import { Reveal } from "@/components/motion/reveal";
import { PageIntro } from "@/components/site/page-intro";
import { getContent } from "@/content/load";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = { title: "Notes", description: "Notes, and an archive of courses." };

/** Notes and the course archive (kept separate: course pages are a learning record, not articles). */
export default function NotesPage() {
  const { notes, courses } = getContent();
  if (!notes.length && !courses.length) notFound();
  const sorted = [...notes].sort((a, b) => b.date.localeCompare(a.date));
  const institutions = [...new Set(courses.map((c) => c.institution))];

  return (
    <main className="container-site pb-10">
      <PageIntro label="Notes" title={notes.length ? "Notes and learning archive" : "Learning archive"} />

      {sorted.length > 0 && (
        <section aria-labelledby="notes" className="border-t pt-8">
          <h2 id="notes" className="label mb-2 text-fg-muted">
            Notes
          </h2>
          <ul>
            {sorted.map((n, i) => (
              <Reveal as="li" key={n.slug} index={i} className="border-b last:border-b-0">
                <Link href={`/notes/${n.slug}/`} className="group grid gap-1 py-5 md:grid-cols-[120px_1fr] md:gap-6">
                  <time dateTime={n.date} className="label pt-1 text-[11px] text-fg-muted">
                    {n.date}
                  </time>
                  <span>
                    <span className="text-lg font-semibold group-hover:text-accent">{n.title}</span>
                    {n.summary && <span className="mt-1 block text-fg-muted">{n.summary}</span>}
                    {n.tags.length > 0 && <span className="label mt-2 block text-[11px] text-fg-muted">{n.tags.join(" · ")}</span>}
                  </span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      {courses.length > 0 && (
        <section aria-labelledby="courses" className="mt-16 border-t pt-8">
          <h2 id="courses" className="label mb-2 text-fg-muted">
            Course archive
          </h2>
          <p className="mb-6 max-w-[56ch] text-sm text-fg-muted">Courses I took, with links to my coursework where it is public.</p>
          {institutions.map((inst) => (
            <div key={inst} className="mb-10">
              {institutions.length > 1 && <h3 className="mb-2 font-semibold">{inst}</h3>}
              <ul>
                {courses
                  .filter((c) => c.institution === inst)
                  .map((course) => (
                    <li key={course.code} className="grid gap-x-6 gap-y-1 border-b py-3.5 text-[15px] md:grid-cols-[110px_1fr_auto]">
                      <span className="label pt-0.5 text-[11px]">{course.code}</span>
                      <span>
                        {course.name}
                        {course.tags.length > 0 && <span className="text-fg-muted"> · {course.tags.join(", ")}</span>}
                      </span>
                      <span className="flex gap-4 text-sm">
                        {course.repo && (
                          <a href={course.repo} className="text-accent hover:underline" rel="noopener">
                            Coursework <span className="arrow-nudge" aria-hidden="true">↗</span>
                          </a>
                        )}
                        {course.handbookUrl && (
                          <a href={course.handbookUrl} className="text-fg-muted hover:text-fg" rel="noopener">
                            Handbook <span className="arrow-nudge" aria-hidden="true">↗</span>
                          </a>
                        )}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
