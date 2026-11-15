import { useContent } from "../store";
import { Chip, PageHeader } from "../ui";

const FILE_TO_PAGE: [RegExp, string][] = [
  [/^profile/, "profile"],
  [/^site/, "site"],
  [/^home/, "home"],
  [/^experience/, "experience"],
  [/^education/, "education"],
  [/^publications/, "publications"],
  [/^courses/, "courses"],
  [/^projects\//, "projects"],
  [/^notes\//, "notes"],
  [/^media\//, "media"],
  [/^resume\//, "resume"],
  [/^theme/, "appearance"],
];
const pageFor = (file: string) => FILE_TO_PAGE.find(([re]) => re.test(file))?.[1] ?? "overview";

export function OverviewPage() {
  const { data } = useContent();
  if (!data) return null;
  const errors = data.issues.filter((i) => i.level === "error");
  const warnings = data.issues.filter((i) => i.level === "warning");
  const arr = (x: unknown) => (Array.isArray(x) ? x : []);
  const counts = [
    ["Experience", arr(data.json.experience).length, "experience"],
    ["Education", arr(data.json.education).length, "education"],
    ["Projects", data.docs.projects.length, "projects"],
    ["Publications", arr(data.json.publications).length, "publications"],
    ["Notes", data.docs.notes.length, "notes"],
    ["Courses", arr(data.json.courses).length, "courses"],
    ["Media", arr(data.json.media).length, "media"],
  ] as const;

  return (
    <>
      <PageHeader title="Overview" intro={`Editing ${data.dir}`} />
      <div className="mb-6 flex flex-wrap gap-2">
        {errors.length ? <Chip tone="danger">{errors.length} error(s)</Chip> : <Chip tone="ok">No errors</Chip>}
        {warnings.length > 0 && <Chip tone="warn">{warnings.length} note(s)</Chip>}
        {data.changed.length > 0 ? <Chip tone="info">{data.changed.length} unpublished change(s)</Chip> : <Chip tone="ok">Up to date</Chip>}
      </div>
      <ul className="mb-8 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
        {counts.map(([label, n, page]) => (
          <li key={label}>
            <a href={`#/${page}`} className="block rounded-lg border bg-panel p-4 hover:border-fg">
              <span className="block text-2xl font-semibold">{n}</span>
              <span className="text-muted">{label}</span>
            </a>
          </li>
        ))}
      </ul>
      {(errors.length > 0 || warnings.length > 0) && (
        <section className="mb-8 max-w-4xl">
          <h2 className="mb-2 font-semibold">Needs attention</h2>
          <ul className="overflow-hidden rounded-lg border bg-panel text-[13px]">
            {[...errors, ...warnings].map((i, k) => (
              <li key={k} className="flex gap-3 border-b px-4 py-2.5 last:border-b-0">
                <span className={i.level === "error" ? "text-danger" : "text-warn"}>{i.level === "error" ? "✗" : "!"}</span>
                <a href={`#/${pageFor(i.file)}`} className="font-mono text-xs text-muted hover:text-fg">
                  {i.file}
                </a>
                <span>{i.message}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="max-w-4xl">
        <h2 className="mb-2 font-semibold">Workflow</h2>
        <ol className="list-decimal space-y-1 pl-5 text-muted">
          <li>Edit and <strong className="text-fg">Save draft</strong>. Nothing changes on the live site.</li>
          <li>
            Check it in <a className="text-accent" href="#/preview">Preview</a> — phone and desktop, light and dark.
          </li>
          <li>
            <a className="text-accent" href="#/publishing">Publish</a>. If anything fails, the live site stays as it was. You can roll back at any time.
          </li>
        </ol>
      </section>
    </>
  );
}
