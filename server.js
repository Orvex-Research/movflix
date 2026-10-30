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

const ROOT = __dirname;
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
  /^\/3\/tv\/\d+$/
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
        return serveFile(res, path.join(ROOT, "index.html"));
      }
      res.writeHead(404); res.end("Not found"); return;
    }
    serveFile(res, filePath);
  });
}

function serveFile(res, filePath) {
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
  const stream = fs.createReadStream(filePath);
  stream.on("error", () => { res.writeHead(500); res.end("Server error"); });
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

  return serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`Movflix server running on port ${PORT} (${IS_PROD ? "production" : "dev"})`);
  console.log(`TMDB proxy: ${TMDB_API_KEY ? "ENABLED (key loaded from env)" : "DISABLED (set TMDB_API_KEY env var)"}`);
});
