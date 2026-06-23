# TabForge — Tab Session Manager for Chrome

Save & restore tab sessions in one click. Auto-save, export/import, keyboard shortcuts. Fast, private, developer-focused.

## Features

- **Save & Restore Sessions** — Snapshot your current window's tabs and restore them later, in order
- **Auto-Save** — Automatically save sessions on a configurable schedule
- **Keyboard Shortcuts** — `Ctrl+Shift+S` to save, `Ctrl+Shift+R` to restore last session
- **Export / Import** — Download sessions as JSON, import on another machine
- **Dark Mode** — Clean, modern UI that's easy on the eyes
- **Privacy First** — No accounts, no tracking, no cloud. All data stays in your browser

## Installation

### From Source

1. Clone this repo
2. Open Chrome → `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" → select the repo folder
5. Done!

### Chrome Web Store

*(Coming soon)*

## Usage

1. Click the TabForge icon in your toolbar
2. Type a session name (or use the auto-suggested one)
3. Click **Save** or press `Ctrl+Shift+S`
4. To restore: click any saved session in the popup
5. Enable auto-save in Settings for automatic snapshots

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+S` | Save current window as session |
| `Ctrl+Shift+R` | Restore most recent session |

## Tech Stack

- Chrome Extension Manifest V3
- ES Modules (no build step)
- `chrome.storage` (sync + local)
- `chrome.alarms` for auto-save
- Zero dependencies

## Project Structure

```
├── manifest.json      # MV3 manifest
├── popup.html         # Popup UI
├── popup.css          # Styles (dark mode)
├── popup.js           # Popup controller
├── background.js      # Service worker (alarms, commands)
├── storage.js         # Storage layer (sync index + local payloads)
├── utils.js           # Shared utilities
└── icons/             # Extension icons
```

## Freemium

- **Free**: 5 saved sessions, auto-save every 15 minutes
- **Pro** ($4.99 one-time): Unlimited sessions, auto-save as frequent as 1 minute, cloud sync (coming soon)

## License

MIT
