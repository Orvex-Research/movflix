/**
 * MOVFLIX — Advanced Search Engine v3.0
 * Features:
 *  - Real-time dropdown instant suggestions on all pages
 *  - Dynamic non-reloading search page with live filtering
 *  - Remote TMDB search integration for millions of titles
 *  - Filter tabs: All, Movies, TV Shows, Anime
 *  - Direct numeric TMDB ID instant player launcher
 */

document.addEventListener("DOMContentLoaded", () => {
  if (typeof Nav !== "undefined" && Nav.init) Nav.init();
  if (typeof MFX !== "undefined" && MFX.updateListBadge) MFX.updateListBadge();

  // Setup navbar search on all pages
  initNavbarSearch();

  // Setup full search page if on search.html
  if (document.getElementById("searchResultsGrid")) {
    initSearchPageEngine();
  }
});

/**
 * Navbar Search with live dropdown suggestions
 */
function initNavbarSearch() {
  const wrap   = document.querySelector(".search-wrap");
  const box    = document.getElementById("searchBox");
  const toggle = document.getElementById("searchToggle");
  const input  = document.getElementById("searchInput");
  const clear  = document.getElementById("searchClear");

  if (!box || !toggle || !input) return;

  const isSearchPage = !!document.getElementById("searchResultsGrid");

  // Create or attach dropdown
  let dropdown = document.getElementById("searchDropdown");
  if (!dropdown && wrap && !isSearchPage) {
    dropdown = document.createElement("div");
    dropdown.id = "searchDropdown";
    dropdown.className = "search-dropdown";
    wrap.appendChild(dropdown);
  }

  // Toggle search box
  toggle.addEventListener("click", e => {
    e.stopPropagation();
    const open = box.classList.toggle("open");
    if (open) {
      input.focus();
    } else {
      input.value = "";
      if (clear) clear.style.display = "none";
      if (dropdown) dropdown.classList.remove("open");
    }
  });

  // Clear button
  if (clear) {
    clear.addEventListener("click", e => {
      e.stopPropagation();
      input.value = "";
      input.focus();
      clear.style.display = "none";
      if (dropdown) dropdown.classList.remove("open");
      if (isSearchPage && typeof window.onSearchInput === "function") {
        window.onSearchInput("");
      }
    });
  }

  // Close dropdown on outside click
  document.addEventListener("click", e => {
    if (!wrap.contains(e.target)) {
      if (dropdown) dropdown.classList.remove("open");
      if (!isSearchPage && !input.value.trim()) {
        box.classList.remove("open");
      }
    }
  });

  // Debounced input handler
  let debounceTimer;
  input.addEventListener("input", () => {
    const q = input.value.trim();
    if (clear) clear.style.display = q ? "flex" : "none";

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (isSearchPage) {
        if (typeof window.onSearchInput === "function") {
          window.onSearchInput(q);
        }
      } else {
        await renderDropdownSuggestions(q, dropdown);
      }
    }, 280);
  });

  // Enter key navigates to full search page
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const q = input.value.trim();
      if (q) {
        if (dropdown) dropdown.classList.remove("open");
        if (!isSearchPage) {
          window.location.href = `search.html?q=${encodeURIComponent(q)}`;
        }
      }
    }
  });
}

/**
 * Render quick suggestions in navbar dropdown
 */
async function renderDropdownSuggestions(q, dropdown) {
  if (!dropdown) return;
  if (!q || q.length < 2) {
    dropdown.classList.remove("open");
    dropdown.innerHTML = "";
    return;
  }

  // 1. Search local DB
  let matches = typeof DB !== "undefined" ? DB.search(q).slice(0, 5) : [];

  // 2. If fewer than 3 local matches, search remote TMDB
  if (matches.length < 3 && typeof window.MFX_searchRemote === "function") {
    try {
      const remote = await window.MFX_searchRemote(q);
      const existingIds = new Set(matches.map(m => m.tmdbId));
      for (const r of remote) {
        if (!existingIds.has(r.tmdbId)) {
          matches.push(r);
          existingIds.add(r.tmdbId);
        }
        if (matches.length >= 5) break;
      }
    } catch(e) {}
  }

  if (matches.length === 0) {
    dropdown.innerHTML = `
      <div class="search-dropdown-empty">
        No matches for "${escapeHtml(q)}"
      </div>
      <div class="search-dropdown-footer"></div>`;
    const emptyFooter = dropdown.querySelector(".search-dropdown-footer");
    emptyFooter.textContent = `Search global library for "${q}" →`;
    emptyFooter.addEventListener("click", () => {
      window.location.href = `search.html?q=${encodeURIComponent(q)}`;
    });
    dropdown.classList.add("open");
    return;
  }

  let html = `<div class="search-dropdown-list">`;
  matches.forEach(item => {
    const isTv = item.type === "tv";
    const typeLabel = isTv ? ((item.tags || []).includes("anime") ? "Anime" : "Series") : "Movie";
    const thumb = MFX.safeImg(item.poster);
    html += `
      <div class="search-dropdown-item" data-id="${escapeHtml(item.id)}" data-tmdb="${escapeHtml(item.tmdbId)}" data-type="${escapeHtml(item.type)}">
        <img src="${escapeHtml(thumb)}" alt="${escapeHtml(item.title)}" class="search-dropdown-thumb" loading="lazy">
        <div class="search-dropdown-info">
          <div class="search-dropdown-title">${escapeHtml(item.title)}</div>
          <div class="search-dropdown-meta">
            <span class="badge-type">${typeLabel}</span>
            <span>${escapeHtml(item.year || "")}</span>
            <span class="match" style="color:var(--green)">${escapeHtml(item.match)}%</span>
          </div>
        </div>
      </div>`;
  });
  html += `</div>`;
  html += `<div class="search-dropdown-footer"></div>`;

  dropdown.innerHTML = html;
  const footer = dropdown.querySelector(".search-dropdown-footer");
  footer.textContent = `View all results for "${q}" →`;
  footer.addEventListener("click", () => {
    window.location.href = `search.html?q=${encodeURIComponent(q)}`;
  });
  dropdown.classList.add("open");

  // Attach click listener to items
  dropdown.querySelectorAll(".search-dropdown-item").forEach(el => {
    el.addEventListener("click", () => {
      dropdown.classList.remove("open");
      const tmdbId = el.dataset.tmdb;
      const type = el.dataset.type;
      const localItem = typeof DB !== "undefined" ? DB.byTmdb(tmdbId) : null;
      if (localItem && typeof MFX !== "undefined" && MFX.goWatch) {
        MFX.goWatch(localItem);
      } else {
        window.location.href = `watch.html?type=${type}&id=${tmdbId}`;
      }
    });
  });
}

/**
 * Search Page Engine (search.html)
 */
function initSearchPageEngine() {
  const params    = new URLSearchParams(window.location.search);
  const initialQ  = params.get("q") || "";
  const titleEl   = document.getElementById("searchKeyword");
  const countEl   = document.getElementById("resultCount");
  const grid      = document.getElementById("searchResultsGrid");
  const noRes     = document.getElementById("noResults");
  const noResMsg  = document.getElementById("noResultsMsg");
  const input     = document.getElementById("searchInput");
  const box       = document.getElementById("searchBox");

  let currentTypeFilter = "all";
  let activeResults = [];

  if (box) box.classList.add("open");
  if (input) input.value = initialQ;

  // Filter tabs click handler
  document.querySelectorAll(".filter-tab[data-type]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-tab[data-type]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentTypeFilter = btn.dataset.type;
      applyFilterAndRender();
    });
  });

  // Execute search
  async function performSearch(q) {
    if (titleEl) titleEl.textContent = q || "All Titles";
    document.title = q ? `Watch "${q}" Online HD – Movflix Search` : "Search Movies & TV Shows – Movflix";

    if (!q) {
      // If empty query, show trending titles
      activeResults = typeof DB !== "undefined" ? DB.trending() : [];
      applyFilterAndRender();
      if (countEl) countEl.textContent = "Trending Titles";
      return;
    }

    // Direct numeric TMDB ID check
    if (/^\d+$/.test(q)) {
      grid.innerHTML = "";
      if (noRes) noRes.style.display = "none";
      const tmdbId = parseInt(q, 10);
      grid.appendChild(buildDirectStreamCard(tmdbId));
      if (countEl) countEl.textContent = `Direct TMDB Stream #${tmdbId}`;
      return;
    }

    // 1. Search local curated DB
    let localMatches = typeof DB !== "undefined" ? DB.search(q) : [];

    // 2. Fetch remote TMDB titles
    let combined = [...localMatches];
    const seenTmdb = new Set(localMatches.map(m => m.tmdbId));

    if (typeof window.MFX_searchRemote === "function") {
      try {
        const remote = await window.MFX_searchRemote(q);
        for (const item of remote) {
          if (!seenTmdb.has(item.tmdbId)) {
            combined.push(item);
            seenTmdb.add(item.tmdbId);
          }
        }
      } catch(err) {}
    }

    activeResults = combined;
    applyFilterAndRender();
  }

  function applyFilterAndRender() {
    grid.innerHTML = "";

    let filtered = activeResults;
    if (currentTypeFilter === "movie") {
      filtered = activeResults.filter(i => i.type === "movie");
    } else if (currentTypeFilter === "tv") {
      filtered = activeResults.filter(i => i.type === "tv" && !(i.tags || []).includes("anime"));
    } else if (currentTypeFilter === "anime") {
      filtered = activeResults.filter(i => (i.tags || []).includes("anime"));
    }

    if (countEl) {
      countEl.textContent = filtered.length > 0 ? `${filtered.length} titles available` : "0 results";
    }

    if (filtered.length === 0) {
      if (noRes) {
        noRes.style.display = "flex";
        if (noResMsg) noResMsg.textContent = `We couldn't find matches for "${input?.value || ''}". Try another title or enter a TMDB ID number.`;
      }
    } else {
      if (noRes) noRes.style.display = "none";
      filtered.forEach(item => {
        grid.appendChild(MFX.createCard(item));
      });
    }
  }

  // Hook for typing without page refresh
  window.onSearchInput = (newQ) => {
    const url = new URL(window.location);
    if (newQ) {
      url.searchParams.set("q", newQ);
    } else {
      url.searchParams.delete("q");
    }
    window.history.replaceState({}, "", url);
    performSearch(newQ);
  };

  // Run initial search
  performSearch(initialQ);
}

/**
 * Direct Stream Card for raw TMDB ID queries
 */
function buildDirectStreamCard(tmdbId) {
  const id = parseInt(tmdbId, 10);
  if (!id || isNaN(id)) return document.createDocumentFragment();
  const wrap = document.createElement("div");
  wrap.className = "direct-stream-card";
  wrap.innerHTML = `
    <div class="ds-icon">&#9889;</div>
    <h4>Stream TMDB #${id}</h4>
    <p>Watch any title directly via frameXTV high-bitrate stream extraction.</p>
    <div class="ds-actions" style="margin-top:14px;display:flex;gap:10px;justify-content:center;">
      <button class="btn-red ds-movie-btn" style="padding:10px 22px;">&#9654; Play Movie</button>
      <button class="btn-outline ds-tv-btn" style="padding:10px 22px;">&#9654; Play TV Show</button>
    </div>`;

  wrap.querySelector(".ds-movie-btn").addEventListener("click", () => {
    window.location.href = `watch.html?type=movie&id=${id}`;
  });
  wrap.querySelector(".ds-tv-btn").addEventListener("click", () => {
    window.location.href = `watch.html?type=tv&id=${id}&s=1&e=1`;
  });

  return wrap;
}
// escapeHtml is provided by js/app.js (stronger: escapes quotes + backticks too)
