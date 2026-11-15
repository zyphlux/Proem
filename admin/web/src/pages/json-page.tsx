import { useState } from "react";
import { api } from "../api";
import { Fields, type Field } from "../fields";
import { useContent } from "../store";
import { PageHeader, SaveBar, same, useSaver, useUnloadGuard } from "../ui";

type Props = { name: "site" | "profile" | "home"; title: string; intro?: string; fields: Field[] };

/** Editor for a single JSON object file (site, profile, home). */
export function JsonPage({ name, title, intro, fields }: Props) {
  const { data } = useContent();
  const original = (data?.json[name] ?? {}) as Record<string, unknown>;
  const [value, setValue] = useState(original);
  const [base, setBase] = useState(original);
  if (!same(base, original)) {
    setBase(original);
    setValue(original);
  }
  const dirty = !same(value, original);
  useUnloadGuard(dirty);
  const saver = useSaver();
  const err = data?.parseErrors[name];

  return (
    <>
      <PageHeader title={title} intro={intro} />
      {err && <p className="mb-4 rounded border border-danger p-3 text-danger">This file is not valid JSON ({err}). Saving will replace it.</p>}
      <div className="max-w-3xl">
        <Fields fields={fields} value={value} onChange={setValue} issues={saver.issues} />
      </div>
      <SaveBar dirty={dirty} saving={saver.saving} message={saver.message} onReset={() => setValue(original)} onSave={() => saver.run(() => api.put(`/api/json/${name}`, value))} />
    </>
  );
}
