# Engineering Log — The Vinyl Vault

A running log of design and build decisions. Newest entries at the top.

---

## 2026-06-16 — Discover page & live API integration

Built the **Discover** page (`discover.html` + `css/discover.css` + `js/discover.js`) on
top of the **Last.fm API**, all driven by one **`AlbumDiscovery`** ES6 class.

**Features.** Genre filter chips (`tag.gettopalbums`), a debounced album search
(`album.search`, 350ms so we don't fire a request per keystroke), and "Load more"
pagination. Switching a genre clears the search and vice-versa; an empty search falls back
to the active genre.

**States (graded explicitly by the brief).**
- *Loading* — a grid of shimmering skeleton cards (better perceived performance than a lone
  spinner for sub-second waits).
- *Error* — a status card with the message and a "Try again" button. Last.fm reports API-level
  problems (e.g. a bad key) inside a `200` response, so we check `data.error` as well as
  `res.ok`. A failed *Load more* keeps the existing results instead of wiping them.
- *Empty* — a friendly "No albums found" card for searches with no matches.
- *No key configured* — a clear instruction to add a free Last.fm key, shown instead of a
  cryptic failure.

**Cover-art fallback.** Last.fm serves a known star *placeholder* image
(`…2a96cbd8b46e442fc41c2b86b821562f…`) for art it doesn't have. We detect and reject it, then
render a hand-drawn CSS sleeve whose hue is hashed from the album title — so the grid always
looks intentional. Cards build with `textContent` (titles can't inject markup) and images use
`loading="lazy"`.

**Verification.** Loaded through the local server: no console errors; the 8 genre chips
render with Rock active; the no-key state shows correctly. The fetch→render path was
exercised with a mocked Last.fm response — real covers render as images and a
placeholder-hash album correctly falls back to CSS art.

> The API key itself is not committed — it lives in the `API_KEY` constant in
> `js/discover.js` for the user to fill in with their own free key.

---

## 2026-06-16 — Home page, shared design system & curated content

**Shared design system (`css/main.css`).** Extracted all cross-page styling into one
file: design tokens (CSS custom properties), base/reset, the sticky navigation bar, the
footer, the hero primitives, and a reusable `.vault-btn` (primary / ghost). Every page now
links `main.css` first, then its own page-specific stylesheet. This keeps the navbar,
colours, and typography identical everywhere and removes duplication.

**Design language.** Dark "OLED" theme — deep indigo-black surfaces with an electric-purple
neon accent. The three form-input states are mapped to three *distinct* semantic colours
(purple = focus, green = valid, red = invalid) rather than reusing one accent, which makes
state changes unambiguous. Motion is intentional: all transitions animate specific cheap
properties (transform / opacity / box-shadow) with a strong custom easing curve
(`cubic-bezier(0.23, 1, 0.32, 1)`) and stay under ~300ms. Hover effects are gated behind
`@media (hover: hover)` so touch taps don't trigger them, and a global
`prefers-reduced-motion` block strips positional motion.

**Curated content (`js/data/albums.js`).** Assembled 18 genuinely notable records — real
artist, title, year, genre and a short written note for each — spanning 12 genres from 1959
to 2015. This is the site's own data (separate from the live API).

**Home page (`index.html` + `css/home.css`).** Hero with a dynamic stats strip, the full
collection as a responsive card grid, and a closing call-to-action. The grid is rendered by
the **`AlbumGallery`** ES6 class, which builds each card with `textContent` (never
`innerHTML`, so album titles can't inject markup) and batches inserts through a
`DocumentFragment`. Cards use hand-drawn CSS sleeve art (a coloured cover + a vinyl disc
that slides out on hover/focus) so no cover images are hotlinked. The hero's "records" and
"genres" stats are computed from the data set at runtime.

**Verification.** Both Home and Submit-a-Review were loaded through a local HTTP server and
checked in the browser: 18 cards render, the stats read 18 / 12, and there are **no console
errors or warnings**.

**Bug caught & fixed.** The genre stat was first hardcoded as "9"; the data actually holds
12 genres. Replaced the hardcoded value with a runtime `Set` count so it stays in sync.

---

## 2026-06-16 — Custom UI requirement: validated contact form

Implemented Perla's assigned unique front-end requirement: **a contact form with styled
inputs and real-time validation**, as the **Submit a Review** page
(`submit-review.html` + `css/submit-review.css` + `js/form-validator.js`).

**Structure.** Semantic HTML5 inside a Bootstrap 5 grid (`container` / `row` / `col`), so
Artist + Album sit side by side on wider screens and stack on mobile. The form is marked
`novalidate` so our custom validation UI is the single source of truth instead of the
browser's native bubbles.

**Styling.** Hand-written inputs with an electric-purple focus glow (layered `box-shadow`),
a green valid state with a check icon, and a red invalid state with a cross icon and an
inline error. The error message animates open using a `grid-template-rows: 0fr → 1fr`
transition, which grows height smoothly without reserving empty space when there's no error.

**Validation logic (`FormValidator` ES6 class).**
- Rules are stored as data (one function per field returning `''` for valid or an error
  string), which keeps the validator easy to extend.
- Each field has a `touched` flag. Errors are only *shown* after a field is first blurred,
  but once touched the field re-validates live on every keystroke — "real-time, but not
  nagging."
- The submit button's `disabled` state is recomputed from the whole form's validity on
  every input.
- On submit: all fields are validated, the first invalid field receives focus (accessibility),
  and on success the form is hidden and a styled thank-you card animates in from `scale(0.96)`
  (never `scale(0)` — elements shouldn't appear from nothing).
- Accessibility: `role="alert"`, `aria-invalid`, and `aria-describedby` wire each input to its
  message; the review field has a live character counter (`0 / 20`).

**Known tradeoffs (documented in README AI-use appendix).** A disabled submit button can
swallow feedback for a user who clicks it while empty (mitigated via blur-validation); the
email regex is intentionally simplified and not RFC-5322-complete.

---

## Next up

- Add a real Last.fm API key to `js/discover.js` and confirm live results in the browser.
- Capture mobile / tablet / desktop screenshots of each page for the evidence folder.
- Optional polish: link album cards through to their Last.fm pages; remember the last-used
  genre between visits.
