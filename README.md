# Movflix — 4K Movie & TV Streaming Portal

Movflix is a high-performance streaming web application designed with a Netflix-grade visual interface, powered by the **frameXTV** high-speed stream engine and backed by **TMDB** metadata.

**Live site:** `https://idms.eu.cc/` (deployed on Render.com)

---

## 🚀 Quick Start (Local Run — with secure API proxy)

The project now ships with a zero-dependency Node server that serves the site **and**
proxies TMDB with the key kept server-side (exactly like production):

1. Open your terminal in the project directory:
   ```powershell
   cd "f:\my progect with Ai\movflix"
   ```
2. Set your TMDB key as an environment variable and start:
   ```powershell
   set TMDB_API_KEY=your_tmdb_key_here
   node server.js
   ```
3. Open in your browser:
   **[http://localhost:3000](http://localhost:3000)**

> Plain static preview (no remote search) still works with
> `python -m http.server 8080`.

---

## ▲ Deploy to Render.com (5 steps)

1. Push this folder to a GitHub repository.
2. On **[render.com](https://render.com)** → **New +** → **Web Service** → connect the repo.
3. Settings (auto-filled by `render.yaml` if you use Blueprint instead):
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free
4. In **Environment** tab add these (never commit them):
   - `TMDB_API_KEY` = your TMDB v3 key
   - `API_GATE_SECRET` = any long random string (signs the browser-only API cookie)
   - `SITE_URL` = `https://idms.eu.cc` (already in `render.yaml`)
5. Deploy → you get `https://movflix-xxxx.onrender.com`.

### Custom domain `idms.eu.cc`
Render dashboard → your service → **Settings** → **Custom Domains** →
Add `idms.eu.cc` (and `www.idms.eu.cc` if you want it) → Render shows you a
**CNAME record** → add it in your domain provider's DNS panel:
```
Type: CNAME   Name: @ (or blank/subdomain per your provider)   Value: xxxx.onrender.com
```
Wait for the certificate (Render issues free HTTPS automatically), then your site
lives at **https://idms.eu.cc**.

**Important:** the site's SEO tags (canonical, sitemap, OpenGraph) already point to
`https://idms.eu.cc/` — nothing else to change.

---

## 🔎 Google Search Console + First-Page SEO

### 1. Verify ownership (2 ways)
- **HTML tag method:** In [Google Search Console](https://search.google.com/search-console)
  add property `https://idms.eu.cc` → choose "HTML tag" verification → copy the
  `content` value Google shows → replace `YOUR_VERIFICATION_CODE_HERE` in `index.html`:
  ```html
  <meta name="google-site-verification" content="PASTE_GOOGLE_CODE_HERE">
  ```
  Commit + deploy, then click **Verify** in GSC.
- **DNS method (recommended for eu.cc):** In GSC choose "Domain" property type for
  `idms.eu.cc` and add the TXT record Google gives you into your DNS panel. This
  verifies all subdomains at once and survives hosting changes.

### 2. Submit the sitemap
GSC → **Sitemaps** → enter `sitemap.xml` → **Submit**.
The sitemap contains all core pages + every watch-page deep link with
`<image:image>` tags for Google Images / Discover.

### 3. What's already built in
- ✅ Canonical URLs on every indexable page → `https://idms.eu.cc`
- ✅ OpenGraph + Twitter cards (rich WhatsApp/Telegram/Facebook previews)
- ✅ Schema.org JSON-LD: `WebSite` + `SearchAction` (sitelinks searchbox),
  `Movie`/`TVEpisode` + `AggregateRating` rich snippets on watch pages
  (auto-generated per title at runtime)
- ✅ `robots.txt` pointing to the sitemap; private pages (`search/mylist/history`)
  correctly `noindex`
- ✅ PWA manifest + service worker (fast repeat visits → better Core Web Vitals)
- ✅ Mobile viewport, lazy-loaded images, compressed assets

### 4. Honest notes on "first page"
No one can *guarantee* first-page ranking — but these move you up fastest:
1. **Speed** (Render free tier cold-starts after idle — the PWA cache softens this;
   a paid plan removes cold starts entirely).
2. **Deep links shared widely** — each watch page is an SEO landing page; share
   them (WhatsApp/Telegram buttons are built in).
3. **Fresh content** — add new titles to `js/data.js`; Google re-crawls the updated
   sitemap.
4. **Backlinks** — a few real links from forums/socials beat any meta tag.

---

## 🌟 Google Search Console & SEO Optimization (Get Indexed Fast)

To get Movflix indexed on Google and attract massive organic traffic (**"Google Index & High Visitors"**):

### 1. Submit Sitemap to Google Search Console
1. Go to **[Google Search Console](https://search.google.com/search-console)**.
2. Add your domain (e.g., `https://movflix.xyz` or your custom domain).
3. Under **Sitemaps** in the left menu, enter `sitemap.xml` and click **Submit**.
4. Movflix's `sitemap.xml` includes all core pages + deep links to all movies, series, and anime with `<image:image>` tags for Google Images and Discover!

### 2. Verify Domain Ownership
In `index.html`, replace:
```html
<meta name="google-site-verification" content="YOUR_VERIFICATION_CODE_HERE">
```
with your actual verification token from Google Search Console.

### 3. SEO Features Built-In
- **Dynamic Schema.org Structured Data**: Automatically outputs `Movie`, `TVSeries`, and `VideoObject` rich snippets so Google displays ratings, runtime, and thumbnails in search results.
- **Search Engine Friendly `robots.txt`**: Fully allows crawling of `/`, `/movies.html`, `/tv.html`, `/anime.html`, and `/watch.html`.
- **OpenGraph & Twitter Cards**: Beautiful preview cards when shared on WhatsApp, Telegram, Facebook, and Twitter.
- **High-CTR Titles & Descriptions**: Targeted keywords for "Watch free online", "4K streaming", "Full Movie HD".

---

## 👥 Viral Social Sharing (Drive Massive Viewers)

Every watch page includes 1-click viral share buttons:
- **WhatsApp Share** (`api.whatsapp.com`)
- **Telegram Share** (`t.me/share`)
- **Facebook Share**
- **X (Twitter) Share**
- **Copy Link**: 1-click clipboard link with instant toast notification.

When users watch an episode or movie, they can share the exact stream link to group chats with one tap!

---

## 🛡️ Security Architecture (`js/security.js` + hardened CSP)

### Multi-layer defense
1. **Strict Content Security Policy (CSP)** — `script-src 'self'` only (no `'unsafe-inline'`
   for scripts), so **injected inline scripts cannot execute even if a hole is found**.
   Explicit allow-lists for `connect-src` (TMDB only), `frame-src` (stream host only),
   `img-src`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.
2. **XSS-safe rendering** — every dynamic value is HTML-escaped (`MFX.escapeHtml`) or set
   via `textContent`. All image URLs pass through a strict https allow-list
   (`image.tmdb.org`, `images.unsplash.com`) — `javascript:`/data URLs are rejected.
3. **localStorage hardening** — `mfx_list` / `mfx_history` are parsed with try/catch,
   type-validated and length-capped on every read; corrupted or poisoned storage can
   never inject markup or crash a page.
4. **Zero inline JS** — all page logic lives in external files, keeping the CSP effective.
5. **Server-side headers** — `_headers` (Netlify/Cloudflare Pages), `.htaccess` (Apache),
   `web.config` (IIS) add `frame-ancestors` (clickjacking protection), `nosniff`,
   `Referrer-Policy`, `Permissions-Policy` and HSTS on deploy.

### API key protection
The TMDB key lives **only** in Render’s `TMDB_API_KEY` env var. The browser talks to
same-origin `/api/tmdb`. Production also requires a signed HttpOnly cookie issued on
HTML pages, plus an origin allow-list for `https://idms.eu.cc`. Direct curl/Postman
cannot read the key because it never ships to the client.

Rotate any key that was previously committed or pasted into chat.

### Other defences
- **Embed URL builder**: numeric-only validation, capped params, origin-locked
  `postMessage` (no `*` targets).
- **Service Worker**: caches same-origin GETs only; cross-origin responses never enter
  the cache (no response poisoning).
- **DevTools/shortcut defences**: right-click restriction (except inputs), blocked
  `F12`/`Ctrl+Shift+I/J/C`/`Ctrl+U`/`Ctrl+S`.
- Iframe sandboxing with `referrerpolicy="no-referrer"` so your origin never leaks to
  the stream provider.

---

## 🔍 Advanced Search Engine (`js/search.js`)

- **Instant Autocomplete Dropdown**: Typing in the navbar on any page instantly shows the top 5 matching titles with poster thumbnail, release year, genre, and match score.
- **Live Search Page (`search.html`)**: Real-time filtering without page reloads; updates URL state via `history.replaceState`.
- **Millions of Titles via TMDB**: If a title isn't in the curated local list, Movflix dynamically queries TMDB through the secure bridge, rendering any movie or show in the world!
- **Direct TMDB ID Launcher**: Enter any raw number (e.g. `550`, `66732`) to launch instant stream playback.

---

## 🎬 Cinema Player & Multi-Server Engine (`js/player.js`)

- **Multi-Server Streaming**:
  - *Barbarian I*: Fast HLS multi-language stream.
  - *Archer II*: 4K Ultra HD & multi-audio.
  - *Goblin III*: Fast auto-mirror extraction.
  - *P.E.K.K.A IV*: Uncompressed 1080p high bitrate.
  - *Auto*: Intelligent automatic fallback.
- **SDK JavaScript Controls**: Rewind 10s, Play/Pause, Forward 10s, Speed selector (0.5x – 2.0x).
- **Cross-Browser Fullscreen**: Flawless on Mobile (iOS Safari & Android) and PC (Chrome, Edge, Firefox).
- **Episode Tracker**: Full season & episode navigation for TV shows and anime.
- **History & Progress**: Saves timestamps to `localStorage` and automatically prompts to resume.

---

## 📱 Progressive Web App (PWA)

- **`manifest.json`**: Standalone app capability; users on mobile can tap "Add to Home Screen" to install Movflix as a native app icon.
- **`sw.js` (Service Worker v3.0)**: Caches core pages, styling, and scripts for instant sub-second loading and offline resilience.

---

© 2026 Movflix Inc. Powered by frameXTV & TMDB.
