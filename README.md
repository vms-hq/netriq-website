# netriq-website

Public product website for [Netriq](https://netriq.ai). Hand-written static HTML/CSS/JS — no build step, no framework.

This repo eventually serves the apex `netriq.ai` domain (currently routes to the demo instance).

## Pages

- `/` — landing
- `/platform.html` — what Netriq does today (only shipping features)
- `/verticals.html` — vertical fit (housing, healthcare, education, retail, hospitality, malls, fleet, SMB)
- `/why-netriq.html` — differentiation, tier model, get-a-quote
- `/contact.html` — contact form

## Local preview

Any static server works. Two one-liners:

```sh
python3 -m http.server 8000
# or
npx --yes serve .
```

Then open `http://localhost:8000`.

## Contact form

The form posts to [Web3Forms](https://web3forms.com) — a free, no-account-required form relay that supports CC. Setup:

1. Sign up for a free access key at <https://web3forms.com/#start>.
2. Configure the access key's destination email as `ishaileshpant@nysha.in`.
3. Open `contact.html`, find the placeholder string `WEB3FORMS_ACCESS_KEY`, and replace it with the real access key.
4. Confirm `<input name="cc" value="mmv@nysha.in" />` is intact — that adds the second recipient.

Submissions land in the configured inbox. The honeypot field (`botcheck`) blocks the most common bot traffic.

## Brand assets

Sourced from `vms-hq/business/logoicons/`. Check that repo for the brand guide before changing colours, typography, or logo treatments.

## Privacy

- All product screenshots in `/assets/img/` are PII-clean (verified): empty states, charts, configuration UI, and a gate-log view where plates show as "not detected". No faces, no real plate numbers.
- Refresh screenshots from the demo instance only (never from `trial`, which holds real customer data).

## Deploy

Static files; deploy to any static host (Cloudflare Pages, GitHub Pages, S3+CloudFront, Caddy on a VPS). When ready to redirect `netriq.ai`, point DNS to wherever this is hosted and remove the demo redirect.
