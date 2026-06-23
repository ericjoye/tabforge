// background.js — TabForge service worker (MV3, ES module).
//
// Responsibilities:
//   1. First-install setup (seed default settings).
//   2. Auto-save on a chrome.alarms schedule (survives worker restarts; setInterval does not).
//   3. Keyboard command handling (save / restore-last).
//   4. A small message API for the popup to trigger save/restore and refresh alarms.
//
// Service workers are ephemeral: never keep state in module globals — always read
// from storage on each event.

import {
  getSettings,
  listSessions,
  getSession,
  putSession,
  putAutoSession,
  getIndex,
} from './storage.js';
import {
  normalizeTabs,
  canSaveMore,
  suggestSessionName,
  clampInterval,
  isRestorableUrl,
} from './utils.js';

const AUTOSAVE_ALARM = 'tabforge-autosave';

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(async (details) => {
  // Seed settings on first install so getSettings() always has a backing object.
  const settings = await getSettings();
  await syncAutoSaveAlarm(settings);
  if (details.reason === 'install') {
    console.log('[TabForge] Installed. Welcome — Ctrl+Shift+S to save a session.');
  }
});

// Re-arm the alarm whenever the worker spins back up.
chrome.runtime.onStartup.addListener(async () => {
  const settings = await getSettings();
  await syncAutoSaveAlarm(settings);
});

// ---------------------------------------------------------------------------
// Auto-save via alarms
// ---------------------------------------------------------------------------

/** Create/clear the recurring auto-save alarm to match current settings. */
export async function syncAutoSaveAlarm(settings) {
  await chrome.alarms.clear(AUTOSAVE_ALARM);
  if (settings && settings.autoSave) {
    const minutes = clampInterval(settings.intervalMinutes, settings);
    chrome.alarms.create(AUTOSAVE_ALARM, {
      periodInMinutes: minutes,
      delayInMinutes: minutes,
    });
    console.log(`[TabForge] Auto-save armed every ${minutes} min.`);
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== AUTOSAVE_ALARM) return;
  try {
    const settings = await getSettings();
    if (!settings.autoSave) return;
    await saveCurrentWindow({ auto: true });
  } catch (err) {
    console.warn('[TabForge] auto-save failed:', err.message);
  }
});

// ---------------------------------------------------------------------------
// Core actions
// ---------------------------------------------------------------------------

/**
 * Save the current window's tabs as a session.
 * @param {{auto?: boolean, name?: string}} opts
 * @returns {Promise<{ok: boolean, session?: object, error?: string, skipped?: number}>}
 */
export async function saveCurrentWindow({ auto = false, name } = {}) {
  const rawTabs = await chrome.tabs.query({ currentWindow: true });
  const tabs = normalizeTabs(rawTabs);
  const skipped = rawTabs.length - tabs.length;

  if (tabs.length === 0) {
    return { ok: false, error: 'No restorable tabs in this window.', skipped };
  }

  const settings = await getSettings();
  const index = await getIndex();
  const gate = canSaveMore(index, settings, { isAuto: auto });
  if (!gate.allowed) {
    return { ok: false, error: gate.reason };
  }

  const sessionName = name || (auto ? `Auto-save — ${suggestSessionName()}` : suggestSessionName());
  const session = auto
    ? await putAutoSession(sessionName, tabs)
    : await putSession({ name: sessionName, tabs, auto: false });

  // Subtle feedback: badge flash so a keyboard save feels acknowledged.
  flashBadge(auto ? '↻' : '✓');
  return { ok: true, session, skipped };
}

/**
 * Restore a session's tabs into a brand-new window so the user's current
 * window is never disturbed. Tabs are created in batches to avoid a stampede.
 * @param {string} id
 */
export async function restoreSession(id) {
  const session = await getSession(id);
  if (!session || !Array.isArray(session.tabs) || session.tabs.length === 0) {
    return { ok: false, error: 'Session not found or empty.' };
  }

  const urls = session.tabs.filter((t) => isRestorableUrl(t.url));
  if (urls.length === 0) {
    return { ok: false, error: 'No restorable tabs in this session.' };
  }

  // First tab opens the new window; the rest are appended to it.
  const firstWin = await chrome.windows.create({ url: urls[0].url, focused: true });
  const windowId = firstWin.id;

  // Pin the first tab if needed.
  if (urls[0].pinned && firstWin.tabs && firstWin.tabs[0]) {
    try { await chrome.tabs.update(firstWin.tabs[0].id, { pinned: true }); } catch (_) {}
  }

  for (let i = 1; i < urls.length; i += 1) {
    const t = urls[i];
    try {
      await chrome.tabs.create({ windowId, url: t.url, pinned: t.pinned, active: false });
    } catch (err) {
      console.warn('[TabForge] failed to open tab:', t.url, err.message);
    }
  }

  return { ok: true, count: urls.length };
}

/** Restore the most recently updated session (used by the keyboard shortcut). */
export async function restoreLast() {
  const sessions = await listSessions();
  if (sessions.length === 0) {
    return { ok: false, error: 'No saved sessions yet.' };
  }
  return restoreSession(sessions[0].id);
}

// ---------------------------------------------------------------------------
// Keyboard commands
// ---------------------------------------------------------------------------

chrome.commands.onCommand.addListener(async (command) => {
  try {
    if (command === 'save-session') {
      const res = await saveCurrentWindow({ auto: false });
      if (!res.ok) flashBadge('!');
    } else if (command === 'restore-last') {
      const res = await restoreLast();
      if (!res.ok) flashBadge('!');
    }
  } catch (err) {
    console.warn(`[TabForge] command "${command}" failed:`, err.message);
    flashBadge('!');
  }
});

// ---------------------------------------------------------------------------
// Message API (popup ⇄ background)
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      switch (message && message.type) {
        case 'save-current':
          sendResponse(await saveCurrentWindow({ auto: false, name: message.name }));
          break;
        case 'restore-session':
          sendResponse(await restoreSession(message.id));
          break;
        case 'restore-last':
          sendResponse(await restoreLast());
          break;
        case 'sync-alarm': {
          const settings = await getSettings();
          await syncAutoSaveAlarm(settings);
          sendResponse({ ok: true });
          break;
        }
        default:
          sendResponse({ ok: false, error: 'Unknown message type.' });
      }
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }
  })();
  return true; // keep the channel open for the async response
});

// ---------------------------------------------------------------------------
// UI feedback
// ---------------------------------------------------------------------------

/** Briefly show a badge on the toolbar icon, then clear it. */
function flashBadge(text) {
  try {
    chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
    chrome.action.setBadgeText({ text });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 1200);
  } catch (_) {
    // setTimeout in a worker can be reclaimed; the badge is cosmetic, ignore failures.
  }
}
