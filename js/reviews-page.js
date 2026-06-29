/* =============================================================
   The Vinyl Vault — Reviews page controller
   Signed-in users: read all reviews + post their own (no reply/delete).
   Admins are bounced to their dashboard.
   ============================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const auth = new AuthManager();
  const session = auth.requireUser();           // anon → login.html
  if (!session) return;
  if (session.type === 'admin') { location.replace('admin.html'); return; }

  // Identity + sign-out.
  const who = document.getElementById('who-label');
  if (who) who.textContent = session.name;
  const avatar = document.getElementById('who-avatar');
  if (avatar && session.picture) { avatar.src = session.picture; avatar.hidden = false; }
  auth.bindSignOut();

  // Live chrome: announcement banner + Album of the Week spotlight.
  const settings = new SiteSettings();
  settings.mountBanner();
  settings.renderSpotlight(document.getElementById('aotw'));

  // Review list — read-only capabilities for normal users.
  const engine = new ReviewEngine();
  const listEl = document.getElementById('review-list');
  const draw = () => engine.render(listEl, { canReply: false, canDelete: false });
  draw();

  // New-review form with the interactive star widget.
  let rating = 0;
  const ratingErr = document.getElementById('rating-error');
  const stars = new StarRating(document.getElementById('star-input'), {
    onChange: (v) => { rating = v; if (ratingErr) ratingErr.hidden = true; },
  });

  const form = document.getElementById('review-form');
  const text = document.getElementById('review-text');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (rating === 0) { if (ratingErr) ratingErr.hidden = false; return; }
    if (!text.value.trim()) { text.focus(); return; }
    engine.add({ author: session.name, authorType: 'user', rating, text: text.value });
    form.reset();
    stars.reset();
    rating = 0;
    draw();
    listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
