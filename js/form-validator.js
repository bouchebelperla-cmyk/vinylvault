/* =============================================================
   The Vinyl Vault — FormValidator
   -------------------------------------------------------------
   CUSTOM UI REQUIREMENT: "Add a contact form with styled inputs
   and real-time validation."

   All logic is contained in one modern ES6 class (no jQuery, no
   legacy syntax). The class:
     1. Defines a validation RULE for each field.
     2. Validates in REAL TIME — every keystroke re-checks a field
        once it has been "touched" (focused then left, or after a
        submit attempt), so users aren't nagged while first typing.
     3. Renders an accessible error message below any invalid field
        and reflects validity visually (green = valid, red = invalid).
     4. Toggles the submit button's `disabled` state from the live
        validity of the whole form.
     5. Handles a mock successful submission (hide form, reveal a
        styled "Thank you" card).
   ============================================================= */

class FormValidator {
  /**
   * @param {string} formSelector  CSS selector for the <form>
   * @param {object} options       { onSuccess } callback hooks
   */
  constructor(formSelector, options = {}) {
    this.form = document.querySelector(formSelector);
    if (!this.form) return; // fail safe: nothing to wire up

    this.submitBtn = this.form.querySelector('[type="submit"]');
    this.onSuccess = options.onSuccess || (() => {});

    /* Validation rules. Each rule is a pure function returning either
       an empty string (= valid) or an error message (= invalid).
       Keeping rules as data makes the validator easy to extend. */
    this.rules = {
      artist: (v) => (v.trim() ? '' : 'Artist name is required.'),
      album:  (v) => (v.trim() ? '' : 'Album title is required.'),
      email:  (v) => {
        if (!v.trim()) return 'Email is required.';
        return this.isEmail(v.trim()) ? '' : 'Enter a valid email address (e.g. you@example.com).';
      },
      review: (v) => {
        const text = v.trim();
        if (!text) return 'A short review is required.';
        if (text.length < 20) return `Just ${text.length}/20 characters — add a little more detail.`;
        return '';
      },
    };

    /* Build a small model for each field we control. `touched` gates
       when errors become visible, which is the key to "real-time but
       not annoying" validation. */
    this.fields = {};
    Object.keys(this.rules).forEach((name) => {
      const fieldEl = this.form.querySelector(`[data-field="${name}"]`);
      const inputEl = this.form.querySelector(`#${name}`);
      const errorEl = this.form.querySelector(`#${name}-error`);
      if (fieldEl && inputEl && errorEl) {
        this.fields[name] = { fieldEl, inputEl, errorEl, touched: false };
      }
    });

    this.counterEl = document.getElementById('review-counter');

    this.bindEvents();
    this.refreshSubmitState(); // start disabled until the form is valid
  }

  /* Pragmatic email check: one "@", text either side, and a dotted
     domain. NOTE: no single regex fully matches the RFC 5322 spec —
     this intentionally favours readability over edge-case coverage. */
  isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  bindEvents() {
    Object.entries(this.fields).forEach(([name, f]) => {
      // Real-time: re-validate on every keystroke, but only paint the
      // error once the field has been touched.
      f.inputEl.addEventListener('input', () => {
        if (name === 'review') this.updateCounter();
        if (f.touched) this.validateField(name);
        this.refreshSubmitState();
      });

      // First blur marks the field touched, then shows its state.
      f.inputEl.addEventListener('blur', () => {
        f.touched = true;
        this.validateField(name);
      });
    });

    // Custom submit handling (form has `novalidate`).
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    this.updateCounter();
  }

  /* Validate ONE field and render its visual + accessible state.
     Returns true when the field is currently valid. */
  validateField(name) {
    const f = this.fields[name];
    const message = this.rules[name](f.inputEl.value);
    const valid = message === '';

    if (valid) {
      f.fieldEl.classList.add('is-valid');
      f.fieldEl.classList.remove('is-invalid');
      f.errorEl.textContent = '';
      f.inputEl.setAttribute('aria-invalid', 'false');
    } else {
      // Only flip to the red/invalid look after the field is touched,
      // so a pristine empty field doesn't look "wrong" on page load.
      f.fieldEl.classList.toggle('is-invalid', f.touched);
      f.fieldEl.classList.remove('is-valid');
      // role="alert" on the element announces the text to screen readers.
      f.errorEl.textContent = f.touched ? message : '';
      f.inputEl.setAttribute('aria-invalid', f.touched ? 'true' : 'false');
    }
    return valid;
  }

  // Live "x / 20" counter for the review field.
  updateCounter() {
    if (!this.counterEl || !this.fields.review) return;
    const len = this.fields.review.inputEl.value.trim().length;
    this.counterEl.textContent = `${len} / 20`;
  }

  // Is every field valid right now? (Pure check — does not render.)
  isFormValid() {
    return Object.keys(this.fields).every(
      (name) => this.rules[name](this.fields[name].inputEl.value) === ''
    );
  }

  // Enable the submit button only while the whole form is valid.
  refreshSubmitState() {
    if (this.submitBtn) this.submitBtn.disabled = !this.isFormValid();
  }

  handleSubmit(e) {
    e.preventDefault();

    // On submit, mark everything touched and validate so any remaining
    // errors are revealed at once.
    let firstInvalid = null;
    Object.keys(this.fields).forEach((name) => {
      this.fields[name].touched = true;
      const ok = this.validateField(name);
      if (!ok && !firstInvalid) firstInvalid = this.fields[name].inputEl;
    });

    if (firstInvalid) {
      // Accessibility: send keyboard/SR focus straight to the first problem.
      firstInvalid.focus();
      return;
    }

    this.showSuccess();
  }

  // Mock successful submission: swap the form for the thank-you card.
  showSuccess() {
    const success = document.getElementById('review-success');
    this.form.hidden = true;

    if (success) {
      success.hidden = false;
      success.setAttribute('aria-hidden', 'false');
      // Next frame so the browser registers the starting style before
      // we add .is-visible — otherwise the entrance transition is skipped.
      requestAnimationFrame(() => success.classList.add('is-visible'));
    }
    this.onSuccess();
  }

  // Reset back to a blank form (used by "Submit another record").
  reset() {
    const success = document.getElementById('review-success');
    if (success) {
      success.classList.remove('is-visible');
      success.hidden = true;
      success.setAttribute('aria-hidden', 'true');
    }
    this.form.reset();
    Object.values(this.fields).forEach((f) => {
      f.touched = false;
      f.fieldEl.classList.remove('is-valid', 'is-invalid');
      f.errorEl.textContent = '';
      f.inputEl.setAttribute('aria-invalid', 'false');
    });
    this.updateCounter();
    this.refreshSubmitState();
    this.form.hidden = false;
  }
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const validator = new FormValidator('#review-form');

  const againBtn = document.getElementById('review-again');
  if (againBtn) {
    againBtn.addEventListener('click', () => {
      validator.reset();
      const firstInput = document.getElementById('artist');
      if (firstInput) firstInput.focus();
    });
  }
});
