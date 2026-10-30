/**
 * MOVFLIX — Home page initialization
 */
document.addEventListener("DOMContentLoaded", () => {
  Nav.init();

  // Mobile hamburger
  const ham = document.getElementById("hamburger");
  const drawer = document.getElementById("mobileDrawer");
  ham?.addEventListener("click", () => {
    const open = drawer.classList.toggle("open");
    ham.setAttribute("aria-expanded", open);
  });

  // Hero data
  const HERO_ITEM = DB.trending()[0];
  setHero(HERO_ITEM);

  // Render all home rows
  const container = document.getElementById("homeRows");
  MFX.buildRow("Trending Now & Top 10",   DB.trending(),                   container);
  MFX.buildRow("Blockbuster Movies",       DB.movies().slice(0, 10),        container);
  MFX.buildRow("Binge-Worthy TV Dramas",   DB.tv().slice(0, 10),            container);
  MFX.buildRow("Action & Shonen Anime",    DB.anime().slice(0, 10),         container);
  MFX.buildRow("Sci-Fi, Space & Fantasy",  DB.scifi().slice(0, 10),         container);

  // Continue Watching row (from history)
  const hist = Store.history();
  if (hist.length > 0) {
    const histItems = hist.slice(0, 8).map(h => {
      const found = DB.byId(h.id);
      if (found) return found;
      return { ...h, genres: h.genres || [], tags: h.tags || [], cast: h.cast || "", overview: h.overview || "", backdrop: h.poster };
    }).filter(Boolean);
    if (histItems.length > 0) {
      const sec = document.createElement("section");
      sec.className = "mfx-row";
      sec.innerHTML = `<div class="row-header"><h2 class="row-title">Continue Watching</h2></div><div class="row-wrap"><button class="row-arrow left">&#8249;</button><div class="row-track" id="contTrack" tabindex="0"></div><button class="row-arrow right">&#8250;</button></div>`;
      const track = sec.querySelector("#contTrack");
      hist.slice(0, 8).forEach(h => {
        const item = DB.byId(h.id) || h;
        const pct = h.duration > 0 ? (h.currentTime / h.duration) * 100 : 30;
        const card = MFX.createCard(item, { showProgress: true, progressPct: pct });
        card.classList.add("has-progress");
        track.appendChild(card);
      });
      sec.querySelector(".row-arrow.left").addEventListener("click", () => track.scrollBy({ left: -600, behavior:"smooth" }));
      sec.querySelector(".row-arrow.right").addEventListener("click", () => track.scrollBy({ left: 600, behavior:"smooth" }));
      container.prepend(sec);
    }
  }

  // Cycle hero every 10s
  let heroIdx = 0;
  const trendingList = DB.trending();
  setInterval(() => {
    heroIdx = (heroIdx + 1) % trendingList.length;
    setHero(trendingList[heroIdx]);
  }, 10000);
});

function setHero(item) {
  if (!item) return;
  const section = document.getElementById("heroSection");
  document.getElementById("heroBg").style.backgroundImage = `url('${MFX.safeCssUrl(item.backdrop)}')`;
  document.getElementById("heroTitle").textContent = item.title;
  document.getElementById("heroMatch").textContent = `${parseInt(item.match, 10) || 0}% Match`;
  document.getElementById("heroAge").textContent = item.age;
  document.getElementById("heroYear").textContent = item.year;
  document.getElementById("heroGenres").textContent = (item.genres || []).join(" • ");
  document.getElementById("heroDesc").textContent = item.overview;
  document.getElementById("heroMaturity").textContent = item.age;
  document.getElementById("heroBadgeType").textContent = item.type === "tv" ? "SERIES" : "MOVIE";
  section.classList.remove("loaded");
  requestAnimationFrame(() => section.classList.add("loaded"));

  const inList = Store.inList(item.id);
  const heroList = document.getElementById("heroList");
  heroList.classList.toggle("active", inList);
  heroList.querySelector(".icon-plus").style.display = inList ? "none" : "block";
  heroList.querySelector(".icon-check").style.display = inList ? "block" : "none";

  document.getElementById("heroPlay").onclick = () => MFX.goWatch(item);
  document.getElementById("heroInfo").onclick = () => MFX.openModal(item);
  document.getElementById("heroList").onclick = () => {
    const added = Store.toggleList(item);
    heroList.classList.toggle("active", added);
    heroList.querySelector(".icon-plus").style.display = added ? "none" : "block";
    heroList.querySelector(".icon-check").style.display = added ? "block" : "none";
  };
}
