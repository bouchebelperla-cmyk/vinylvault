/* =============================================================
   The Vinyl Vault — StarRating
   -------------------------------------------------------------
   The styled 1–5 star click widget. Interactive mode powers the
   review form (click / hover / keyboard); the static helper renders
   a read-only rating inside each review card. ES6 class, no jQuery.
   ============================================================= */
class StarRating {
  /**
   * @param {HTMLElement} mount        container to render into
   * @param {object}      [opts]
   * @param {number}      [opts.value] initial value 0–5
   * @param {function}    [opts.onChange] called with the new value
   */
  constructor(mount, opts = {}) {
    this.mount = mount;
    this.value = opts.value || 0;
    this.onChange = opts.onChange || (() => {});
    this.buttons = [];
    this.render();
  }

  render() {
    this.mount.classList.add('star-rating');
    this.mount.setAttribute('role', 'radiogroup');
    this.mount.setAttribute('aria-label', 'Rating, 1 to 5 stars');
    this.mount.textContent = '';

    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'star-rating__star';
      btn.dataset.value = String(i);
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-label', `${i} star${i > 1 ? 's' : ''}`);
      btn.textContent = '★';
      btn.addEventListener('click', () => this.set(i));
      btn.addEventListener('mouseenter', () => this.paint(i));
      btn.addEventListener('focus', () => this.paint(i));
      this.buttons.push(btn);
      this.mount.appendChild(btn);
    }
    // Return to the committed value when the pointer leaves the row.
    this.mount.addEventListener('mouseleave', () => this.paint(this.value));
    this.paint(this.value);
  }

  set(v) {
    this.value = v;
    this.paint(v);
    this.onChange(v);
  }
  reset() { this.set(0); }

  paint(upTo) {
    this.buttons.forEach((b, idx) => {
      b.classList.toggle('is-on', idx < upTo);
      b.setAttribute('aria-checked', String(idx + 1 === this.value));
    });
  }

  // Read-only stars for display inside a review card.
  static renderStatic(rating) {
    const wrap = document.createElement('div');
    wrap.className = 'star-rating star-rating--static';
    wrap.setAttribute('aria-label', `${rating} out of 5 stars`);
    for (let i = 1; i <= 5; i++) {
      const s = document.createElement('span');
      s.className = 'star-rating__star' + (i <= rating ? ' is-on' : '');
      s.textContent = '★';
      s.setAttribute('aria-hidden', 'true');
      wrap.appendChild(s);
    }
    return wrap;
  }
}

window.StarRating = StarRating;
