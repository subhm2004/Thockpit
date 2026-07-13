# Deploying Thockpit

Thockpit is a **fully static** Next.js app — no server code, no database, no API keys,
no environment variables. Every route is prerendered:

```
Route (app)
┌ ○ /
├ ○ /_not-found
└ ○ /icon.svg

○  (Static)  prerendered as static content
```

Everything the app remembers (your history, your preferences, your switch) lives in the
browser's `localStorage`. That means deploying is about as simple as it gets, and there
is nothing to configure or keep secret.

---

## Vercel (recommended)

### The one-click way

1. Push the repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and **import** `subhm2004/Thockpit`.
3. Vercel detects Next.js on its own. **Leave every setting alone** and hit **Deploy**.

That's it. There are no environment variables to add.

For the record, the settings Vercel will pick — and which you should not need to touch:

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Build Command | `next build` (from `npm run build`) |
| Install Command | `npm install` |
| Output Directory | `.next` |
| Node.js Version | 22.x (from [`.nvmrc`](.nvmrc)) |
| Environment Variables | *none* |

Every push to `main` redeploys production. Every pull request gets its own preview URL.

### The CLI way

```bash
npm i -g vercel

vercel          # first run: links the project, deploys a preview
vercel --prod   # ship it to the production URL
```

The first `vercel` run asks a handful of questions (scope, link to an existing project,
directory). The defaults are all correct for this repo.

---

## After the first deploy

**Check the sounds actually load.** Open the deployed site, type a key, and listen. The
48 samples are served straight out of `public/sounds/` as static files — if they 404,
something ate the `public/` folder, not Vercel.

**Check the board renders.** It needs WebGL. If a device has WebGL disabled the canvas
comes up blank — the typing test itself still works, and the board can be hidden from
the toolbar.

**Browsers.** Next.js 16 targets Chrome/Edge/Firefox 111+ and Safari 16.4+. Older
browsers will not run the build at all, regardless of where you host it.

**A custom domain:** Vercel dashboard → your project → **Settings → Domains** → add it,
then point your registrar at the DNS records Vercel shows you. HTTPS is automatic.

---

## What gets shipped

| | |
|---|---|
| Static JS/CSS | ~1.6 MB (three.js is most of it) |
| Switch samples | 208 KB — 48 mono MP3s |
| Screenshots + banner | 552 KB, README only; never sent to visitors |

The three.js bundle is the big one. It loads lazily (`next/dynamic` with `ssr: false`),
so the words and the timer are interactive before the board has finished arriving.

---

## Other hosts

Nothing here is Vercel-specific.

- **Netlify / Cloudflare Pages / Render** — build `npm run build`, and use their Next.js
  adapter/preset. Node 22.
- **A plain Node server** — `npm run build && npm start` serves it on `:3000`.
- **A static bucket (S3, GitHub Pages, nginx)** — add `output: 'export'` to
  [`next.config.ts`](next.config.ts), run `npm run build`, and upload the `out/` folder.
  This app has no server features, so nothing breaks. (`next/font` still works; it
  inlines the font at build time.)

---

## If the build fails

**TypeScript or lint errors.** Vercel runs a real build — it will not ignore them.
Reproduce locally, and fix them there:

```bash
npm run lint
npm run build
```

**`npm ci` can't resolve the lockfile.** `package-lock.json` must be committed and in
sync with `package.json`. If you changed dependencies by hand, re-run `npm install` and
commit the updated lockfile.

**Node version.** [`.nvmrc`](.nvmrc) pins Node 22. If your host ignores it, set the Node
version to 22.x in its dashboard — Next.js 16 does not support Node 18.
