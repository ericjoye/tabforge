# TabForge — Test Results (Phase 3)

**Date:** 2026-06-23
**Tester:** Automated suite (`scratchpad/run-tests.mjs`) + manual review
**Runtime:** Node v26.0.0 on Linux (WSL2)
**Result:** ✅ **77 / 77 checks passed, 0 failed**

---

## How to reproduce

```bash
node scratchpad/run-tests.mjs
```

The suite is dependency-free (Node built-ins only) and imports `utils.js` directly,
since that module is pure (no `chrome.*` calls) and therefore unit-testable in Node.
Chrome-dependent modules (`background.js`, `storage.js`, `popup.js`) cannot be *executed*
outside the extension sandbox, so they are validated by `node --check` (syntax/parse)
plus static contract checks (manifest references, DOM id parity).

---

## 1. JavaScript syntax — `node --check`

Every JS file parses cleanly as an ES module under Node 26's automatic module detection.

| File | Result |
|------|--------|
| `background.js` | ✅ PASS |
| `storage.js` | ✅ PASS |
| `utils.js` | ✅ PASS |
| `popup.js` | ✅ PASS |

## 2. JSON validity

| File | Result |
|------|--------|
| `manifest.json` | ✅ valid JSON |
| `stripe.json` | ✅ valid JSON |

## 3. Manifest V3 integrity

Validated the manifest as a contract rather than just as JSON:

- ✅ `manifest_version === 3`
- ✅ `name` present, `version` is valid semver (`1.0.0`)
- ✅ Background registered as **module** service worker → `background.js` (file exists)
- ✅ `action.default_popup` → `popup.html` (file exists)
- ✅ Permissions declare exactly what the code uses: `tabs`, `storage`, `alarms`
- ✅ Command `save-session` bound to `Ctrl+Shift+S`
- ✅ Command `restore-last` bound to `Ctrl+Shift+R`
- ✅ All three referenced icons (16/48/128) exist on disk

## 4. Icons — PNG signature + dimensions

Each icon was byte-inspected (PNG magic header + IHDR width/height), not just existence-checked:

| Icon | Expected | Actual | Result |
|------|----------|--------|--------|
| `icons/icon16.png` | 16×16 | 16×16 | ✅ |
| `icons/icon48.png` | 48×48 | 48×48 | ✅ |
| `icons/icon128.png` | 128×128 | 128×128 | ✅ |

## 5. popup.html ↔ popup.js DOM contract

Cross-checked every `document.getElementById(...)` lookup in `popup.js` against ids
declared in `popup.html`. All **17** referenced ids exist; no orphan lookups:

`toast, session-name, save-btn, settings-toggle, settings-panel, autosave-toggle,
interval-input, export-btn, import-btn, import-file, pro-banner, upgrade-btn,
session-list, session-count, clear-all, empty-state, plan-tag`

- ✅ `popup.html` loads `popup.js` with `type="module"` (required for the ES imports)
- ✅ `popup.html` links `popup.css`

## 6. Functional unit tests — `utils.js` (the business logic)

These actually **execute** the pure helpers and assert behavior — the real test of correctness.

**URL safety**
- ✅ `isRestorableUrl` accepts `https://`, rejects `chrome://`, `about:`, empty, and non-strings

**Tab normalization (save path)**
- ✅ `normalizeTabs` drops unsupported schemes and `null` entries
- ✅ preserves the `pinned` flag
- ✅ trims titles to 300 chars (keeps payloads small)
- ✅ drops non-`http` favicons (e.g. `data:` URIs)
- ✅ non-array input → `[]`

**Freemium gate (`canSaveMore`) — the paywall**
- ✅ Free user blocked at 5 manual sessions
- ✅ Free user allowed at 4
- ✅ Auto-save bypasses the cap (so auto-save never bricks a free user)
- ✅ Pro user = unlimited

**Auto-save interval clamping (`clampInterval`)**
- ✅ Free floor enforced (2 → 15)
- ✅ Pro allows 1 min
- ✅ Ceiling enforced (99999 → 1440 / 24h)
- ✅ Non-finite input → tier floor

**Export / Import round-trip**
- ✅ `validateImport(buildExport(x))` round-trips cleanly
- ✅ Rejects malformed JSON (no `sessions` array)
- ✅ Rejects sessions with zero restorable tabs
- ✅ `dedupeTabs` collapses URLs ignoring `#hash` (Pro helper)

**Display + safety helpers**
- ✅ `escapeHtml` neutralizes `<img onerror=…>` (XSS guard for rendered session names)
- ✅ `formatRelativeTime` buckets: just now / Xm / Xh / Xd
- ✅ `pluralizeTabs` singular/plural
- ✅ `generateId` returns unique ids
- ✅ `toIndexEntry` computes `tabCount` from the tab array
- ✅ `DEFAULT_SETTINGS` / `LIMITS` sane defaults

## 7. Monetization wiring

- ✅ `stripe.json` holds the live payment link, `livemode: true`
- ✅ `landing.html` embeds the Stripe link in the CTA button
- ✅ `popup.js` upgrade button opens the **live** Stripe link
- ✅ No leftover placeholder URL (`tabforge.app/upgrade`) anywhere in `popup.js`

**Live link check:** `GET https://buy.stripe.com/8x2eVe9Da7AZbxY21ObAs0g` → **HTTP 200**,
`<title>Stripe Checkout</title>`. (The `$4.99` amount is rendered client-side by Stripe's
JS, so it is intentionally absent from the static HTML — not a defect.)

---

## Issues found & fixed during Phase 3

1. **Placeholder checkout URL in the extension.** `popup.js > handleUpgrade()` pointed the
   in-extension "Upgrade · $4.99" button at a non-existent placeholder
   (`https://tabforge.app/upgrade`). Rewired it to the live Stripe payment link, hoisted to a
   `CHECKOUT_URL` constant (single source of truth, still overridable via
   `window.TABFORGE_CHECKOUT_URL`). Added two regression tests to lock this in.

No other defects found. Code is clean, error-handled, and ready to package.

## Manual / in-browser checks still recommended before store submission

Automated checks can't drive Chrome's tab APIs. Before publishing, load the unpacked
extension (`chrome://extensions` → Developer mode → Load unpacked) and confirm:

- [ ] Popup renders, dark theme applied
- [ ] Save current window → session appears with favicons + relative time
- [ ] Restore → opens tabs in a **new** window (current window untouched)
- [ ] `Ctrl+Shift+S` / `Ctrl+Shift+R` trigger save/restore with badge flash
- [ ] Auto-save toggle arms the alarm; interval respects the 15-min free floor
- [ ] Export downloads JSON; Import merges without overwriting existing sessions
- [ ] 6th manual save on free tier shows the upgrade prompt
