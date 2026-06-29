/* =============================================================
   The Vinyl Vault — SiteSettings
   -------------------------------------------------------------
   Global, admin-controlled chrome persisted in window.localStorage
   under 'vault.settings':
     • announcement  — the global banner string shown at the top of
                       the layout on every page that mounts it.
     • Album of the Week — an optional spotlight referencing one of
                       the curated records in js/data/albums.js.

   Changes reflect instantly on the current page and sync to other
   open tabs via the 'storage' event. ES6 class, no jQuery.
   ============================================================= */
class SiteSettings {
  constructor() {
    this.KEY = 'vault.settings';
  }

  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; }
    catch { return {}; }
  }
  save(patch) {
    const next = { ...this.get(), ...patch };
    localStorage.setItem(this.KEY, JSON.stringify(next));
    return next;
  }

  /* ---------- Announcement banner ---------- */
  get announcement() { return this.get().announcement || ''; }
  setAnnouncement(text) { return this.save({ announcement: String(text).trim() }); }

  // Prepend a live announcement strip to <body> (once). Safe to call on any
  // page; it hides itself while the string is empty.
  mountBanner() {
    let bar = document.getElementById('vault-announce');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'vault-announce';
      bar.className = 'vault-announce';
      bar.setAttribute('role', 'status');
      bar.setAttribute('aria-live', 'polite');
      document.body.prepend(bar);
    }
    this.paintBanner(bar);
    // Reflect changes made from another tab (e.g. the admin panel).
    window.addEventListener('storage', (e) => {
      if (e.key === this.KEY) this.paintBanner(bar);
    });
    return bar;
  }
  paintBanner(bar) {
    if (!bar) return;
    const text = this.announcement;
    bar.textContent = text;
    bar.classList.toggle('is-empty', !text);
  }

  /* ---------- Album of the Week ---------- */
  get albumOfWeek() {
    const s = this.get();
    return { enabled: !!s.aotwEnabled, albumId: s.aotwId || '' };
  }
  setAlbumOfWeek(albumId, enabled) {
    return this.save({ aotwId: albumId, aotwEnabled: !!enabled });
  }

  // Render the spotlight into `container` using window.VAULT_ALBUMS.
  renderSpotlight(container) {
    if (!container) return;
    const { enabled, albumId } = this.albumOfWeek;
    container.textContent = '';
    const albums = window.VAULT_ALBUMS || [];
    const album = albums.find((a) => a.id === albumId) || albums[0];

    if (!enabled || !album) { container.hidden = true; return; }
    container.hidden = false;

    const sleeve = document.createElement('div');
    sleeve.className = 'aotw__sleeve';
    sleeve.style.setProperty('--card-accent', album.accent || 'var(--accent)');
    const sleeveTitle = document.createElement('span');
    sleeveTitle.className = 'aotw__sleeve-title';
    sleeveTitle.textContent = album.title;
    sleeve.appendChild(sleeveTitle);

    const info = document.createElement('div');
    info.className = 'aotw__info';
    const tag = document.createElement('span');
    tag.className = 'aotw__tag';
    tag.textContent = '★ Album of the Week';
    const title = document.createElement('h3');
    title.className = 'aotw__title';
    title.textContent = album.title;
    const meta = document.createElement('p');
    meta.className = 'aotw__meta';
    meta.textContent = `${album.artist} · ${album.year} · ${album.genre}`;
    const blurb = document.createElement('p');
    blurb.className = 'aotw__blurb';
    blurb.textContent = album.blurb || '';
    info.append(tag, title, meta, blurb);

    container.append(sleeve, info);
  }
}

window.SiteSettings = SiteSettings;
