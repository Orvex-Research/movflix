/**
 * MOVFLIX — Security Layer v5.0 (server-backed)
 * ============================================================
 * API KEY IS NOT IN THIS FILE — BY DESIGN.
 * All TMDB traffic goes through the same-origin proxy on our server
 * (server.js on Render.com), which holds the key in an environment
 * variable. The browser only ever sees its own /api/tmdb endpoint,
 * so no one can capture the key from the client — it never ships.
 *
 * Stream provider URL stays runtime-obfuscated (mild deterrent).
 */
(function(g) {
  // ─── 1. Stream provider — XOR-masked, assembled in memory ────────
  function _decode(masked) {
    let out = "";
    for (let i = 0; i < masked.length; i++) {
      out += String.fromCharCode(masked[i] ^ (0x5A + (i % 7)));
    }
    return out;
  }
  // "https://framextv.cc"
  const _sK = [50,47,40,45,45,101,79,117,61,46,60,51,58,24,46,45,114,62,61];
  let _streamBaseCache = null;
  function getStreamBase() {
    if (!_streamBaseCache) _streamBaseCache = _decode(_sK);
    return _streamBaseCache;
  }

  // ─── 2. TMDB transport — same-origin secure proxy ────────────────
  // No key here. No fallback key. The server owns the secret.
  g.MFX_tmdbFetch = async function(path, params) {
    const p = params instanceof URLSearchParams ? params : new URLSearchParams(params || {});
    const url = `/api/tmdb?path=${encodeURIComponent(path)}&${p.toString()}`;
    const res = await fetch(url, {
      method: "GET",
      credentials: "same-origin",
      referrerPolicy: "strict-origin-when-cross-origin",
      headers: { accept: "application/json" }
    });
    if (!res.ok) throw new Error(`Proxy ${res.status}`);
    return res.json();
  };

  // ─── 3. Build Safe Embed Stream URL ─────────────────────────────
  g.MFX_buildEmbed = function(tmdbId, type, season, episode, opts) {
    const id = Math.abs(parseInt(tmdbId, 10));
    if (!id || isNaN(id)) throw new Error("Invalid TMDB ID");

    const s = Math.max(1, parseInt(season, 10) || 1);
    const e = Math.max(1, parseInt(episode, 10) || 1);
    const isTv = type === "tv";

    const path = isTv ? `/${id}/${s}/${e}` : `/${id}`;
    const params = new URLSearchParams();
    params.set("autoplay", opts && String(opts.autoplay) === "0" ? "0" : "1");
    params.set("muted", opts && String(opts.muted) === "1" ? "1" : "0");
    params.set("controls", opts && String(opts.controls) === "0" ? "0" : "1");
    params.set("quality", "4k");
    const t = parseInt(opts && opts.t, 10);
    if (t > 5) params.set("t", Math.min(Math.floor(t), 86400));

    return `${getStreamBase()}/embed${path}?${params.toString()}`;
  };

  // ─── 4. Secure Remote TMDB Search & Catalog Integration ───────────
  const _searchCache = new Map();

  g.MFX_searchRemote = async function(query) {
    const q = (query || "").trim().slice(0, 120);
    if (!q) return [];
    const cacheKey = q.toLowerCase();
    if (_searchCache.has(cacheKey)) return _searchCache.get(cacheKey);

    try {
      const params = new URLSearchParams({
        query: q,
        include_adult: "false",
        page: "1"
      });
      const data = await g.MFX_tmdbFetch("/3/search/multi", params);
      if (!data.results) return [];

      const filtered = (data.results || [])
        .filter(r => (r.media_type === "movie" || r.media_type === "tv") && r.poster_path)
        .map(r => {
          const isTv = r.media_type === "tv";
          const title = String(r.title || r.name || "Untitled").slice(0, 300);
          const year = parseInt(String(r.release_date || r.first_air_date || "").slice(0, 4), 10) || new Date().getFullYear();
          return {
            id: `tmdb-${parseInt(r.id, 10) || 0}`,
            tmdbId: parseInt(r.id, 10) || 0,
            type: isTv ? "tv" : "movie",
            title: title,
            match: Math.min(99, Math.max(75, Math.floor((r.vote_average || 7.5) * 10))),
            age: r.adult ? "18+" : "13+",
            year: year,
            seasons: isTv ? 1 : null,
            totalEpisodes: isTv ? 12 : null,
            genres: ["Popular"],
            duration: isTv ? null : "2h",
            cast: "Global Stars",
            overview: String(r.overview || "").slice(0, 2000) || `Watch ${title} in 4K Ultra HD on Movflix.`,
            poster: `https://image.tmdb.org/t/p/w500${encodeURIComponent(String(r.poster_path).slice(0, 100))}`,
            backdrop: r.backdrop_path
              ? `https://image.tmdb.org/t/p/original${encodeURIComponent(String(r.backdrop_path).slice(0, 100))}`
              : `https://image.tmdb.org/t/p/w500${encodeURIComponent(String(r.poster_path).slice(0, 100))}`,
            tags: isTv ? ["tv"] : ["movie"]
          };
        });

      _searchCache.set(cacheKey, filtered);
      return filtered;
    } catch(err) {
      console.warn("Remote search fetch notice:", err);
      return [];
    }
  };

  // ─── 5. Fetch Remote Media Details (for dynamic watch pages) ──────
  g.MFX_getMediaDetails = async function(tmdbId, type = "movie") {
    try {
      const isTv = type === "tv";
      const endpoint = isTv ? "tv" : "movie";
      const id = parseInt(tmdbId, 10);
      if (!id || isNaN(id)) return null;

      const data = await g.MFX_tmdbFetch(`/3/${endpoint}/${id}`, { append_to_response: "credits" });
      if (!data || !data.id) return null;

      const title = String(data.title || data.name || `Title #${id}`).slice(0, 300);
      const year = parseInt(String(data.release_date || data.first_air_date || "").slice(0, 4), 10) || new Date().getFullYear();
      const castNames = data.credits && data.credits.cast
        ? data.credits.cast.slice(0, 5).map(c => String(c.name || "")).filter(Boolean).join(", ")
        : "Featured Cast";
      const genreNames = data.genres ? data.genres.map(x => String(x.name || "").slice(0, 60)) : ["Streaming"];

      const rawRating = data.vote_average ? Number(data.vote_average).toFixed(1) : "8.5";
      const castList = data.credits && data.credits.cast ? data.credits.cast.slice(0, 18).map(c => ({
        name: String(c.name || "").slice(0, 120),
        character: String(c.character || "Actor").slice(0, 120),
        photo: c.profile_path ? `https://image.tmdb.org/t/p/w185${encodeURIComponent(String(c.profile_path).slice(0, 100))}` : null
      })) : [];

      const runtimeMin = parseInt(data.runtime, 10) || (data.episode_run_time ? parseInt(data.episode_run_time[0], 10) : 0) || 145;
      const formattedDur = isTv
        ? (data.number_of_seasons ? `${data.number_of_seasons} Season${data.number_of_seasons > 1 ? "s" : ""}` : "1 Season")
        : `${Math.floor(runtimeMin/60)}h ${runtimeMin%60}m`;

      return {
        id: `tmdb-${parseInt(data.id, 10) || 0}`,
        tmdbId: parseInt(data.id, 10) || 0,
        type: isTv ? "tv" : "movie",
        title: title,
        rating: rawRating,
        votes: parseInt(data.vote_count, 10) || 134,
        match: Math.min(99, Math.max(80, Math.floor((data.vote_average || 8) * 10))),
        age: data.adult ? "18+" : "PG-13",
        year: year,
        seasons: isTv ? (parseInt(data.number_of_seasons, 10) || 1) : null,
        totalEpisodes: isTv ? (parseInt(data.number_of_episodes, 10) || 10) : null,
        genres: genreNames,
        duration: formattedDur,
        runtimeMinutes: runtimeMin,
        cast: castNames,
        castList: castList,
        overview: String(data.overview || "").slice(0, 2000) || `Watch ${title} online in 4K Ultra HD on Movflix.`,
        poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${encodeURIComponent(String(data.poster_path).slice(0, 100))}` : "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
        backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/original${encodeURIComponent(String(data.backdrop_path).slice(0, 100))}` : "https://image.tmdb.org/t/p/original/yDHYTfA3R0jFYba16jBB1jv82EU.jpg",
        tags: [isTv ? "tv" : "movie"]
      };
    } catch(err) {
      console.warn("Could not fetch remote media details:", err);
      return null;
    }
  };

  // ─── 6. Security Defenses: Context Menu & Shortcuts ───────────────
  document.addEventListener("contextmenu", e => {
    if (e.target.closest && e.target.closest("INPUT, TEXTAREA")) return;
    e.preventDefault();
  });

  document.addEventListener("keydown", function(e) {
    if (e.key === "F12") { e.preventDefault(); return; }
    if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) { e.preventDefault(); return; }
    if (e.ctrlKey && e.key === "U") { e.preventDefault(); return; }
    if (e.ctrlKey && e.key === "s") { e.preventDefault(); return; }
  });

})(window);
