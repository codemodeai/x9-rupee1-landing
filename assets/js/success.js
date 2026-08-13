/* ==========================================================================
   X9 CREATIVES — success page
   Reads the handoff main.js left in sessionStorage, greets the visitor by name,
   and returns to the landing page after a countdown.
   Leads are captured in the Google Sheet, so there is no send-a-message step
   here — the page only confirms and says we'll be in touch.
   ========================================================================== */
(function () {
  'use strict';

  var SUCCESS_KEY = 'x9-claim-success';   // must match main.js
  var RETURN_AFTER = 20;                  // seconds before going back
  var HANDOFF_MAX_AGE = 30 * 60 * 1000;   // ignore a stale handoff (30 min)

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel) { return document.querySelector(sel); }

  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* --- Read the handoff -------------------------------------------------- */
  var data = null;
  try {
    var raw = window.sessionStorage.getItem(SUCCESS_KEY);
    if (raw) {
      data = JSON.parse(raw);
      // One-shot: a reload or a later visit must not replay someone's details.
      window.sessionStorage.removeItem(SUCCESS_KEY);
    }
  } catch (e) { /* private mode or malformed — generic copy stands */ }

  var fresh = !!(data && data.at && (Date.now() - data.at) < HANDOFF_MAX_AGE);

  /* --- Conversion events ------------------------------------------------
     Gated on `fresh`, which is the whole point of the one-shot handoff above:
     the key is already removed, so a reload, a direct visit, or a return trip
     through the countdown all leave `fresh` false and fire nothing. Counting
     those would inflate the conversion rate and teach the ad platforms to
     optimise toward people who refresh a page.
     Both tags are hardcoded here for the same reason the base snippets are —
     one delivery path each, never also configured inside GTM.
     ---------------------------------------------------------------------- */
  if (fresh) {
    var interest = data.interest || 'Unknown';

    // Meta. No value: the lead is worth far more than the ₹1 entry price and
    // a made-up number would skew Meta's bidding.
    try {
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Lead', { content_category: interest });
      }
    } catch (e) { /* blocked or missing — never break the page for a tag */ }

    // GA4. `generate_lead` is the recommended event name; mark it a
    // conversion in GA4 → Admin → Events for it to count.
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'generate_lead', { lead_type: interest });
      }
    } catch (e) { /* same */ }
  }

  if (fresh && data.firstName) {
    var title = $('#successTitle');
    if (title) title.textContent = "You're in, " + data.firstName + '.';
  }

  if (!fresh) {
    // Direct visit, refresh, or an expired handoff — nothing personal to show.
    var lead = $('#successLead');
    if (lead) {
      lead.innerHTML = 'If you have already sent your answers, you are in the batch and ' +
        'we will be in touch shortly. Otherwise, ' +
        '<a href="/#claim">fill the form</a> — it takes a minute.';
    }
  }

  /* --- Countdown back to the landing page -------------------------------- */
  var el = $('#successCountdown');
  if (!el) return;

  if (REDUCED) {
    // Don't yank the page away from someone who asked for less motion.
    el.textContent = '';
    return;
  }

  var left = RETURN_AFTER;
  function render() { el.textContent = 'Taking you back to the page in ' + left + 's…'; }
  render();

  var timer = window.setInterval(function () {
    left -= 1;
    if (left <= 0) {
      window.clearInterval(timer);
      window.location.href = '/';
      return;
    }
    render();
  }, 1000);

  // Any interaction means they're reading — stop the auto-return.
  ['click', 'keydown', 'touchstart', 'wheel'].forEach(function (evt) {
    window.addEventListener(evt, function () {
      window.clearInterval(timer);
      el.textContent = '';
    }, { once: true, passive: true });
  });
})();
