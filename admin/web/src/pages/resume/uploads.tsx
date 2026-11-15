import { useRef, useState } from "react";
import { api } from "../../api";
import { useContent } from "../../store";
import { Chip, SaveBar, same, useSaver, useUnloadGuard } from "../../ui";

type V = { id: string; file: string; downloadName: string; uploadedAt: string };
type R = { current: string | null; versions: V[]; publicDocument?: string | null; documents?: unknown[] };

/** Upload versions, choose which one is public (or none), set the download name. */
export function ResumeUploads() {
  const { data } = useContent();
  const original = { current: null, versions: [], ...((data?.json.resume ?? {}) as Partial<R>) } as R;
  const [value, setValue] = useState(original);
  const [base, setBase] = useState(original);
  if (!same(base, original)) {
    setBase(original);
    setValue(original);
  }
  const dirty = !same(value, original);
  useUnloadGuard(dirty);
  const saver = useSaver();
  const file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");

  const upload = async (f: File) => {
    const fd = new FormData();
    fd.append("file", f);
    fd.append("downloadName", name);
    await saver.run(() => api.post("/api/resume", fd), "Uploaded. Make it public below, then save and publish.");
  };

  return (
    <>
      <p className="mb-4 max-w-3xl text-muted">For resumes made elsewhere. Only the public version is copied into the site; older versions stay private and can’t be reached by URL.</p>
      {value.publicDocument && (
        <p className="mb-4 max-w-3xl rounded border border-accent p-3 text-[13px]">
          A built resume is currently public, so /resume shows that one. Choosing an uploaded PDF below makes it public instead.
        </p>
      )}
      <section className="mb-8 max-w-2xl rounded-lg border bg-panel p-4">
        <h2 className="mb-3 font-semibold">Upload a new version (PDF, max 10 MB)</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grow">
            <span className="mb-1 block text-[13px] font-medium">Download file name</span>
            <input className="input" placeholder="Firstname-Lastname-Resume.pdf" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <input ref={file} type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <button className="btn btn-primary" onClick={() => file.current?.click()} disabled={dirty}>
            Choose PDF…
          </button>
        </div>
        {dirty && <p className="mt-2 text-xs text-warn">Save or discard your changes before uploading.</p>}
      </section>

      <fieldset className="max-w-3xl">
        <legend className="mb-2 font-semibold">Which version is public?</legend>
        <ul className="overflow-hidden rounded-lg border bg-panel">
          <li className="flex items-center gap-3 border-b px-4 py-3">
            <input type="radio" name="current" checked={value.current === null} onChange={() => setValue({ ...value, current: null })} id="none" />
            <label htmlFor="none">{value.publicDocument ? "None of these" : "None — hide every Resume link"}</label>
          </li>
          {[...value.versions].reverse().map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-b-0">
              <input type="radio" name="current" checked={value.current === v.id} onChange={() => setValue({ ...value, current: v.id, publicDocument: null })} id={`v-${v.id}`} />
              <label htmlFor={`v-${v.id}`} className="font-mono text-[13px]">
                {v.id}
              </label>
              {original.current === v.id && !original.publicDocument && <Chip tone="ok">Public</Chip>}
              <input className="input max-w-72" value={v.downloadName} aria-label="Download name" onChange={(e) => setValue({ ...value, versions: value.versions.map((x) => (x.id === v.id ? { ...x, downloadName: e.target.value } : x)) })} />
              <a className="text-accent" href={`/api/resume-file/${v.id}`} target="_blank" rel="noreferrer">
                View
              </a>
              <button
                className="btn btn-danger ml-auto px-2 py-0.5"
                disabled={value.current === v.id}
                title={value.current === v.id ? "Choose another public version first" : "Remove this version from the list"}
                onClick={() => confirm(`Remove version ${v.id} from the list?`) && setValue({ ...value, versions: value.versions.filter((x) => x.id !== v.id) })}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </fieldset>
      <SaveBar dirty={dirty} saving={saver.saving} message={saver.message} onReset={() => setValue(original)} onSave={() => saver.run(() => api.put("/api/json/resume", value))} />
    </>
  );
}
