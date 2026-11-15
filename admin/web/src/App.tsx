import { useEffect, useState, type ReactNode } from "react";
import { api, setCsrf } from "./api";
import { collections, homeFields, noteMetaFields, profileFields, projectMetaFields, siteFields } from "./modules";
import { AppearancePage } from "./pages/appearance-page";
import { CollectionPage } from "./pages/collection-page";
import { DocsPage } from "./pages/docs-page";
import { JsonPage } from "./pages/json-page";
import { LoginPage } from "./pages/login-page";
import { MediaPage } from "./pages/media-page";
import { OverviewPage } from "./pages/overview-page";
import { PreviewPage } from "./pages/preview-page";
import { PublishPage } from "./pages/publish-page";
import { ResumeHub } from "./pages/resume/hub";
import { ContentProvider, useContent } from "./store";

const NAV: { group: string; items: { id: string; label: string }[] }[] = [
  { group: "", items: [{ id: "overview", label: "Overview" }] },
  { group: "About you", items: [{ id: "profile", label: "Profile" }, { id: "experience", label: "Experience" }, { id: "education", label: "Education" }] },
  { group: "Work", items: [{ id: "projects", label: "Projects" }, { id: "publications", label: "Publications" }, { id: "notes", label: "Notes" }, { id: "courses", label: "Courses" }] },
  { group: "Assets", items: [{ id: "media", label: "Media" }, { id: "resume", label: "Resume" }] },
  { group: "Site", items: [{ id: "home", label: "Home page" }, { id: "appearance", label: "Appearance" }, { id: "site", label: "Site settings" }] },
  { group: "Ship", items: [{ id: "preview", label: "Preview" }, { id: "publishing", label: "Publishing" }] },
];

function route(): string {
  return location.hash.replace(/^#\/?/, "") || "overview";
}

function Page({ route }: { route: string }): ReactNode {
  const [id, sub = ""] = route.split("/");
  switch (id) {
    case "profile":
      return <JsonPage name="profile" title="Profile" intro="Who you are: the hero, About, contact and social links." fields={profileFields} />;
    case "site":
      return <JsonPage name="site" title="Site settings" fields={siteFields} />;
    case "home":
      return <JsonPage name="home" title="Home page" intro="Section order and titles, and what is featured." fields={homeFields} />;
    case "experience":
    case "education":
    case "publications":
    case "courses":
      return <CollectionPage key={id} m={collections[id]} />;
    case "projects":
      return <DocsPage key="projects" kind="projects" title="Projects" fields={projectMetaFields} intro="A project gets its own story page once it has a role and a story." />;
    case "notes":
      return <DocsPage key="notes" kind="notes" title="Notes" fields={noteMetaFields} />;
    case "media":
      return <MediaPage />;
    case "resume":
      return <ResumeHub tab={sub} />;
    case "appearance":
      return <AppearancePage />;
    case "preview":
      return <PreviewPage />;
    case "publishing":
      return <PublishPage />;
    default:
      return <OverviewPage />;
  }
}

function Shell({ onSignOut }: { onSignOut: () => void }) {
  const [page, setPage] = useState(route());
  const { data, error } = useContent();
  useEffect(() => {
    const on = () => setPage(route());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const changed = data?.changed.length ?? 0;
  const errors = data?.issues.filter((i) => i.level === "error").length ?? 0;

  return (
    <div className="grid min-h-screen md:grid-cols-[220px_1fr]">
      <aside className="border-b bg-panel md:sticky md:top-0 md:h-screen md:overflow-y-auto md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-4 py-4">
          <a href="#/overview" className="font-semibold">
            Proem
          </a>
          <button className="text-xs text-muted hover:text-fg" onClick={onSignOut}>
            Sign out
          </button>
        </div>
        <nav aria-label="Sections" className="flex gap-1 overflow-x-auto px-2 pb-3 md:block md:space-y-4 md:pb-6">
          {NAV.map((g) => (
            <div key={g.group || "top"} className="flex gap-1 md:block">
              {g.group && <p className="hidden px-2 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase md:block">{g.group}</p>}
              {g.items.map((i) => (
                <a
                  key={i.id}
                  href={`#/${i.id}`}
                  aria-current={page.split("/")[0] === i.id ? "page" : undefined}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 whitespace-nowrap hover:bg-bg aria-[current]:bg-bg aria-[current]:font-semibold"
                >
                  {i.label}
                  {i.id === "publishing" && changed > 0 && <span className="ml-2 rounded-full bg-accent px-1.5 text-[11px] text-white">{changed}</span>}
                  {i.id === "overview" && errors > 0 && <span className="ml-2 rounded-full bg-danger px-1.5 text-[11px] text-white">{errors}</span>}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 px-6 pt-8">
        {error && <p className="mb-4 text-danger">{error}</p>}
        {data ? <Page route={page} /> : <p className="text-muted">Loading…</p>}
      </main>
    </div>
  );
}

export function App() {
  const [state, setState] = useState<"loading" | "in" | "out">("loading");
  useEffect(() => {
    api
      .get<{ authenticated: boolean; csrf: string | null }>("/api/session")
      .then((s) => {
        setCsrf(s.csrf);
        setState(s.authenticated ? "in" : "out");
      })
      .catch(() => setState("out"));
    const out = () => setState("out");
    window.addEventListener("admin:signed-out", out);
    return () => window.removeEventListener("admin:signed-out", out);
  }, []);

  if (state === "loading") return null;
  if (state === "out")
    return (
      <LoginPage
        onSignedIn={(csrf) => {
          setCsrf(csrf);
          setState("in");
        }}
      />
    );
  return (
    <ContentProvider>
      <Shell
        onSignOut={async () => {
          await api.post("/api/logout").catch(() => {});
          setCsrf(null);
          setState("out");
        }}
      />
    </ContentProvider>
  );
}
