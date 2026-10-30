/**
 * MOVFLIX — TMDB Secure Proxy (Cloudflare Worker)
 * ============================================================
 * Keeps the TMDB API key SERVER-SIDE so it never ships to the
 * browser. Add rate limiting + origin allow-list so strangers
 * cannot abuse your key through this endpoint.
 *
 * ── Setup (5 minutes) ──────────────────────────────────────
 * 1. Install wrangler:  npm install -g wrangler   →   wrangler login
 * 2. In this folder run:  wrangler init tmdb-proxy   (choose "Worker only")
 *    then replace the generated worker file with this one.
 * 3. Store the key as a secret (never in code/git):
 *       wrangler secret put TMDB_API_KEY
 *    (use a FRESH key from themoviedb.org → Settings → API)
 * 4. Set your site origin(s) as another secret:
 *       wrangler secret put ALLOWED_ORIGINS
 *    → paste: https://idms.eu.cc,https://www.idms.eu.cc,http://localhost:3000
 * 5. (Optional but recommended) Protect against abuse with a rate limit.
 *    On the Cloudflare dashboard: Workers → tmdb-proxy →
 *    Settings → Rate Limiting → e.g. 30 requests / 10 seconds.
 * 6. Deploy:  wrangler deploy
 * 7. Copy the final URL (https://tmdb-proxy.<you>.workers.dev) into
 *    js/security.js →  MFX_CONFIG.proxyUrl = "https://...workers.dev";
 *
 * The browser then calls:  https://…/?path=/3/search/multi&query=dune
 * and only this worker knows the key.
 */

const ALLOWED_PATHS = [
  /^\/3\/search\/multi$/,
  /^\/3\/movie\/\d+$/,
  /^\/3\/tv\/\d+$/
];

// Hot catalog responses cache well at the edge and save your TMDB quota
const EDGE_CACHE_TTL = 300; // seconds

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── CORS: only respond to origins we allow ─────────────────
    const allowedOrigins = String(env.ALLOWED_ORIGINS || "")
      .split(",").map(s => s.trim()).filter(Boolean);
    const origin = request.headers.get("Origin") || "";
    const corsHeaders = {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff"
    };
    if (allowedOrigins.includes(origin)) {
      corsHeaders["Access-Control-Allow-Origin"] = origin;
      corsHeaders["Vary"] = "Origin";
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (!allowedOrigins.includes(origin)) {
      return new Response(JSON.stringify({ error: "Origin not allowed" }), {
        status: 403, headers: corsHeaders
      });
    }

    // ── Only whitelisted TMDB endpoints ────────────────────────
    const path = url.searchParams.get("path") || "";
    if (!ALLOWED_PATHS.some(re => re.test(path))) {
      return new Response(JSON.stringify({ error: "Path not allowed" }), {
        status: 404, headers: corsHeaders
      });
    }

    if (!env.TMDB_API_KEY) {
      return new Response(JSON.stringify({ error: "TMDB_API_KEY secret not set" }), {
        status: 500, headers: corsHeaders
      });
    }

    // ── Forward to TMDB (key injected server-side) ─────────────
    const tmdbUrl = new URL("https://api.themoviedb.org" + path);
    for (const [k, v] of url.searchParams) {
      if (k !== "path") tmdbUrl.searchParams.set(k, v);
    }
    tmdbUrl.searchParams.set("api_key", env.TMDB_API_KEY);

    const cacheKey = new Request(tmdbUrl.toString(), { method: "GET" });
    const cache = caches.default;
    let response = await cache.match(cacheKey);

    if (!response) {
      const upstream = await fetch(tmdbUrl.toString(), {
        method: "GET",
        headers: { "accept": "application/json" },
        cf: { cacheTtl: EDGE_CACHE_TTL, cacheEverything: true }
      });
      response = new Response(upstream.body, upstream);
      response.headers.set("Cache-Control", `public, max-age=${EDGE_CACHE_TTL}`);
      if (upstream.ok) {
        await cache.put(cacheKey, response.clone());
      }
    }

    const out = new Response(response.body, response);
    Object.entries(corsHeaders).forEach(([k, v]) => out.headers.set(k, v));
    return out;
  }
};
