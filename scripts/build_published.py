#!/usr/bin/env python3
"""Build browser-ready talk decks without changing the original slide exports.

Each self-contained slides.html stays in talks/<slug>/ as the source of truth.
This script extracts inline base64 images to small, cacheable assets under
published/ so that each served HTML file stays below Cloudflare's 25 MiB limit.
"""
import base64
import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "published"
DATA_IMAGE = re.compile(
    r"data:(image/(?:png|jpe?g|webp|gif|svg\+xml));base64,([A-Za-z0-9+/]+={0,2})",
    re.IGNORECASE,
)
EXT = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
}
MAX_ASSET_BYTES = 25 * 1024 * 1024


def build_talk(source: Path, destination: Path) -> tuple[int, int]:
    html = source.read_text(encoding="utf-8")
    assets_dir = destination.parent / "assets"
    written = set()
    matches = 0

    def extract(match: re.Match[str]) -> str:
        nonlocal matches
        matches += 1
        kind = match.group(1).lower()
        raw = base64.b64decode(match.group(2), validate=True)
        if len(raw) > MAX_ASSET_BYTES:
            raise ValueError(f"Asset in {source} exceeds Cloudflare's per-file limit")
        digest = hashlib.sha256(raw).hexdigest()[:24]
        name = f"{digest}.{EXT[kind]}"
        if name not in written:
            assets_dir.mkdir(parents=True, exist_ok=True)
            (assets_dir / name).write_bytes(raw)
            written.add(name)
        return "assets/" + name

    # Replace the complete data URL, regardless of whether it occurs in an
    # HTML attribute, a CSS url(...) declaration, or an inline JS string.
    html = DATA_IMAGE.sub(extract, html)
    # The original self-contained deck permits data: images but not same-origin
    # files. Permit those files while retaining the original CSP restrictions.
    html = html.replace("img-src data: blob:", "img-src 'self' data: blob:")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(html, encoding="utf-8")
    if destination.stat().st_size > MAX_ASSET_BYTES:
        raise ValueError(f"{destination} still exceeds Cloudflare's 25 MiB limit")
    return matches, len(written)


def main() -> None:
    catalog = json.loads((ROOT / "talks.json").read_text(encoding="utf-8"))
    if OUT.exists():
        shutil.rmtree(OUT)
    for talk in catalog["talks"]:
        source_relative = Path(talk["slides"])
        if (source_relative.is_absolute()
                or ".." in source_relative.parts
                or source_relative.parts[0] != "talks"):
            raise ValueError(f"Unsafe slides path: {source_relative}")
        source = ROOT / source_relative
        if not source.is_file():
            raise FileNotFoundError(source)
        destination = OUT / source_relative
        matches, unique = build_talk(source, destination)
        print(f"{talk['id']}: {matches} image references, "
              f"{unique} unique image assets; "
              f"HTML {destination.stat().st_size / 1024:.1f} KiB")
    (OUT / ".gitkeep").write_text("", encoding="utf-8")


if __name__ == "__main__":
    main()
