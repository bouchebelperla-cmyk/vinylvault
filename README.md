# The Vinyl Vault 🎵

A music album discovery hub for crate diggers. Browse a hand-curated collection of
records worth digging for, discover new pressings from the live music charts, and
recommend the albums the Vault is still missing.

**Author:** Perla Bou Chebel
**Course:** Full Stack Development — Final Project 2026 (Lebanese University, Faculty of Engineering)

---

## Project description

The Vinyl Vault is a multi-page front-end website built around a single real topic:
notable vinyl records. It combines a hand-curated data set with live data from a public
music API, wrapped in a dark, neon-accented "OLED" interface designed for low-light
listening sessions.

### Pages

| Page | File | What it does |
| --- | --- | --- |
| **Home** | `index.html` | Hero, at-a-glance stats, and the full curated collection rendered as a responsive card grid with hover/keyboard reveal. |
| **Discover** | `discover.html` | Live album discovery via the Last.fm API — genre filter, debounced search, "Load more" pagination, and proper loading / error / empty states. |
| **Submit a Review** | `submit-review.html` | The custom UI requirement — a styled contact form with real-time validation. |

A consistent, sticky navigation bar appears on every page.

---

## Tech stack

- **Semantic HTML5**
- **Hand-written CSS3** — design tokens, custom properties, Flexbox & CSS Grid. Bootstrap 5
  is used **only** for layout scaffolding (container / row / col); every visual element is
  styled by hand.
- **Vanilla JavaScript (ES6 classes only)** — no jQuery, no legacy syntax. Each interactive
  feature is encapsulated in its own class (`FormValidator`, `AlbumGallery`, …).
- **Google Fonts** — Righteous (display) + Poppins (body).

### Design system

| Token | Value | Use |
| --- | --- | --- |
| Background | `#0f0f23` | deep indigo-black page base |
| Surface | `#16162b` | cards |
| Accent | `#a855f7` | electric-purple focus / brand |
| Valid | `#22c55e` | valid input state |
| Invalid | `#ef4444` | invalid input state |

The full system lives in `css/main.css` and is shared across all pages.

---

## API used

**Last.fm API** (`ws.audioscrobbler.com`) — a free, registration/key-based public API.
Used on the **Discover** page to fetch top albums/artists and to power album search.

> ⚙️ **Setup:** the Discover page reads an API key from a single constant. Register for a
> free key at <https://www.last.fm/api/account/create> and drop it into the `API_KEY`
> constant in `js/discover.js`. Without a key the page shows a friendly error state rather
> than breaking.

---

## Your own content (curated data)

`js/data/albums.js` holds **18 real, notable records** — each with a real artist, title,
release year, genre and a short written note (no placeholder text). This is the data set
the Home page renders, and it spans **12 genres** from 1959 to 2015.

---

## Custom UI requirement — contact form with real-time validation

Perla's assigned unique front-end requirement is **"Add a contact form with styled inputs
and real-time validation."** It is implemented as the **Submit a Review** page:

- **Styled inputs** — hand-built dark inputs with three distinct visual states: an
  electric-purple **focus glow**, a green **valid** accent (with a check icon), and a red
  **invalid** border (with a cross icon and an inline message).
- **Real-time validation** — handled entirely by the `FormValidator` ES6 class
  (`js/form-validator.js`). Each field re-validates on every keystroke once it has been
  touched, renders an accessible error message below the field, and toggles the submit
  button's `disabled` state from the live validity of the whole form.
- **Fields & rules:** Artist Name (required), Album Title (required), Email
  (required + valid format), Review (required, minimum 20 characters, with a live counter).
- **Mock submission** — on a valid submit the form is hidden and a styled
  "Thank you for your submission!" card animates in.

Accessibility: `role="alert"` + `aria-invalid` + `aria-describedby` on every field, focus is
moved to the first invalid field on submit, and all motion respects
`prefers-reduced-motion`.

---

## Project structure

```
.
├── index.html              # Home
├── discover.html           # Discover (API): search, genre filter, pagination
├── submit-review.html      # Custom requirement: validated contact form
├── css/
│   ├── main.css            # Shared design system (tokens, nav, footer, buttons)
│   ├── home.css            # Home page styles + album card grid
│   ├── discover.css        # Discover controls, results grid, states
│   └── submit-review.css   # Contact form styles
└── js/
    ├── data/albums.js      # Curated collection (own content)
    ├── album-gallery.js    # AlbumGallery ES6 class (renders the grid)
    ├── form-validator.js   # FormValidator ES6 class (real-time validation)
    └── discover.js         # AlbumDiscovery ES6 class (Last.fm API)
```

## Running locally

This is a static site, so it just needs to be served over HTTP (opening the HTML files
directly with `file://` will block the `fetch` call on the Discover page). Any static
server works, for example:

```bash
# Python 3
python -m http.server 8000
# then open http://localhost:8000
```

or the **Live Server** extension in VS Code.

---

## AI-use appendix

In the spirit of honest disclosure, this project was built with AI assistance.

### Tools used

| Tool | Used for |
| --- | --- |
| **Claude (Claude Code)** | Scaffolding the page structure, writing the hand-written CSS design system, authoring the `FormValidator` and `AlbumGallery` ES6 classes, and assembling the curated data set. All output was reviewed, tested in-browser, and corrected before being kept. |

### Sample prompts used

1. _"Build a 'Submit an Album Review' page for a dark-themed music site: semantic HTML5 +
   Bootstrap 5 layout, hand-written CSS3 (dark theme, neon accent, focus/valid/invalid input
   states), and real-time validation in a single ES6 class (Artist, Album, Email, Review ≥20
   chars). Handle a mock success state."_
2. _"Continue the rest of the site — a shared navbar, a home page with the curated
   collection, and the API-powered discover page."_
3. _"Map the three input states to three semantic colours and keep all animation under 300ms
   with custom easing."_

### What the AI got wrong (and how it was found & fixed)

1. **Hardcoded the wrong genre count.** The AI first wrote "9 genres" into the Home hero
   stats, but the curated data set actually contains **12** distinct genres. _Found_ by
   counting the genres in `albums.js` against the displayed number; _fixed_ by computing the
   count dynamically with `new Set(albums.map(a => a.genre)).size` so the stat can never
   drift from the data again.
2. **A disabled submit button can swallow user feedback.** The form keeps the submit button
   `disabled` until every field is valid (as required). But a disabled button fires no click
   event, so a user who clicks it with empty fields gets no response. _Found_ while testing
   the empty-form case in the browser; _mitigated_ by validating each field on `blur` (so
   errors surface as the user tabs through) and by moving focus to the first invalid field on
   submit. The tradeoff is documented here intentionally.
3. **The email regex is deliberately simplified.** `^[^\s@]+@[^\s@]+\.[^\s@]+$` is readable
   but not RFC-5322-complete — it rejects valid dot-less domains (e.g. `user@localhost`) and
   accepts unusual-looking but structurally valid addresses. Real verification would require
   a confirmation email; this is a known, accepted limitation for a front-end demo.
4. **A grammar slip in curated copy** — "A audiophile favourite" was corrected to "An
   audiophile favourite" on review of the data file.
