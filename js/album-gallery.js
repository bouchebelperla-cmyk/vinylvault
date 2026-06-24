/* =============================================================
   The Vinyl Vault — AlbumGallery
   Renders the curated collection into a responsive grid of cards.
   Each card has hand-drawn CSS sleeve art (driven by the album's
   accent colour) and a vinyl disc that slides out on hover.

   ES6 class only — builds nodes with textContent (no innerHTML)
   so album titles can never inject markup.
   ============================================================= */
class AlbumGallery {
  /**
   * @param {string} containerSelector  where cards are rendered
   * @param {Array}  albums             the dataset to render
   */
  constructor(containerSelector, albums) {
    this.container = document.querySelector(containerSelector);
    this.albums = Array.isArray(albums) ? albums : [];
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
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const gallery = new AlbumGallery('#album-grid', window.VAULT_ALBUMS || []);
  gallery.render();

  // Reflect the real collection size + distinct genre count in the hero
  // stats, computed from the data so the numbers can never drift.
  const albums = window.VAULT_ALBUMS || [];
  const countEl = document.getElementById('collection-count');
  if (countEl) countEl.textContent = albums.length;

  const genreEl = document.getElementById('genre-count');
  if (genreEl) genreEl.textContent = new Set(albums.map((a) => a.genre)).size;
});
