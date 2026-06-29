/* =============================================================
   The Vinyl Vault — ReviewEngine
   -------------------------------------------------------------
   All review/rating data lives in window.localStorage under
   'vault.reviews'. Everyone can READ; POSTING is for any signed-in
   user; REPLY + DELETE are admin-only — the page passes capability
   flags into render() and the engine draws the matching controls.
   Admin replies are stored nested on the review itself.

   Cards are built with textContent (never innerHTML) so review text
   can't inject markup. ES6 class, no jQuery.
   ============================================================= */
class ReviewEngine {
  constructor() {
    this.KEY = 'vault.reviews';
    this.seedIfEmpty();
  }

  /* ---------- Storage ---------- */
  all() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch { return []; }
  }
  save(list) { localStorage.setItem(this.KEY, JSON.stringify(list)); }

  // First visit: lay down a few realistic reviews so the list isn't empty.
  seedIfEmpty() {
    if (localStorage.getItem(this.KEY)) return;
    const now = Date.now();
    const hr = 1000 * 60 * 60;
    this.save([
      {
        id: 'seed-3', author: 'Jun', authorType: 'user', rating: 5,
        text: 'Kind of Blue is the record I use to test every new cartridge. Timeless, and the soundstage is enormous.',
        createdAt: now - hr * 0.5, reply: null,
      },
      {
        id: 'seed-2', author: 'Theo R.', authorType: 'user', rating: 4,
        text: 'Random Access Memories on 180g is worth it — "Giorgio by Moroder" fills the whole room.',
        createdAt: now - hr * 5,
        reply: { text: 'Agreed — the dynamic range on that pressing is superb. Thanks for the tip!', repliedAt: now - hr * 4 },
      },
      {
        id: 'seed-1', author: 'Mara K.', authorType: 'user', rating: 5,
        text: 'My original 1977 pressing of Rumours still out-sings every remaster. Side A is flawless.',
        createdAt: now - hr * 26, reply: null,
      },
    ]);
  }

  /* ---------- Mutations ---------- */
  add({ author, authorType, rating, text }) {
    const list = this.all();
    const review = {
      id: ReviewEngine.uid(),
      author: String(author || 'Anonymous'),
      authorType: authorType || 'user',
      rating: Number(rating) || 0,
      text: String(text).trim(),
      createdAt: Date.now(),
      reply: null,
    };
    list.unshift(review);          // newest first
    this.save(list);
    return review;
  }
  reply(id, text) {                // admin only
    const list = this.all();
    const r = list.find((x) => x.id === id);
    if (!r) return false;
    r.reply = { text: String(text).trim(), repliedAt: Date.now() };
    this.save(list);
    return true;
  }
  remove(id) {                     // admin only
    this.save(this.all().filter((x) => x.id !== id));
  }

  /* ---------- Rendering ---------- */
  /**
   * @param {HTMLElement} container
   * @param {object} caps  { canReply, canDelete, onChange }
   */
  render(container, caps = {}) {
    const list = this.all();
    container.textContent = '';
    if (list.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'reviews-empty';
      empty.textContent = 'No reviews yet — be the first to drop the needle and share one.';
      container.appendChild(empty);
      return;
    }
    list.forEach((r) => container.appendChild(this.card(r, caps)));
  }

  card(r, caps) {
    const card = document.createElement('article');
    card.className = 'review-card';

    const head = document.createElement('div');
    head.className = 'review-card__head';

    const who = document.createElement('div');
    who.className = 'review-card__who';
    const name = document.createElement('span');
    name.className = 'review-card__author';
    name.textContent = r.author;
    const when = document.createElement('time');
    when.className = 'review-card__time';
    when.dateTime = new Date(r.createdAt).toISOString();
    when.textContent = ReviewEngine.timeAgo(r.createdAt);
    who.append(name, when);

    head.append(who, StarRating.renderStatic(r.rating));
    card.appendChild(head);

    const body = document.createElement('p');
    body.className = 'review-card__text';
    body.textContent = r.text;
    card.appendChild(body);

    // Nested admin reply — visible to everyone once it exists.
    if (r.reply) card.appendChild(this.replyBlock(r.reply));

    // Admin-only moderation controls.
    if (caps.canReply || caps.canDelete) card.appendChild(this.adminControls(r, caps));
    return card;
  }

  replyBlock(reply) {
    const wrap = document.createElement('div');
    wrap.className = 'review-reply';
    const tag = document.createElement('span');
    tag.className = 'review-reply__tag';
    tag.textContent = 'Vault Admin replied';
    const txt = document.createElement('p');
    txt.className = 'review-reply__text';
    txt.textContent = reply.text;
    wrap.append(tag, txt);
    return wrap;
  }

  adminControls(r, caps) {
    const bar = document.createElement('div');
    bar.className = 'review-admin';

    if (caps.canReply) {
      const form = document.createElement('form');
      form.className = 'review-admin__reply';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'review-admin__input';
      input.placeholder = r.reply ? 'Edit reply…' : 'Write a reply…';
      input.value = r.reply ? r.reply.text : '';
      input.setAttribute('aria-label', 'Reply to this review');

      const send = document.createElement('button');
      send.type = 'submit';
      send.className = 'vault-btn vault-btn--ghost review-admin__send';
      send.textContent = r.reply ? 'Update reply' : 'Reply';

      form.append(input, send);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = input.value.trim();
        if (!v) return;
        this.reply(r.id, v);
        caps.onChange?.();
      });
      bar.appendChild(form);
    }

    if (caps.canDelete) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'vault-btn review-admin__delete';
      del.textContent = 'Delete';
      del.addEventListener('click', () => {
        if (!confirm('Delete this review permanently? This cannot be undone.')) return;
        this.remove(r.id);
        caps.onChange?.();
      });
      bar.appendChild(del);
    }
    return bar;
  }

  /* ---------- Helpers ---------- */
  static uid() {
    return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  static timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60); if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h} hr ago`;
    const d = Math.floor(h / 24); return `${d} day${d > 1 ? 's' : ''} ago`;
  }
}

window.ReviewEngine = ReviewEngine;
