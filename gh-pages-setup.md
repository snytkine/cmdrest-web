# Deploying cmdrest-web to GitHub Pages at www.cmdrest.com

This document is the step-by-step checklist for going live. The repo-side
work (workflow, `CNAME`, SPA fallback) is already done and described below;
everything else happens in the GitHub UI and at your DNS provider.

## What's already in the repo

- **`.github/workflows/deploy.yml`** — builds the site (lint, test, `vite build`)
  and deploys `dist/` to GitHub Pages on every push to `main`, using GitHub's
  official Pages Actions (`actions/upload-pages-artifact` +
  `actions/deploy-pages`). Can also be triggered manually from the Actions tab
  (`workflow_dispatch`).
- **`public/CNAME`** — contains `www.cmdrest.com`. Vite copies this into
  `dist/` on every build, which is how GitHub Pages knows the custom domain.
- **`public/.nojekyll`** — disables GitHub's Jekyll processing so files/folders
  are served as-is.
- **`public/404.html`** + a small script in `index.html` — the standard
  ["SPA on GitHub Pages" redirect trick](https://github.com/rafgraph/spa-github-pages).
  It's needed because the app uses React Router's `BrowserRouter` with real
  paths (`/docs/getting-started`, `/features`, etc.), but GitHub Pages is a
  static file server with no rewrite rules. Without this, a direct link or a
  page refresh on any route other than `/` would 404.

None of this requires a repo-name subpath (`base: '/...'` in `vite.config.ts`)
because a custom domain is served at its own root.

## 1. Push this to GitHub

```bash
git add .github public/CNAME public/.nojekyll public/404.html index.html gh-pages-setup.md
git commit -m "Set up GitHub Pages deployment for www.cmdrest.com"
git push origin main
```

The push will trigger the workflow, but the first run will fail to deploy
until Pages is enabled in step 2 (the build/test/artifact steps will still
succeed).

## 2. Enable GitHub Pages with the Actions source

In the GitHub repo (`snytkine/cmdrest-web`):

1. Go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions** (not
   "Deploy from a branch"). This is what lets `deploy.yml` publish via
   `actions/deploy-pages`.
3. Re-run the workflow once this is set (Actions tab → select the failed run →
   **Re-run all jobs**), or just push again.

## 3. DNS records

Configure these at whichever service manages DNS for `cmdrest.com` (your
registrar or a DNS host like Cloudflare/Route 53).

**Required — `www` subdomain (this is the canonical domain):**

| Type  | Name  | Value                  |
|-------|-------|------------------------|
| CNAME | `www` | `snytkine.github.io`   |

**Recommended — apex domain (`cmdrest.com`), so it redirects to `www`:**

| Type | Name | Value             |
|------|------|--------------------|
| A    | `@`  | `185.199.108.153`  |
| A    | `@`  | `185.199.109.153`  |
| A    | `@`  | `185.199.110.153`  |
| A    | `@`  | `185.199.111.153`  |

(Optional, IPv6:)

| Type | Name | Value                                |
|------|------|----------------------------------------|
| AAAA | `@`  | `2606:50c0:8000::153`                   |
| AAAA | `@`  | `2606:50c0:8001::153`                   |
| AAAA | `@`  | `2606:50c0:8002::153`                   |
| AAAA | `@`  | `2606:50c0:8003::153`                   |

With `www.cmdrest.com` set as the custom domain in step 4 and the apex `A`
records also pointing at GitHub Pages, GitHub automatically redirects
`cmdrest.com` → `https://www.cmdrest.com`. If you skip the apex `A` records,
only `www.cmdrest.com` will work and bare `cmdrest.com` will not resolve to
the site.

If your registrar doesn't allow a bare `CNAME` on `www` alongside other
records, or you're using a provider with "flattened" records (Cloudflare
calls their apex equivalent "CNAME flattening"), follow their docs — the
target hostnames above (`snytkine.github.io` and the four Pages IPs) are what
matter, not the record type name.

DNS propagation can take anywhere from a few minutes to a few hours.

## 4. Set the custom domain in GitHub

1. **Settings → Pages → Custom domain**, enter `www.cmdrest.com`, click
   **Save**.
   - GitHub will verify the `CNAME` DNS record. If it can't yet (DNS not
     propagated), it'll show a warning — check back once step 3 has
     propagated.
   - This write actually just needs to match what's already committed in
     `public/CNAME`; if you ever change the domain, update that file too so
     it doesn't get reverted on the next deploy.
2. **Enforce HTTPS**: once GitHub finishes provisioning a TLS certificate
   (via Let's Encrypt) for the domain — usually minutes, occasionally up to a
   day after DNS is correct — a checkbox **Enforce HTTPS** becomes available
   on the same Pages settings page. Check it. This is what makes
   `https://www.cmdrest.com` mandatory and redirects plain HTTP to HTTPS.

## 5. (Optional but recommended) Verify domain ownership

GitHub lets you cryptographically verify you own `cmdrest.com` under your
**account or org Settings → Pages → Verified domains**. This isn't required
for the site to work, but it prevents someone else from claiming the domain
in a different repo later and it unlocks some domain-wide protections. It
adds a `TXT` record you'll be prompted for.

## 6. Confirm it's live

Once DNS has propagated and the workflow has deployed successfully:

- `https://www.cmdrest.com` loads the site.
- `https://cmdrest.com` redirects to `https://www.cmdrest.com` (if you added
  the apex `A` records).
- Plain `http://` requests to either redirect to `https://`.
- A direct link to a nested route, e.g.
  `https://www.cmdrest.com/docs/getting-started`, loads correctly (not a
  404) — this exercises the `public/404.html` SPA fallback.
- Check DNS from the command line if something looks off:
  ```bash
  dig www.cmdrest.com +short
  dig cmdrest.com +short
  ```

## Day-to-day

After this initial setup, every push to `main` automatically redeploys: the
workflow builds, runs lint + tests, and publishes `dist/` to Pages. No manual
steps are needed for routine updates — only touch DNS/Pages settings again if
the domain itself changes.
