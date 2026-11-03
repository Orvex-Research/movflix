/**
 * MOVFLIX — Home page initialization
 * Automatic New Movies API Hero Slider
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

  // Hero data: initial fast render from local DB
  let heroList = DB.trending();
  let heroIdx = 0;
  let heroTimer = null;

  setHero(heroList[0]);

  function startHeroTimer() {
    if (heroTimer) clearInterval(heroTimer);
    heroTimer = setInterval(() => {
      if (!heroList || heroList.length === 0) return;
      heroIdx = (heroIdx + 1) % heroList.length;
      setHero(heroList[heroIdx]);
    }, 8000);
  }

  startHeroTimer();

  // Auto fetch latest new movies from TMDB API for the home slider
  if (typeof window.MFX_getNewMovies === "function") {
    window.MFX_getNewMovies().then(newMovies => {
      if (Array.isArray(newMovies) && newMovies.length > 0) {
        heroList = newMovies;
        heroIdx = 0;
        setHero(heroList[0]);
        startHeroTimer();
      }
    }).catch(err => {
      console.warn("Could not load API new movies for slider:", err);
    });
  }

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
});

function setHero(item) {
  if (!item) return;
  const section = document.getElementById("heroSection");
  if (!section) return;

  const heroBg = document.getElementById("heroBg");
  if (heroBg) heroBg.style.backgroundImage = `url('${MFX.safeCssUrl(item.backdrop)}')`;

  const heroTitle = document.getElementById("heroTitle");
  if (heroTitle) heroTitle.textContent = item.title;

  const heroMatch = document.getElementById("heroMatch");
  if (heroMatch) heroMatch.textContent = `${parseInt(item.match, 10) || 0}% Match`;

  const heroAge = document.getElementById("heroAge");
  if (heroAge) heroAge.textContent = item.age || "13+";

  const heroYear = document.getElementById("heroYear");
  if (heroYear) heroYear.textContent = item.year || new Date().getFullYear();

  const heroGenres = document.getElementById("heroGenres");
  if (heroGenres) heroGenres.textContent = (item.genres || []).join(" • ");

  const heroDesc = document.getElementById("heroDesc");
  if (heroDesc) heroDesc.textContent = item.overview || "";

  const heroMaturity = document.getElementById("heroMaturity");
  if (heroMaturity) heroMaturity.textContent = item.age || "13+";

  const heroBadgeType = document.getElementById("heroBadgeType");
  if (heroBadgeType) heroBadgeType.textContent = item.badge || (item.type === "tv" ? "SERIES" : "NEW RELEASE");

  section.classList.remove("loaded");
  requestAnimationFrame(() => section.classList.add("loaded"));

  const inList = Store.inList(item.id);
  const heroList = document.getElementById("heroList");
  if (heroList) {
    heroList.classList.toggle("active", inList);
    const iconPlus = heroList.querySelector(".icon-plus");
    const iconCheck = heroList.querySelector(".icon-check");
    if (iconPlus) iconPlus.style.display = inList ? "none" : "block";
    if (iconCheck) iconCheck.style.display = inList ? "block" : "none";

    heroList.onclick = () => {
      const added = Store.toggleList(item);
      heroList.classList.toggle("active", added);
      if (iconPlus) iconPlus.style.display = added ? "none" : "block";
      if (iconCheck) iconCheck.style.display = added ? "block" : "none";
    };
  }

  const heroPlay = document.getElementById("heroPlay");
  if (heroPlay) heroPlay.onclick = () => MFX.goWatch(item);

  const heroInfo = document.getElementById("heroInfo");
  if (heroInfo) heroInfo.onclick = () => MFX.openModal(item);
}
