#!/usr/bin/env bash
# sync-screenshots.sh — copy PII-safe product screenshots from vms-hq/business
# to assets/img/, then open a PR if any changed. Designed to be called
# from a scheduled remote agent.
#
# Usage:
#   ./scripts/sync-screenshots.sh                # write to a topic branch + open PR
#   DRY_RUN=1 ./scripts/sync-screenshots.sh      # report diff only, no writes
#
# Required env (when not DRY_RUN):
#   gh CLI authenticated against vms-hq with repo write
#   git user.email / user.name set on this checkout
#
# Allowlist below is the set verified PII-clean during the 2026-05-15 audit.
# If a new screenshot is needed on the site, add it here AND eyeball the
# source frame for faces / readable plates / customer names before adding.
#
# NOTE: bom-*.png screens carry "INTERNAL ONLY" marketing context (pricing,
# competitor research) and are deliberately NOT in this allowlist.
#
# NOTE: analytics.png + events.png contain the "Sightings Groups" / detection
# thumbnail bands which can hold partial faces. They are imported through
# scripts/face_blur.py (mosaic-redacted), not via this sync script. If you
# refresh them, re-run the blur pipeline before committing.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUSINESS_DIR="${BUSINESS_DIR:-${ROOT}/../business}"
SRC="${BUSINESS_DIR}/docs/marketing/screenshots"
DST="${ROOT}/assets/img"

# PII-safe allowlist (verified 2026-05-15; re-audit yearly):
#   alerts.png      — alerts list, text-only
#   dashboard.png   — chart of detections by class, no faces / no plates
#   devices.png     — camera list with credentials masked as ****
#   gate-log.png    — vehicle thumbnails, plates show "not detected"
#   groups.png      — group config, no people
#   live-view.png   — loading-state grid, no live frames
#   login.png       — login screen, no people
#   poi-tracking.png — empty state ("No objects of interest registered")
#   recordings.png  — timeline view, no people
#   settings.png    — config UI, no data
#   vehicle-registry.png — plates only, no faces
ALLOWLIST=(
  alerts.png dashboard.png devices.png gate-log.png groups.png
  live-view.png login.png poi-tracking.png recordings.png settings.png
  vehicle-registry.png
)

DRY_RUN="${DRY_RUN:-0}"

if [[ ! -d "$SRC" ]]; then
  echo "ERROR: business screenshots dir not found at $SRC" >&2
  echo "Set BUSINESS_DIR=/path/to/vms-hq/business if needed." >&2
  exit 1
fi

cd "$ROOT"
mkdir -p "$DST"

CHANGED=()
SKIPPED=()

for f in "${ALLOWLIST[@]}"; do
  if [[ ! -f "$SRC/$f" ]]; then
    SKIPPED+=("$f (missing in source)")
    continue
  fi
  if [[ -f "$DST/$f" ]] && cmp -s "$SRC/$f" "$DST/$f"; then
    continue   # identical, nothing to do
  fi
  CHANGED+=("$f")
done

if [[ ${#CHANGED[@]} -eq 0 ]]; then
  echo "no screenshot changes — assets/img is already up to date"
  if [[ ${#SKIPPED[@]} -gt 0 ]]; then
    printf 'skipped:\n'; printf '  - %s\n' "${SKIPPED[@]}"
  fi
  exit 0
fi

echo "screenshots changed (${#CHANGED[@]}):"
printf '  - %s\n' "${CHANGED[@]}"
if [[ ${#SKIPPED[@]} -gt 0 ]]; then
  echo "skipped:"
  printf '  - %s\n' "${SKIPPED[@]}"
fi

if [[ "$DRY_RUN" == "1" ]]; then
  echo
  echo "DRY_RUN=1 — no files written, no PR opened"
  exit 0
fi

# Topic branch + PR (no direct push to main).
BRANCH="auto/screenshots-$(date -u +%Y%m%d)"
git fetch origin main >/dev/null 2>&1 || true
git checkout -B "$BRANCH" origin/main 2>/dev/null || git checkout -B "$BRANCH"

for f in "${CHANGED[@]}"; do
  cp "$SRC/$f" "$DST/$f"
  git add "$DST/$f"
done

if git diff --cached --quiet; then
  echo "nothing to stage after copy — exiting clean"
  exit 0
fi

git commit -m "auto: refresh screenshots from business repo

$(printf '%s\n' "${CHANGED[@]}" | sed 's/^/- /')

Source: vms-hq/business/docs/marketing/screenshots/
Allowlist verified PII-safe at v1.0.0 audit."

git push -u origin "$BRANCH" --force-with-lease

if command -v gh >/dev/null 2>&1; then
  gh pr create \
    --repo vms-hq/netriq-website \
    --base main --head "$BRANCH" \
    --title "auto: refresh website screenshots" \
    --body "$(cat <<EOF
## Auto-generated screenshot refresh

The following screenshots in \`assets/img/\` differ from the source in \`vms-hq/business/docs/marketing/screenshots/\`. This PR copies the new versions over.

$(printf '- \`%s\`\n' "${CHANGED[@]}")

## Eyeball before merging

- [ ] No faces visible in any frame
- [ ] No readable plate text (HSRP plates → must be illegible or "not detected")
- [ ] No customer / patient / staff names in any list / panel
- [ ] No real email addresses or phone numbers in form / config screens
- [ ] No internal hostnames / IPs that aren't already public

If anything fails the eyeball, close this PR and remove the offending file from the allowlist in \`scripts/sync-screenshots.sh\`.
EOF
)" || echo "gh pr create failed; branch is pushed at $BRANCH — open PR manually"
else
  echo "gh CLI not available — branch pushed at $BRANCH — open PR manually"
fi
