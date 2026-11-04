/**
 * MOVFLIX — Shared Utility Functions
 * Used across all pages: navbar, toast, storage, card creation, state.
 */

// ═══════════════════════════════════════════════════════
// SECURITY HELPERS (shared XSS-safe utilities)
// ═══════════════════════════════════════════════════════
const MFX_FALLBACK_POSTER = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80";
const MFX_IMG_ALLOWLIST = ["https://image.tmdb.org/", "https://images.unsplash.com/"];

/** Escape a string for safe interpolation into HTML text and attributes. */
function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"'`]/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;"
  }[c]));
}

/** Allow-list check for remote image URLs — anything unrecognised gets the fallback poster. */
function safeImg(url, fallback) {
  const s = String(url == null ? "" : url);
  if (s.startsWith("https://") && MFX_IMG_ALLOWLIST.some(host => s.startsWith(host))) return s;
  return fallback || MFX_FALLBACK_POSTER;
}

/** Allow-listed URL made safe for interpolation inside a CSS url('...') value. */
function safeCssUrl(url) {
  return safeImg(url).replace(/[^a-zA-Z0-9%\-._~:/?#[\]@!$&()*+,;=]/g, "");
}

/** Clamp anything to a 0–100 number (progress bars). */
function safePercent(v) {
  const n = Number(v);
  if (!isFinite(n) || n < 0) return 0;
  return Math.min(100, Math.round(n));
}

// ═══════════════════════════════════════════════════════
// STORAGE (validated — localStorage is never trusted)
// ═══════════════════════════════════════════════════════
function mfxParseStore(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(x => x && typeof x === "object" && !Array.isArray(x))
      .slice(0, 100)
      .map(x => ({
        id: String(x.id == null ? "" : x.id).slice(0, 120),
        tmdbId: parseInt(x.tmdbId, 10) || 0,
        type: x.type === "tv" ? "tv" : "movie",
        title: String(x.title == null ? "" : x.title).slice(0, 300),
        poster: typeof x.poster === "string" ? x.poster.slice(0, 500) : "",
        backdrop: typeof x.backdrop === "string" ? x.backdrop.slice(0, 500) : "",
        match: parseInt(x.match, 10) || 0,
        age: String(x.age == null ? "" : x.age).slice(0, 10),
        year: parseInt(x.year, 10) || 0,
        seasons: parseInt(x.seasons, 10) || parseInt(x.season, 10) || 1,
        totalEpisodes: parseInt(x.totalEpisodes, 10) || parseInt(x.episode, 10) || 1,
        genres: Array.isArray(x.genres) ? x.genres.slice(0, 12).map(v => String(v == null ? "" : v).slice(0, 60)) : [],
        tags: Array.isArray(x.tags) ? x.tags.slice(0, 12).map(v => String(v == null ? "" : v).slice(0, 30)) : [],
        duration: typeof x.duration === "number"
          ? Math.max(0, Math.floor(x.duration))
          : (typeof x.duration === "string" ? x.duration.slice(0, 40) : null),
        cast: typeof x.cast === "string" ? x.cast.slice(0, 300) : "",
        overview: typeof x.overview === "string" ? x.overview.slice(0, 2000) : "",
        season: parseInt(x.season, 10) || 1,
        episode: parseInt(x.episode, 10) || 1,
        currentTime: Math.max(0, parseInt(x.currentTime, 10) || 0)
      }));
  } catch (e) {
    return [];
  }
}

const Store = {
  myList: () => mfxParseStore("mfx_list"),
  history: () => mfxParseStore("mfx_history"),
  saveList: (arr) => localStorage.setItem("mfx_list", JSON.stringify(arr)),
  saveHistory: (arr) => localStorage.setItem("mfx_history", JSON.stringify(arr)),

  inList: (id) => Store.myList().some(i => i.id === id),

  toggleList(item) {
    let list = Store.myList();
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      list.splice(idx, 1);
      MFX.toast(`Removed "${item.title}" from My List`);
    } else {
      list.unshift(item);
      MFX.toast(`Added "${item.title}" to My List`);
    }
    Store.saveList(list);
    MFX.updateListBadge();
    return idx < 0; // true = added
  },

  addHistory(item, season, episode, currentTime, duration) {
    let hist = Store.history();
    const idx = hist.findIndex(h => h.tmdbId === item.tmdbId);
    const rec = {
      id: item.id, tmdbId: item.tmdbId, type: item.type,
      title: item.title, poster: item.poster,
      season: season || 1, episode: episode || 1,
      currentTime: Math.floor(currentTime || 0),
      duration: Math.floor(duration || 0),
      ts: Date.now()
    };
    if (idx >= 0) hist.splice(idx, 1);
    hist.unshift(rec);
    if (hist.length > 30) hist.pop();
    Store.saveHistory(hist);
  }
};

// ═══════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════
const Nav = {
  init() {
    const navbar = document.getElementById("navbar");
    if (navbar) {
      window.addEventListener("scroll", () => {
        navbar.classList.toggle("scrolled", window.scrollY > 60);
      }, { passive: true });
    }
    const hamburger = document.getElementById("hamburger");
    const drawer = document.getElementById("mobileDrawer");
    if (hamburger && drawer && !hamburger.dataset.bound) {
      hamburger.dataset.bound = "1";
      hamburger.addEventListener("click", () => {
        const isOpen = drawer.classList.toggle("open");
        hamburger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });
    }
    Nav.markActive();
    MFX.updateListBadge();
    if ("serviceWorker" in navigator && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => {});
      });
    }
  },
  markActive() {
    const page = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll("[data-navpage]").forEach(el => {
      el.classList.toggle("active", el.dataset.navpage === page);
    });
  }
};

// ═══════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════
const MFX = {
  _toastTimer: null,
  toast(msg, type = "info") {
    let t = document.getElementById("mfx-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "mfx-toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = `mfx-toast show ${type}`;
    clearTimeout(MFX._toastTimer);
    MFX._toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
  },

  updateListBadge() {
    const b = document.getElementById("listBadge");
    if (b) b.textContent = Store.myList().length;
  },

  /**
   * Create a movie card element.
   * @param {object} item - media object from DB
   * @param {object} opts - { showProgress, progressPct, onClick }
   */
  createCard(item, opts = {}) {
    const card = document.createElement("div");
    card.className = "mfx-card";
    card.setAttribute("data-id", String(item.id == null ? "" : item.id).slice(0, 120));

    // Normalise + escape every dynamic value (item may originate from TMDB or localStorage)
    const inList = Store.inList(item.id);
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const title = String(item.title == null || item.title === "" ? "Untitled" : item.title).slice(0, 300);
    const poster = safeImg(item.poster);
    const tag = item.type === "tv" ? (tags.includes("anime") ? "ANIME" : "SERIES") : "MOVIE";
    const match = parseInt(item.match, 10) || 0;
    const age = String(item.age == null ? "13+" : item.age).slice(0, 10);
    const year = parseInt(item.year, 10) || new Date().getFullYear();

    let progressHtml = "";
    if (opts.showProgress && opts.progressPct != null) {
      progressHtml = `<div class="card-progress"><div class="card-progress-fill" style="width:${safePercent(opts.progressPct)}%"></div></div>`;
    }

    card.innerHTML = `
      <div class="card-inner">
        <img src="${escapeHtml(poster)}" alt="${escapeHtml(title)}" class="card-poster" loading="lazy">
        <span class="card-tag">${tag}</span>
        ${progressHtml}
        <div class="card-overlay">
          <div class="card-actions">
            <button class="card-btn-play btn-circle" aria-label="Play ${escapeHtml(title)}">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <button class="card-btn-list btn-circle-sm ${inList ? "in-list" : ""}" aria-label="Toggle My List">
              <svg class="icon-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <svg class="icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
            <button class="card-btn-info btn-circle-sm" aria-label="More info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </button>
          </div>
          <div class="card-meta">
            <span class="card-title"></span>
            <div class="card-submeta">
              <span class="match">${escapeHtml(match)}%</span>
              <span class="age-badge"></span>
              <span class="year">${escapeHtml(year)}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Text-only nodes for user-controlled strings (defence-in-depth over escaping)
    card.querySelector(".card-title").textContent = title;
    card.querySelector(".age-badge").textContent = age;

    // Play → Watch page
    card.querySelector(".card-btn-play").addEventListener("click", e => {
      e.stopPropagation();
      MFX.goWatch(item);
    });

    // List toggle
    card.querySelector(".card-btn-list").addEventListener("click", e => {
      e.stopPropagation();
      const added = Store.toggleList(item);
      card.querySelector(".card-btn-list").classList.toggle("in-list", added);
    });

    // Info → Watch / Details page directly
    card.querySelector(".card-btn-info").addEventListener("click", e => {
      e.stopPropagation();
      MFX.goWatch(item);
    });

    // Click card → Watch / Details page directly
    card.addEventListener("click", () => {
      MFX.goWatch(item);
    });

    return card;
  },

  goWatch(item, season = 1, episode = 1, resumeAt = 0) {
    const isTv = item.type === "tv";
    const p = new URLSearchParams({
      id: item.id || item.tmdbId,
      type: item.type || "movie"
    });
    if (isTv) {
      p.set("s", season);
      p.set("e", episode);
    }
    if (resumeAt > 5) {
      p.set("r", Math.floor(resumeAt));
    }
    window.location.href = `watch.html?${p.toString()}`;
  },

  /** Build a horizontal carousel section */
  buildRow(title, items, parent) {
    if (!items || items.length === 0) return;
    const sec = document.createElement("section");
    sec.className = "mfx-row";
    sec.innerHTML = `
      <div class="row-header">
        <h2 class="row-title">${title}</h2>
        <span class="row-explore">Explore All <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><polyline points="9 18 15 12 9 6"/></svg></span>
      </div>
      <div class="row-wrap">
        <button class="row-arrow left" aria-label="Previous">&#8249;</button>
        <div class="row-track" tabindex="0"></div>
        <button class="row-arrow right" aria-label="Next">&#8250;</button>
      </div>
    `;
    const track = sec.querySelector(".row-track");
    items.forEach(item => track.appendChild(MFX.createCard(item)));

    // Chevron scrolling
    sec.querySelector(".row-arrow.left").addEventListener("click", () => {
      track.scrollBy({ left: -Math.floor(track.clientWidth * 0.8), behavior: "smooth" });
    });
    sec.querySelector(".row-arrow.right").addEventListener("click", () => {
      track.scrollBy({ left: Math.floor(track.clientWidth * 0.8), behavior: "smooth" });
    });

    // Keyboard scroll
    track.addEventListener("keydown", e => {
      if (e.key === "ArrowLeft") track.scrollBy({ left: -250, behavior: "smooth" });
      if (e.key === "ArrowRight") track.scrollBy({ left: 250, behavior: "smooth" });
    });

    parent.appendChild(sec);
  },

  /** Details / Info Modal - Direct navigation to Movie Details page */
  openModal(item) {
    if (item) MFX.goWatch(item);
  }
};

// Expose security helpers for other modules (player.js, search.js, page scripts)
MFX.escapeHtml = escapeHtml;
MFX.safeImg = safeImg;
MFX.safeCssUrl = safeCssUrl;
MFX.safePercent = safePercent;
