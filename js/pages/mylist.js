/**
 * MOVFLIX — My List page
 */
document.addEventListener("DOMContentLoaded", () => {
  Nav.init();
  document.getElementById("hamburger")?.addEventListener("click", () => document.getElementById("mobileDrawer").classList.toggle("open"));
  renderList();
});

function renderList() {
  const list = Store.myList();
  const grid = document.getElementById("listGrid");
  const empty = document.getElementById("emptyState");
  grid.innerHTML = "";
  if (list.length === 0) {
    empty.style.display = "flex"; grid.style.display = "none";
  } else {
    empty.style.display = "none"; grid.style.display = "grid";
    list.forEach(item => {
      const dbItem = DB.byId(item.id) || item;
      const card = MFX.createCard(dbItem);
      // Remove from list on toggle
      card.querySelector(".card-btn-list").addEventListener("click", e => {
        e.stopPropagation();
        Store.toggleList(dbItem);
        renderList();
      });
      grid.appendChild(card);
    });
  }
}
