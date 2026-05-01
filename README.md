# netriq-website

Public product website for [Netriq](https://netriq.ai) — `v1.0.0`.

Hand-written static HTML/CSS/vanilla JS. No build step, no framework.
Eventually serves the apex `netriq.ai` domain (currently routed to the demo instance).

## Pages

- `/` — landing
- `/platform.html` — what Netriq does today (only shipping features)
- `/verticals.html` — vertical fit (housing, healthcare, education, retail, hospitality, malls, fleet, SMB)
- `/why-netriq.html` — differentiation, tier model, get-a-quote
- `/contact.html` — contact form (Web3Forms)
- `/404.html` — friendly fallback

## Local preview

```sh
./serve            # http://localhost:8000, auto-opens browser
./serve 9000       # custom port

# or via Docker
docker compose up --build      # http://localhost:8000
docker compose down            # stop
```

## Deployment paths

The site is just static files. Pick whichever matches your infra. All paths leave the repo private; only the rendered site is public.

### A. Hetzner + Caddy (matches the existing vms-hq stack)

The `Caddyfile` in this repo serves the site behind Cloudflare-fronted TLS, the same pattern as `core` and `agent`. Steps:

1. Clone the repo onto the VPS at `/srv/netriq-website` (or symlink `/srv/netriq-website` to a deploy dir).
2. Run Caddy with this config:
   ```sh
   caddy run --config Caddyfile
   ```
3. Or run it as a systemd unit alongside the other `vms-hq` services. Cloudflare points `netriq.ai` to the VPS; Caddy serves `:80` behind Cloudflare's TLS termination.

To update: `git pull` on the VPS, Caddy auto-reloads on file change (or `caddy reload`).

### B. Docker / Compose (any host)

```sh
docker compose up -d --build      # nginx:alpine on :80, mapped to :8000
```

The included `nginx.conf` sets cache-control headers, the 404 fallback, and standard security headers. Push the image to a registry, deploy anywhere container workloads run.

### C. Cloudflare Pages

1. Connect the GitHub repo `vms-hq/netriq-website` in Cloudflare Pages.
2. Build settings: **none** (static).
   - Framework preset: `None`
   - Build command: *(leave empty)*
   - Build output directory: `/`
3. Production branch: `main`.
4. Add custom domain `netriq.ai` once DNS is ready (see cutover below).

Cloudflare Pages handles TLS, edge caching, and preview deployments automatically.

### D. GitHub Pages (Enterprise plan only for private repos)

The `CNAME` file is already in the repo. Enable Pages in the repo settings → Pages → source `main` / `/ (root)`.

## DNS cutover plan (`netriq.ai` → this site)

`netriq.ai` currently points to the **demo instance**. To cut over:

1. **Stand up the host first** (Hetzner+Caddy / Cloudflare Pages / your choice). Verify it serves the site on a temporary hostname (e.g. `www2.netriq.ai` or a Cloudflare Pages preview URL).
2. **Swap DNS**:
   - If on Cloudflare DNS: edit the `A` / `CNAME` for `netriq.ai` to point at the new origin. TTL is usually 5 min — propagation is fast.
   - Confirm with `dig netriq.ai` and a curl from outside.
3. **Reroute the demo instance** to its own subdomain (e.g. `demo.netriq.ai`) so links from old material still work.
4. **Validate**:
   - `curl -I https://netriq.ai/` returns 200 and serves this site
   - `https://netriq.ai/platform.html`, `/verticals.html`, `/why-netriq.html`, `/contact.html` all 200
   - Submit a test enquiry through the contact form, confirm it lands in `ishaileshpant@nysha.in`
5. **Update any external references** (Cloudflare worker rules, Caddy redirects, marketing material) that still point old paths to the demo box.

Rollback is one DNS edit away — keep the old `A` record around in your DNS history for 24 h.

## Brand assets

Sourced from `vms-hq/business/logoicons/`. Check that repo's `brand-guide.md` before changing colours, typography, or logo treatments.

## Privacy

- Product screenshots in `/assets/img/` are PII-clean (verified): empty states, charts, configuration UI, and a gate-log view where plates show as "not detected". No faces, no real plate numbers.
- Refresh screenshots from the demo instance only (never from `trial`, which holds real customer data).

## Contact form

The form posts to [Web3Forms](https://web3forms.com) (Free tier, form name `leads-netriq.ai`). Submissions deliver to `ishaileshpant@nysha.in`.

### Dual-recipient delivery (mmv@nysha.in)

Free tier delivers to **one** registered email. The `<input name="cc" value="mmv@nysha.in" />` field is silently ignored on Free (CC is a Pro feature).

To get both recipients without subscribing:

- **Recommended**: forward `subject:("New enquiry from netriq.ai")` from `ishaileshpant@nysha.in` to `mmv@nysha.in` via a mail filter, OR
- create a distribution alias (e.g. `leads@nysha.in`) and re-register that as the destination on Web3Forms.

### Upgrade to Pro (₹399/mo) only if you need

- Native multi-recipient / CC enforcement
- Webhook fan-out (Slack / Sheets / Notion)
- File uploads in the form
- More than 250 submissions/month

The honeypot field (`botcheck`) blocks the most common bot traffic.

## Versioning

- `v1.0.0` — initial public release. Five pages, dark theme, contact form wired, DNS-ready.

Tags follow semver. Bump minor for new pages or sections; major when the site IA materially changes.
