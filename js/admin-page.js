/* =============================================================
   The Vinyl Vault — Admin dashboard controller
   Admin-only. Moderate reviews (read / reply / delete) and manage
   site chrome (announcement banner + Album of the Week).
   ============================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const auth = new AuthManager();
  if (!auth.requireAdmin()) return;             // non-admins are redirected
  auth.bindSignOut();

  const settings = new SiteSettings();
  const banner = settings.mountBanner();

  /* ---------- Review moderation ---------- */
  const engine = new ReviewEngine();
  const listEl = document.getElementById('admin-review-list');
  const countEl = document.getElementById('review-count');
  const draw = () => {
    engine.render(listEl, { canReply: true, canDelete: true, onChange: draw });
    if (countEl) countEl.textContent = engine.all().length;
  };
  draw();

  /* ---------- Announcement banner control ---------- */
  const annForm = document.getElementById('announce-form');
  const annInput = document.getElementById('announce-input');
  const annStatus = document.getElementById('announce-status');
  annInput.value = settings.announcement;
  annForm.addEventListener('submit', (e) => {
    e.preventDefault();
    settings.setAnnouncement(annInput.value);
    settings.paintBanner(banner);
    flash(annStatus, 'Banner updated — live across the site.');
  });
  document.getElementById('announce-clear').addEventListener('click', () => {
    settings.setAnnouncement('');
    annInput.value = '';
    settings.paintBanner(banner);
    flash(annStatus, 'Banner cleared.');
  });

  /* ---------- Album of the Week control ---------- */
  const select = document.getElementById('aotw-select');
  const toggle = document.getElementById('aotw-toggle');
  const preview = document.getElementById('aotw-preview');
  const albums = window.VAULT_ALBUMS || [];

  albums.forEach((a) => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = `${a.title} — ${a.artist}`;
    select.appendChild(opt);
  });

  const current = settings.albumOfWeek;
  select.value = current.albumId || (albums[0] ? albums[0].id : '');
  toggle.checked = current.enabled;

  const syncAotw = () => {
    settings.setAlbumOfWeek(select.value, toggle.checked);
    settings.renderSpotlight(preview);
  };
  select.addEventListener('change', syncAotw);
  toggle.addEventListener('change', syncAotw);
  settings.renderSpotlight(preview);
});

// Briefly show a status message, then fade it out.
function flash(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.hidden = true; }, 2400);
}
