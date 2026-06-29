/* =============================================================
   The Vinyl Vault — Login page controller
   Wires AuthManager into login.html: Google sign-in + Admin form.
   ============================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const auth = new AuthManager();

  // Already signed in? Skip straight to the right place.
  if (auth.isAdmin()) { location.replace('admin.html'); return; }
  if (auth.isUser())  { location.replace('reviews.html'); return; }

  // Live announcement banner (admin-controlled, shown site-wide).
  new SiteSettings().mountBanner();

  /* ---- a) Google Identity Services ----
     The GIS library loads async, so window.google may not exist yet at
     DOMContentLoaded — wait for it before rendering the button. */
  const gmount = document.getElementById('google-btn');
  const gnote  = document.getElementById('google-note');
  const configured = GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('YOUR_');

  if (!configured) {
    if (gnote) gnote.hidden = false;            // no Client ID set yet
  } else {
    whenGoogleReady((ready) => {
      const ok = ready && auth.initGoogle(gmount, () => location.replace('reviews.html'));
      if (!ok && gnote) gnote.hidden = false;   // script blocked (e.g. file://)
    });
  }

  /* ---- b) Administrator credential form ---- */
  const form = document.getElementById('admin-form');
  const error = document.getElementById('admin-error');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    error.hidden = true;
    const username = form.elements['admin-user'].value.trim();
    const password = form.elements['admin-pass'].value;
    const res = auth.loginAdmin(username, password);
    if (res.ok) {
      location.replace('admin.html');
    } else {
      error.textContent = res.error;
      error.hidden = false;
    }
  });
});

// Resolve once the GIS library is available, or false after a timeout.
function whenGoogleReady(cb, timeoutMs = 4000) {
  if (window.google?.accounts?.id) return cb(true);
  const start = Date.now();
  const timer = setInterval(() => {
    if (window.google?.accounts?.id) { clearInterval(timer); cb(true); }
    else if (Date.now() - start > timeoutMs) { clearInterval(timer); cb(false); }
  }, 120);
}
