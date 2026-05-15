#!/usr/bin/env python3
"""
Import-with-redaction pipeline for two screenshots that carry person thumbnails:
  - analytics.png  (Sightings Groups panel)
  - events.png     (Detection events thumbnail column)

The rest of the marketing screenshots are imported untouched by
scripts/sync-screenshots.sh. These two need a strip-blur because face-detector
recall on partial silhouettes / profile shots is not reliable enough for
public-facing marketing material — so we mosaic the entire region where
person thumbnails appear (identified by fractional bounding box).

Usage:
  python3 scripts/face_blur.py                # writes into assets/img/
  python3 scripts/face_blur.py --dry-run      # report only

Re-run any time the source screenshots in vms-hq/business are refreshed.
"""
from __future__ import annotations
import argparse, pathlib, sys

try:
    import cv2  # type: ignore
except ImportError:
    print("ERROR: opencv-python not installed. `pip install opencv-python` and retry.", file=sys.stderr)
    sys.exit(1)

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC_DEFAULT = ROOT.parent / "business" / "docs" / "marketing" / "screenshots"
DST = ROOT / "assets" / "img"

# (y0, y1, x0, x1) as fractions of image dimensions
STRIP_BLUR = {
    "analytics.png": [(0.53, 0.92, 0.08, 0.85)],
    "events.png":    [(0.10, 0.99, 0.13, 0.22)],
}

def pixelate(img, x0, y0, x1, y1, block=24):
    roi = img[y0:y1, x0:x1]
    h, w = roi.shape[:2]
    if h < 4 or w < 4:
        return
    small = cv2.resize(roi, (max(1, w // block), max(1, h // block)), interpolation=cv2.INTER_LINEAR)
    img[y0:y1, x0:x1] = cv2.resize(small, (w, h), interpolation=cv2.INTER_NEAREST)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=pathlib.Path, default=SRC_DEFAULT,
                        help=f"source screenshots dir (default: {SRC_DEFAULT})")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not args.source.exists():
        print(f"ERROR: source not found: {args.source}", file=sys.stderr)
        sys.exit(1)
    DST.mkdir(parents=True, exist_ok=True)

    for name, regions in STRIP_BLUR.items():
        src = args.source / name
        if not src.exists():
            print(f"  SKIP {name} (missing in source)")
            continue
        img = cv2.imread(str(src))
        if img is None:
            print(f"  ERROR reading {name}", file=sys.stderr)
            continue
        h, w = img.shape[:2]
        for (y0p, y1p, x0p, x1p) in regions:
            y0, y1 = int(h * y0p), int(h * y1p)
            x0, x1 = int(w * x0p), int(w * x1p)
            pixelate(img, x0, y0, x1, y1)
        if args.dry_run:
            print(f"  WOULD WRITE {name} {w}x{h} -> {len(regions)} band(s) pixelated")
        else:
            cv2.imwrite(str(DST / name), img)
            print(f"  REDACT {name} {w}x{h} -> {len(regions)} band(s) pixelated")

if __name__ == "__main__":
    main()
