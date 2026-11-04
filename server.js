/**
 * MOVFLIX — Production Server for Render.com
 * ============================================================
 * Zero-dependency Node.js server that:
 *   1. Serves the static site (HTML/CSS/JS/PWA assets)
 *   2. Proxies TMDB API calls through /api/tmdb — the API key lives
 *      ONLY in the TMDB_API_KEY environment variable and is NEVER
 *      sent to the browser. Nothing in the client can capture it.
 *   3. Applies strong HTTP security headers (CSP, HSTS, etc.)
 *   4. Rate-limits the proxy so strangers cannot burn your quota.
 *
 * Local dev:   TMDB_API_KEY=xxx node server.js   → http://localhost:3000
 * Render.com:  set TMDB_API_KEY in the dashboard (env var), done.
 */
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const vm = require("vm");

const ROOT = __dirname;

// Local .env only (gitignored). Render injects env vars itself — never commit keys.
(function loadDotEnv() {
  try {
    const envPath = path.join(ROOT, ".env");
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 1) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
  } catch { /* ignore missing/unreadable .env */ }
})();

const PORT = parseInt(process.env.PORT, 10) || 3000;
const TMDB_API_KEY = process.env.TMDB_API_KEY || "";
const IS_PROD = process.env.NODE_ENV === "production" || process.env.RENDER === "true";
const SITE_URL = (process.env.SITE_URL || "https://idms.eu.cc").replace(/\/$/, "");
const GATE_SECRET = process.env.API_GATE_SECRET || TMDB_API_KEY || "movflix-dev-gate";

// ─────────────────────────────────────────────────────────────
// Security headers applied to every response
// ─────────────────────────────────────────────────────────────
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://image.tmdb.org https://images.unsplash.com",
  "connect-src 'self'",
  "frame-src https://framextv.cc https://framextv.xyz",
  "media-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  IS_PROD ? "upgrade-insecure-requests" : ""
].filter(Boolean).join("; ");

function securityHeaders(res, extra) {
  res.setHeader("Content-Security-Policy", CSP);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("X-XSS-Protection", "0");
  if (IS_PROD) {
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  if (extra) Object.entries(extra).forEach(([k, v]) => res.setHeader(k, v));
}

// ─────────────────────────────────────────────────────────────
// Rate limiter — /api/tmdb only (per-IP sliding window)
// ─────────────────────────────────────────────────────────────
const RATE_LIMIT = 40;        // requests…
const RATE_WINDOW_MS = 60_000; // …per minute per IP
const rateBuckets = new Map(); // ip → { count, resetAt }

function rateLimit(ip) {
  const now = Date.now();
  const b = rateBuckets.get(ip);
  if (!b || now > b.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true, remaining: RATE_LIMIT - 1 };
  }
  b.count += 1;
  return { ok: b.count <= RATE_LIMIT, remaining: Math.max(0, RATE_LIMIT - b.count) };
}
// Periodic cleanup so the map cannot grow forever
setInterval(() => {
  const now = Date.now();
  for (const [ip, b] of rateBuckets) if (now > b.resetAt) rateBuckets.delete(ip);
}, RATE_WINDOW_MS).unref();

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

function originAllowList() {
  const set = new Set([
    SITE_URL,
    "https://idms.eu.cc",
    "https://www.idms.eu.cc",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ]);
  const renderUrl = process.env.RENDER_EXTERNAL_URL;
  if (renderUrl) set.add(renderUrl.replace(/\/$/, ""));
  for (const raw of String(process.env.ALLOWED_ORIGINS || "").split(",")) {
    const o = raw.trim().replace(/\/$/, "");
    if (o) set.add(o);
  }
  return set;
}

function originAllowed(req) {
  const allowed = originAllowList();
  const origin = String(req.headers.origin || "").replace(/\/$/, "");
  const referer = String(req.headers.referer || "");
  if (origin) return allowed.has(origin);
  return [...allowed].some((o) => referer === o || referer.startsWith(o + "/"));
}

function mintGate() {
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = crypto.createHmac("sha256", GATE_SECRET).update(ts).digest("hex").slice(0, 32);
  return `${ts}.${sig}`;
}

function validGate(cookieHeader) {
  const match = /(?:^|;\s*)mfx_gate=([A-Za-z0-9.]+)/.exec(cookieHeader || "");
  if (!match) return false;
  const [ts, sig] = match[1].split(".");
  if (!/^\d{10}$/.test(ts || "") || !/^[a-f0-9]{32}$/.test(sig || "")) return false;
  const age = Math.floor(Date.now() / 1000) - Number(ts);
  if (age < -30 || age > 7200) return false;
  const expected = crypto.createHmac("sha256", GATE_SECRET).update(ts).digest("hex").slice(0, 32);
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}

function gateCookie() {
  const flags = ["Path=/", "HttpOnly", "SameSite=Strict", "Max-Age=7200"];
  if (IS_PROD) flags.push("Secure");
  return `mfx_gate=${mintGate()}; ${flags.join("; ")}`;
}

// ─────────────────────────────────────────────────────────────
// TMDB proxy — whitelist, param forwarding, server-side key
// ─────────────────────────────────────────────────────────────
const TMDB_ALLOWED = [
  /^\/3\/search\/multi$/,
  /^\/3\/movie\/\d+$/,
  /^\/3\/tv\/\d+$/,
  /^\/3\/trending\/(all|movie|tv)\/(day|week)$/,
  /^\/3\/movie\/(now_playing|popular|upcoming|top_rated)$/,
  /^\/3\/tv\/(popular|top_rated|on_the_air|airing_today)$/,
  /^\/3\/discover\/(movie|tv)$/,
  /^\/3\/genre\/(movie|tv)\/list$/
];

function proxyTmdb(req, res, url) {
  const fail = (code, msg) => {
    res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: msg }));
  };

  if (req.method !== "GET") return fail(405, "Method not allowed");

  // Browser-only: custom domain + Render URL allow-list, plus signed HttpOnly cookie.
  // The TMDB key never leaves this process — curl/Postman without a live page cookie fail.
  if (!originAllowed(req) || (IS_PROD && !validGate(req.headers.cookie))) {
    return fail(403, "Forbidden");
  }

  const rl = rateLimit(clientIp(req));
  if (!rl.ok) return fail(429, "Too many requests — slow down");

  if (!TMDB_API_KEY) {
    console.error("TMDB_API_KEY environment variable is not set");
    return fail(503, "Search backend unavailable");
  }

  const tmdbPath = url.searchParams.get("path") || "";
  if (!TMDB_ALLOWED.some(re => re.test(tmdbPath))) return fail(404, "Not found");

  const tmdbUrl = new URL("https://api.themoviedb.org" + tmdbPath);
  for (const [k, v] of url.searchParams) {
    if (k !== "path" && v.length <= 200) tmdbUrl.searchParams.set(k, v.slice(0, 200));
  }
  tmdbUrl.searchParams.set("api_key", TMDB_API_KEY); // server-side only

  const upstreamReq = https.get(tmdbUrl, { timeout: 10000, headers: { accept: "application/json" } }, (up) => {
    securityHeaders(res, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=120",
      "X-RateLimit-Remaining": String(rl.remaining)
    });
    res.writeHead(up.statusCode);
    up.pipe(res);
  });

  upstreamReq.on("timeout", () => upstreamReq.destroy());
  upstreamReq.on("error", () => fail(502, "Upstream error"));
}

// ─────────────────────────────────────────────────────────────
// Static file serving (traversal-safe)
// ─────────────────────────────────────────────────────────────
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".atom": "application/atom+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2"
};

const BLOCKED_FILES = [
  /^\./,
  /(^|\/)node_modules\//,
  /^server\.js$/,
  /^package(-lock)?\.json$/,
  /^render\.yaml$/,
  /^proxy\//,
  /\.env/,
  /^README\.md$/
];

function serveStatic(req, res, pathname) {
  let clean = decodeURIComponent(pathname);
  if (clean === "/" || clean === "") clean = "/index.html";

  const filePath = path.normalize(path.join(ROOT, clean));
  // Traversal guard: resolved path must stay inside the site root
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403); res.end("Forbidden"); return;
  }

  const rel = path.relative(ROOT, filePath).replace(/\\/g, "/");
  if (BLOCKED_FILES.some(re => re.test(rel))) {
    res.writeHead(404); res.end("Not found"); return;
  }

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      // SPA-ish fallback for unknown routes → home
      if (!path.extname(filePath)) {
        return serveFile(req, res, path.join(ROOT, "index.html"));
      }
      res.writeHead(404); res.end("Not found"); return;
    }
    serveFile(req, res, filePath);
  });
}

function xmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function catalogIds() {
  try {
    const src = fs.readFileSync(path.join(ROOT, "js", "data.js"), "utf8");
    const ids = [];
    const re = /"id"\s*:\s*"([a-z0-9-]+)"/gi;
    let match;
    while ((match = re.exec(src))) ids.push(match[1]);
    return [...new Set(ids)];
  } catch {
    return [];
  }
}

function sitemapUrls() {
  const urls = [
    `${SITE_URL}/`,
    `${SITE_URL}/movies.html`,
    `${SITE_URL}/tv.html`,
    `${SITE_URL}/anime.html`,
    `${SITE_URL}/privacy.html`,
    `${SITE_URL}/terms.html`
  ];
  for (const id of catalogIds()) {
    urls.push(`${SITE_URL}/watch.html?id=${encodeURIComponent(id)}`);
  }
  return urls;
}

function buildSitemapXml() {
  const lastmod = new Date().toISOString().slice(0, 10);
  const body = sitemapUrls().map((loc) => (
    `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
  )).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function buildSitemapTxt() {
  return sitemapUrls().join("\n") + "\n";
}

function catalogItems() {
  try {
    const src = fs.readFileSync(path.join(ROOT, "js", "data.js"), "utf8");
    const sandbox = {};
    vm.runInNewContext(src + "; this.items = MOVFLIX_DB;", sandbox);
    if (Array.isArray(sandbox.items)) return sandbox.items;
  } catch { /* fallback below */ }
  return catalogIds().map((id) => ({
    id,
    title: id.replace(/-/g, " "),
    overview: `Watch ${id.replace(/-/g, " ")} online free on MOVFLIX.`
  }));
}

function buildAtomXml() {
  const updatedIso = `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;
  const staticPages = [
    {
      id: "page-home",
      title: "IDMS – Discover Latest Movies, Popular Films & Entertainment",
      loc: `${SITE_URL}/`,
      summary: "IDMS is your destination for discovering movies and entertainment. Watch trending movies, popular series, and anime online free in HD on IDMS."
    },
    {
      id: "page-movies",
      title: "Movies — IDMS",
      loc: `${SITE_URL}/movies.html`,
      summary: "Browse and watch trending, popular, and top-rated movies free on IDMS."
    },
    {
      id: "page-tv",
      title: "TV Series — IDMS",
      loc: `${SITE_URL}/tv.html`,
      summary: "Explore top-rated and latest TV series streaming free on IDMS."
    },
    {
      id: "page-anime",
      title: "Anime — IDMS",
      loc: `${SITE_URL}/anime.html`,
      summary: "Stream popular and trending anime shows and movies on IDMS."
    },
    {
      id: "page-privacy",
      title: "Privacy Policy — IDMS",
      loc: `${SITE_URL}/privacy.html`,
      summary: "IDMS Privacy Policy — Learn how your data and privacy are handled."
    },
    {
      id: "page-terms",
      title: "Terms of Use — IDMS",
      loc: `${SITE_URL}/terms.html`,
      summary: "IDMS Terms of Use and service disclaimer."
    }
  ];

  const items = catalogItems();
  const mediaEntries = items.map((item) => ({
    id: `media-${item.id}`,
    title: `Watch ${item.title}${item.year ? ` (${item.year})` : ""} Online Free — IDMS`,
    loc: `${SITE_URL}/watch.html?id=${encodeURIComponent(item.id)}`,
    summary: item.overview || `Watch ${item.title} free in HD on IDMS.`
  }));

  const allEntries = [...staticPages, ...mediaEntries];

  const entriesXml = allEntries.map((e) => (
    `  <entry>\n` +
    `    <id>tag:idms.eu.cc,2026:${e.id}</id>\n` +
    `    <published>${updatedIso}</published>\n` +
    `    <updated>${updatedIso}</updated>\n` +
    `    <title type='text'>${xmlEscape(e.title)}</title>\n` +
    `    <summary type='html'>${xmlEscape(e.summary)}</summary>\n` +
    `    <link rel='alternate' type='text/html' href='${xmlEscape(e.loc)}' title='${xmlEscape(e.title)}'/>\n` +
    `    <author>\n` +
    `      <name>IDMS</name>\n` +
    `      <email>noreply@idms.eu.cc</email>\n` +
    `    </author>\n` +
    `  </entry>`
  )).join("\n");

  return (
    `<?xml version='1.0' encoding='UTF-8'?>\n` +
    `<feed xmlns='http://www.w3.org/2005/Atom' xmlns:openSearch='http://a9.com/-/spec/opensearchrss/1.0/' xmlns:blogger='http://schemas.google.com/blogger/2008' xmlns:georss='http://www.georss.org/georss' xmlns:gd='http://schemas.google.com/g/2005' xmlns:thr='http://purl.org/syndication/thread/1.0'>\n` +
    `  <id>tag:idms.eu.cc,2026:feed</id>\n` +
    `  <updated>${updatedIso}</updated>\n` +
    `  <title type='text'>IDMS – Discover Latest Movies, Popular Films &amp; Entertainment</title>\n` +
    `  <subtitle type='html'>IDMS is your destination for discovering movies and entertainment. Explore the latest movies, popular films, movie details, trailers, genres, and entertainment updates in one place. Enjoy a simple and user-friendly movie browsing experience.</subtitle>\n` +
    `  <link rel='http://schemas.google.com/g/2005#feed' type='application/atom+xml' href='${SITE_URL}/feeds/posts/default'/>\n` +
    `  <link rel='self' type='application/atom+xml' href='${SITE_URL}/atom.xml'/>\n` +
    `  <link rel='alternate' type='text/html' href='${SITE_URL}/'/>\n` +
    `  <author>\n` +
    `    <name>IDMS</name>\n` +
    `    <email>noreply@idms.eu.cc</email>\n` +
    `  </author>\n` +
    `  <generator version='7.00' uri='https://idms.eu.cc'>IDMS</generator>\n` +
    `  <openSearch:totalResults>${allEntries.length}</openSearch:totalResults>\n` +
    `  <openSearch:startIndex>1</openSearch:startIndex>\n` +
    `  <openSearch:itemsPerPage>500</openSearch:itemsPerPage>\n` +
    `${entriesXml}\n` +
    `</feed>\n`
  );
}

function sendCrawlerBody(req, res, contentType, body) {
  const buf = Buffer.from(body, "utf8");
  const hash = crypto.createHash("md5").update(buf).digest("hex");
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Length", String(buf.length));
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  res.setHeader("ETag", `"${hash}"`);
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  res.setHeader("Last-Modified", todayUtc.toUTCString());
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.writeHead(200);
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.end(buf);
}

function serveFile(req, res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  const isHtml = ext === ".html";
  securityHeaders(res, {
    "Content-Type": type,
    "Cache-Control": isHtml
      ? "public, max-age=0, must-revalidate"   // HTML always fresh (SEO + updates)
      : "public, max-age=86400"                 // assets cached 1 day
  });
  if (isHtml) res.setHeader("Set-Cookie", gateCookie());
  res.writeHead(200);
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(500);
      res.end("Server error");
    } else {
      res.destroy();
    }
  });
  stream.pipe(res);
}

// ─────────────────────────────────────────────────────────────
// HTTP entry
// ─────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  } catch (e) {
    res.writeHead(400); res.end("Bad request"); return;
  }

  if (url.pathname === "/api/tmdb") return proxyTmdb(req, res, url);
  if (url.pathname.startsWith("/api/")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" })); return;
  }
  if (url.pathname === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok"); return;
  }

  const normPath = url.pathname.replace(/\/+$/, "") || "/";

    // Googlebot issues HEAD then GET and does not follow sitemap redirects.
  if (
    normPath === "/sitemap.xml" ||
    normPath === "/sitemap_index.xml" ||
    normPath === "/sitemap-index.xml" ||
    normPath === "/mysite.xml" ||
    normPath === "/atom.xml" ||
    normPath === "/feeds/posts/default" ||
    normPath === "/feed.xml" ||
    normPath === "/rss.xml" ||
    normPath === "/sitemap.txt" ||
    normPath === "/robots.txt"
  ) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" });
      res.end();
      return;
    }
    if (
      normPath === "/sitemap.xml" ||
      normPath === "/sitemap_index.xml" ||
      normPath === "/sitemap-index.xml" ||
      normPath === "/mysite.xml"
    ) {
      return sendCrawlerBody(req, res, "application/xml; charset=utf-8", buildSitemapXml());
    }
    if (
      normPath === "/atom.xml" ||
      normPath === "/feeds/posts/default" ||
      normPath === "/feed.xml" ||
      normPath === "/rss.xml"
    ) {
      return sendCrawlerBody(req, res, "application/atom+xml; charset=utf-8", buildAtomXml());
    }
    if (normPath === "/sitemap.txt") {
      return sendCrawlerBody(req, res, "text/plain; charset=utf-8", buildSitemapTxt());
    }
    fs.readFile(path.join(ROOT, "robots.txt"), "utf8", (err, text) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      sendCrawlerBody(req, res, "text/plain; charset=utf-8", text);
    });
    return;
  }

  return serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`Movflix server running on port ${PORT} (${IS_PROD ? "production" : "dev"})`);
  console.log(`TMDB proxy: ${TMDB_API_KEY ? "ENABLED (key loaded from env)" : "DISABLED (set TMDB_API_KEY env var)"}`);
});
