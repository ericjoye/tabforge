# Claude Code — End-to-End Product Build

## Mission

Build a complete, monetizable Chrome extension from scratch. You are the SOUL of this project — ideate, build, test, package, and prepare for launch. Everything.

## Rules

1. **One task per phase** — complete each phase fully before moving to the next
2. **Write real code** — no placeholders, no TODO comments, no fake functionality
3. **Test as you go** — verify each feature works before building the next
4. **Keep it lean** — this runs on a 4-core/11GB WSL machine. Don't install heavy dependencies
5. **Log everything** — append to log.md after each phase

## The Product

Build a Chrome extension called **"TabForge"** — a tab management productivity tool.

### Why TabForge?
- Tab management is a universal pain point for developers
- Existing solutions (OneTab, Toby) are either too simple or too complex
- Opportunity for a clean, fast, developer-focused tab manager
- Easy to demo, easy to monetize (freemium: free basic, $4.99 pro)

### Core Features (MVP)

1. **Save & Restore Tab Sessions** — save current window's tabs as a named session, restore later
2. **Session Sidebar** — browser action popup shows saved sessions, click to restore
3. **Auto-save** — automatically save session every N minutes (configurable)
4. **Export/Import** — export sessions as JSON, import on another machine
5. **Keyboard Shortcuts** — Ctrl+Shift+S to save, Ctrl+Shift+R to restore last

### Pro Features (future, just structure the code to support them)

- Cloud sync across devices
- Tab grouping with colors
- Duplicate tab detection
- Session templates

## Phases (do in order)

### Phase 1: Research & Plan (5 min)
- Read the existing a11y-annotator extension to understand the pattern
- Study Chrome extension manifest v3 format
- Plan the file structure
- Write a plan to plan.md

### Phase 2: Build Core (15 min)
Create these files:
- `manifest.json` — Chrome Extension Manifest V3
- `popup.html` — popup UI
- `popup.css` — styles (clean, modern, dark mode)
- `popup.js` — popup logic (save/restore sessions)
- `background.js` — service worker (auto-save, keyboard shortcuts)
- `storage.js` — wrapper around chrome.storage.sync
- `utils.js` — helper functions

### Phase 3: Test & Verify (5 min)
- Verify the extension loads in Chrome (check manifest validity)
- Test each function individually
- Fix any issues found
- Write test results to test-results.md

### Phase 4: Package & Prepare for Launch (5 min)
- Create a professional zip file for Chrome Web Store
- Generate icons programmatically (SVG → PNG at 16, 48, 128px) using Python
- Write store listing copy (title, description, screenshots description)
- Create a simple landing page HTML
- Update log.md with everything you did

### Phase 5: Monetization Setup (5 min)
- Create a Stripe payment link for $4.99 one-time purchase
  (Use the existing Stripe setup)
- Update landing page with payment link
- Write a launch plan (where to post, what to say)

## Quality Standards

- All code must be real and functional — no stubs, no "implement later"
- UI must be polished — this is a product people will pay for
- Error handling everywhere — chrome.storage can fail, tabs can fail
- Clean code — commented, organized, maintainable
- No placeholder icons — generate real SVG icons

## Output

When done, your workspace should contain:
```
claude-workspace/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── background.js
├── storage.js
├── utils.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── landing.html
├── plan.md
├── test-results.md
├── log.md
├── store-listing.md
├── launch-plan.md
└── TabForge.zip
```

## Important

- This is a REAL product, not a demo. Build it like you're launching it tomorrow.
- Log every decision, every approach, every lesson learned to log.md
- We're watching how you work — your approach, your style, your decision-making
- Make it something we can actually sell
