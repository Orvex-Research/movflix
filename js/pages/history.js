/**
 * MOVFLIX — Watch History page
 */
document.addEventListener("DOMContentLoaded", () => {
  Nav.init();
  document.getElementById("hamburger")?.addEventListener("click", () => document.getElementById("mobileDrawer").classList.toggle("open"));
  renderHistory();
  document.getElementById("clearHistBtn").addEventListener("click", () => {
    if (confirm("Clear all watch history?")) {
      localStorage.removeItem("mfx_history");
      renderHistory();
      MFX.toast("Watch history cleared");
    }
  });
});

function renderHistory() {
  const hist  = Store.history();
  const grid  = document.getElementById("histGrid");
  const empty = document.getElementById("emptyState");
  grid.innerHTML = "";
  if (hist.length === 0) {
    empty.style.display = "flex"; grid.style.display = "none"; return;
  }
  empty.style.display = "none"; grid.style.display = "grid";
  hist.forEach(h => {
    const item = DB.byId(h.id) || {
      id: h.id, tmdbId: h.tmdbId, type: h.type, title: h.title,
      match: 95, age: "13+", year: new Date().getFullYear(),
      seasons: 1, totalEpisodes: 10, genres: h.genres || [], tags: h.tags || [], cast: h.cast || "",
      overview: h.overview || "", poster: h.poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80",
      backdrop: h.poster || ""
    };
    const pct = h.duration > 0 ? Math.min(100, (h.currentTime / h.duration) * 100) : 30;
    const card = MFX.createCard(item, { showProgress: true, progressPct: pct });
    card.classList.add("has-progress");
    // Override play to resume
    card.querySelector(".card-btn-play").addEventListener("click", e => {
      e.stopPropagation();
      MFX.goWatch(item, h.season || 1, h.episode || 1, h.currentTime || 0);
    });
    card.addEventListener("click", () => {
      MFX.goWatch(item, h.season || 1, h.episode || 1, h.currentTime || 0);
    });
    // Show "S1 E3" sub text
    const d = document.createElement("div");
    d.style.cssText = "position:absolute;bottom:36px;left:10px;font-size:0.73rem;color:#ccc;font-weight:600;z-index:3;display:none;";
    if (item.type === "tv") d.textContent = `S${h.season || 1} E${h.episode || 1}`;
    card.querySelector(".card-inner").appendChild(d);
    card.addEventListener("mouseenter", () => { d.style.display = "block"; });
    card.addEventListener("mouseleave", () => { d.style.display = "none"; });
    grid.appendChild(card);
  });
}
