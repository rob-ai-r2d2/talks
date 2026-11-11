/**
 * Public presentation pages for aikis.lt/talks/*
 * The original slide decks remain in GitHub. Generated assets are preferred
 * when available; the self-contained original is a safe publishing fallback.
 * Changing slides or talks.json requires no Worker redeployment.
 */
const GITHUB = "https://raw.githubusercontent.com/rob-ai-r2d2/talks/main/";
const PREFIX = "/talks";
const TTL = 60;
const SLUG = /^[0-9]{4}-[a-z0-9-]+$/;
const ASSET_NAME = /^[a-f0-9]{24}\.(?:png|jpg|webp|gif|svg)$/;

function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}

function github(path) {
  return fetch(GITHUB + path, { cf: { cacheEverything: true, cacheTtl: TTL } });
}

async function catalog() {
  const response = await github("talks.json");
  if (!response.ok) throw new Error("GitHub catalog unavailable: " + response.status);
  const data = await response.json();
  return Array.isArray(data.talks) ? data.talks : [];
}

const CSS = "html{box-sizing:border-box}*,*:before,*:after{box-sizing:inherit}" +
  "body{margin:0;background:#0b0c12;color:#f3f3f8;font:16px/1.6 system-ui,-apple-system,Segoe UI,sans-serif}" +
  "a{color:inherit;text-decoration:none}a:hover{text-decoration:underline}" +
  "header{border-bottom:1px solid #2b2d38;padding:20px clamp(20px,6vw,80px);display:flex;align-items:center;justify-content:space-between}" +
  ".brand{font-weight:800;letter-spacing:.04em}.muted{color:#aeb3c4}" +
  "main{max-width:1200px;margin:auto;padding:44px 24px 80px}" +
  "h1{font-size:clamp(28px,4vw,48px);line-height:1.13;margin:0 0 16px}h2{font-size:22px;margin:0 0 8px}" +
  ".eyebrow{color:#a5a9bb;font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 10px}" +
  ".grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;margin-top:30px}" +
  ".card{display:block;padding:26px;border:1px solid #343748;border-radius:16px;background:#151723}" +
  ".card:hover{border-color:#8288a3;text-decoration:none}.card p{margin:0;color:#c2c5d1}" +
  ".button{display:inline-block;padding:9px 15px;border:1px solid #797e91;border-radius:9px;margin-right:12px}" +
  ".viewer{width:100%;aspect-ratio:16/9;border:1px solid #343748;border-radius:14px;background:#000}" +
  ".details{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:20px 0 24px}" +
  "@media(max-width:650px){main{padding:30px 16px}.viewer{border-radius:6px}}";

function page(title, content) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(title) + ' · Aikis</title><style>' + CSS + '</style></head>' +
    '<body><header><a class="brand" href="https://aikis.lt/">AIKIS</a>' +
    '<a class="muted" href="/talks/">Talks & presentations</a></header>' +
    '<main>' + content + '</main></body></html>';
}

function htmlResponse(html, status) {
  return new Response(html, {
    status: status || 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function mimeFor(filename) {
  const ext = filename.split(".").pop();
  return {
    html: "text/html; charset=utf-8",
    json: "application/json; charset=utf-8",
    png: "image/png",
    jpg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml"
  }[ext] || "application/octet-stream";
}

async function proxy(path, allowSourceFallback) {
  let upstream = await github("published/" + path);
  if (allowSourceFallback && upstream.status === 404) {
    upstream = await github(path);
  }
  if (!upstream.ok) return new Response("Presentation asset not found", { status: 404 });
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": mimeFor(path),
      "Cache-Control": "public, max-age=60",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

async function indexPage() {
  const talks = await catalog();
  const cards = talks.filter(function (t) { return SLUG.test(t.id || ""); }).map(function (t) {
    const href = PREFIX + "/" + encodeURIComponent(t.id) + "/";
    return '<a class="card" href="' + href + '">' +
      '<p class="eyebrow">' + esc(t.event) + ' · ' + esc(t.year) + '</p>' +
      '<h2>' + esc(t.title) + '</h2><p>' + esc(t.summary) + '</p></a>';
  }).join("");
  return htmlResponse(page("Talks & presentations",
    '<p class="eyebrow">Conference talks</p><h1>Talks & presentations</h1>' +
    '<p class="muted">Slides, demos and notes from my talks.</p>' +
    '<div class="grid">' + (cards || '<p>No presentations published yet.</p>') + '</div>'));
}

async function talkPage(id) {
  const talks = await catalog();
  const t = talks.find(function (item) { return item.id === id; });
  if (!t) return htmlResponse(page("Not found", '<h1>Presentation not found</h1>'), 404);
  const src = PREFIX + "/" + encodeURIComponent(id) + "/slides.html";
  const content = '<p class="eyebrow">' + esc(t.event) + ' · ' + esc(t.year) + '</p>' +
    '<h1>' + esc(t.title) + '</h1>' +
    '<p class="muted">' + esc(t.summary) + '</p>' +
    '<div class="details"><a class="button" href="' + src + '" target="_blank" rel="noopener">Open slides</a>' +
    '<a class="button" href="https://github.com/rob-ai-r2d2/talks/tree/main/talks/' +
    encodeURIComponent(id) + '" target="_blank" rel="noopener">GitHub & resources</a></div>' +
    '<iframe class="viewer" src="' + src + '" title="' + esc(t.title) +
    '" loading="eager" allowfullscreen></iframe>';
  return htmlResponse(page(t.title, content));
}

export default {
  async fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === PREFIX || path === PREFIX + "/") {
        if (path === PREFIX) return Response.redirect(url.origin + PREFIX + "/", 308);
        return await indexPage();
      }
      if (path === PREFIX + "/catalog.json") {
        const upstream = await github("talks.json");
        if (!upstream.ok) return new Response("Catalog not found", { status: 502 });
        return new Response(upstream.body, {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=60" }
        });
      }
      const match = path.match(/^\/talks\/([0-9]{4}-[a-z0-9-]+)(?:\/(slides\.html|assets\/[a-f0-9]{24}\.(?:png|jpg|webp|gif|svg)))?\/?$/);
      if (!match || !SLUG.test(match[1])) {
        return htmlResponse(page("Not found", '<h1>Page not found</h1>'), 404);
      }
      const id = match[1];
      const resource = match[2];
      if (resource === "slides.html") return await proxy("talks/" + id + "/slides.html", true);
      if (resource && resource.startsWith("assets/") &&
          ASSET_NAME.test(resource.slice(7))) {
        return await proxy("talks/" + id + "/" + resource, false);
      }
      if (!path.endsWith("/")) return Response.redirect(url.origin + PREFIX + "/" + id + "/", 308);
      return await talkPage(id);
    } catch (err) {
      return htmlResponse(page("Temporarily unavailable",
        '<h1>Presentations temporarily unavailable</h1>' +
        '<p>Please try again shortly.</p>'), 503);
    }
  }
};
