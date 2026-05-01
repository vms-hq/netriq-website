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

The form posts to [Web3Forms](https://web3forms.com) (Free tier — `leads-netriq.ai` form). Submissions deliver to `ishaileshpant@nysha.in`.

### Dual-recipient delivery (mmv@nysha.in)

Free tier delivers to **one** registered email. The `<input name="cc" value="mmv@nysha.in" />` field in our form is silently ignored on Free (CC is a Pro feature). To get both recipients without subscribing:

- **Recommended**: set up a forwarding rule on `ishaileshpant@nysha.in` that auto-forwards mail with subject `New enquiry from netriq.ai` to `mmv@nysha.in`, OR
- create a distribution alias (e.g. `leads@nysha.in`) that fans out to both, then change the Web3Forms destination to that alias.

### Upgrade to Pro (₹399/mo) only if you need

- Native multi-recipient / CC enforcement
- Webhook fan-out into Slack / Sheets / Notion
- File uploads in the form
- More than 250 submissions/month (Free cap)

The `cc` hidden input stays in the markup either way — harmless on Free, immediate when/if you upgrade.

The honeypot field (`botcheck`) blocks the most common bot traffic.

## Brand assets

Sourced from `vms-hq/business/logoicons/`. Check that repo for the brand guide before changing colours, typography, or logo treatments.

## Privacy

- All product screenshots in `/assets/img/` are PII-clean (verified): empty states, charts, configuration UI, and a gate-log view where plates show as "not detected". No faces, no real plate numbers.
- Refresh screenshots from the demo instance only (never from `trial`, which holds real customer data).

## Deploy

Static files; deploy to any static host (Cloudflare Pages, GitHub Pages, S3+CloudFront, Caddy on a VPS). When ready to redirect `netriq.ai`, point DNS to wherever this is hosted and remove the demo redirect.
