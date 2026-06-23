// utils.js — Pure helper functions for TabForge.
// No chrome.* calls here so this module is trivially unit-testable in Node.
// Imported by both popup.js and background.js.

/** Freemium limits. Centralized so the paywall is a single code path. */
export const LIMITS = {
  FREE_MAX_SESSIONS: 5,
  FREE_MIN_AUTOSAVE_MINUTES: 15,
  PRO_MIN_AUTOSAVE_MINUTES: 1,
  // Tab schemes we cannot restore — filtered out on save.
  UNSUPPORTED_SCHEMES: ['chrome:', 'chrome-extension:', 'edge:', 'about:', 'devtools:', 'view-source:'],
};

/** Default settings applied on first install / when a field is missing. */
export const DEFAULT_SETTINGS = {
  autoSave: false,
  intervalMinutes: 15,
  pro: false,
  theme: 'dark',
};

/**
 * Generate a short, collision-resistant id.
 * crypto.randomUUID exists in service workers, popups, and modern Node.
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random suffix.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** True if a url can be reopened by chrome.tabs.create. */
export function isRestorableUrl(url) {
  if (typeof url !== 'string' || url.length === 0) return false;
  const lower = url.toLowerCase();
  return !LIMITS.UNSUPPORTED_SCHEMES.some((scheme) => lower.startsWith(scheme));
}

/**
 * Normalize a raw chrome tab into the minimal shape we persist.
 * Drops anything we can't restore and trims fields to keep payloads small.
 */
export function normalizeTab(tab) {
  if (!tab || !isRestorableUrl(tab.url)) return null;
  return {
    url: tab.url,
    title: typeof tab.title === 'string' ? tab.title.slice(0, 300) : tab.url,
    pinned: Boolean(tab.pinned),
    favIconUrl: typeof tab.favIconUrl === 'string' && tab.favIconUrl.startsWith('http')
      ? tab.favIconUrl
      : '',
  };
}

/** Convert a list of raw chrome tabs into normalized, restorable tabs. */
export function normalizeTabs(tabs) {
  if (!Array.isArray(tabs)) return [];
  return tabs.map(normalizeTab).filter(Boolean);
}

/** Build the lightweight index entry stored in chrome.storage.sync. */
export function toIndexEntry(session) {
  return {
    id: session.id,
    name: session.name,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    auto: Boolean(session.auto),
    tabCount: Array.isArray(session.tabs) ? session.tabs.length : (session.tabCount || 0),
  };
}

/** Minimum allowed auto-save interval for the current tier. */
export function minAutoSaveMinutes(settings) {
  return settings && settings.pro
    ? LIMITS.PRO_MIN_AUTOSAVE_MINUTES
    : LIMITS.FREE_MIN_AUTOSAVE_MINUTES;
}

/**
 * Whether the user may save another session.
 * Returns { allowed, reason }. Auto-saves replace a rolling slot so they never
 * count against the free cap (otherwise auto-save would brick a free user).
 */
export function canSaveMore(indexEntries, settings, { isAuto = false } = {}) {
  if (settings && settings.pro) return { allowed: true, reason: '' };
  if (isAuto) return { allowed: true, reason: '' };
  const manualCount = (indexEntries || []).filter((e) => !e.auto).length;
  if (manualCount >= LIMITS.FREE_MAX_SESSIONS) {
    return {
      allowed: false,
      reason: `Free plan is limited to ${LIMITS.FREE_MAX_SESSIONS} saved sessions. Upgrade to Pro for unlimited.`,
    };
  }
  return { allowed: true, reason: '' };
}

/** Clamp an auto-save interval to the tier minimum and a sane maximum. */
export function clampInterval(minutes, settings) {
  const floor = minAutoSaveMinutes(settings);
  const n = Number(minutes);
  if (!Number.isFinite(n)) return floor;
  return Math.min(Math.max(Math.round(n), floor), 1440); // cap at 24h
}

/** Human-friendly relative time, e.g. "3m ago", "2h ago", "Jun 22". */
export function formatRelativeTime(timestamp, now = Date.now()) {
  const diff = now - timestamp;
  if (diff < 0) return 'just now';
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** "1 tab" / "12 tabs". */
export function pluralizeTabs(count) {
  return `${count} ${count === 1 ? 'tab' : 'tabs'}`;
}

/** Suggest a session name from the current time, e.g. "Session — Jun 22, 3:45 PM". */
export function suggestSessionName(now = new Date()) {
  const date = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `Session — ${date}, ${time}`;
}

/** Escape user-controlled text before injecting into innerHTML. */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Detect duplicate tabs within a session by normalized url (Pro feature helper).
 * Returns { unique: [...], duplicates: number }.
 */
export function dedupeTabs(tabs) {
  const seen = new Set();
  const unique = [];
  let duplicates = 0;
  for (const tab of tabs || []) {
    const key = (tab.url || '').split('#')[0];
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    unique.push(tab);
  }
  return { unique, duplicates };
}

/**
 * Validate a parsed import payload before it touches storage.
 * Accepts the object produced by buildExport(). Returns { valid, sessions, error }.
 */
export function validateImport(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, sessions: [], error: 'File is not valid TabForge JSON.' };
  }
  const list = Array.isArray(parsed.sessions) ? parsed.sessions : null;
  if (!list) {
    return { valid: false, sessions: [], error: 'No "sessions" array found in file.' };
  }
  const sessions = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const tabs = normalizeTabs(raw.tabs);
    if (tabs.length === 0) continue; // skip empty/unrestorable sessions
    sessions.push({
      id: typeof raw.id === 'string' ? raw.id : generateId(),
      name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 120) : 'Imported session',
      createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
      updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : Date.now(),
      auto: false, // imported sessions are treated as manual
      tabs,
    });
  }
  if (sessions.length === 0) {
    return { valid: false, sessions: [], error: 'No restorable sessions in this file.' };
  }
  return { valid: true, sessions, error: '' };
}

/** Build the export envelope written to a .json download. */
export function buildExport(sessions) {
  return {
    app: 'TabForge',
    version: 1,
    exportedAt: Date.now(),
    sessions: sessions || [],
  };
}
