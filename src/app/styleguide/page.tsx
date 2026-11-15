/**
 * Design-token reference (P2). Development only: production builds render a 404.
 * Shows the resolved palette with WCAG contrast, the type scale, the grid and the motion primitives.
 */
import { Orbit } from "@/components/motion/orbit";
import { Parallax } from "@/components/motion/parallax";
import { Reveal } from "@/components/motion/reveal";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { getContent } from "@/content/load";
import { contrastChecks, resolveTheme } from "@/theme/theme";
import type { ThemeTokens } from "@/content/schema";
import { notFound } from "next/navigation";

export const metadata = { title: "Styleguide", robots: { index: false } };

const TOKENS: (keyof ThemeTokens)[] = ["background", "surface", "text", "textMuted", "accent", "border", "band"];

export default function Styleguide() {
  if (process.env.NODE_ENV === "production") notFound();
  const theme = resolveTheme(getContent().theme);
  const checks = contrastChecks(theme);

  return (
    <main className="space-y-20 pb-24">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <p className="label text-accent">P2 · Design foundation</p>
          <h1 className="text-h2">Styleguide</h1>
        </div>
        <ThemeSwitch />
      </header>

      <section className="space-y-6">
        <h2 className="label">Colour · Silver / Charcoal</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {(["light", "dark"] as const).map((mode) => (
            <div key={mode} className="space-y-2">
              <p className="label text-fg-muted">{mode}</p>
              <ul className="grid grid-cols-4 gap-2 md:grid-cols-7">
                {TOKENS.map((k) => (
                  <li key={k} className="space-y-1">
                    <div className="aspect-square rounded border" style={{ background: theme[mode][k] }} />
                    <p className="text-[11px] leading-tight">{k}</p>
                    <p className="font-mono text-[10px] text-fg-muted">{theme[mode][k]}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="label border-b text-left text-fg-muted">
              <th className="py-2">Mode</th>
              <th>Pair</th>
              <th>Sample</th>
              <th className="text-right">Ratio</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((r) => (
              <tr key={r.mode + r.pair} className="border-b">
                <td className="py-1.5 font-mono text-xs">{r.mode}</td>
                <td>{r.pair}</td>
                <td>
                  <span className="rounded px-2 py-0.5" style={{ color: r.fg, background: r.bg }}>
                    Aa readable
                  </span>
                </td>
                <td className={`text-right font-mono ${r.ok ? "" : "text-red-600"}`}>
                  {r.ratio.toFixed(2)} {r.ok ? "AA" : "LOW"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-6">
        <h2 className="label">Type</h2>
        <p className="text-display">Hi, I’m Alex.</p>
        <p className="text-h2">The person behind the projects.</p>
        <p className="text-h3">TidyBoard</p>
        <p className="text-statement max-w-[22ch]">I care about the moment a confusing dataset turns into a clear decision.</p>
        <p className="text-lead max-w-[48ch]">I design data tools for people who don’t write code, and like long walks with a camera.</p>
        <p className="max-w-[60ch]">Body text, 16px. Interface copy, paragraphs and descriptions use this size with comfortable line height.</p>
        <p className="label">01 / About · label</p>
        <p>
          <a href="#" className="text-accent">
            Explore the story <span className="arrow-nudge">↗</span>
          </a>
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="label">Grid · 4 / 8 / 12</h2>
        <div className="grid-site h-16">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className={`rounded-sm bg-accent/15 ${i >= 4 ? "hidden md:block" : ""} ${i >= 8 ? "md:hidden lg:block" : ""}`} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="label">Band</h2>
        <div className="band rounded-lg p-8">
          <p className="label text-fg-muted">03 / Selected work</p>
          <p className="text-h2">A few things I’ve worked on.</p>
          <p className="text-fg-muted">Muted text on the band.</p>
          <a href="#" className="text-accent">
            Explore the story <span className="arrow-nudge">↗</span>
          </a>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="label">Motion</h2>
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="space-y-2">
            <p className="label text-fg-muted">M-1 · enter (reload to replay)</p>
            {["Based in Wellington", "Hi, I’m Alex.", "An introduction paragraph.", "Links"].map((t, i) => (
              <p key={t} className="enter" style={{ ["--i" as string]: i }}>
                {t}
              </p>
            ))}
          </div>
          <Parallax strength={6} className="mx-auto w-full max-w-sm">
            <Orbit nodes={[{ at: 0.15 }, { at: 0.62 }]}>
              <div className="grid size-40 place-items-center rounded-[28px] border bg-surface label text-fg-muted">M-2 · M-3 · M-4</div>
            </Orbit>
          </Parallax>
        </div>
        <div className="space-y-2 pt-[60vh]">
          <p className="label text-fg-muted">M-5 / M-7 · reveal on scroll</p>
          {[0, 1, 2, 3, 4].map((i) => (
            <Reveal key={i} index={i} className="rounded border bg-surface p-4">
              Row {i + 1}
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}
