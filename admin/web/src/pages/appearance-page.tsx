import { useState } from "react";
import type { ThemeTokens } from "@/content/schema";
import { PRESETS } from "@/theme/presets";
import { contrastChecks, resolveTheme } from "@/theme/theme";
import { api } from "../api";
import { useContent } from "../store";
import { PageHeader, SaveBar, same, useSaver, useUnloadGuard } from "../ui";

type T = { preset: string; light: Partial<ThemeTokens>; dark: Partial<ThemeTokens> };
const TOKENS: { key: keyof ThemeTokens; label: string }[] = [
  { key: "background", label: "Page background" },
  { key: "surface", label: "Surface" },
  { key: "text", label: "Text" },
  { key: "textMuted", label: "Secondary text" },
  { key: "accent", label: "Accent" },
  { key: "border", label: "Lines" },
  { key: "band", label: "Project band" },
];
const HEX = /^#[0-9a-fA-F]{6}$/;

/** Theme: preset + per-mode colour overrides, with live contrast checks. Colours only — no CSS. */
export function AppearancePage() {
  const { data } = useContent();
  const original = { preset: "silver-charcoal", light: {}, dark: {}, ...((data?.json.theme ?? {}) as Partial<T>) } as T;
  const [value, setValue] = useState(original);
  const [base, setBase] = useState(original);
  if (!same(base, original)) {
    setBase(original);
    setValue(original);
  }
  const dirty = !same(value, original);
  useUnloadGuard(dirty);
  const saver = useSaver();
  const preset = PRESETS[value.preset] ?? PRESETS["silver-charcoal"];
  const valid = (["light", "dark"] as const).every((m) => Object.values(value[m]).every((c) => HEX.test(String(c))));
  const resolved = valid && PRESETS[value.preset] ? resolveTheme(value as Parameters<typeof resolveTheme>[0]) : null;
  const checks = resolved ? contrastChecks(resolved) : [];

  const setToken = (mode: "light" | "dark", key: keyof ThemeTokens, color: string | null) => {
    const next = { ...value[mode] };
    if (color === null || color.toUpperCase() === preset[mode][key].toUpperCase()) delete next[key];
    else next[key] = color.toUpperCase();
    setValue({ ...value, [mode]: next });
  };

  return (
    <>
      <PageHeader title="Appearance" intro="Colours are applied to both the light and the dark theme. Visitors choose light, dark or system; your colours define what each looks like." />
      <label className="mb-6 block max-w-xs">
        <span className="mb-1 block text-[13px] font-medium">Preset</span>
        <select className="input" value={value.preset} onChange={(e) => setValue({ ...value, preset: e.target.value })}>
          {Object.values(PRESETS).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-6 lg:grid-cols-2">
        {(["light", "dark"] as const).map((mode) => (
          <section key={mode} className="rounded-lg border bg-panel p-4">
            <h2 className="mb-3 font-semibold capitalize">{mode}</h2>
            <ul className="space-y-2">
              {TOKENS.map((t) => {
                const v = value[mode][t.key] ?? preset[mode][t.key];
                const custom = t.key in value[mode];
                return (
                  <li key={t.key} className="flex items-center gap-3">
                    <input type="color" aria-label={`${mode} ${t.label}`} value={HEX.test(v) ? v : "#000000"} onChange={(e) => setToken(mode, t.key, e.target.value)} className="h-8 w-10 rounded border" />
                    <input className="input max-w-28 font-mono text-xs" value={v} onChange={(e) => setToken(mode, t.key, e.target.value)} aria-label={`${mode} ${t.label} hex`} />
                    <span className="grow">{t.label}</span>
                    {custom && (
                      <button className="text-xs text-accent" onClick={() => setToken(mode, t.key, null)}>
                        Reset
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {resolved && (
              <div className="mt-4 rounded-lg border p-4" style={{ background: resolved[mode].background, color: resolved[mode].text, borderColor: resolved[mode].border }}>
                <p style={{ color: resolved[mode].accent }} className="text-xs font-semibold tracking-wider uppercase">
                  Based in your city
                </p>
                <p className="text-2xl font-bold">Hi, I’m you.</p>
                <p style={{ color: resolved[mode].textMuted }}>Secondary text looks like this.</p>
                <div className="mt-3 rounded p-3" style={{ background: resolved[mode].band, color: resolved.dark.text }}>
                  Project band · <span style={{ color: resolved.dark.accent }}>Read the story →</span>
                </div>
              </div>
            )}
          </section>
        ))}
      </div>
      <section className="mt-6 max-w-3xl">
        <h2 className="mb-2 font-semibold">Readability</h2>
        {!valid && <p className="text-danger">Use colours in the form #RRGGBB.</p>}
        <ul className="grid gap-1 text-[13px] sm:grid-cols-2">
          {checks.map((c) => (
            <li key={c.mode + c.pair} className={c.ok ? "" : "font-semibold text-danger"}>
              {c.ok ? "✓" : "✗"} {c.mode} · {c.pair}: {c.ratio.toFixed(2)} {c.ok ? "" : `(needs ${c.min})`}
            </li>
          ))}
        </ul>
        {checks.some((c) => !c.ok) && <p className="mt-2 text-warn">Some text may be hard to read. You can still save, but consider adjusting.</p>}
      </section>
      <SaveBar dirty={dirty} saving={saver.saving} message={saver.message} onReset={() => setValue(original)} onSave={() => saver.run(() => api.put("/api/json/theme", value))} extra={<button className="btn" onClick={() => setValue({ ...value, light: {}, dark: {} })}>Restore preset</button>} />
    </>
  );
}
