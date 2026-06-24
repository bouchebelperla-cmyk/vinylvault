/* =============================================================
   The Vinyl Vault — AlbumDiscovery
   -------------------------------------------------------------
   Live album discovery powered by the Last.fm API (a free,
   key-based public API). One ES6 class owns everything:
     - genre FILTER chips (tag.gettopalbums)
     - album SEARCH, debounced (album.search)
     - "Load more" PAGINATION
     - loading (skeletons), error (with retry), and empty states

   SETUP: paste your free Last.fm API key below. Get one at
   https://www.last.fm/api/account/create
   ============================================================= */

const API_KEY = '9d3a11d2c8cf1b846ad1ef136a21de0e'; // <-- replace with your key

class AlbumDiscovery {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.endpoint = 'https://ws.audioscrobbler.com/2.0/';
    this.limit = 18; // results per page

    // DOM references
    this.resultsEl = document.getElementById('discover-results');
    this.statusEl  = document.getElementById('discover-status');
    this.filtersEl = document.getElementById('discover-filters');
    this.searchForm = document.getElementById('discover-search');
    this.searchInput = document.getElementById('discover-query');
    this.moreBtn = document.getElementById('discover-more');

    // Genre chips (label -> Last.fm tag)
    this.genres = [
      { label: 'Rock', tag: 'rock' },
      { label: 'Pop', tag: 'pop' },
      { label: 'Jazz', tag: 'jazz' },
      { label: 'Hip-Hop', tag: 'hip-hop' },
      { label: 'Electronic', tag: 'electronic' },
      { label: 'Soul', tag: 'soul' },
      { label: 'Metal', tag: 'metal' },
      { label: 'Folk', tag: 'folk' },
    ];

    // Query state
    this.mode = 'tag';        // 'tag' (filter) or 'search'
    this.tag = 'rock';        // active genre
    this.query = '';          // active search term
    this.page = 1;
    this.debounceId = null;
  }

  init() {
    this.renderChips();
    this.bindEvents();
    this.load();              // initial load: top albums for the default genre
  }

  /* ---------- Setup ---------- */
  renderChips() {
    this.genres.forEach((g, i) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'discover-chip';
      chip.textContent = g.label;
      chip.dataset.tag = g.tag;
      chip.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      this.filtersEl.appendChild(chip);
    });
  }

  bindEvents() {
    // Genre filtering
    this.filtersEl.addEventListener('click', (e) => {
      const chip = e.target.closest('.discover-chip');
      if (!chip) return;
      this.setActiveChip(chip);
      this.mode = 'tag';
      this.tag = chip.dataset.tag;
      this.query = '';
      this.searchInput.value = '';
      this.page = 1;
      this.load();
    });

    // Search — debounced so we don't fire a request on every keystroke.
    this.searchInput.addEventListener('input', () => {
      clearTimeout(this.debounceId);
      this.debounceId = setTimeout(() => this.onSearch(), 350);
    });
    // Pressing Enter shouldn't reload the page.
    this.searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearTimeout(this.debounceId);
      this.onSearch();
    });

    // Pagination
    this.moreBtn.addEventListener('click', () => {
      this.page += 1;
      this.load(true); // append
    });
  }

  onSearch() {
    const term = this.searchInput.value.trim();
    this.page = 1;
    if (term === '') {
      // Empty search falls back to the active genre filter.
      this.mode = 'tag';
      this.query = '';
      this.load();
      return;
    }
    this.mode = 'search';
    this.query = term;
    this.clearActiveChips();
    this.load();
  }

  setActiveChip(activeChip) {
    this.filtersEl.querySelectorAll('.discover-chip').forEach((c) => {
      c.setAttribute('aria-pressed', c === activeChip ? 'true' : 'false');
    });
  }
  clearActiveChips() {
    this.filtersEl.querySelectorAll('.discover-chip')
      .forEach((c) => c.setAttribute('aria-pressed', 'false'));
  }

  /* ---------- Data ---------- */
  buildUrl() {
    const params = new URLSearchParams({
      api_key: this.apiKey,
      format: 'json',
      limit: String(this.limit),
      page: String(this.page),
    });
    if (this.mode === 'search') {
      params.set('method', 'album.search');
      params.set('album', this.query);
    } else {
      params.set('method', 'tag.gettopalbums');
      params.set('tag', this.tag);
    }
    return `${this.endpoint}?${params.toString()}`;
  }

  // Normalise the two different response shapes into a single list of
  // { title, artist, image } objects.
  parse(data) {
    if (this.mode === 'search') {
      const matches = data?.results?.albummatches?.album || [];
      return matches.map((a) => ({
        title: a.name,
        artist: typeof a.artist === 'string' ? a.artist : a.artist?.name || 'Unknown',
        image: this.pickCover(a.image),
      }));
    }
    const albums = data?.albums?.album || [];
    return albums.map((a) => ({
      title: a.name,
      artist: a.artist?.name || 'Unknown',
      image: this.pickCover(a.image),
    }));
  }

  // Choose the best real cover; Last.fm serves a known star placeholder
  // for art it doesn't have, so we reject that and fall back to CSS art.
  pickCover(images) {
    if (!Array.isArray(images)) return null;
    const placeholder = '2a96cbd8b46e442fc41c2b86b821562f';
    for (const size of ['extralarge', 'large', 'medium']) {
      const found = images.find((i) => i.size === size && i['#text']);
      if (found && !found['#text'].includes(placeholder)) return found['#text'];
    }
    return null;
  }

  async load(append = false) {
    // Guard: no key configured yet.
    if (!this.apiKey || this.apiKey === 'YOUR_LASTFM_API_KEY') {
      this.showError(
        'Add your Last.fm API key',
        'Discover needs a free Last.fm API key. Create one and paste it into the API_KEY constant in js/discover.js.',
        false
      );
      return;
    }

    if (!append) this.showLoading();
    else { this.moreBtn.disabled = true; this.moreBtn.textContent = 'Loading…'; }

    try {
      const res = await fetch(this.buildUrl());
      if (!res.ok) throw new Error(`Network error (${res.status})`);
      const data = await res.json();

      // Last.fm reports API-level problems inside a 200 response.
      if (data.error) throw new Error(data.message || 'The music service returned an error.');

      const albums = this.parse(data);

      if (!append && albums.length === 0) {
        this.showEmpty();
        return;
      }

      this.renderResults(albums, append);
      this.clearStatus();
      // If we got a full page, assume there may be more.
      this.toggleMore(albums.length === this.limit);
    } catch (err) {
      if (append) {
        // A failed "load more" shouldn't wipe existing results.
        this.moreBtn.disabled = false;
        this.moreBtn.textContent = 'Load more';
        this.page -= 1;
      } else {
        this.showError('Something went wrong', err.message, true);
      }
    }
  }

  /* ---------- Rendering ---------- */
  renderResults(albums, append) {
    if (!append) this.resultsEl.textContent = '';
    const fragment = document.createDocumentFragment();
    albums.forEach((album) => fragment.appendChild(this.createCard(album)));
    this.resultsEl.appendChild(fragment);
  }

  createCard(album) {
    const card = document.createElement('article');
    card.className = 'result-card';

    const cover = document.createElement('div');
    cover.className = 'result-cover';

    if (album.image) {
      const img = document.createElement('img');
      img.src = album.image;
      img.alt = `${album.title} cover art`;
      img.loading = 'lazy';
      cover.appendChild(img);
    } else {
      // CSS fallback sleeve; hue derived from the title for variety.
      cover.classList.add('result-cover--fallback');
      cover.style.setProperty('--hue', String(this.hueFromString(album.title)));
      const label = document.createElement('span');
      label.textContent = album.title;
      cover.appendChild(label);
    }

    const title = document.createElement('h3');
    title.className = 'result-title';
    title.textContent = album.title;
    title.title = album.title;

    const artist = document.createElement('p');
    artist.className = 'result-artist';
    artist.textContent = album.artist;

    card.append(cover, title, artist);
    return card;
  }

  hueFromString(str = '') {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash) % 360;
  }

  /* ---------- States ---------- */
  showLoading() {
    this.clearStatus();
    this.toggleMore(false);
    this.resultsEl.textContent = '';
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < this.limit; i++) {
      const card = document.createElement('div');
      card.className = 'skeleton-card';
      card.setAttribute('aria-hidden', 'true');
      card.innerHTML =
        '<div class="skeleton-box skeleton-cover"></div>' +
        '<div class="skeleton-box skeleton-line"></div>' +
        '<div class="skeleton-box skeleton-line short"></div>';
      fragment.appendChild(card);
    }
    this.resultsEl.appendChild(fragment);
  }

  showEmpty() {
    this.resultsEl.textContent = '';
    this.toggleMore(false);
    this.statusEl.innerHTML = `
      <div class="status-card">
        <div class="status-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/></svg>
        </div>
        <h2 class="status-title">No albums found</h2>
        <p class="status-text">Nothing matched that search. Try another album title or pick a genre.</p>
      </div>`;
  }

  showError(title, message, retryable) {
    this.resultsEl.textContent = '';
    this.toggleMore(false);
    this.statusEl.innerHTML = `
      <div class="status-card">
        <div class="status-icon is-error" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/></svg>
        </div>
        <h2 class="status-title">${title}</h2>
        <p class="status-text">${message}</p>
      </div>`;
    if (retryable) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vault-btn vault-btn--ghost';
      btn.textContent = 'Try again';
      btn.addEventListener('click', () => this.load());
      this.statusEl.querySelector('.status-card').appendChild(btn);
    }
  }

  clearStatus() { this.statusEl.innerHTML = ''; }

  toggleMore(show) {
    this.moreBtn.hidden = !show;
    this.moreBtn.disabled = false;
    this.moreBtn.textContent = 'Load more';
  }
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const discovery = new AlbumDiscovery(API_KEY);
  discovery.init();
});
