'use strict';

/**
 * FORM_ENDPOINT
 * Live Formspree endpoint for the enquiry form — submissions deliver to
 * the recipient address configured in the Formspree dashboard for this
 * form. To point this at a different backend instead:
 *   - Formspree:  'https://formspree.io/f/YOUR_FORM_ID'
 *   - Getform:    'https://getform.io/f/YOUR_FORM_ID'
 *   - Custom API: 'https://api.yourdomain.com/enquiries'
 * The form POSTs a JSON body: { name, email, phone, company, service, message }
 * Also update the Content-Security-Policy meta tag in index.html
 * (connect-src) if you swap in a different origin.
 */
const FORM_ENDPOINT = 'https://formspree.io/f/xwlkkkek';

/**
 * LEAD_MAGNET_ENDPOINT
 * Placeholder endpoint for the "Free IT Security Readiness Checklist" email
 * capture. Same swap-in pattern as FORM_ENDPOINT above. POSTs JSON:
 * { email }
 *
 * NOTE: if you point either FORM_ENDPOINT or LEAD_MAGNET_ENDPOINT at a real
 * domain, also update the Content-Security-Policy meta tag in index.html
 * (connect-src / form-action) — the CSP currently only allows
 * 'self' and https://example.com, and will silently block fetch() to any
 * other origin.
 */
const LEAD_MAGNET_ENDPOINT = 'https://example.com/api/lead-magnet';

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initNavToggle();
  initFadeInOnScroll();
  initTestimonialCarousel();
  initEnquiryForm();
  initLeadMagnetForm();
  initEbookPopup();
  initWhatsAppWidget();
  initCurrentYear();
});

/**
 * initThemeToggle
 * Applies the visitor's saved theme preference (if any) on load, and wires
 * the header button to flip between light/dark, persisting the choice to
 * localStorage as "light"/"dark" so it survives a page reload. With no
 * saved preference, the site follows the OS-level prefers-color-scheme via
 * CSS alone — this only takes over once the visitor makes an explicit choice.
 */
function initThemeToggle() {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;

  const STORAGE_KEY = 'cru-theme';
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (storageError) {
    // Private browsing / disabled storage — fall back to OS preference only.
  }

  if (saved === 'light' || saved === 'dark') {
    applyTheme(saved);
  }

  toggle.addEventListener('click', () => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const current = document.documentElement.getAttribute('data-theme') || (prefersDark ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (storageError) {
      // Ignore — theme still applies for this page view.
    }
  });

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    toggle.setAttribute('aria-pressed', String(theme === 'dark'));
    toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
}

/**
 * initNavToggle
 * Wires up the hamburger button below the 768px breakpoint: toggles the
 * mobile menu's visibility and keeps aria-expanded in sync, and closes the
 * menu automatically when a link inside it is clicked.
 */
function initNavToggle() {
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/**
 * initFadeInOnScroll
 * Uses IntersectionObserver to add an `is-visible` class to `.fade-in`
 * elements as they enter the viewport. Skips the animation entirely when
 * the user prefers reduced motion, revealing content immediately instead.
 */
function initFadeInOnScroll() {
  const items = document.querySelectorAll('.fade-in');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  items.forEach((el) => observer.observe(el));
}

/**
 * initTestimonialCarousel
 * Drives the mobile testimonial carousel: translates the track horizontally
 * to the active slide, builds dot indicators, and wires prev/next buttons.
 * On desktop the CSS grid layout takes over and this logic is inert.
 */
function initTestimonialCarousel() {
  const track = document.getElementById('testimonialsTrack');
  const dotsContainer = document.getElementById('testimonialDots');
  const prevBtn = document.getElementById('testimonialPrev');
  const nextBtn = document.getElementById('testimonialNext');
  if (!track || !dotsContainer || !prevBtn || !nextBtn) return;

  const slides = Array.from(track.children);
  let activeIndex = 0;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'testimonials__dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Go to testimonial ${i + 1}`);
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
  });
  const dots = Array.from(dotsContainer.children);

  function goToSlide(index) {
    activeIndex = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${activeIndex * 100}%)`;
    dots.forEach((dot, i) => dot.setAttribute('aria-selected', String(i === activeIndex)));
  }

  prevBtn.addEventListener('click', () => goToSlide(activeIndex - 1));
  nextBtn.addEventListener('click', () => goToSlide(activeIndex + 1));

  goToSlide(0);
}

/**
 * initEnquiryForm
 * Handles the enquiry form end to end: blur/submit validation, honeypot
 * spam check, JSON submission via fetch() with a loading state, and the
 * success panel with a "send another" reset.
 */
function initEnquiryForm() {
  const form = document.getElementById('enquiryForm');
  const submitBtn = document.getElementById('submitBtn');
  const statusEl = document.getElementById('formStatus');
  const successPanel = document.getElementById('enquirySuccess');
  const resetBtn = document.getElementById('resetFormBtn');
  if (!form) return;

  const fields = {
    name: { input: document.getElementById('name'), error: document.getElementById('nameError') },
    email: { input: document.getElementById('email'), error: document.getElementById('emailError') },
    phone: { input: document.getElementById('phone'), error: document.getElementById('phoneError') },
    service: { input: document.getElementById('service'), error: document.getElementById('serviceError') },
    message: { input: document.getElementById('message'), error: document.getElementById('messageError') },
  };

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_REGEX = /^[+]?[\d\s().-]{7,20}$/;

  /** validateField: checks one field and shows/hides its inline error. */
  function validateField(key) {
    const { input, error } = fields[key];
    let message = '';

    const value = input.value.trim();
    if (input.hasAttribute('required') && !value) {
      message = 'This field is required.';
    } else if (key === 'email' && value && !EMAIL_REGEX.test(value)) {
      message = 'Enter a valid email address.';
    } else if (key === 'phone' && value && !PHONE_REGEX.test(value)) {
      message = 'Enter a valid phone number.';
    }

    if (message) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', error.id);
      error.textContent = message;
      error.hidden = false;
    } else {
      input.removeAttribute('aria-invalid');
      error.hidden = true;
      error.textContent = '';
    }

    return !message;
  }

  Object.keys(fields).forEach((key) => {
    fields[key].input.addEventListener('blur', () => validateField(key));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Honeypot: if this hidden field has a value, silently treat as spam.
    const honeypot = form.querySelector('#website');
    if (honeypot && honeypot.value) {
      return;
    }

    const isValid = Object.keys(fields)
      .map(validateField)
      .every(Boolean);

    if (!isValid) {
      setStatus('Please fix the errors above and try again.', 'error');
      return;
    }

    const payload = {
      name: fields.name.input.value.trim(),
      email: fields.email.input.value.trim(),
      phone: fields.phone.input.value.trim(),
      company: document.getElementById('company').value.trim(),
      service: fields.service.input.value,
      message: fields.message.input.value.trim(),
    };

    setLoading(true);
    setStatus('', null);

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setStatus(`Something went wrong (server responded ${response.status}). Please try again.`, 'error');
        setLoading(false);
        return;
      }

      showSuccess();
    } catch (networkError) {
      setStatus('Network error — please check your connection and try again.', 'error');
      setLoading(false);
    }
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', (event) => {
      event.preventDefault();
      form.reset();
      Object.keys(fields).forEach((key) => {
        fields[key].input.removeAttribute('aria-invalid');
        fields[key].error.hidden = true;
      });
      successPanel.hidden = true;
      form.hidden = false;
      setLoading(false);
      setStatus('', null);
    });
  }

  /** setLoading: toggles the submit button's disabled/spinner state. */
  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.querySelector('.btn__spinner').hidden = !isLoading;
    submitBtn.querySelector('.btn__label').textContent = isLoading ? 'Sending…' : 'Send enquiry';
  }

  /** setStatus: writes a status message with success/error styling. */
  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = 'form__status' + (type ? ` form__status--${type}` : '');
  }

  /** showSuccess: hides the form and reveals the confirmation panel. */
  function showSuccess() {
    form.hidden = true;
    successPanel.hidden = false;
  }
}

/**
 * initLeadMagnetForm
 * Handles the "Free IT Security Readiness Checklist" email-capture form:
 * a lighter-weight sibling of initEnquiryForm with just one field, its own
 * validation, loading state, and success message.
 */
function initLeadMagnetForm() {
  const form = document.getElementById('leadMagnetForm');
  if (!form) return;

  const emailInput = document.getElementById('lead-email');
  const emailError = document.getElementById('leadEmailError');
  const submitBtn = document.getElementById('leadMagnetSubmitBtn');
  const statusEl = document.getElementById('leadMagnetStatus');
  const successEl = document.getElementById('leadMagnetSuccess');
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  emailInput.addEventListener('blur', validate);

  function validate() {
    const value = emailInput.value.trim();
    const message = !value
      ? 'Enter your email address.'
      : !EMAIL_REGEX.test(value)
        ? 'Enter a valid email address.'
        : '';

    if (message) {
      emailInput.setAttribute('aria-invalid', 'true');
      emailInput.setAttribute('aria-describedby', emailError.id);
      emailError.textContent = message;
      emailError.hidden = false;
    } else {
      emailInput.removeAttribute('aria-invalid');
      emailError.hidden = true;
    }
    return !message;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.querySelector('.btn__spinner').hidden = false;
    submitBtn.querySelector('.btn__label').textContent = 'Sending…';
    statusEl.textContent = '';

    try {
      const response = await fetch(LEAD_MAGNET_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: emailInput.value.trim() }),
      });

      if (!response.ok) {
        statusEl.textContent = `Something went wrong (server responded ${response.status}). Please try again.`;
        resetButton();
        return;
      }

      form.hidden = true;
      successEl.hidden = false;
    } catch (networkError) {
      statusEl.textContent = 'Network error — please check your connection and try again.';
      resetButton();
    }
  });

  function resetButton() {
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn__spinner').hidden = true;
    submitBtn.querySelector('.btn__label').textContent = 'Send me the checklist';
  }
}

/**
 * initEbookPopup
 * Shows the "free eBook" popup 10 seconds after page load, once per visitor
 * (tracked in localStorage so it doesn't nag on every visit). Dismissible via
 * the close button, "No thanks", clicking the overlay, or Escape; submitting
 * the form counts as dismissed too. Reuses LEAD_MAGNET_ENDPOINT since it's
 * the same underlying offer as the inline lead-magnet section.
 */
function initEbookPopup() {
  const overlay = document.getElementById('ebookPopup');
  if (!overlay) return;

  const STORAGE_KEY = 'cru-ebook-popup-seen';
  let alreadySeen = false;
  try {
    alreadySeen = localStorage.getItem(STORAGE_KEY) === 'true';
  } catch (storageError) {
    // Private browsing / disabled storage — fall back to showing it once per tab session.
    alreadySeen = window.__cruEbookPopupShown === true;
  }
  if (alreadySeen) return;

  const closeBtn = document.getElementById('ebookPopupClose');
  const dismissBtn = document.getElementById('popupNoThanks');
  const form = document.getElementById('ebookPopupForm');
  const emailInput = document.getElementById('popup-email');
  const emailError = document.getElementById('popupEmailError');
  const submitBtn = document.getElementById('popupSubmitBtn');
  const statusEl = document.getElementById('popupStatus');
  const successEl = document.getElementById('popupSuccess');
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  let previouslyFocused = null;

  const timer = setTimeout(show, 10000);

  function show() {
    overlay.hidden = false;
    previouslyFocused = document.activeElement;
    emailInput.focus();
    document.addEventListener('keydown', onKeydown);
  }

  function hide(markSeen) {
    overlay.hidden = true;
    document.removeEventListener('keydown', onKeydown);
    if (previouslyFocused) previouslyFocused.focus();
    if (markSeen) {
      window.__cruEbookPopupShown = true;
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch (storageError) {
        // Ignore — best effort only.
      }
    }
  }

  function onKeydown(event) {
    if (event.key === 'Escape') hide(true);
  }

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) hide(true);
  });
  closeBtn.addEventListener('click', () => hide(true));
  dismissBtn.addEventListener('click', () => hide(true));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = emailInput.value.trim();

    if (!value || !EMAIL_REGEX.test(value)) {
      emailInput.setAttribute('aria-invalid', 'true');
      emailInput.setAttribute('aria-describedby', emailError.id);
      emailError.textContent = 'Enter a valid email address.';
      emailError.hidden = false;
      return;
    }
    emailInput.removeAttribute('aria-invalid');
    emailError.hidden = true;

    submitBtn.disabled = true;
    submitBtn.querySelector('.btn__spinner').hidden = false;
    submitBtn.querySelector('.btn__label').textContent = 'Sending…';
    statusEl.textContent = '';

    try {
      const response = await fetch(LEAD_MAGNET_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: value, source: 'popup' }),
      });

      if (!response.ok) {
        statusEl.textContent = `Something went wrong (server responded ${response.status}). Please try again.`;
        resetButton();
        return;
      }

      form.hidden = true;
      successEl.hidden = false;
      setTimeout(() => hide(true), 2000);
    } catch (networkError) {
      statusEl.textContent = 'Network error — please check your connection and try again.';
      resetButton();
    }
  });

  function resetButton() {
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn__spinner').hidden = true;
    submitBtn.querySelector('.btn__label').textContent = 'Send me the eBook';
  }

  // Expose the timer id only for the test harness / manual debugging.
  overlay._ebookPopupTimer = timer;
}

/**
 * initWhatsAppWidget
 * Toggles the floating WhatsApp panel open/closed. Closes on: close button,
 * clicking outside the widget, Escape, or clicking a suggestion/CTA link
 * (which navigates away to WhatsApp in a new tab anyway).
 */
function initWhatsAppWidget() {
  const toggle = document.getElementById('whatsappToggle');
  const panel = document.getElementById('whatsappPanel');
  const closeBtn = document.getElementById('whatsappClose');
  if (!toggle || !panel) return;

  function open() {
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', onOutsideClick);
    document.addEventListener('keydown', onKeydown);
  }

  function close() {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onOutsideClick);
    document.removeEventListener('keydown', onKeydown);
  }

  function onOutsideClick(event) {
    if (!panel.contains(event.target) && event.target !== toggle && !toggle.contains(event.target)) {
      close();
    }
  }

  function onKeydown(event) {
    if (event.key === 'Escape') close();
  }

  toggle.addEventListener('click', () => {
    if (panel.hidden) open();
    else close();
  });
  closeBtn.addEventListener('click', close);
}

/**
 * initCurrentYear
 * Stamps the current year into the footer's copyright line.
 */
function initCurrentYear() {
  const yearEl = document.getElementById('currentYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}
