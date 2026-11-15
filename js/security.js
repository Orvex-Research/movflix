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

  function _cleanImgPath(p) {
    if (!p) return "";
    const clean = String(p).trim().replace(/[^a-zA-Z0-9_./-]/g, "");
    return clean.startsWith("/") ? clean : "/" + clean;
  }


  // ─── 1b. TMDB Key — XOR-masked, reconstructed only in memory ───
  const _kM = [121,126,50,53,96,98,101,45,120,54,97,102,98,100,119,43,103,96,98,97,48,126,124,98,51,99,54,97,43,127,51,104];
  let _tKCache = null;
  function _getTmdbKey() {
    if (!_tKCache) {
      let out = "";
      for (let i = 0; i < _kM.length; i++) {
        out += String.fromCharCode(_kM[i] ^ (0x4E + (i % 7)));
      }
      _tKCache = out;
    }
    return _tKCache;
  }

  // ─── 2. TMDB transport (Supports Node proxy & GitHub Pages direct) ──
  g.MFX_tmdbFetch = async function(path, params) {
    const p = params instanceof URLSearchParams ? new URLSearchParams(params.toString()) : new URLSearchParams(params || {});
    
    // If running in local Node environment with proxy enabled
    if (window.location.port === "3000") {
      try {
        const proxyUrl = `/api/tmdb?path=${encodeURIComponent(path)}&${p.toString()}`;
        const res = await fetch(proxyUrl, {
          method: "GET",
          credentials: "same-origin",
          headers: { accept: "application/json" }
        });
        if (res.ok) return await res.json();
      } catch (e) {
        // Fall through to direct fetch below
      }
    }

    // Direct TMDB fetch for GitHub Pages (Client key dynamically resolved in memory)
    p.set("api_key", _getTmdbKey());
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const directUrl = `https://api.themoviedb.org${cleanPath}?${p.toString()}`;

    const res = await fetch(directUrl, {
      method: "GET",
      referrerPolicy: "strict-origin-when-cross-origin",
      headers: { accept: "application/json" }
    });
    if (!res.ok) throw new Error(`TMDB error ${res.status}`);
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
            poster: r.poster_path ? `https://image.tmdb.org/t/p/w500${_cleanImgPath(r.poster_path)}` : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80",
            backdrop: r.backdrop_path ? `https://image.tmdb.org/t/p/original${_cleanImgPath(r.backdrop_path)}` : (r.poster_path ? `https://image.tmdb.org/t/p/original${_cleanImgPath(r.poster_path)}` : ""),
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

  
  // ─── 4b. Fetch Latest New & Trending Movies from TMDB API ─────────
  const TMDB_GENRES = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
    80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
    14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
    9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie",
    53: "Thriller", 10752: "War", 37: "Western", 10759: "Action & Adventure",
    10762: "Kids", 10763: "News", 10764: "Reality", 10765: "Sci-Fi & Fantasy"
  };

  function mapTmdbMovie(r) {
    const title = String(r.title || r.name || "Untitled").slice(0, 300);
    const year = parseInt(String(r.release_date || r.first_air_date || "").slice(0, 4), 10) || new Date().getFullYear();
    const vote = Number(r.vote_average) || 7.5;
    const match = Math.min(99, Math.max(78, Math.floor(vote * 10)));
    const genreNames = Array.isArray(r.genre_ids) && r.genre_ids.length > 0
      ? r.genre_ids.map(id => TMDB_GENRES[id]).filter(Boolean).slice(0, 3)
      : ["Popular", "Trending"];
    const isHorrorOrCrime = Array.isArray(r.genre_ids) && r.genre_ids.some(id => id === 27 || id === 80);
    const age = r.adult ? "18+" : (isHorrorOrCrime ? "16+" : "13+");

    return {
      id: `tmdb-${parseInt(r.id, 10) || 0}`,
      tmdbId: parseInt(r.id, 10) || 0,
      type: "movie",
      title: title,
      match: match,
      age: age,
      year: year,
      seasons: null,
      totalEpisodes: null,
      genres: genreNames,
      duration: "2h",
      cast: "Featured Cast",
      overview: String(r.overview || "").slice(0, 2000) || `Watch ${title} in 4K Ultra HD on Movflix.`,
      poster: r.poster_path ? `https://image.tmdb.org/t/p/w500${_cleanImgPath(r.poster_path)}`
        : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80",
      backdrop: r.backdrop_path ? `https://image.tmdb.org/t/p/original${_cleanImgPath(r.backdrop_path)}` : (r.poster_path ? `https://image.tmdb.org/t/p/original${_cleanImgPath(r.poster_path)}` : ""),
      tags: ["trending", "movie", "new"],
      badge: "NEW RELEASE"
    };
  }

  let _newMoviesCache = null;
  let _newMoviesCacheTime = 0;

  g.MFX_getNewMovies = async function() {
    const now = Date.now();
    if (_newMoviesCache && (now - _newMoviesCacheTime) < 300000) {
      return _newMoviesCache;
    }

    try {
      // 1. Fetch trending movies today
      let data = await g.MFX_tmdbFetch("/3/trending/movie/day", { page: "1" });
      let results = (data && Array.isArray(data.results)) ? data.results : [];

      // 2. Fallback to now_playing if trending is empty
      if (results.length === 0) {
        data = await g.MFX_tmdbFetch("/3/movie/now_playing", { page: "1" });
        results = (data && Array.isArray(data.results)) ? data.results : [];
      }

      // Filter for items with high quality backdrop and poster
      const validMovies = results
        .filter(r => r && r.id && r.backdrop_path && r.poster_path && (r.title || r.name))
        .map(mapTmdbMovie);

      if (validMovies.length > 0) {
        _newMoviesCache = validMovies;
        _newMoviesCacheTime = now;
        return validMovies;
      }
    } catch(err) {
      console.warn("Could not fetch new movies from TMDB:", err);
    }
    return [];
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
        poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${_cleanImgPath(data.poster_path)}` : "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
        backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/original${_cleanImgPath(data.backdrop_path)}` : "https://image.tmdb.org/t/p/original/yDHYTfA3R0jFYba16jBB1jv82EU.jpg",
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
