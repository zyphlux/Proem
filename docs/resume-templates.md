# Resume templates

Resumes are built from your site content (experience, education, projects, publications)
plus resume-only sections (summary, skills, lists, free text), then rendered with a
template. The same output is used for the live preview in the admin, the web version on
`/resume`, the printable page and the PDF.

## Built-in templates

| ID | Layouts | For |
| --- | --- | --- |
| `classic` | single | Any application |
| `modern` | sidebar-left, sidebar-right, single | Industry roles; contact/skills/education in a tinted sidebar |
| `academic` | single | Research / graduate applications; numbered publications |
| `compact` | single, sidebar-right | Dense one-pagers |

Every document can change: layout (if the template supports it), accent colour, sans or
serif font, density, A4/Letter and margins.

## Custom templates

The easiest start: **Admin → Resume → Templates → Duplicate as custom template**.
Custom templates live in your content folder:

```
resume-templates/<id>/
  template.json   { "name": "…", "description": "…", "layouts": ["single"] }
  template.html   Mustache template
  style.css       CSS
```

Choose it in a resume as `custom:<id>`.

### Data

| Value | |
| --- | --- |
| `name`, `headline` | header |
| `contact[]` | `kind` (location, email, phone, website, or a social id), `text`, `url` |
| `sections[]` | all sections in order |
| `main[]`, `side[]`, `hasSide` | split by column for sidebar layouts |
| `layout` | `single`, `sidebar-left`, `sidebar-right` |

Each section: `type`, `title`, `entries[]`, `blocks[]`, `groups[]`, `hasEntries`,
`hasBlocks`, `hasGroups`.

- entry: `title`, `url`, `subtitle`, `location`, `date`, `meta`, `authors[]`
  (`name`, `self`, `last`), `hasAuthors`, `bullets[]`, `hasBullets`, `tech`
- block: `isList`, `text`, `items[]`
- group: `label`, `itemsText`

Partials: `{{> section}}` renders any section with the standard markup; `{{> contact}}`
renders the contact list. The output is wrapped in
`<div class="resume r-tpl-<id> r-layout-<layout> r-density-<d> r-font-<f>">`.

CSS variables: `--r-accent`, `--r-font`, `--r-serif`, `--r-head-font`, `--r-size`,
`--r-gap`, `--r-text`, `--r-muted`, `--r-line`, `--r-margin`, `--r-page-width`.
Base styles (`src/resume/templates/shared.ts`) are applied first.

### Rules (enforced)

- Values are HTML-escaped by Mustache.
- The rendered HTML is filtered: no scripts, frames, forms, images, inline `style`
  attributes or event handlers; links must be `http(s)`, `mailto` or `tel`.
- CSS loses `@import`, `url(...)` (except `data:`) and legacy script hooks. The admin
  shows what was removed.
- On the site the resume sits in a Shadow DOM, so template CSS can't affect the page.
- PDFs are rendered by headless Chromium with JavaScript disabled and all network
  requests blocked.

### Printing

Use `@media print` for print-only rules. Page size and margins come from the document
settings (`@page` is generated). Add `break-inside: avoid` to blocks that shouldn't split.
