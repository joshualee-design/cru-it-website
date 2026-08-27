'use strict';

/**
 * FORM_ENDPOINT
 * Placeholder endpoint for the enquiry form. Swap this for a real endpoint:
 *   - Formspree:  'https://formspree.io/f/YOUR_FORM_ID'
 *   - Getform:    'https://getform.io/f/YOUR_FORM_ID'
 *   - Custom API: 'https://api.yourdomain.com/enquiries'
 * The form POSTs a JSON body: { name, email, phone, company, service, message }
 */
const FORM_ENDPOINT = 'https://example.com/api/enquiries';

document.addEventListener('DOMContentLoaded', () => {
  initNavToggle();
  initFadeInOnScroll();
  initTestimonialCarousel();
  initEnquiryForm();
  initCurrentYear();
});

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
        headers: { 'Content-Type': 'application/json' },
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
 * initCurrentYear
 * Stamps the current year into the footer's copyright line.
 */
function initCurrentYear() {
  const yearEl = document.getElementById('currentYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}
