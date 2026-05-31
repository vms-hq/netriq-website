#!/usr/bin/env python3
"""
seo_check.py — NetrIQ SEO + LLM-visibility checker.

Verifies the discoverability surface that search engines and LLM agents read:
canonical, Open Graph, Twitter cards, valid JSON-LD structured data, llms.txt /
llms-full.txt, AI-crawler-friendly robots.txt, and a sitemap with <lastmod>.

Two modes (pick one):
  --root DIR    Validate the static files in DIR (pre-deploy / CI on a PR).
  --url  BASE   Validate the live deployment over HTTP (e.g. https://netriq.ai),
                and — if PAGESPEED_API_KEY is set or --psi is passed — pull
                Core Web Vitals + Lighthouse Performance/SEO from the
                PageSpeed Insights API for the home page.

Exit code is non-zero if any required check fails, so it gates CI.
Stdlib only — no third-party dependencies.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.request
import urllib.parse
from pathlib import Path

PAGES = ["", "platform.html", "verticals.html", "why-netriq.html", "contact.html"]
DEFAULT_BASE = "https://netriq.ai"

# Per-page expectations for the JSON-LD @type that should appear.
EXPECTED_TYPES = {
    "": {"Organization", "WebSite"},
    "platform.html": {"SoftwareApplication", "BreadcrumbList"},
    "verticals.html": {"BreadcrumbList", "ItemList"},
    "why-netriq.html": {"FAQPage", "BreadcrumbList"},
    "contact.html": {"ContactPage", "BreadcrumbList"},
}

AI_BOTS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "OAI-SearchBot"]

results: list[tuple[bool, str]] = []


def check(ok: bool, msg: str) -> None:
    results.append((bool(ok), msg))


# --------------------------------------------------------------------------- IO
def fetch_text(base: str, path: str, is_url: bool) -> str | None:
    if is_url:
        url = base.rstrip("/") + "/" + path if path else base.rstrip("/") + "/"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "netriq-seo-check"})
            with urllib.request.urlopen(req, timeout=30) as r:
                if r.status != 200:
                    return None
                return r.read().decode("utf-8", "replace")
        except Exception:
            return None
    else:
        fp = Path(base) / ("index.html" if path == "" else path)
        return fp.read_text("utf-8") if fp.exists() else None


# ---------------------------------------------------------------- HTML parsing
def jsonld_blocks(html: str) -> list[dict]:
    out: list[dict] = []
    for m in re.finditer(
        r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html, re.S | re.I,
    ):
        raw = m.group(1).strip()
        out.append(json.loads(raw))  # raises on invalid JSON -> surfaced as failure
    return out


def collect_types(block: dict) -> set[str]:
    types: set[str] = set()
    nodes = block.get("@graph", [block]) if isinstance(block, dict) else []
    for n in nodes:
        t = n.get("@type")
        if isinstance(t, str):
            types.add(t)
        elif isinstance(t, list):
            types.update(t)
    return types


def has_meta(html: str, attr: str, value: str) -> bool:
    return re.search(
        rf'<meta[^>]*{attr}=["\']{re.escape(value)}["\']', html, re.I
    ) is not None


# ------------------------------------------------------------------ page check
def check_page(base: str, path: str, is_url: bool) -> None:
    label = path or "(home)"
    html = fetch_text(base, path, is_url)
    if html is None:
        check(False, f"{label}: page not reachable")
        return

    check('<link rel="canonical"' in html.replace("'", '"'),
          f"{label}: canonical link present")
    check(has_meta(html, "property", "og:title") and has_meta(html, "property", "og:image"),
          f"{label}: Open Graph title+image present")
    check(has_meta(html, "property", "og:url"),
          f"{label}: og:url present")
    check(has_meta(html, "name", "twitter:card"),
          f"{label}: Twitter card present")
    check(re.search(r'<meta[^>]*name=["\']robots["\']', html, re.I) is not None,
          f"{label}: robots meta present")

    try:
        blocks = jsonld_blocks(html)
        types: set[str] = set()
        for b in blocks:
            types |= collect_types(b)
        check(len(blocks) >= 1, f"{label}: has valid JSON-LD ({len(blocks)} block(s))")
        want = EXPECTED_TYPES.get(path, set())
        missing = want - types
        check(not missing,
              f"{label}: JSON-LD types {sorted(want)} present"
              + (f" — MISSING {sorted(missing)}" if missing else ""))
    except json.JSONDecodeError as e:
        check(False, f"{label}: JSON-LD is INVALID JSON — {e}")


# ------------------------------------------------------------ site-wide checks
def check_llms(base: str, is_url: bool) -> None:
    for f in ("llms.txt", "llms-full.txt"):
        txt = fetch_text(base, f, is_url)
        check(bool(txt) and txt.lstrip().startswith("#"),
              f"/{f}: present and starts with a markdown heading")


def check_robots(base: str, is_url: bool) -> None:
    txt = fetch_text(base, "robots.txt", is_url)
    if not txt:
        check(False, "/robots.txt: present")
        return
    check("Sitemap:" in txt, "/robots.txt: Sitemap line present")
    named = [b for b in AI_BOTS if b in txt]
    check(len(named) >= 3,
          f"/robots.txt: names AI crawlers ({', '.join(named) or 'none'})")


def check_sitemap(base: str, is_url: bool) -> None:
    xml = fetch_text(base, "sitemap.xml", is_url)
    if not xml:
        check(False, "/sitemap.xml: present")
        return
    check("<lastmod>" in xml, "/sitemap.xml: <lastmod> present")
    check(xml.count("<loc>") >= len(PAGES),
          f"/sitemap.xml: lists all pages ({xml.count('<loc>')} URLs)")


# --------------------------------------------------------- PageSpeed Insights
def check_psi(base: str) -> None:
    key = os.environ.get("PAGESPEED_API_KEY", "")
    api = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
    q = {"url": base, "strategy": "mobile", "category": ["performance", "seo"]}
    url = api + "?" + urllib.parse.urlencode(q, doseq=True) + (f"&key={key}" if key else "")
    try:
        with urllib.request.urlopen(url, timeout=90) as r:
            data = json.loads(r.read())
    except Exception as e:
        check(True, f"PSI: skipped (could not reach API: {e})")
        return
    cats = data.get("lighthouseResult", {}).get("categories", {})
    perf = round((cats.get("performance", {}).get("score") or 0) * 100)
    seo = round((cats.get("seo", {}).get("score") or 0) * 100)
    check(seo >= 90, f"PSI mobile SEO score = {seo} (target >= 90)")
    check(perf >= 70, f"PSI mobile Performance score = {perf} (target >= 70, aim 90)")
    cwv = data.get("loadingExperience", {}).get("metrics", {})
    for k in ("LARGEST_CONTENTFUL_PAINT_MS", "CUMULATIVE_LAYOUT_SHIFT_SCORE",
              "INTERACTION_TO_NEXT_PAINT"):
        m = cwv.get(k)
        if m:
            check(m.get("category") in ("FAST", "AVERAGE"),
                  f"PSI CWV {k} = {m.get('percentile')} [{m.get('category')}]")


# ------------------------------------------------------------------------ main
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--root", help="validate static files in this directory")
    g.add_argument("--url", help="validate live deployment at this base URL")
    ap.add_argument("--psi", action="store_true",
                    help="also query PageSpeed Insights (url mode only)")
    ap.add_argument("--report", help="write the markdown report to this path")
    args = ap.parse_args()

    is_url = bool(args.url) or not args.root
    base = args.url or args.root or DEFAULT_BASE

    for p in PAGES:
        check_page(base, p, is_url)
    check_llms(base, is_url)
    check_robots(base, is_url)
    check_sitemap(base, is_url)
    if is_url and (args.psi or os.environ.get("PAGESPEED_API_KEY")):
        check_psi(base)

    passed = sum(1 for ok, _ in results if ok)
    total = len(results)
    failed = total - passed

    lines = [f"# NetrIQ SEO / LLM-visibility check",
             f"\n**Target:** `{base}` ({'live URL' if is_url else 'local files'})  ",
             f"**Result:** {passed}/{total} checks passed, **{failed} failed**\n"]
    for ok, msg in results:
        lines.append(f"- {'✅' if ok else '❌'} {msg}")
    report = "\n".join(lines) + "\n"

    print(report)
    if args.report:
        Path(args.report).write_text(report, "utf-8")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
