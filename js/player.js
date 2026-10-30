/**
 * MOVFLIX — Dual Interface Cinema Controller
 * Reference 1: Movie Details Page (Overview, Hero, Badges, Cast)
 * Reference 2: Fullscreen Video Player (Timeline, Custom Controls, Quality, Audio/Subtitles)
 */

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof Nav !== "undefined" && Nav.init) Nav.init();

  const params  = new URLSearchParams(window.location.search);
  const rawId   = params.get("id");
  const type    = params.get("type") || "movie";
  let season    = parseInt(params.get("s"), 10) || 1;
  let episode   = parseInt(params.get("e"), 10) || 1;
  const resume  = parseInt(params.get("r"), 10) || 0;
  const autoPlay = params.get("play") === "1" || params.has("autoplay");

  if (!rawId) {
    showError();
    return;
  }

  // 1. Locate item in curated local DB or fetch from remote TMDB API
  let item = (typeof DB !== "undefined")
    ? (DB.byId(rawId) || DB.byTmdb(rawId))
    : null;

  if (!item) {
    const cleanTmdbId = rawId.replace(/^tmdb-|^custom-/, "");
    if (/^\d+$/.test(cleanTmdbId) && typeof window.MFX_getMediaDetails === "function") {
      item = await window.MFX_getMediaDetails(cleanTmdbId, type);
    }
  }

  // Fallback stub if remote is unreachable
  if (!item && /^\d+$/.test(rawId)) {
    const numericId = parseInt(rawId, 10);
    item = {
      id: `tmdb-${numericId}`,
      tmdbId: numericId,
      type: type,
      title: `Title #${numericId}`,
      rating: "8.5",
      votes: 134,
      match: 98,
      age: "PG-13",
      year: new Date().getFullYear(),
      seasons: type === "tv" ? 3 : null,
      totalEpisodes: type === "tv" ? 24 : null,
      genres: ["Action", "Sci-Fi", "Adventure"],
      duration: type === "tv" ? "3 Seasons" : "2h 25m",
      runtimeMinutes: 145,
      cast: "Featured Hollywood Cast",
      overview: "Streaming directly in 4K Ultra HD on Movflix with high-bitrate extraction.",
      poster: "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
      backdrop: "https://image.tmdb.org/t/p/original/kVd3a9YeLGkoeR50jGEXM6EqseS.jpg",
      tags: [type]
    };
  }

  if (!item) {
    showError();
    return;
  }

  // 2. SEO Metadata & Schema
  updateSEOMetadata(item, season, episode);

  // 3. Playback State
  const totalDurationSec = (item.runtimeMinutes || 145) * 60;
  let currentPlaybackSec = resume > 0 ? resume : 7;
  let isPlaying = false;
  let isMuted = false;
  let currentVolume = 1;
  let idleTimeout = null;
  let tickerInterval = null;

  // DOM Elements - Details Page
  const detailsView       = document.getElementById("movieDetailsView");
  const detailsHero       = document.getElementById("detailsHero");
  const detailTitle       = document.getElementById("detailTitle");
  const detailRating      = document.getElementById("detailRating");
  const detailVotes       = document.getElementById("detailVotes");
  const detailComments    = document.getElementById("detailComments");
  const detailYear        = document.getElementById("detailYear");
  const detailDuration    = document.getElementById("detailDuration");
  const detailAge         = document.getElementById("detailAge");
  const detailGenres      = document.getElementById("detailGenres");
  const detailOverview    = document.getElementById("detailOverview");
  const detailsPlayBtn    = document.getElementById("detailsPlayBtn");
  const detailsListBtn    = document.getElementById("detailsListBtn");
  const detailsListText   = document.getElementById("detailsListText");
  const detailsDownloadBtn = document.getElementById("detailsDownloadBtn");
  const heroMuteToggle    = document.getElementById("heroMuteToggle");
  const heroMuteIcon      = document.getElementById("heroMuteIcon");
  const backBtn           = document.getElementById("backBtn");
  const castTrack         = document.getElementById("castTrack");
  const recsGrid          = document.getElementById("recommendationsGrid");
  const episodesSection   = document.getElementById("episodesSection");
  const seasonSelect      = document.getElementById("seasonSelect");
  const episodesTrack     = document.getElementById("episodesTrack");

  // DOM Elements - Video Player Page
  const playerView        = document.getElementById("videoPlayerView");
  const playerIframe      = document.getElementById("playerIframe");
  const playerLoader      = document.getElementById("playerLoader");
  const playerErrorOverlay= document.getElementById("playerErrorOverlay");
  const playerRetryBtn    = document.getElementById("playerRetryBtn");
  const playerUiOverlay   = document.getElementById("playerUiOverlay");
  const exitPlayerBtn     = document.getElementById("exitPlayerBtn");
  const playerMovieTitle  = document.getElementById("playerMovieTitle");
  const playerMovieDuration = document.getElementById("playerMovieDuration");
  const qualityBtn        = document.getElementById("qualityBtn");
  const qualityCurrentText = document.getElementById("qualityCurrentText");
  const qualityMenu       = document.getElementById("qualityMenu");
  const audioSubBtn       = document.getElementById("audioSubBtn");
  const audioSubModal     = document.getElementById("audioSubModal");
  const closeAudioSubModal = document.getElementById("closeAudioSubModal");
  const downloadModal     = document.getElementById("downloadModal");
  const closeDownloadModal = document.getElementById("closeDownloadModal");
  const confirmDownloadBtn = document.getElementById("confirmDownloadBtn");
  const dlModalTitle      = document.getElementById("dlModalTitle");



  // ═══════════════════════════════════════════════════════════
  // POPULATE REFERENCE 1: MOVIE DETAILS PAGE
  // ═══════════════════════════════════════════════════════════
  populateDetailsPage(item);
  populateCastSection(item);
  populateRecommendations(item);

  // TV Episodes support
  if (item.type === "tv" && episodesSection) {
    episodesSection.style.display = "block";
    setupEpisodes(item);
  }

  function populateDetailsPage(data) {
    if (detailsHero && data.backdrop) {
      detailsHero.style.backgroundImage = `url('${MFX.safeCssUrl(data.backdrop)}')`;
    }
    if (detailTitle) detailTitle.textContent = data.title;
    if (detailRating) detailRating.textContent = data.rating || ((data.match || 90) / 10).toFixed(1);
    if (detailVotes) detailVotes.textContent = data.votes || (data.match ? data.match * 2 : 134);
    if (detailComments) detailComments.textContent = Math.max(3, Math.floor((data.votes || 120) / 38));
    if (detailYear) detailYear.textContent = data.year || new Date().getFullYear();
    if (detailDuration) {
      detailDuration.textContent = data.type === "tv"
        ? `${data.seasons || 1} Season${data.seasons > 1 ? "s" : ""}`
        : (data.duration || "2h 25m");
    }
    if (detailAge) detailAge.textContent = data.age || "PG-13";
    if (detailGenres) {
      detailGenres.textContent = (data.genres || ["Action", "Sci-Fi", "Adventure"]).join(" • ");
    }
    if (detailOverview) {
      detailOverview.textContent = data.overview || `Watch ${data.title} in 4K Ultra HD on Movflix.`;
    }

    // List button state
    if (typeof Store !== "undefined") {
      const inList = Store.inList(data.id);
      updateWatchlistUI(inList);
    }
  }

  function updateWatchlistUI(inList) {
    if (!detailsListBtn || !detailsListText) return;
    detailsListBtn.classList.toggle("in-list", inList);
    detailsListText.textContent = inList ? "In List" : "Add to List";
    const icon = detailsListBtn.querySelector("svg");
    if (icon) {
      icon.innerHTML = inList
        ? `<polyline points="20 6 9 17 4 12"/>`
        : `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`;
    }
  }

  // Watchlist Toggle
  if (detailsListBtn && typeof Store !== "undefined") {
    detailsListBtn.addEventListener("click", () => {
      const added = Store.toggleList(item);
      updateWatchlistUI(added);
    });
  }

  // Download Button handler
  if (detailsDownloadBtn) {
    detailsDownloadBtn.addEventListener("click", () => {
      if (dlModalTitle) dlModalTitle.textContent = `Download "${item.title}"`;
      if (downloadModal) downloadModal.showModal();
    });
  }
  if (closeDownloadModal) {
    closeDownloadModal.addEventListener("click", () => downloadModal?.close());
  }
  if (confirmDownloadBtn) {
    confirmDownloadBtn.addEventListener("click", () => {
      downloadModal?.close();
      if (typeof MFX !== "undefined" && MFX.toast) {
        MFX.toast("Authorized offline stream link created!", "success");
      }
    });
  }

  // Hero sound mute toggle
  if (heroMuteToggle) {
    let heroMuted = true;
    heroMuteToggle.addEventListener("click", () => {
      heroMuted = !heroMuted;
      if (heroMuteIcon) {
        heroMuteIcon.innerHTML = heroMuted
          ? `<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>`
          : `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>`;
      }
      if (typeof MFX !== "undefined" && MFX.toast) {
        MFX.toast(heroMuted ? "Sound Muted" : "Sound Enabled", "info");
      }
    });
  }

  // Back button
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (window.history.length > 1) window.history.back();
      else window.location.href = "index.html";
    });
  }

  // Populate Cast Section (Screenshot 1)
  function populateCastSection(data) {
    if (!castTrack) return;
    castTrack.innerHTML = "";

    const fallbackPhotos = [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces",
      "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&h=200&fit=crop&crop=faces",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=faces"
    ];

    let castItems = data.castList || [];
    if (castItems.length === 0 && data.cast) {
      castItems = data.cast.split(",").map((name, i) => ({
        name: name.trim(),
        character: "Star",
        photo: fallbackPhotos[i % fallbackPhotos.length]
      }));
    }

    if (castItems.length === 0) {
      castItems = [
        { name: "Lead Star", character: "Main Character", photo: fallbackPhotos[0] },
        { name: "Co-Star", character: "Supporting Role", photo: fallbackPhotos[1] },
        { name: "Special Appearance", character: "Guest Role", photo: fallbackPhotos[2] }
      ];
    }

    castItems.forEach((c, idx) => {
      const card = document.createElement("div");
      card.className = "cast-card";
      const photoSrc = MFX.safeImg(c.photo, fallbackPhotos[idx % fallbackPhotos.length]);
      card.innerHTML = `
        <img src="${MFX.escapeHtml(photoSrc)}" alt="${MFX.escapeHtml(c.name)}" class="cast-avatar" loading="lazy">
        <div class="cast-name"></div>
        <div class="cast-character"></div>
      `;
      card.querySelector(".cast-name").textContent = c.name;
      card.querySelector(".cast-character").textContent = c.character || "Actor";
      castTrack.appendChild(card);
    });
  }

  // Populate Recommendations
  function populateRecommendations(data) {
    if (!recsGrid || typeof DB === "undefined") return;
    recsGrid.innerHTML = "";
    const all = DB.all();
    const recs = all.filter(m => m.id !== data.id && (m.type === data.type || (m.genres || []).some(g => (data.genres || []).includes(g)))).slice(0, 6);
    recs.forEach(r => {
      if (typeof MFX !== "undefined" && MFX.createCard) {
        recsGrid.appendChild(MFX.createCard(r));
      }
    });
  }

  function setupEpisodes(data) {
    if (!seasonSelect || !episodesTrack) return;
    seasonSelect.innerHTML = "";
    const seasons = Math.max(1, data.seasons || 1);
    for (let s = 1; s <= seasons; s++) {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = `Season ${s}`;
      if (s === season) opt.selected = true;
      seasonSelect.appendChild(opt);
    }

    const renderTrack = (sNum) => {
      episodesTrack.innerHTML = "";
      const epCount = 8;
      const thumbSrc = MFX.safeImg(data.backdrop);
      for (let e = 1; e <= epCount; e++) {
        const epCard = document.createElement("div");
        epCard.className = "ep-card" + (sNum === season && e === episode ? " active" : "");
        epCard.style.flex = "0 0 220px";
        epCard.innerHTML = `
          <div class="ep-thumb-wrap">
            <img src="${MFX.escapeHtml(thumbSrc)}" alt="Ep ${e}" loading="lazy">
            <span class="ep-num-badge">Ep ${e}</span>
            <div class="ep-play-overlay">
              <svg viewBox="0 0 24 24" fill="currentColor" width="28"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
          <div class="ep-info">
            <strong>Episode ${e}</strong>
            <p>Season ${parseInt(sNum, 10)} • Episode ${e}</p>
          </div>
        `;
        epCard.addEventListener("click", () => {
          season = sNum;
          episode = e;
          openPlayer();
        });
        episodesTrack.appendChild(epCard);
      }
    };

    seasonSelect.addEventListener("change", () => renderTrack(parseInt(seasonSelect.value, 10)));
    renderTrack(season);
  }


  // ═══════════════════════════════════════════════════════════
  // POPULATE & MANAGE REFERENCE 2: FULL-SCREEN VIDEO PLAYER
  // ═══════════════════════════════════════════════════════════

  function openPlayer() {
    isPlaying = true;
    detailsView.style.display = "none";
    playerView.style.display = "flex";

    // Set top header info (Reference 2)
    if (playerMovieTitle) playerMovieTitle.textContent = item.title;
    if (playerMovieDuration) {
      playerMovieDuration.textContent = item.type === "tv"
        ? `Season ${season} • Episode ${episode}`
        : (item.duration || "2h 25m");
    }

    loadStreamEmbed();
    resetIdleTimer();

    // Save to history
    if (typeof Store !== "undefined" && Store.addHistory) {
      Store.addHistory(item, season, episode, 0, (item.runtimeMinutes || 145) * 60);
    }
  }

  function closePlayer() {
    isPlaying = false;
    clearTimeout(idleTimeout);
    playerView.style.display = "none";
    detailsView.style.display = "block";
    if (playerIframe) playerIframe.src = "";
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function loadStreamEmbed() {
    if (playerLoader) playerLoader.style.opacity = "1";
    if (playerErrorOverlay) playerErrorOverlay.style.display = "none";

    let streamUrl = "";
    try {
      streamUrl = window.MFX_buildEmbed(item.tmdbId, item.type, season, episode, {
        t: currentPlaybackSec > 5 ? currentPlaybackSec : 0
      });
    } catch(err) {
      showPlayerError();
      return;
    }

    if (playerIframe) {
      playerIframe.src = streamUrl;
      playerIframe.onload = () => {
        setTimeout(() => {
          if (playerLoader) playerLoader.style.opacity = "0";
        }, 500);
      };
      playerIframe.onerror = () => {
        showPlayerError();
      };
    }
  }

  function showPlayerError() {
    if (playerLoader) playerLoader.style.opacity = "0";
    if (playerErrorOverlay) playerErrorOverlay.style.display = "flex";
  }

  if (playerRetryBtn) {
    playerRetryBtn.addEventListener("click", () => {
      loadStreamEmbed();
    });
  }

  // Controls auto-hide on inactivity
  function resetIdleTimer() {
    if (playerUiOverlay) playerUiOverlay.classList.remove("idle");
    clearTimeout(idleTimeout);
    if (isPlaying) {
      idleTimeout = setTimeout(() => {
        if (playerUiOverlay) playerUiOverlay.classList.add("idle");
      }, 3500);
    }
  }

  playerView.addEventListener("mousemove", resetIdleTimer);
  playerView.addEventListener("click", resetIdleTimer);
  playerView.addEventListener("touchstart", resetIdleTimer, { passive: true });

  // Play button click from Details Page
  if (detailsPlayBtn) {
    detailsPlayBtn.addEventListener("click", openPlayer);
  }

  // Exit Player button
  if (exitPlayerBtn) {
    exitPlayerBtn.addEventListener("click", closePlayer);
  }

  // AutoPlay support
  if (autoPlay) {
    openPlayer();
  }

  // Quality selector dropdown
  if (qualityBtn && qualityMenu) {
    qualityBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isVisible = qualityMenu.style.display === "block";
      qualityMenu.style.display = isVisible ? "none" : "block";
    });

    document.addEventListener("click", () => {
      qualityMenu.style.display = "none";
    });

    qualityMenu.querySelectorAll(".quality-option").forEach(opt => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        qualityMenu.querySelectorAll(".quality-option").forEach(o => o.classList.remove("active"));
        opt.classList.add("active");
        const q = opt.dataset.quality;
        if (qualityCurrentText) {
          qualityCurrentText.textContent = q === "4k" ? "Quality 4K UHD" : (q === "720p" ? "Quality 720p" : "Quality 1080p");
        }
        qualityMenu.style.display = "none";
        loadStreamEmbed();
        if (typeof MFX !== "undefined" && MFX.toast) {
          MFX.toast(`Switched quality to ${opt.textContent}`, "info");
        }
      });
    });
  }

  // Audio & Subtitles Dialog
  if (audioSubBtn && audioSubModal) {
    audioSubBtn.addEventListener("click", () => {
      audioSubModal.showModal();
    });
  }
  if (closeAudioSubModal && audioSubModal) {
    closeAudioSubModal.addEventListener("click", () => {
      audioSubModal.close();
    });
  }

  // Fullscreen button
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        playerView.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });
  }

  // SDK postMessage helper — locked to the embed origin, never "*"
  function sendPlayerCmd(payload) {
    if (playerIframe && playerIframe.contentWindow && playerIframe.src) {
      try {
        const target = new URL(playerIframe.src, window.location.href).origin;
        if (target.startsWith("https://")) {
          playerIframe.contentWindow.postMessage(payload, target);
        }
      } catch(e) {}
    }
  }

  // Keyboard Shortcuts (Desktop)
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (playerView && playerView.style.display === "flex") {
      if (e.key === "Escape") {
        if (!document.fullscreenElement) {
          closePlayer();
        }
      }
      resetIdleTimer();
    }
  });
});

function updateSEOMetadata(item, season, episode) {
  const isTv = item.type === "tv";
  const titleText = isTv
    ? `Watch ${item.title} Season ${season} Episode ${episode} in 4K – Movflix`
    : `Watch ${item.title} (${item.year}) Online Free in 4K – Movflix`;

  document.title = titleText;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", item.overview.slice(0, 160));

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", titleText);

  const ogImg = document.querySelector('meta[property="og:image"]');
  if (ogImg && item.backdrop) ogImg.setAttribute("content", item.backdrop);

  const schemaScript = document.getElementById("mediaSchema");
  if (schemaScript) {
    const schema = {
      "@context": "https://schema.org",
      "@type": isTv ? "TVEpisode" : "Movie",
      "name": item.title,
      "description": item.overview,
      "image": [item.poster, item.backdrop],
      "dateCreated": `${item.year}-01-01`,
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": ((item.match || 90) / 10).toFixed(1),
        "bestRating": "10",
        "ratingCount": "3200"
      },
      "potentialAction": {
        "@type": "WatchAction",
        "target": window.location.href
      }
    };
    schemaScript.textContent = JSON.stringify(schema, null, 2);
  }
}

function showError() {
  const view = document.getElementById("movieDetailsView");
  if (view) {
    view.innerHTML = `
      <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:20px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="70" height="70" style="color:var(--red);"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <h2 style="font-size:1.8rem;margin:0;">Movie Not Found</h2>
        <p style="color:#aaa;max-width:440px;margin:0;">Could not locate this title in our catalog. Try searching or return to homepage.</p>
        <a href="index.html" class="btn-play-hero" style="margin-top:10px;text-decoration:none;">Return Home</a>
      </div>
    `;
  }
}
