# Publish talk decks

The source presentation stays in `talks/<year>-<event>/slides.html`. The
publishing build extracts embedded base64 images and fonts into separate files
so that Cloudflare can serve the resulting HTML deck.

## Preview build

```bash
python3 scripts/build_site.py
python3 -m http.server -d dist 8000
```

Open `http://localhost:8000/talks/2026-digital-marketing-europe/`.
Check navigation, styling, fonts and slide images before publishing.

## Automatic publishing

A GitHub Actions workflow builds and deploys the `dist/` directory to the
separate Cloudflare Pages project `aikis-talks` whenever main changes.
This does **not** modify the existing `aikis-site` Worker.

To enable deployment:

1. Create a Cloudflare API token scoped to the account, with
   **Cloudflare Pages: Edit** permission.
2. Open GitHub repository Settings → Secrets and variables → Actions.
3. Add repository secret `CLOUDFLARE_API_TOKEN`.
4. Run the "Publish talks to Cloudflare Pages" workflow once.

The project is expected to be reachable at `https://aikis-talks.pages.dev`.
URLs will be `/talks/<talk-id>/`, and its index will be `/talks.json`.

## Integration with aikis.lt

Link to the public Pages URLs from `aikis.lt/talks`, or later add a
same-domain reverse proxy in the existing `aikis-site` Worker. The latter
should be tested before changing the production Worker.

The HTML deck remains the canonical editable file in Git; `dist/` is
generated and should not be committed.
