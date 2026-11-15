import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { RawContent } from "../../server/content-store";
import { api } from "./api";

export type Changed = { status: string; file: string }[];
export type ContentState = RawContent & { changed: Changed; previewPort: number };

type Store = { data: ContentState | null; reload: () => Promise<void>; error: string | null };
const Ctx = createContext<Store>({ data: null, reload: async () => {}, error: null });

export function ContentProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ContentState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      setData(await api.get<ContentState>("/api/content"));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    let alive = true;
    api
      .get<ContentState>("/api/content")
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);
  return <Ctx.Provider value={{ data, reload, error }}>{children}</Ctx.Provider>;
}

export const useContent = () => useContext(Ctx);

/** Options for reference pickers. */
export function refOptions(data: ContentState, source: "projects" | "publications" | "media"): { value: string; label: string }[] {
  if (source === "projects") return data.docs.projects.map((d) => ({ value: d.slug, label: String(d.meta.title ?? d.slug) }));
  const list = (Array.isArray(data.json[source]) ? data.json[source] : []) as { id: string; title?: string; alt?: string }[];
  return list.map((x) => ({ value: x.id, label: source === "media" ? `${x.id}${x.title ? ` — ${x.title}` : ""}` : `${x.title ?? x.id}` }));
}
