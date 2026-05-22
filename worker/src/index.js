// Contact-form Worker for netriq.ai.
//
// Accepts a POST from the static contact form, validates, and delivers the
// message to the team mailbox via Cloudflare's native Email Routing send_email
// binding. No third-party form-relay involved.
//
// Bindings (see wrangler.toml):
//   env.LEADS      — send_email binding. Worker can only deliver to the
//                    destination_address configured on the binding (Cloudflare
//                    enforces this; the binding is not a generic SMTP relay).
//   env.LEADS_TO   — string. The "To:" header on the outbound MIME message.
//                    Usually identical to the binding's destination_address.
//
// Response shape mirrors what assets/js/site.js already expects from the
// previous form-relay: `{ success: "true" }` on success, anything else
// triggers the mailto fallback in the browser.

import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

const ALLOWED_ORIGINS = new Set([
  "https://netriq.ai",
  "https://www.netriq.ai",
]);

const SENDER = { name: "NetrIQ Contact Form", addr: "forms@netriq.ai" };
const SUBJECT_PREFIX = "New enquiry from netriq.ai";

const FIELDS = ["name", "organisation", "email", "phone", "vertical", "cameras", "message"];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "https://netriq.ai";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Vary": "Origin",
  };
}

function json(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function isEmail(s) {
  return typeof s === "string"
    && s.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function clip(s, max) {
  if (typeof s !== "string") return "";
  const t = s.trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

async function readFields(request) {
  const ct = (request.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) return await request.json();
  const fd = await request.formData();
  const out = {};
  for (const [k, v] of fd.entries()) out[k] = typeof v === "string" ? v : "";
  return out;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "POST") {
      return json(405, { success: "false", error: "method-not-allowed" }, origin);
    }

    let data;
    try {
      data = await readFields(request);
    } catch {
      return json(400, { success: "false", error: "bad-request" }, origin);
    }

    // Honeypots — silently return success so bots don't probe further.
    const honey = String(data._honey || "");
    const bot = String(data.botcheck || "");
    if (honey.length > 0 || bot === "on" || bot === "true") {
      return json(200, { success: "true" }, origin);
    }

    const name = clip(String(data.name || ""), 200);
    const email = clip(String(data.email || ""), 254);
    const message = clip(String(data.message || ""), 4000);

    if (!name || !isEmail(email) || !message) {
      return json(400, { success: "false", error: "missing-required-fields" }, origin);
    }

    const lines = FIELDS
      .map(k => {
        const v = clip(String(data[k] || ""), 1000);
        if (!v) return null;
        const label = k.charAt(0).toUpperCase() + k.slice(1);
        return `${label}: ${v}`;
      })
      .filter(Boolean);

    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const country = (request.cf && request.cf.country) || "unknown";
    const ua = clip(request.headers.get("user-agent") || "", 300);

    const body =
      lines.join("\n") +
      "\n\n-- \n" +
      `IP: ${ip}\nCountry: ${country}\nUser-Agent: ${ua}\n`;

    const mime = createMimeMessage();
    mime.setSender(SENDER);
    mime.setRecipient(env.LEADS_TO);
    mime.setSubject(`${SUBJECT_PREFIX} — ${name}`);
    mime.setHeader("Reply-To", email);
    mime.addMessage({ contentType: "text/plain", data: body });

    const outbound = new EmailMessage(SENDER.addr, env.LEADS_TO, mime.asRaw());

    try {
      await env.LEADS.send(outbound);
    } catch (err) {
      return json(502, { success: "false", error: "delivery-failed", detail: String(err && err.message || err) }, origin);
    }

    return json(200, { success: "true" }, origin);
  },
};
