# TabForge — Chrome Web Store Listing

Copy-paste-ready listing content for the Chrome Web Store Developer Dashboard.

---

## Name (45 char max)

```
TabForge — Tab Session Manager
```

## Summary / short description (132 char max)

```
Save & restore your tabs in one click. Auto-save, export/import, keyboard shortcuts. Fast, private, developer-focused.
```

## Category

`Productivity`

## Language

`English`

---

## Detailed description

```
TabForge is a fast, private tab session manager for people who live in their browser.

Close a window full of research, docs, and dashboards — and bring it all back with one
click. No accounts. No cloud you didn't ask for. Your tabs never leave your machine.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT IT DOES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾  Save sessions
    Save every tab in your current window as a named session — one click, or press
    Ctrl+Shift+S. TabForge captures URLs, titles, pinned state, and favicons.

↻  Restore anytime
    Reopen any session in a fresh window. Your current workspace is never disturbed.
    Press Ctrl+Shift+R to restore your most recent session instantly.

⏰  Auto-save
    Let TabForge quietly snapshot your window on a schedule so a crash or an accidental
    "close window" never costs you your place again.

📤  Export & import
    Export all sessions to a JSON file and import them on another machine. Your data is
    portable and yours — back it up, move it, version it.

⌨️  Keyboard-first
    Ctrl+Shift+S to save, Ctrl+Shift+R to restore last. Stay in flow, hands on the keyboard.

🛡️  Privacy by default
    No sign-in. No analytics. No tracking. Sessions live in your browser's local storage;
    lightweight session metadata can roam across your own Chrome profile via Chrome sync.
    We never see your tabs.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FREE vs PRO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Free
  • Up to 5 saved sessions
  • Auto-save every 15 minutes
  • Full export / import
  • Keyboard shortcuts

Pro — $4.99 one-time (no subscription)
  • Unlimited saved sessions
  • Auto-save as often as every 1 minute
  • Priority support
  • Early access to: cloud sync, tab grouping with colors, duplicate-tab detection,
    and session templates

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHY TABFORGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Built Manifest V3, lightweight, and fast. No bloated dashboard, no onboarding wizard —
just save and restore that works the moment you install it. Made for developers, researchers,
and anyone who keeps 40 tabs open and means to.

Install free. Upgrade only if you love it.
```

---

## Permission justifications (required at submission)

Reviewers ask why each permission is needed. Use these verbatim:

| Permission | Justification |
|------------|---------------|
| `tabs` | Read the URLs and titles of tabs in the current window to save a session, and open tabs to restore one. This is the core function of the extension. |
| `storage` | Persist saved sessions and user settings locally (and sync lightweight session metadata across the user's own Chrome profile). No remote servers are involved. |
| `alarms` | Schedule the optional auto-save snapshot at the user-configured interval. `alarms` is used instead of `setInterval` because MV3 service workers are ephemeral. |

**Single purpose statement:**
> TabForge has one purpose: to save the set of open tabs in a browser window as a named
> session and restore that set of tabs later.

**Remote code:** None. All code is bundled in the package. No `eval`, no remote scripts.

**Data usage disclosure:** TabForge does **not** collect, transmit, or sell any user data.
All session data is stored locally via `chrome.storage`. Tick "I do not sell or transfer user
data to third parties" and "I do not use or transfer user data for purposes unrelated to my
item's single purpose."

---

## Screenshots to capture (1280×800 or 640×400 PNG)

The store allows up to 5. Suggested set, in order:

1. **Hero — populated popup.** The popup with 4–5 saved sessions, favicon rows visible,
   dark theme. Caption: "All your sessions, one click away."
2. **Saving a session.** Mid-save: the name input filled in, "Save" highlighted.
   Caption: "Name it and save — or just hit Ctrl+Shift+S."
3. **Restore in a new window.** Split view: popup on the left, a freshly restored window
   of tabs on the right. Caption: "Restore into a fresh window. Your workspace stays put."
4. **Settings / auto-save.** The settings panel open showing the auto-save toggle and
   interval. Caption: "Auto-save on a schedule. Never lose your tabs."
5. **Pro upgrade.** The Pro banner with "Upgrade · $4.99". Caption: "Go Pro for unlimited
   sessions — one-time $4.99, no subscription."

**Promo tile (440×280):** ⚒ TabForge wordmark on the indigo gradient (`#4338ca → #7c3aed`),
tagline "Save & restore your tabs."

---

## Store metadata checklist

- [ ] Icon: 128×128 PNG (use `icons/icon128.png`)
- [ ] At least 1 screenshot (1280×800 recommended)
- [ ] Small promo tile 440×280
- [ ] Privacy policy URL (host the section below as a public page)
- [ ] Support email / website
- [ ] Single purpose + permission justifications (above)
- [ ] Distribution: Public, all regions

---

## Privacy policy (host publicly; link in the dashboard)

```
TabForge Privacy Policy

TabForge does not collect, store, or transmit any personal data to us or any third party.

• Your saved tab sessions and settings are stored locally in your browser using the
  Chrome storage API.
• Lightweight session metadata (names, timestamps, tab counts) may sync across your own
  Chrome profile via Chrome's built-in sync, controlled entirely by your Google account
  settings. We have no access to it.
• We do not use analytics, advertising, or tracking of any kind.
• We do not sell or transfer user data.

Payments for TabForge Pro are processed by Stripe; we never receive your card details.

Questions: support@<your-domain>
```
