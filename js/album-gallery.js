/* =============================================================
   The Vinyl Vault — AlbumGallery
   Renders the curated collection into a responsive grid of cards.
   Each card has hand-drawn CSS sleeve art (driven by the album's
   accent colour) and a vinyl disc that slides out on hover.

   ES6 class only — builds nodes with textContent (no innerHTML)
   so album titles can never inject markup.

   Cover art is then fetched live from Last.fm (the same free key the
   Discover page uses) and fades in over each sleeve. If a cover can't be
   found — or the network is down — the hand-drawn sleeve simply stays.
   ============================================================= */

// Shared with js/discover.js. Get a free key at last.fm/api/account/create.
const LASTFM_API_KEY = '9d3a11d2c8cf1b846ad1ef136a21de0e';

class AlbumGallery {
  /**
   * @param {string} containerSelector  where cards are rendered
   * @param {Array}  albums             the dataset to render
   */
  constructor(containerSelector, albums) {
    this.container = document.querySelector(containerSelector);
    this.albums = Array.isArray(albums) ? albums : [];
    // id -> { art, sleeve } so loaded covers can find their card later.
    this.cardsById = new Map();
  }

  // Build one card element for a single album record.
  createCard(album) {
    const card = document.createElement('article');
    card.className = 'album-card';
    card.tabIndex = 0; // keyboard focusable so the hover/lift is reachable
    card.setAttribute('aria-label', `${album.title} by ${album.artist}, ${album.year}, ${album.genre}`);

    // ---- Art: a coloured sleeve with a vinyl disc peeking behind it ----
    const art = document.createElement('div');
    art.className = 'album-art';
    art.style.setProperty('--card-accent', album.accent || 'var(--accent)');

    const disc = document.createElement('div');
    disc.className = 'album-disc';
    disc.setAttribute('aria-hidden', 'true');

    const sleeve = document.createElement('div');
    sleeve.className = 'album-sleeve';

    const genre = document.createElement('span');
    genre.className = 'album-sleeve__genre';
    genre.textContent = album.genre;

    const sleeveTitle = document.createElement('span');
    sleeveTitle.className = 'album-sleeve__title';
    sleeveTitle.textContent = album.title;

    sleeve.append(genre, sleeveTitle);
    art.append(disc, sleeve);

    // ---- Meta block beneath the art ----
    const meta = document.createElement('div');
    meta.className = 'album-meta';

    const name = document.createElement('h3');
    name.className = 'album-name';
    name.textContent = album.title;

    const artist = document.createElement('p');
    artist.className = 'album-artist';
    artist.textContent = `${album.artist} · ${album.year}`;

    const blurb = document.createElement('p');
    blurb.className = 'album-blurb';
    blurb.textContent = album.blurb;

    meta.append(name, artist, blurb);

    // ---- 3D tilt plane: art + meta ride on one inner element so the card
    //      can lean toward the cursor while its border/shadow stay flat ----
    const inner = document.createElement('div');
    inner.className = 'album-card__inner';
    inner.append(art, meta);
    card.append(inner);

    // Remember where this album's live cover should be dropped in.
    this.cardsById.set(album.id, { art, sleeve });
    return card;
  }

  // Render every album into the container in one batch (DocumentFragment
  // keeps it to a single reflow).
  render() {
    if (!this.container) return;
    const fragment = document.createDocumentFragment();
    this.albums.forEach((album) => fragment.appendChild(this.createCard(album)));
    this.container.textContent = '';
    this.container.appendChild(fragment);
  }

  /* ---------- Live cover art (Last.fm — progressive enhancement) ----------
     Cards are already on screen with their CSS sleeves; covers stream in and
     fade over them. Each request is independent so one failure never blocks
     the rest, and any failure just leaves the hand-drawn sleeve in place. */
  loadCovers() {
    if (!LASTFM_API_KEY) return;
    this.albums.forEach((album) => this.loadCover(album));
  }

  async loadCover(album) {
    try {
      const res = await fetch(this.coverUrl(album));
      if (!res.ok) return;
      const data = await res.json();
      const cover = this.pickCover(data?.album?.image);
      if (cover) this.applyCover(album.id, cover);
    } catch {
      /* offline or blocked — keep the CSS sleeve fallback */
    }
  }

  coverUrl(album) {
    const params = new URLSearchParams({
      method: 'album.getinfo',
      api_key: LASTFM_API_KEY,
      artist: album.artist,
      album: album.title,
      autocorrect: '1',           // tolerate small title/artist differences
      format: 'json',
    });
    return `https://ws.audioscrobbler.com/2.0/?${params.toString()}`;
  }

  // Last.fm serves a known star placeholder for art it doesn't have; reject it
  // and prefer the largest real image. (Mirrors the Discover page's logic.)
  pickCover(images) {
    if (!Array.isArray(images)) return null;
    const placeholder = '2a96cbd8b46e442fc41c2b86b821562f';
    for (const size of ['extralarge', 'large', 'medium']) {
      const found = images.find((i) => i.size === size && i['#text']);
      if (found && !found['#text'].includes(placeholder)) return found['#text'];
    }
    return null;
  }

  // Drop the cover into its sleeve; it fades in once decoded (load event),
  // and removes itself if the image 404s so the sleeve stays clean.
  applyCover(id, src) {
    const entry = this.cardsById.get(id);
    if (!entry) return;
    const img = document.createElement('img');
    img.className = 'album-sleeve__cover';
    img.alt = '';                 // decorative: title/artist are in the meta block
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('load', () => entry.art.classList.add('has-cover'));
    img.addEventListener('error', () => img.remove());
    img.src = src;
    entry.sleeve.appendChild(img);
  }
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const gallery = new AlbumGallery('#album-grid', window.VAULT_ALBUMS || []);
  gallery.render();
  gallery.loadCovers();

  // Reflect the real collection size + distinct genre count in the hero
  // stats, computed from the data so the numbers can never drift.
  const albums = window.VAULT_ALBUMS || [];
  const countEl = document.getElementById('collection-count');
  if (countEl) countEl.textContent = albums.length;

  const genreEl = document.getElementById('genre-count');
  if (genreEl) genreEl.textContent = new Set(albums.map((a) => a.genre)).size;
});
