# Deploying

The public site is plain static files. The admin is a separate, local-only process
that builds new releases and switches the live site between them.

```
/srv/portfolio/
  template/        this repository (git clone), `pnpm install`, `pnpm admin:build`
  content/         your content (CONTENT_DIR) — private, its own git history
  data/            admin password, preview build, backups (ADMIN_DATA_DIR)
  releases/<id>/   published builds (kept: last 10)
  current -> releases/<id>   ← the web server serves this
```

## 1. Install

```bash
git clone https://github.com/zyphlux/Proem.git /srv/portfolio/template
cd /srv/portfolio/template
pnpm install
pnpm exec playwright install --with-deps chromium   # PDF export for built resumes
pnpm admin:build
cp -r /path/to/your/content /srv/portfolio/content
CONTENT_DIR=/srv/portfolio/content pnpm content:check
ADMIN_DATA_DIR=/srv/portfolio/data pnpm admin:passwd
```

## 2. Web server

Use `Caddyfile.example` (automatic HTTPS) or `nginx.conf.example`. Both serve
`/srv/portfolio/current`, return real 404s, redirect the old `/projects` and `/blog`
URLs, and cache hashed assets for a year.

## 3. Admin

Install `portfolio-admin.service.example` as a systemd unit. It listens on
`127.0.0.1:4310` (admin) and `127.0.0.1:4311` (preview) only. From your computer:

```bash
ssh -L 4310:127.0.0.1:4310 -L 4311:127.0.0.1:4311 you@server
```

then open http://127.0.0.1:4310 and publish once to create `current`.

If you must expose the admin on a LAN, set `ADMIN_HOST` and `ADMIN_ALLOWED_HOSTS`,
and restrict access with a firewall. Never expose it to the internet: it can rebuild
and replace the site.

## Notes

- The site keeps working when the admin is stopped; releases are just files.
- A failed build or check never touches `current`.
- Rolling back only switches `current`; content files stay as they are.
- Back up `/srv/portfolio/content` (or use *Download backup* in the admin).
- Built resumes are exported to PDF with headless Chromium. Without it the build still
  succeeds; `/resume` then offers the web version and *Print / Save as PDF* only.
- Chinese (or other CJK) text in resumes needs CJK fonts on the server for the PDF,
  e.g. `sudo apt install fonts-noto-cjk`.
