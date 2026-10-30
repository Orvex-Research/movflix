/**
 * MOVFLIX — Catalog page auto-initializer (movies / tv / anime)
 * Detects the page by its grid element and wires up genre filter tabs.
 */
(function() {
  function init() {
    let gridId = null, source = null;
    if (document.getElementById("movieGrid")) { gridId = "movieGrid"; source = () => DB.movies(); }
    else if (document.getElementById("tvGrid")) { gridId = "tvGrid"; source = () => DB.tv(); }
    else if (document.getElementById("animeGrid")) { gridId = "animeGrid"; source = () => DB.anime(); }
    if (!gridId) return;

    Nav.init();
    const grid = document.getElementById(gridId);
    const render = (genre) => {
      grid.innerHTML = "";
      let items = source();
      if (genre !== "all") items = items.filter(m => (m.genres || []).includes(genre));
      if (items.length === 0) {
        grid.innerHTML = `<p style="color:#888;padding:40px 0;">No titles found for this genre.</p>`;
        return;
      }
      items.forEach(item => grid.appendChild(MFX.createCard(item)));
    };

    render("all");
    document.querySelectorAll(".filter-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-tab").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        render(btn.dataset.genre);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
