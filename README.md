# Proem

**A self-hosted personal website and resume builder. Meet the person first, then the work.**

A personal website template with a separate local editing platform. It is built for people who want a site about *them*, not a product page: an introduction, a timeline of work and study, a few projects, publications, and some life outside the screen.

> See [docs/design.md](./docs/design.md) for the design system and page structure, [docs/resume-templates.md](./docs/resume-templates.md) for resume templates and [deploy/](./deploy/README.md) for self-hosting.

- **Next.js (App Router) + React 19 + Tailwind CSS v4**, exported as a fully static site.
- **Content lives outside the code.** Point `CONTENT_DIR` at your own folder; template upgrades never touch it.
- **Validated content.** Every file is checked with zod; broken references, missing files and missing alt text fail the build instead of breaking the live site.
- **No external APIs at render time.**
- **Self-hosted.** Serve the static output with Caddy or nginx. See [deploy/](./deploy/README.md).
- **Resume builder.** Resumes built from the same content: pick items, override wording, choose a template (or write your own), export to PDF. See [docs/resume-templates.md](./docs/resume-templates.md).
- **Local editing platform.** A separate admin (password, local-only) edits content, uploads images and resumes, previews drafts, publishes atomically and rolls back.

## Quick start

```bash
pnpm install
pnpm dev            # uses the demo content in content.example/
```

Use your own content:

```bash
cp -r content.example ~/my-site-content
CONTENT_DIR=~/my-site-content pnpm dev
```

## Content folder

```
site.json            title, description, canonical URL
profile.json         name, intro, about, socials, contact
experience.json      jobs
education.json       degrees
publications.json    papers (full author list, links, BibTeX)
courses.json         learning archive
home.json            section order/titles, featured projects and photos
theme.json           colour preset and overrides
projects/<slug>.md   project card + story (Markdown with frontmatter)
notes/<slug>.md      notes
media/media.json     images with alt text, captions, focal point, albums
resume/resume.json   built resume documents + uploaded PDF versions; only the public one is published
resume-templates/    custom resume templates (Mustache HTML + CSS)
```

Items can be `"status": "draft"` or `"verified": false`; neither appears on the public site. Long-form content is plain Markdown: raw HTML and scripts are not rendered.

## Admin

```bash
pnpm admin:passwd        # set the owner password (stored in ~/.portfolio-data)
pnpm admin:build         # build the admin UI
CONTENT_DIR=~/my-site-content pnpm admin
# → http://127.0.0.1:4310 (admin) and :4311 (private preview)
```

Workflow: edit and **Save draft** → **Preview** (phone/desktop, light/dark) → **Publish**.
Publishing commits your content (git), builds the site, checks every internal link, then
switches `current` to the new release in one step. Older releases can be made live again
from *Publishing → History*.

| Variable | Default | |
| --- | --- | --- |
| `CONTENT_DIR` | `content.example` | your content |
| `ADMIN_DATA_DIR` | `~/.portfolio-data` | password, preview, backups |
| `PUBLISH_DIR` | `$ADMIN_DATA_DIR/site` | `releases/` and `current` |
| `ADMIN_HOST` / `ADMIN_PORT` | `127.0.0.1` / `4310` | preview uses port + 1 |
| `ADMIN_ALLOWED_HOSTS` | — | extra Host headers when exposing on a LAN |
| `KEEP_RELEASES` | `10` | |

Development: `ADMIN_DEV=1 pnpm admin` and `pnpm admin:dev` (Vite on :5173).

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm content:check` | Validate `CONTENT_DIR` and list errors and warnings |
| `pnpm content:sync` | Resize images to WebP (metadata stripped) and copy the current resume into `public/_content` |
| `pnpm build` | Check → sync → static export to `out/` → remove pages disabled by empty content |
| `pnpm screens [url] [dir] [paths…]` | Screenshots at 360–1440px in light and dark, fails on horizontal overflow |
| `pnpm typecheck` / `pnpm lint` | Type check and lint |

## License

[MIT](./LICENSE)
