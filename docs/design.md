# Design

The template is built around one idea: **visitors should meet the person before the work.**
The home page is a short narrative; detail lives on sub-pages.

| Reading depth | Time | Where |
| --- | --- | --- |
| Glance | ~10 s | Hero (name, intro, now, interests) and the Resume link |
| Scroll | ~1 min | Home sections: About → Journey → Selected work → Research → Outside the screen |
| Read | minutes | `/work/<slug>` stories, `/research`, `/notes`, `/life`, `/resume` |

## Display rules

- Section numbers (01, 02 …) are computed from the sections that actually render.
- Empty content hides its section, link or button (no empty shells). Pages for empty
  features are removed from the export, so the server returns a real 404.
- `status: draft` and `verified: false` never reach the public build.
- Illustrations get a visible **Concept** badge; without a portrait, the hero draws a small
  graph of your real projects and papers instead of a placeholder photo.
- In-site links use →, external links ↗.

## Tokens

Colours are semantic (`background`, `surface`, `text`, `textMuted`, `accent`, `border`,
`band`) with light and dark sets per preset; owners override them in `theme.json` and the
build checks WCAG contrast. Type scale: `text-display`, `text-h2`, `text-h3`,
`text-statement`, `text-lead`, `label`. Grid: 4 / 8 / 12 columns (`grid-site`),
content max 1200px (`container-site`).

## Motion

| Token | Value |
| --- | --- |
| `--dur-fast` / `--dur-base` / `--dur-enter` | 150 / 220 / 520 ms |
| `--dur-orbit` | 28 s |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--shift-enter` / `--stagger` | 12px / 60ms |

- Content is visible by default; entrance hiding only starts once the observer runs.
- Only `transform` and `opacity` animate. One primary motion per section.
- `prefers-reduced-motion` removes movement and continuous animation.
- Hero orbit pauses off-screen and in hidden tabs; pointer parallax only on fine pointers.
- Theme switching and card → story navigation use View Transitions where supported.

## Accessibility checklist

Keyboard-operable menu, theme switch (radio group), expandable rows (`<details>`),
lightbox (`<dialog>`, Escape, focus return); skip link; visible focus; no horizontal
scroll at 360–1440px (`pnpm screens`).
