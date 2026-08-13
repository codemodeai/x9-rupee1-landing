/* ==========================================================================
   X9 CREATIVES — ₹1 Website Landing Page
   Claim form → Google Sheet, validation, scroll animation, mobile CTA.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     CONFIG — edit these three lines before going live.
     ------------------------------------------------------------------------ */
  var CONFIG = {
    // Optional. Only used to fill any element marked data-wa-link (e.g. a
    // "chat with us" button) — the claim form does NOT message WhatsApp; it
    // records to the Google Sheet and you contact the lead yourself.
    // International format, digits only. India example: '919876543210'.
    whatsapp: '91XXXXXXXXXX',

    // Used for the mailto fallback link.
    email: 'hello@x9creatives.in',

    // Instagram handle (without @) — used in the proof section.
    instagram: 'x9creatives',

    // Google Sheet logging. Paste the Apps Script Web app URL here (it ends in
    // /exec) — see google-apps-script.gs and the README. Leave empty to skip:
    // the form still works, it just won't record to a sheet.
    sheetEndpoint: 'https://script.google.com/macros/s/AKfycbx6KK2wxdQy1RKapiP6s3PhI8l1ZtEgATf_0E7Pde952zX1lFfIsOZZouijvbotVn3O/exec',

    // Must match SHARED_TOKEN in google-apps-script.gs.
    sheetToken: 'x9-change-this-token'
  };

  var NUMBER_READY = /^\d{10,15}$/.test(CONFIG.whatsapp);
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // Coalesce scroll work into one paint.
  function onScroll(fn) {
    var queued = false;
    function run() { queued = false; fn(); }
    window.addEventListener('scroll', function () {
      if (!queued) { queued = true; window.requestAnimationFrame(run); }
    }, { passive: true });
    fn();
  }

  /* ======================================================================
     ANIMATION
     ====================================================================== */

  /* --- Scroll progress bar --------------------------------------------- */
  var bar = $('#progressBar');

  /* --- Nav condenses once you leave the top ---------------------------- */
  var nav = $('#siteNav');

  /* --- Mobile sticky CTA: show after the hero, hide over the form ------- */
  var mobileCta = $('#mobileCta');
  var hero = $('#top');
  var claim = $('#claim');

  onScroll(function () {
    var y = window.pageYOffset || document.documentElement.scrollTop;

    if (bar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    }

    if (nav) nav.classList.toggle('scrolled', y > 20);

    if (mobileCta && hero) {
      var pastHero = y > hero.offsetHeight * 0.72;
      var formInView = false;
      if (claim) {
        var r = claim.getBoundingClientRect();
        formInView = r.top < window.innerHeight * 0.85 && r.bottom > 0;
      }
      mobileCta.classList.toggle('show', pastHero && !formInView);
    }
  });

  /* --- Scroll reveals + staggered children ----------------------------- */
  // Children of [data-stagger] get an index the CSS turns into a delay.
  $$('[data-stagger]').forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (child, i) {
      child.style.setProperty('--i', i);
    });
  });

  var revealTargets = $$('.rv, [data-stagger]');

  if (REDUCED || !('IntersectionObserver' in window)) {
    revealTargets.forEach(function (el) { el.classList.add('in'); });
  } else {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          obs.unobserve(en.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach(function (el) { obs.observe(el); });
  }

  /* --- Marquee: seamless, gap-free at any width ------------------------- */
  // Two identical groups + a -50% translate gives a loop with no visible seam,
  // but only if one group is wider than the viewport. Hardcoding a couple of
  // copies leaves dead space on wide monitors, so the group is filled to fit.
  var MARQUEE_SPEED = 70;   // px per second, independent of content length

  function buildMarquee(track) {
    var group = $('.ticker-group', track);
    if (!group) return;

    // Remember the authored items once; every rebuild starts from these.
    if (!track._items) {
      track._items = Array.prototype.map.call(group.children, function (node) {
        return node.cloneNode(true);
      });
    }
    var items = track._items;
    if (!items.length) return;

    // Reset to a single copy of the authored items.
    group.textContent = '';
    items.forEach(function (node) { group.appendChild(node.cloneNode(true)); });

    // Repeat until the group alone covers the viewport (guard against a
    // zero-width measurement looping forever, e.g. if fonts haven't loaded).
    var guard = 0;
    while (group.scrollWidth > 0 && group.scrollWidth < window.innerWidth && guard < 40) {
      items.forEach(function (node) { group.appendChild(node.cloneNode(true)); });
      guard += 1;
    }

    // Exactly two groups — drop any clone from a previous build first.
    while (track.children.length > 1) track.removeChild(track.lastChild);
    track.appendChild(group.cloneNode(true));

    track.style.setProperty('--marquee-duration', (group.scrollWidth / MARQUEE_SPEED) + 's');
    track.classList.add('is-running');   // safe to animate now: two groups exist
  }

  var ticker = $('#tickerTrack');
  if (ticker) {
    buildMarquee(ticker);

    // Web fonts change the text width, which changes the repeat point.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { buildMarquee(ticker); });
    }

    // Only rebuild when the width actually changes — mobile browsers fire
    // resize on scroll as the address bar collapses.
    var lastWidth = window.innerWidth;
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () { buildMarquee(ticker); }, 200);
    });
  }

  /* --- Hero highlight sweep (it sits outside any .rv container) --------- */
  var heroHl = $('#heroHl');
  if (heroHl) {
    if (REDUCED) heroHl.classList.add('lit');
    else window.setTimeout(function () { heroHl.classList.add('lit'); }, 700);
  }

  /* ======================================================================
     CLAIM FORM
     ====================================================================== */

  /* --- Lead source: which ad produced this enquiry? -------------------- */
  function leadSource() {
    var p = new URLSearchParams(window.location.search);
    var src = p.get('utm_source') || p.get('source');
    var camp = p.get('utm_campaign');
    if (src || camp) return [src, camp].filter(Boolean).join(' / ');
    if (document.referrer) {
      try { return new URL(document.referrer).hostname; } catch (e) { /* ignore */ }
    }
    return 'direct';
  }

  /* ======================================================================
     GOOGLE SHEET LOGGING
     POSTs each submission to an Apps Script web app. This is the ONLY place a
     lead is captured — there is no WhatsApp fallback — so durability matters:
     every lead is persisted to a localStorage queue before the request goes
     out, retried on the success page and on any later visit, and carries a
     unique id so a retry can never duplicate a row.
     ====================================================================== */
  var QUEUE_KEY = 'x9-sheet-queue';

  /** Handoff to success.html. Read and cleared there. Shared with success.js. */
  var SUCCESS_KEY = 'x9-claim-success';

  function readQueue() {
    try {
      var raw = window.localStorage.getItem(QUEUE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Object.prototype.toString.call(parsed) === '[object Array]' ? parsed : [];
    } catch (e) { return []; }
  }
  function writeQueue(items) {
    try { window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-20))); }
    catch (e) { /* private mode / full */ }
  }
  function enqueue(payload) {
    var q = readQueue();
    q.push(payload);
    writeQueue(q);
  }
  function dequeue(id) {
    writeQueue(readQueue().filter(function (item) { return item.id !== id; }));
  }

  // Content-Type text/plain keeps this a CORS "simple request" — Apps Script
  // cannot answer a preflight OPTIONS, so anything else would be blocked.
  function postOnce(payload) {
    if (!CONFIG.sheetEndpoint) return Promise.resolve('skipped');
    return window.fetch(CONFIG.sheetEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      keepalive: true,        // survives the tab closing right after submit
      redirect: 'follow'      // Apps Script 302s to googleusercontent.com
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    }).then(function (text) {
      // A misconfigured deployment ("Who has access" not set to Anyone) answers
      // with an HTTP 200 sign-in PAGE, so status alone is not proof of a write.
      // Only {"ok":true} counts; anything else is queued and retried.
      var body;
      try { body = JSON.parse(text); } catch (e) {
        throw new Error('endpoint did not return JSON — is "Who has access" set to Anyone?');
      }
      if (!body || body.ok !== true) throw new Error(body && body.error ? body.error : 'endpoint rejected the write');
      return body;
    });
  }

  // Under bursts of requests Apps Script answers with an HTML error page — but
  // measured behaviour is that it STILL RUNS the script and writes the row; only
  // the response is lost. So a "failure" here often means the lead is already
  // saved, which is exactly why the script dedupes on submission id: without it
  // these retries would each add a duplicate row. Spaced-out real traffic does
  // not trigger it; the retries cover genuine transient failures.
  var SHEET_ATTEMPTS = 3;

  function postToSheet(payload) {
    function attempt(n) {
      return postOnce(payload)['catch'](function (err) {
        if (n >= SHEET_ATTEMPTS) throw err;
        return new Promise(function (resolve) {
          window.setTimeout(resolve, 1200 * n);
        }).then(function () { return attempt(n + 1); });
      });
    }
    return attempt(1);
  }

  function logToSheet(payload) {
    if (!CONFIG.sheetEndpoint) return;

    // Queue FIRST, drop it only once the write is confirmed. Submitting now
    // navigates to success.html, and an unloading page may never run a .catch —
    // so a failure must already be persisted rather than recorded on rejection.
    // A retry of a row that did land is harmless: the script dedupes on id.
    enqueue(payload);

    postToSheet(payload).then(function (body) {
      dequeue(payload.id);
      // Logged on success too, so "did it record?" is answerable from the console.
      // Rows land in the "Leads" tab, which the script creates — not Sheet1.
      console.info('[X9] Recorded to the "Leads" tab' +
        (body.duplicate ? ' (already recorded earlier)' : body.row ? ' — row ' + body.row : ''));
    })['catch'](function (err) {
      console.warn('[X9] Sheet write failed, kept in queue for retry:', err && err.message);
    });
  }

  // Retry anything stranded by an earlier failure or by the page unloading.
  function flushQueue() {
    if (!CONFIG.sheetEndpoint) return;
    var q = readQueue();
    if (!q.length) return;
    console.info('[X9] Retrying ' + q.length + ' queued lead(s)…');
    q.forEach(function (payload) {
      postToSheet(payload).then(function (body) {
        dequeue(payload.id);
        console.info('[X9] Queued lead recorded' + (body.duplicate ? ' (was already saved)' : ''));
      })['catch'](function (err) {
        // Never silent: a lead that cannot be saved has to be visible.
        console.warn('[X9] Queued lead still failing:', err && err.message);
      });
    });
  }

  /* --- Validation ------------------------------------------------------ */
  // Accepts 10-digit Indian mobiles, with or without +91 / 0 prefix.
  function normalisePhone(raw) {
    var digits = String(raw).replace(/\D/g, '');
    if (digits.length === 12 && digits.indexOf('91') === 0) digits = digits.slice(2);
    if (digits.length === 11 && digits.charAt(0) === '0') digits = digits.slice(1);
    return /^[6-9]\d{9}$/.test(digits) ? digits : null;
  }

  function setFieldError(input, message) {
    var field = input.closest('.field');
    if (!field) return;
    var err = $('.err', field);
    if (message) {
      field.classList.add('invalid');
      input.setAttribute('aria-invalid', 'true');
      if (err) err.textContent = message;
    } else {
      field.classList.remove('invalid');
      input.removeAttribute('aria-invalid');
    }
  }

  function validate(form) {
    var firstBad = null;

    $$('input, select', form).forEach(function (el) {
      if (!el.name) return;
      var value = el.value.trim();
      var message = '';

      if (!value) {
        message = el.tagName === 'SELECT' ? 'Please pick an option.' : 'This one is needed.';
      } else if (el.name === 'phone') {
        if (!normalisePhone(value)) message = 'Enter a valid 10-digit Indian mobile number.';
      } else if (el.name === 'name' && value.length < 2) {
        message = 'Your name, as you would say it.';
      }

      setFieldError(el, message);
      if (message && !firstBad) firstBad = el;
    });

    if (firstBad) {
      firstBad.focus();
      firstBad.scrollIntoView({ block: 'center', behavior: REDUCED ? 'auto' : 'smooth' });
      return false;
    }
    return true;
  }

  /* ======================================================================
     CLAIM MODAL
     Progressive enhancement: the form lives inline in the HTML and is moved
     into the <dialog> here. If <dialog> is unsupported it stays inline and
     every CTA keeps working as a plain #claim anchor.
     ====================================================================== */
  var form = $('#claimForm');
  var modal = $('#claimModal');
  var modalBody = $('#modalBody');
  var formHost = $('#claimFormHost');
  var canModal = !!(modal && modalBody && form && typeof modal.showModal === 'function');

  /* --- Form variants ----------------------------------------------------
     One form, two contexts. A CTA carrying data-variant="growth" opens it with
     Growth Site wording; everything else gets the ₹1 default. `interest` is
     what lands in the sheet, so leads are separable at a glance.
     The HTML holds the ₹1 copy so the no-JS inline form still reads correctly.
     -------------------------------------------------------------------- */
  var VARIANTS = {
    rupee: {
      interest: '₹1 Website',
      eyebrow: 'Batch 1 · limited slots',
      title: 'Claim your ₹1 slot',
      sub: 'One minute, six answers. No payment now.',
      submit: 'Claim my slot →',
      note: 'Your answers come straight to us — that\'s your slot request in. No payment now. The ₹1 happens only on the call, after everything is explained.'
    },
    growth: {
      interest: 'Growth Site',
      eyebrow: 'Growth Site · ₹10–20K',
      title: 'Ask about the Growth Site',
      sub: 'One minute, six answers. We\'ll come back with an exact quote.',
      submit: 'Ask about the Growth Site →',
      note: 'Your answers come straight to us. Nothing to pay and nothing fixed yet — the exact quote depends on what your business needs, and we work that out on a 10-minute call.'
    }
  };

  var variant = 'rupee';

  function applyVariant(name) {
    variant = VARIANTS[name] ? name : 'rupee';
    var v = VARIANTS[variant];

    var eyebrow = $('#modalEyebrow');
    var title = $('#modalTitle');
    var sub = $('#modalSub');
    if (eyebrow) eyebrow.textContent = v.eyebrow;
    if (title) title.textContent = v.title;
    if (sub) sub.textContent = v.sub;

    var submitBtn = form && $('.form-btn', form);
    if (submitBtn) submitBtn.textContent = v.submit;
    var note = form && $('.form-note', form);
    if (note) note.textContent = v.note;
  }

  /* --- Draft autofill: remember what they typed, prefill next time ------ */
  var DRAFT_KEY = 'x9-claim-draft';

  function readDraft() {
    try { return JSON.parse(window.localStorage.getItem(DRAFT_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function writeDraft(data) {
    try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (e) { /* private mode */ }
  }
  function clearDraft() {
    try { window.localStorage.removeItem(DRAFT_KEY); } catch (e) { /* private mode */ }
  }
  function saveDraft() {
    if (!form) return;
    var data = {};
    $$('input, select', form).forEach(function (el) {
      if (el.name && el.value) data[el.name] = el.value;
    });
    writeDraft(data);
  }
  function restoreDraft() {
    if (!form) return;
    var data = readDraft();
    $$('input, select', form).forEach(function (el) {
      // Never overwrite something the visitor (or the browser) already filled.
      if (el.name && !el.value && data[el.name]) el.value = data[el.name];
    });
  }

  /* --- Form state ------------------------------------------------------- */
  // Success now lives on success.html, so there is no panel to toggle here —
  // this only has to make the form usable again if the modal is reopened.
  function resetFormState() {
    if (!form) return;
    form.style.display = '';
    var btn = $('.form-btn', form);
    // Label follows whichever variant is open, not a hardcoded string.
    if (btn) { btn.disabled = false; btn.textContent = VARIANTS[variant].submit; }
    $$('input, select', form).forEach(function (el) { setFieldError(el, ''); });
  }

  function openModal(variantName) {
    if (!canModal) return false;
    applyVariant(variantName);
    resetFormState();
    restoreDraft();
    modal.showModal();
    document.body.classList.add('modal-open');
    // Focus the first field on pointer devices; on touch this would throw up the
    // keyboard and hide the form, so let the dialog's default focus stand.
    if (window.matchMedia('(hover:hover)').matches) {
      var first = $('input, select', form);
      if (first) window.setTimeout(function () { first.focus(); }, 80);
    }
    return true;
  }

  if (canModal) {
    modalBody.appendChild(form);

    // The section that held the form now gets a button to open it.
    if (formHost) {
      var openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'form-btn open-form-btn';
      openBtn.textContent = 'Open the 1-minute form →';
      openBtn.addEventListener('click', function () { openModal(); });
      formHost.appendChild(openBtn);

      var hostNote = document.createElement('p');
      hostNote.className = 'form-note';
      hostNote.textContent = 'Six answers, about a minute. No payment now — the ₹1 only happens on the call, after everything is explained.';
      formHost.appendChild(hostNote);
    }

    // Every CTA on the page opens the modal instead of jumping to the section.
    // data-variant picks the wording; without it, the ₹1 default applies.
    $$('a[href="#claim"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        openModal(a.getAttribute('data-variant'));
      });
    });

    var closeBtn = $('#modalClose');
    if (closeBtn) closeBtn.addEventListener('click', function () { modal.close(); });

    // Click on the backdrop (the dialog element itself) closes it.
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.close();
    });

    // Fires for the close button, Esc, and programmatic close alike.
    modal.addEventListener('close', function () {
      document.body.classList.remove('modal-open');
    });
  }

  /* --- Submit → sheet, then the success page --------------------------- */
  if (form) {
    // Clear a field's error as soon as the visitor starts fixing it, and keep a
    // local draft so a half-filled form survives a close or a reload.
    ['input', 'change'].forEach(function (evt) {
      form.addEventListener(evt, function (e) {
        var field = e.target.closest && e.target.closest('.field');
        if (field && field.classList.contains('invalid')) setFieldError(e.target, '');
        saveDraft();
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate(form)) return;

      // NOTE: read fields through form.elements — `form.name` is the form's own
      // name property, not the "name" input, which is why the earlier version
      // sent an empty name.
      var f = form.elements;
      var phone = normalisePhone(f.phone.value);

      var btn = $('.form-btn', form);
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

      // Record it to the Google Sheet (no-op until CONFIG.sheetEndpoint is set).
      logToSheet({
        token: CONFIG.sheetToken,
        id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
        interest: VARIANTS[variant].interest,   // "₹1 Website" or "Growth Site"
        name: f.name.value.trim(),
        business: f.business.value.trim(),
        what: f.what.value.trim(),
        phone: phone,
        content: f.content.value,
        paid: f.paid.value,
        source: leadSource(),
        page: window.location.href
      });

      // Submitted — the draft has served its purpose.
      clearDraft();

      // Hand off to the standalone success page. sessionStorage, never query
      // params — a first name is personal data and does not belong in a URL,
      // browser history or server logs.
      try {
        window.sessionStorage.setItem(SUCCESS_KEY, JSON.stringify({
          firstName: f.name.value.trim().split(/\s+/)[0],
          interest: VARIANTS[variant].interest,   // which offer converted
          at: Date.now()
        }));
      } catch (e) { /* private mode — the page copes without it */ }

      window.location.href = '/success';
    });
  }

  /* ======================================================================
     CONTACT LINKS FROM CONFIG
     ====================================================================== */
  if (NUMBER_READY) {
    $$('[data-wa-link]').forEach(function (a) {
      a.href = 'https://wa.me/' + CONFIG.whatsapp +
        '?text=' + encodeURIComponent('Hi X9 — I saw the ₹1 website offer.');
    });
  }
  $$('[data-email]').forEach(function (a) {
    a.href = 'mailto:' + CONFIG.email;
    if (!a.textContent.trim()) a.textContent = CONFIG.email;
  });
  $$('[data-instagram]').forEach(function (a) {
    a.href = 'https://instagram.com/' + CONFIG.instagram;
  });

  /* --- Footer year ------------------------------------------------------ */
  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* --- Retry any sheet writes that failed on a previous visit ----------- */
  flushQueue();
})();
