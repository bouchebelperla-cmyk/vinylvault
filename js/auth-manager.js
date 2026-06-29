/* =============================================================
   The Vinyl Vault — AuthManager
   -------------------------------------------------------------
   Client-side authentication + session persistence. Two avenues:
     1. Google Identity Services (GIS) for normal users.
     2. A hardcoded Administrator credential form.

   There is no backend — sessions are mocked in window.localStorage
   under 'logged_in_user' / 'logged_in_admin' and read on every page.
   ES6 class only, no jQuery.
   ============================================================= */

/* 1) Google sign-in needs a Web OAuth Client ID. Create one at
      console.cloud.google.com → APIs & Services → Credentials →
      OAuth client ID (type: Web), and add your origin (e.g.
      http://localhost:5500) under "Authorized JavaScript origins".
      Paste it here. GIS also requires the page be served over
      http(s) — the Admin login below works on file:// too. */
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

/* 2) Hardcoded administrator credentials (per project spec). */
const ADMIN_USERNAME = 'Admin';
const ADMIN_PASSWORD = 'Admin123';

class AuthManager {
  constructor() {
    this.USER_KEY = 'logged_in_user';
    this.ADMIN_KEY = 'logged_in_admin';
  }

  /* ---------- Session state ---------- */
  read(key) {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
  }
  getSession() {
    const admin = this.read(this.ADMIN_KEY);
    if (admin) return { ...admin, type: 'admin' };
    const user = this.read(this.USER_KEY);
    if (user) return { ...user, type: 'user' };
    return null;
  }
  isAdmin()    { return !!this.read(this.ADMIN_KEY); }
  isUser()     { return !!this.read(this.USER_KEY); }
  isLoggedIn() { return this.isAdmin() || this.isUser(); }

  logout() {
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.ADMIN_KEY);
    // Stop GIS from silently re-selecting the same account next time.
    if (window.google?.accounts?.id) google.accounts.id.disableAutoSelect();
  }

  /* ---------- Administrator credential login ---------- */
  loginAdmin(username, password) {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      localStorage.setItem(this.ADMIN_KEY, JSON.stringify({
        name: 'Admin', role: 'admin', loginAt: Date.now(),
      }));
      return { ok: true };
    }
    return { ok: false, error: 'Incorrect administrator username or password.' };
  }

  /* ---------- Google Identity Services ---------- */
  // Renders the official Google button into `mountEl`. Returns false (so the
  // page can show a hint) when GIS isn't loaded or no Client ID is configured.
  initGoogle(mountEl, onLogin) {
    if (!window.google?.accounts?.id) return false;
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith('YOUR_')) return false;

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        const profile = this.decodeJwt(response.credential);
        if (!profile) return;
        const user = {
          name: profile.name || profile.email || 'Listener',
          email: profile.email || '',
          picture: profile.picture || '',
          role: 'user',
          loginAt: Date.now(),
        };
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        onLogin(user);
      },
    });
    google.accounts.id.renderButton(mountEl, {
      theme: 'filled_black', size: 'large', shape: 'pill',
      text: 'signin_with', logo_alignment: 'left', width: 280,
    });
    return true;
  }

  // Decode a GIS ID-token (JWT) payload client-side, for display only.
  decodeJwt(token) {
    try {
      let b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      b64 += '='.repeat((4 - (b64.length % 4)) % 4);
      const json = decodeURIComponent(
        atob(b64).split('').map((c) =>
          '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
      );
      return JSON.parse(json);
    } catch { return null; }
  }

  /* ---------- Route guards (call at the top of a protected page) ---------- */
  requireUser(redirect = 'login.html') {
    const s = this.getSession();
    if (!s) { location.replace(redirect); return null; }
    return s;
  }
  requireAdmin(redirect = 'login.html') {
    if (!this.isAdmin()) { location.replace(redirect); return null; }
    return this.getSession();
  }

  /* ---------- Wire any [data-signout] control on the page ---------- */
  bindSignOut(redirect = 'login.html') {
    document.querySelectorAll('[data-signout]').forEach((el) =>
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
        location.replace(redirect);
      }));
  }
}

window.AuthManager = AuthManager;
