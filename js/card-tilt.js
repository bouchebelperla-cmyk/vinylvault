/* =============================================================
   The Vinyl Vault — CardTilt
   Progressive enhancement for the homepage album cards: makes the
   pure-CSS 3D tilt FOLLOW the cursor instead of using a fixed lean.

   It is NOT a 3D library — it only reads the pointer position and
   writes four CSS custom properties (--tilt-x/--tilt-y for the
   rotation, --sheen-x/--sheen-y for the light). All the actual 3D
   work is hand-written CSS3 in css/home.css, so with this file
   removed the cards still tilt and slide on hover.

   ES6 class, event delegation on the grid (works regardless of when
   AlbumGallery renders the cards), and one rAF-batched write per
   frame so we never thrash layout.
   ============================================================= */
class CardTilt {
  /**
   * @param {string} containerSelector  grid that holds the cards
   * @param {object} [options]
   * @param {number} [options.maxTilt]   max rotation in degrees
   * @param {string} [options.cardSelector]
   */
  constructor(containerSelector, options = {}) {
    this.container = document.querySelector(containerSelector);
    this.maxTilt = options.maxTilt ?? 8;
    this.cardSelector = options.cardSelector ?? '.album-card';
    this.active = null;     // card currently under the pointer
    this.pending = null;    // latest pointer sample awaiting a frame
    this.frame = null;      // pending requestAnimationFrame id
  }

  // The tilt is meaningless without a fine hover pointer, and unwanted
  // by visitors who asked the OS to reduce motion — bail in both cases
  // so phones/tablets and reduced-motion users keep the flat layout.
  isEnabled() {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
           !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  init() {
    if (!this.container || !this.isEnabled()) return;
    this.container.addEventListener('pointermove', (e) => this.onMove(e));
    this.container.addEventListener('pointerleave', () => this.reset());
  }

  onMove(event) {
    const card = event.target.closest(this.cardSelector);
    if (!card) { this.reset(); return; }          // moved into the gap
    if (this.active && this.active !== card) this.clear(this.active);
    this.active = card;
    this.pending = { card, x: event.clientX, y: event.clientY };
    // Coalesce bursts of pointermove events into a single write per frame.
    if (this.frame === null) this.frame = requestAnimationFrame(() => this.apply());
  }

  apply() {
    this.frame = null;
    if (!this.pending) return;
    const { card, x, y } = this.pending;
    const inner = card.querySelector('.album-card__inner');
    if (!inner) return;

    const rect = card.getBoundingClientRect();    // one read, inside the frame
    const px = (x - rect.left) / rect.width;       // 0 (left) .. 1 (right)
    const py = (y - rect.top) / rect.height;       // 0 (top)  .. 1 (bottom)
    const ry = (px - 0.5) * 2 * this.maxTilt;      // rotateY follows the X axis
    const rx = (0.5 - py) * 2 * this.maxTilt;      // rotateX inverted (natural feel)

    // Writes only feed transform/background → composited, no layout thrash.
    inner.style.setProperty('--tilt-x', `${rx.toFixed(2)}deg`);
    inner.style.setProperty('--tilt-y', `${ry.toFixed(2)}deg`);
    inner.style.setProperty('--sheen-x', `${(px * 100).toFixed(1)}%`);
    inner.style.setProperty('--sheen-y', `${(py * 100).toFixed(1)}%`);
  }

  // Hand back to CSS: removing the inline vars lets the card ease home.
  clear(card) {
    const inner = card.querySelector('.album-card__inner');
    if (!inner) return;
    ['--tilt-x', '--tilt-y', '--sheen-x', '--sheen-y']
      .forEach((prop) => inner.style.removeProperty(prop));
  }

  reset() {
    if (this.active) this.clear(this.active);
    this.active = null;
    this.pending = null;
  }
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  new CardTilt('#album-grid').init();
});
