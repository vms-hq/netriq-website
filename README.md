# netriq-website

Public product website for **NetrIQ** — `https://netriq.ai` and `https://www.netriq.ai`.

Hand-written static HTML / CSS / vanilla JS. No build step, no framework.

## Pages

- `/` — landing
- `/platform.html` — what NetrIQ does today (shipping features only)
- `/verticals.html` — vertical fit (gated communities, hospitals, schools, retail, hospitality, malls, fleet, IT offices, SMB)
- `/why-netriq.html` — differentiation, tier model, get-a-quote
- `/contact.html` — contact form (Cloudflare Worker → Email Routing, with mailto fallback)
- `/404.html` — friendly fallback

## Local preview

```sh
./serve            # http://localhost:8000, auto-opens browser
./serve 9000       # custom port

# or via Docker
docker compose up --build      # http://localhost:8000
docker compose down            # stop
```

## Deployment

Served via **GitHub Pages** from the `main` branch root, custom domain `netriq.ai` (apex + `www`). DNS is managed in Cloudflare with the proxy off (grey-cloud) so Pages can issue its Let's Encrypt cert.

To deploy: merge to `main`. Pages picks up the change on the next build (~30–60 s).

## Contact form

The form posts to a Cloudflare Worker at `https://forms.netriq.ai/contact` (source under `worker/`), which validates the submission and delivers it to a NetrIQ team alias via Cloudflare Email Routing's native `send_email` binding — no third-party form-relay. On any Worker failure, the form falls back to a `mailto:` link populated with all field values so a deliverable message is always produced. Setup, deploy and smoke-test steps live in `worker/README.md`.

Recipient mapping is configured on Cloudflare Email Routing and on the form-relay account. No recipient email addresses appear in this repo's source.

## Screenshots

Product screenshots live in `assets/img/` and are PII-clean — face regions on customer-bearing surfaces are mosaic-redacted via `scripts/face_blur.py`. The allowlist is enforced by `scripts/sync-screenshots.sh` (used by the weekly `sync-screenshots.yml` GitHub Action).

## Workflows

- `.github/workflows/sync-screenshots.yml` — weekly auto-refresh of allowlisted screenshots from the internal `business` repo. Opens a PR; never pushes to `main` directly so a human eyeballs the diff.
