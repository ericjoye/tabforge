# TabForge — Build Log

A running log of decisions, approaches, and lessons. Newest phases appended at the bottom.

---

## Phase 1 — Research & Plan

- Studied Chrome Extension **Manifest V3** and the existing a11y-annotator pattern.
- Key MV3 constraint identified early: **service workers are ephemeral** — they get killed and
  restarted, so no state can live in module globals and `setInterval` is unreliable for
  scheduling. This shaped the whole architecture.
- Chose a **storage split**: lightweight session *index* + settings in `chrome.storage.sync`
  (roams across the user's devices, but is quota-limited), full tab payloads in
  `chrome.storage.local` (large quota, never synced). Keeps big tab arrays out of the 100KB
  sync cap.
- Wrote the file structure and approach to `plan.md`.

## Phase 2 — Build Core

Built the full extension:

- `manifest.json` — MV3, module service worker, `tabs`/`storage`/`alarms` perms, two keyboard
  commands (Ctrl+Shift+S save, Ctrl+Shift+R restore-last).
- `utils.js` — **pure** helpers (no `chrome.*`), so the business logic is unit-testable in Node:
  url filtering, tab normalization, freemium gating, interval clamping, export/import
  validation, html escaping, relative-time formatting, dedupe.
- `storage.js` — promise-wrapped persistence layer over the sync/local split, with graceful
  fallback to local when sync writes fail (user never loses their list).
- `background.js` — service worker: auto-save via `chrome.alarms` (not setInterval), keyboard
  command handling, and a message API for the popup.
- `popup.html` / `popup.css` / `popup.js` — clean dark-mode UI; save bar, settings panel,
  session list with favicon rows, export/import, Pro banner.

**Lessons baked in:** auto-save uses `chrome.alarms` (survives worker restarts); restore always
opens a **new window** so the user's current workspace is never disturbed; rendered session
names are escaped to prevent HTML injection.

## Phase 3 — Test & Verify

- Wrote a dependency-free Node test runner (`scratchpad/run-tests.mjs`) that:
  1. runs `node --check` on all four JS files (all parse as ES modules on Node 26),
  2. validates `manifest.json` / `stripe.json` as JSON,
  3. checks the manifest as a **contract** (version, module worker, perms, command bindings,
     icon references all resolve to real files),
  4. byte-inspects each icon's PNG header + dimensions (16/48/128),
  5. verifies every `getElementById` in `popup.js` has a matching id in `popup.html` (17/17),
  6. **executes** the pure helpers in `utils.js` with real assertions (the freemium gate,
     interval clamping, tab normalization, export/import round-trip, XSS escaping, etc.),
  7. confirms the monetization wiring.
- **Result: 77/77 checks pass.** Full breakdown in `test-results.md`.
- **Bug found & fixed:** `popup.js > handleUpgrade()` pointed the in-extension upgrade button at
  a placeholder (`https://tabforge.app/upgrade`) instead of the live Stripe link. Rewired it to
  the real checkout URL via a `CHECKOUT_URL` constant (single source of truth, still overridable
  through `window.TABFORGE_CHECKOUT_URL`) and added two regression tests.
- **Decision:** Chrome-API modules can't be executed outside the browser sandbox, so they're
  covered by syntax + static-contract checks; the genuinely testable logic (all in `utils.js`)
  is exercised for real. A manual in-browser checklist is included in `test-results.md` for the
  parts only Chrome can verify.

## Phase 4 — Package & Prepare for Launch

- `zip` isn't installed on this machine, so built the package with Python's `zipfile` instead.
- Created **`TabForge.zip`** containing only the 10 shippable files (manifest, 4 JS, popup
  html/css, 3 icons) — no docs, no dev scripts, no `.git`. Verified with `testzip()` (no
  corruption), confirmed exactly 10 entries with the `icons/` path preserved. 25.8KB zipped.
- Confirmed all three icons exist at the correct dimensions (verified in Phase 3).
- Wrote **`store-listing.md`**: name, summary, full detailed description, category, permission
  justifications (reviewers require these), single-purpose statement, data-usage disclosure,
  a 5-screenshot shot list with captions, a promo-tile spec, and a ready-to-host privacy policy.
- The landing page (`landing.html`) already carried the live Stripe CTA from earlier work —
  verified rather than rebuilt.

## Phase 5 — Monetization Setup

- Stripe payment link for the $4.99 one-time Pro purchase already existed (`stripe.json`,
  `livemode: true`).
- **Verified the link is live:** `GET https://buy.stripe.com/8x2eVe9Da7AZbxY21ObAs0g` → HTTP 200,
  `<title>Stripe Checkout</title>`. (The `$4.99` is rendered client-side by Stripe's JS, so it's
  intentionally absent from the static HTML — not a defect.)
- Confirmed the link is wired in **three** places consistently: `stripe.json`, the landing page
  CTA, and (newly fixed) the in-extension upgrade button.
- Wrote **`launch-plan.md`**: pre-launch checklist, positioning vs. OneTab/Toby/Session Buddy,
  a staged channel plan (friends → Reddit/IndieHackers → Product Hunt + Show HN → niche
  communities), channel-tuned copy hooks, pricing mechanics + conversion triggers, metrics &
  targets, risks/mitigations, and a 2-week post-launch roadmap.
- **Honest gap flagged for launch:** Pro currently unlocks via a local `settings.pro` flag.
  Recommended a Stripe success-page unlock for day one, with a proper license-key API as the
  v1.1 follow-up — documented in the launch plan so it isn't a surprise.

### Final deliverables present
`manifest.json`, `popup.{html,css,js}`, `background.js`, `storage.js`, `utils.js`,
`icons/icon{16,48,128}.png`, `landing.html`, `plan.md`, `test-results.md`, `log.md`,
`store-listing.md`, `launch-plan.md`, `TabForge.zip` — all accounted for.
