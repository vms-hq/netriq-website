# Contact-form Worker

Cloudflare Worker behind `https://forms.netriq.ai/contact` that receives the
public contact form and delivers each submission to the team mailbox via the
native Email Routing `send_email` binding. No third-party form-relay involved.

## Why a Worker (vs. formsubmit.co / Web3Forms / Resend)

- **Single vendor.** DNS, mail routing, and form ingestion all sit on
  Cloudflare. No external API key for the form path.
- **Sends only to one verified mailbox.** Cloudflare enforces this on the
  binding — the Worker physically cannot be turned into a spam relay.
- **Survives independently of the demo cluster.** The marketing site has no
  dependency on `core`.
- **Free.** Workers free tier covers 100k requests/day; this form will see a
  vanishingly small fraction of that.

The earlier formsubmit.co backend is removed.

## One-time setup

### 1. Verify the destination mailbox

`Email → Email Routing → Destination addresses → Add destination address`

Add the external mailbox you want enquiries delivered to (e.g. the Gmail/Workspace inbox the team monitors). Click the verification link Cloudflare emails to that address.

Put that exact verified mailbox into `wrangler.toml` under both `destination_address` and the `LEADS_TO` var. The two must match — Cloudflare rejects sends whose `To:` header diverges from the binding's destination.

> ⚠️ Note: `leads@netriq.ai` is a **custom address** on Email Routing (it forwards mail elsewhere). It is NOT a "destination address" and cannot be used in the binding. The destination must be the external mailbox `leads@netriq.ai` ultimately forwards to.

`Email → Email Routing → Routing rules`

Confirm there is a rule for `leads@netriq.ai` (or whichever public-facing alias you prefer) that forwards to the same verified mailbox. This is only relevant for the **mailto fallback** that the static JS uses if the Worker is unreachable — it lets visitors mail `leads@netriq.ai` directly and still land in the team inbox.

### 2. Add the `forms.netriq.ai` DNS record

`DNS → Records → Add record`

- Type: `CNAME`
- Name: `forms`
- Target: `netriq.ai` (placeholder — the Worker route takes over before origin is hit)
- Proxy status: **Proxied (orange cloud)** — required for Worker routes to fire

Apex (`netriq.ai`) and `www` must remain **DNS-only (grey cloud)** so GitHub Pages can renew its Let's Encrypt cert. Do not flip those.

### 3. Install + deploy

```sh
cd worker
npm install
npx wrangler login           # one-time browser auth
npx wrangler deploy
```

Wrangler will create the Worker, attach the route `forms.netriq.ai/contact`, and confirm the `send_email` binding.

### 4. Smoke-test

```sh
curl -i https://forms.netriq.ai/contact \
  -H "Origin: https://netriq.ai" \
  -H "Content-Type: application/json" \
  -d '{"name":"Smoke Test","email":"you@example.com","message":"hello from curl"}'
```

Expected: `HTTP 200`, body `{"success":"true"}`. Mail lands in the verified mailbox within a few seconds.

### 5. (Optional) Add a rate-limit rule

`Security → WAF → Rate limiting rules → Create rule`

- Field: `URI Path` equals `/contact`
- Hostname equals `forms.netriq.ai`
- Threshold: 5 requests per minute per IP
- Action: Block, 10-minute duration

Honeypot fields already drop the obvious bots. The rate-limit rule is belt-and-braces against scripted floods.

## Live operations

- **Tail logs:** `npx wrangler tail` — streams every request + console output.
- **Local dev:** `npm run dev` runs against Cloudflare's edge (the `send_email` binding does not work in local-only mode; `--remote` is mandatory).
- **Update the destination:** edit `destination_address` in `wrangler.toml`, redeploy. Email Routing must already have the new address verified.

## Files

| File | Purpose |
|---|---|
| `src/index.js` | Worker handler — validation, MIME assembly, `env.LEADS.send()` |
| `wrangler.toml` | Worker config: binding, route, vars |
| `package.json` | `mimetext` dep + wrangler scripts |

## Failure modes the static site handles

The form's JS (`assets/js/site.js`) treats any non-`{success:"true"}` response as failure and shows the mailto fallback. So if the Worker is mis-deployed, throttled, or the binding breaks, visitors still get a working `mailto:leads@netriq.ai` link populated with their form values — no lead is lost.
