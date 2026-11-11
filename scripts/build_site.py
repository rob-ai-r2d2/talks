#!/usr/bin/env python3
"""Build standalone talk decks into Cloudflare-hostable static assets.

The original slides.html files remain unchanged in Git. Base64 data URLs
are extracted into content-addressed assets during publishing.
"""
import base64
import hashlib
import html
import json
import mimetypes
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "dist"
MAX_BYTES = 25 * 1024 * 1024
DATA_URL = re.compile(r"data:([\w.+-]+/[\w.+-]+)(?:;[\w.+-]+=[\w.+-]+)*;base64,([A-Za-z0-9+/=]+)", re.IGNORECASE)
EXT = {"image/jpeg": ".jpg", "image/svg+xml": ".svg", "font/woff2": ".woff2", "font/woff": ".woff", "application/font-woff": ".woff", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif", "image/avif": ".avif"}

def link(path):
    return "/" + str(path).replace("\\", "/")

def build():
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir()
    catalog = json.loads((ROOT / "talks.json").read_text(encoding="utf-8"))
    talks = catalog.get("talks", [])
    for talk in talks:
        slug = talk["id"]
        source = ROOT / talk["slides"]
        if not source.is_file() or source.suffix.lower() != ".html":
            raise ValueError(f"Missing HTML deck: {source}")
        destination = OUTPUT / "talks" / slug
        assets = destination / "assets"
        destination.mkdir(parents=True, exist_ok=True)
        page = source.read_text(encoding="utf-8")
        extracted = set()

        def externalize(match):
            mime = match.group(1).lower()
            raw = base64.b64decode(match.group(2), validate=True)
            ext = EXT.get(mime, mimetypes.guess_extension(mime) or ".bin")
            filename = hashlib.sha256(raw).hexdigest()[:24] + ext
            assets.mkdir(exist_ok=True)
            asset = assets / filename
            if filename not in extracted:
                asset.write_bytes(raw)
                extracted.add(filename)
            return "./assets/" + filename

        page = DATA_URL.sub(externalize, page)
        deck = destination / "index.html"
        deck.write_text(page, encoding="utf-8")
        if deck.stat().st_size > MAX_BYTES:
            raise ValueError(f"{deck} exceeds Cloudflare's 25 MiB file limit")
        for asset in assets.glob("*") if assets.exists() else []:
            if asset.stat().st_size > MAX_BYTES:
                raise ValueError(f"{asset} exceeds Cloudflare's 25 MiB file limit")
        print(f"{slug}: extracted {len(extracted)} assets; HTML {deck.stat().st_size:,} bytes")

    (OUTPUT / "talks.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    cards = "\n".join(
        f'<li><a href="/talks/{html.escape(t["id"], quote=True)}/">{html.escape(t["title"])}</a> — {html.escape(t.get("event", ""))}</li>'
        for t in talks
    )
    listing = ('<!doctype html><html lang="en"><meta charset="utf-8">'
               '<meta name="viewport" content="width=device-width, initial-scale=1">'
               '<title>Talks — Aikis</title><style>body{font:18px system-ui;'
               'max-width:800px;margin:10vh auto;padding:0 24px;line-height:1.65}'
               'a{color:inherit}</style><h1>Talks &amp; presentations</h1><ul>'
               + cards + '</ul></html>')
    (OUTPUT / "index.html").write_text(listing, encoding="utf-8")
    (OUTPUT / "talks").mkdir(exist_ok=True)
    (OUTPUT / "talks" / "index.html").write_text(listing, encoding="utf-8")
    print("Build completed:", OUTPUT)

if __name__ == "__main__":
    build()
