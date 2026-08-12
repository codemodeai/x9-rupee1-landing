# X9 CREATIVES — ₹1 Website Landing Page

A single-page, no-build landing page for the ₹1 website offer. Plain HTML, CSS and
vanilla JS — no dependencies, no toolchain, deployable to any static host.

## Run it locally

```powershell
.\serve.ps1
```

Opens <http://localhost:5173> and serves the folder. Ctrl+C to stop.
`-Port 8080` to change the port, `-NoBrowser` to skip auto-opening the browser.

> Open it through the server, not by double-clicking `index.html` — a `file://`
> page can't load the fonts or run the form handler cleanly. And make sure you're
> on `localhost:5173`, not the old `x9-rupee1-landing (1).html` draft, which has no
> modal and scrolls to an inline form instead.

Avoid plain `python -m http.server` here: it sends `Last-Modified` with no
`Cache-Control`, so browsers cache CSS/JS heuristically and a refresh can silently
keep running the old JavaScript. `dev-server.py` exists to prevent exactly that.
If a change ever seems not to apply, hard-reload with **Ctrl+Shift+R**.

## Files

```
index.html               the landing page (copy, structure, JSON-LD)
success.html             post-submit thank-you page (noindex)
assets/css/styles.css    all styling, 19 numbered sections
assets/js/main.js        CONFIG block + form, validation, scroll animation
assets/js/success.js     success page: personalisation + return countdown
assets/img/x9-logo.png   brand mark — nav logo, favicon, apple-touch-icon
assets/img/og-cover.png  1200×630 social share card
robots.txt               crawler rules
sitemap.xml              single-URL sitemap
serve.ps1                local preview server
dev-server.py            the server itself — adds no-cache headers
google-apps-script.gs    paste into the Google Sheet to collect leads
x9-rupee1-landing (1).html   original single-file draft, kept for reference
```

The logo was extracted from `../../Website/Assets/Logo 1.jpeg` and masked to a
transparent circle so it sits on the paper background. The social card is
generated, not hand-drawn — regenerate it if the headline or pricing changes.

## Before you go live — 4 things

1. **WhatsApp number.** Open `assets/js/main.js` and set `CONFIG.whatsapp` to your
   number in international format, digits only — e.g. `919876543210`. Until you do,
   the form runs in **preview mode**: it validates and shows the success panel but
   does not open a broken `wa.me` link. Set `CONFIG.email` and `CONFIG.instagram`
   in the same block.
2. **Domain.** Replace `https://x9creatives.in/` in `index.html` (canonical,
   `og:url`, `og:image`, `twitter:image`, both JSON-LD blocks) plus `robots.txt`
   and `sitemap.xml`. The `og:image` must be an absolute URL or previews break.
3. **Instagram link** in the proof section (`data-instagram`) — the JS fills the
   href from CONFIG; the hardcoded fallback covers no-JS visitors.
4. **Google Sheet endpoint** — `CONFIG.sheetEndpoint` ships empty, so nothing is
   recorded until you deploy the Apps Script. See the section below.

## Layout

Two container widths, both driven by tokens in `:root`:

- `--wrap: 1140px` — nav, hero, footer.
- `--measure: 720px` — reading width for body sections, applied via
  `.wrap.narrow > *` so body copy stays on the **same left grid line** as the nav
  logo and hero headline instead of being centred independently.

The hero is a two-column grid: headline and proof points on the left, the offer
card (₹1, MRP tag, CTA) on the right. It collapses to one column at 940px, and the
card goes full-width at 600px.

The ₹1 figure is **Inter 800, not the display serif** — Fraunces is high-contrast,
so its rupee crossbars render as hairlines at any weight and the price reads faint.
The ₹2,501 first-year total is not repeated in the card; it lives in the catch
section and the FAQ.

## Animation

| What | Where |
|---|---|
| Hero headline reveals line by line behind a mask | `.hero h1 .line` |
| Offer card rises, ₹1 pops, ribbon and MRP tag settle | `cardIn`, `pricePop`, `ribbonIn`, `mrpIn` |
| Lime marker sweeps across highlighted words | `.hl` — `background-size 0 → 100%` |
| Sections fade up on scroll, with direction variants | `.rv`, `data-anim="left\|right\|zoom"` |
| List items stagger in | `[data-stagger]`, JS sets `--i` per child |
| Nav condenses and blurs past 20px of scroll | `.site-nav.scrolled` |
| Lime scroll-progress bar | `#progressBar` |
| Sticky bottom CTA on phones, hidden over the form | `#mobileCta` |
| FAQ `+` rotates to `×`, answer fades in | `details[open]` |

**Careful with tilted elements.** `animation-fill-mode: both` beats the base rule,
so a generic `rise` keyframe ending on `transform:none` will flatten a rotated
element. That's why the MRP tag has its own `mrpIn` keyframe and its tilt lives in
a `--tilt` variable that both the static rule and the keyframe read — a breakpoint
straightens the tag by setting `--tilt: 0deg`.

Everything collapses to no motion under `prefers-reduced-motion: reduce`, and a
`<noscript>` block forces all reveals visible if JS never runs.

## The claim flow

Every CTA on the page (`a[href="#claim"]`) opens a **modal form** rather than
scrolling to a section. The flow is: click → dialog opens → fill → submit →
success panel → back to the top of the page.

Built as progressive enhancement. The form lives inline inside `#claimFormHost`
in the HTML; on load `main.js` moves it into `<dialog id="claimModal">` and
replaces it with an "Open the 1-minute form" button. If `<dialog>` is
unsupported the form simply stays inline and every CTA works as a plain anchor.

- **Native `<dialog>` + `showModal()`** — focus trapping, Esc, and the `::backdrop`
  come from the platform. Clicking the backdrop also closes it.
- **Two kinds of autofill.** Real `autocomplete` tokens (`name`, `organization`,
  `tel-national`) let the browser/password-manager fill it; separately, a draft is
  kept in `localStorage` under `x9-claim-draft` as they type, so closing the modal
  and reopening restores what they had. The draft never overwrites a field that
  already has a value, and it is cleared on successful submit.
- **Success is its own page** — `success.html`, not a panel inside the modal.
  Submitting navigates there. It is `noindex,nofollow` (a thank-you page must
  never appear in search results) and is the right place to add a conversion
  pixel or GA event later, since reaching it means a real submission.
- **Handoff via `sessionStorage`, never query params.** The success page needs the
  visitor's first name and the WhatsApp link, and that link embeds their name and
  phone number — personal data does not belong in a URL, browser history or
  server logs. Key: `x9-claim-success`, read once then deleted, so a reload or a
  later visit shows generic copy instead of replaying someone's details.
- **Back to the page** after a 20-second countdown, or immediately via the button.
  Any click, keypress, scroll or touch cancels the countdown — someone reading the
  page should not have it yanked away. Under `prefers-reduced-motion` there is no
  auto-return at all.
- **Mobile** (≤600px) the dialog becomes a bottom sheet: full width, pinned to the
  bottom, sliding up. The first field is deliberately **not** auto-focused on touch
  devices — that would throw up the keyboard and cover the form.

> `margin:auto` is set explicitly on `.modal`. A modal dialog is centred by the UA
> via auto margins, and the `*{margin:0}` reset at the top of the stylesheet kills
> that — without it the dialog sits in the top-left corner.

## Recording leads to a Google Sheet

A static page can't write to Sheets directly, so submissions POST to a **Google
Apps Script web app** bound to your sheet, which appends a row. No server, no
API keys, no third-party service. `google-apps-script.gs` is the script.

**Setup (about 5 minutes, needs your Google account):**

1. Create a Google Sheet — name it whatever you like, e.g. "X9 ₹1 Leads".
2. In that sheet: **Extensions → Apps Script**. Delete the placeholder `myFunction`
   and paste the entire contents of `google-apps-script.gs`.
3. Change `SHARED_TOKEN` at the top to any random string. Save (Ctrl+S).
4. **Deploy → New deployment**, gear icon → **Web app**. Set:
   - *Description*: anything
   - *Execute as*: **Me**
   - *Who has access*: **Anyone** ← must be "Anyone", not "Anyone with Google account"
5. Click Deploy and **Authorize access** — Google will warn that the app isn't
   verified; it's your own script, so choose *Advanced → Go to … (unsafe)*.
6. Copy the **Web app URL** (ends in `/exec`). In `assets/js/main.js` set
   `CONFIG.sheetEndpoint` to that URL and `CONFIG.sheetToken` to the same string
   you used in step 3.

Paste the `/exec` URL into a browser to smoke-test it — it should return
`{"ok":true,"service":"x9-claim-form","sheet":"Leads"}`. The `Leads` tab, its
header row and text formatting on the phone column are all created on first write.

Columns: Received at · Name · Business · What they sell · WhatsApp · Content ready
· Paid for marketing before · Source · Page · Submission ID.

**If you redeploy the script after editing it**, use *Deploy → Manage deployments
→ edit → New version*, otherwise the `/exec` URL keeps serving the old code.

### How it behaves

The sheet write is **fire-and-forget and never blocks the submission** — WhatsApp
remains the primary hand-off, so a Sheets or Apps Script outage can't cost you a
lead or show the visitor an error.

- A lead is written to the `localStorage` queue (`x9-sheet-queue`, last 20)
  **before** the request goes out, and removed only once the write is confirmed.
  It has to be that way round: submitting navigates to `success.html`, and an
  unloading page may never run a rejection handler — so a failure has to be
  already persisted rather than recorded when it happens.
- `success.html` loads `main.js` purely so its `flushQueue()` can confirm or retry
  that in-flight write. The landing page can't do it — it's already gone. Every
  other part of `main.js` is guarded on landing-page elements and no-ops there.
- Every submission carries a unique `id`, and the script skips an `id` it has
  already recorded. This matters precisely because a request can reach Apps Script,
  append the row, and *then* fail on the response — without the check, the retry
  would duplicate the lead.
- The POST uses `Content-Type: text/plain` on purpose. That keeps it a CORS
  "simple request"; Apps Script cannot answer a preflight `OPTIONS`, so any other
  content type gets blocked by the browser.
- `CONFIG.sheetToken` is visible in page source, so it is not real security — it
  only stops casual drive-by posting to your endpoint. Don't treat it as auth.
- Leave `CONFIG.sheetEndpoint` empty and logging is skipped entirely; the form
  still works.

## What the form does

Submitting doesn't hit a server. It validates, normalises the phone number, builds
a pre-filled message and opens `wa.me` in a new tab — the visitor taps send. The
message includes a **Source** line taken from `utm_source` / `utm_campaign` (or the
referrer), so leads from different ads are distinguishable in your inbox.

For ad links, append the params:

```
https://x9creatives.in/?utm_source=instagram&utm_campaign=batch1
```

Phone input accepts `9876543210`, `+91 98765 43210` and `09876543210`, and
normalises all three to ten digits. If you later want leads stored rather than
messaged, the submit handler in `main.js` is the single place to POST to a form
endpoint or sheet.

## Notes

- **Prices are hardcoded in copy** (₹1, ₹2,500, ₹2,501, ₹10–20K, ₹30K). If any
  change, update `index.html` in three places: the catch section, the FAQ, **and**
  the FAQ JSON-LD block at the bottom, which mirrors the FAQ. Mismatched structured
  data can be flagged by Google.
- **Accessibility:** skip link, focus rings, `aria-labelledby` per section,
  `role="alert"` errors, reduced-motion fallbacks.
- **Fonts** come from Google Fonts, so the first paint needs a network round trip;
  Georgia and system-ui are the fallbacks. To make the page fully self-contained,
  download Fraunces + Inter into `assets/fonts/` and swap the `<link>` for
  `@font-face` rules.

## Deploy (Vercel)

No build step, no framework — Vercel serves the folder as static files.

```powershell
npx vercel            # first run: log in + link the project, creates a preview
npx vercel --prod     # promote to production
```

When it asks: **build command** → leave empty, **output directory** → leave empty
(the repo root *is* the output).

### URLs

`vercel.json` sets `cleanUrls: true`, so pages have no `.html` extension:

| File | URL |
|---|---|
| `index.html` | `/` |
| `success.html` | `/success` |
| `404.html` | shown automatically for unknown paths |

`/success.html` 308-redirects to `/success`. All internal links already use the
clean form, and `dev-server.py` resolves them the same way so local matches prod.

### What does NOT deploy

`.vercelignore` keeps `README.md`, `serve.ps1`, `dev-server.py`,
`google-apps-script.gs` and `archive/` out of the deploy. Without it, every one of
those would be a public URL — including the Apps Script source and its token.

### Headers

`vercel.json` sets a **Content-Security-Policy** that has to stay in step with what
the page actually loads:

- `style-src` / `font-src` → Google Fonts
- `connect-src` → `script.google.com` **and** `script.googleusercontent.com`
  (the Apps Script POST redirects to the second one — omitting it breaks lead
  capture silently)
- `style-src 'unsafe-inline'` → the `<noscript>` block in `index.html`

`dev-server.py` reads these same headers out of `vercel.json`, so a CSP mistake
shows up locally instead of in production. If you add an analytics script, a pixel,
or an embedded font, the CSP needs updating or it will be blocked.

CSS and JS are served `max-age=0, must-revalidate` on purpose. Filenames are not
content-hashed, so a long cache would mean edits silently not appearing — the exact
trap that `dev-server.py` exists to avoid. Revalidation costs one cheap 304.

### Domain

Live domain: **`details.x9creatives.in`**

Add it in Vercel under *Project → Settings → Domains*, then create the DNS record
it shows you (a `CNAME` for `details` pointing at `cname.vercel-dns.com`) with
whoever hosts `x9creatives.in`. HTTPS is issued automatically once DNS resolves.

The domain is hardcoded in **8 places** across `index.html` (canonical, `og:url`,
`og:image`, `twitter:image`, and the JSON-LD `url`/`logo`), `sitemap.xml` and
`robots.txt`. If it ever changes, update all of them — a canonical tag pointing at
a dead domain will keep the page out of search results, and a wrong `og:image` URL
means no preview image when the link is shared.

Note `CONFIG.email` in `main.js` is `hello@x9creatives.in` — an address on the root
domain, deliberately not the subdomain.
