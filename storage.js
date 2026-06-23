// storage.js — Persistence layer for TabForge.
//
// Storage split (see plan.md):
//   - chrome.storage.sync  → tiny "index" (list of session metadata) + "settings".
//     Syncs across devices, but capped at 100KB total / 8KB per item.
//   - chrome.storage.local → full session payloads under `session:<id>` keys.
//     Large quota, never synced. Keeps big tab arrays out of the sync quota.
//
// Every public function is async and resolves even when chrome.storage errors;
// failures are logged and surfaced as thrown Errors the callers can catch.

import {
  DEFAULT_SETTINGS,
  toIndexEntry,
  generateId,
} from './utils.js';

const INDEX_KEY = 'index';
const SETTINGS_KEY = 'settings';
const SESSION_PREFIX = 'session:';

const sessionKey = (id) => `${SESSION_PREFIX}${id}`;

/** Promise wrapper around a chrome.storage area get. */
function areaGet(area, keys) {
  return new Promise((resolve, reject) => {
    area.get(keys, (result) => {
      const err = chrome.runtime.lastError;
      if (err) return reject(new Error(err.message));
      resolve(result || {});
    });
  });
}

/** Promise wrapper around a chrome.storage area set. */
function areaSet(area, items) {
  return new Promise((resolve, reject) => {
    area.set(items, () => {
      const err = chrome.runtime.lastError;
      if (err) return reject(new Error(err.message));
      resolve();
    });
  });
}

/** Promise wrapper around a chrome.storage area remove. */
function areaRemove(area, keys) {
  return new Promise((resolve, reject) => {
    area.remove(keys, () => {
      const err = chrome.runtime.lastError;
      if (err) return reject(new Error(err.message));
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/** Read settings, merged over defaults so new fields always have a value. */
export async function getSettings() {
  try {
    const data = await areaGet(chrome.storage.sync, SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...(data[SETTINGS_KEY] || {}) };
  } catch (err) {
    console.warn('[TabForge] getSettings failed, using defaults:', err.message);
    return { ...DEFAULT_SETTINGS };
  }
}

/** Patch settings and return the merged result. */
export async function saveSettings(patch) {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await areaSet(chrome.storage.sync, { [SETTINGS_KEY]: next });
  return next;
}

// ---------------------------------------------------------------------------
// Index (session metadata list)
// ---------------------------------------------------------------------------

/** Read the session index from sync, falling back to local if sync is empty. */
export async function getIndex() {
  try {
    const data = await areaGet(chrome.storage.sync, INDEX_KEY);
    if (Array.isArray(data[INDEX_KEY])) return data[INDEX_KEY];
  } catch (err) {
    console.warn('[TabForge] getIndex sync read failed:', err.message);
  }
  // Fallback for environments where sync was unavailable when we wrote.
  try {
    const local = await areaGet(chrome.storage.local, INDEX_KEY);
    if (Array.isArray(local[INDEX_KEY])) return local[INDEX_KEY];
  } catch (err) {
    console.warn('[TabForge] getIndex local read failed:', err.message);
  }
  return [];
}

/**
 * Persist the index. Tries sync first (so the list roams across devices); if the
 * sync quota is exceeded, falls back to local so the user never loses their list.
 */
async function saveIndex(index) {
  try {
    await areaSet(chrome.storage.sync, { [INDEX_KEY]: index });
    // Mirror to local as a recovery copy.
    await areaSet(chrome.storage.local, { [INDEX_KEY]: index });
  } catch (err) {
    console.warn('[TabForge] index sync write failed, using local only:', err.message);
    await areaSet(chrome.storage.local, { [INDEX_KEY]: index });
  }
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

/** Return the index entries (metadata only), newest first. */
export async function listSessions() {
  const index = await getIndex();
  return [...index].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

/** Load a full session payload (with tabs) by id, or null if missing. */
export async function getSession(id) {
  try {
    const data = await areaGet(chrome.storage.local, sessionKey(id));
    return data[sessionKey(id)] || null;
  } catch (err) {
    console.warn('[TabForge] getSession failed:', err.message);
    return null;
  }
}

/** Load every full session payload (used for export). */
export async function getAllSessions() {
  const index = await getIndex();
  const out = [];
  for (const entry of index) {
    const full = await getSession(entry.id);
    if (full) out.push(full);
  }
  return out;
}

/**
 * Create or update a session. Writes the payload to local and refreshes the
 * matching index entry in one consistent operation.
 * @param {{id?, name, tabs, auto?, createdAt?}} session
 */
export async function putSession(session) {
  const now = Date.now();
  const record = {
    id: session.id || generateId(),
    name: session.name,
    auto: Boolean(session.auto),
    createdAt: session.createdAt || now,
    updatedAt: now,
    tabs: Array.isArray(session.tabs) ? session.tabs : [],
  };

  // Write payload first; if this fails we never touch the index (no dangling entry).
  await areaSet(chrome.storage.local, { [sessionKey(record.id)]: record });

  const index = await getIndex();
  const without = index.filter((e) => e.id !== record.id);
  without.push(toIndexEntry(record));
  await saveIndex(without);

  return record;
}

/**
 * Auto-save slot: keeps a single rolling "auto" session updated in place so
 * repeated auto-saves don't pile up. Returns the saved record.
 */
export async function putAutoSession(name, tabs) {
  const index = await getIndex();
  const existingAuto = index.find((e) => e.auto);
  return putSession({
    id: existingAuto ? existingAuto.id : undefined,
    name,
    tabs,
    auto: true,
    createdAt: existingAuto ? existingAuto.createdAt : Date.now(),
  });
}

/** Rename a session in both the payload and the index. */
export async function renameSession(id, name) {
  const full = await getSession(id);
  if (!full) throw new Error('Session not found.');
  full.name = name;
  full.updatedAt = Date.now();
  await areaSet(chrome.storage.local, { [sessionKey(id)]: full });
  const index = await getIndex();
  const updated = index.map((e) => (e.id === id ? { ...e, name, updatedAt: full.updatedAt } : e));
  await saveIndex(updated);
  return full;
}

/** Delete a session payload and its index entry. */
export async function deleteSession(id) {
  await areaRemove(chrome.storage.local, sessionKey(id));
  const index = await getIndex();
  await saveIndex(index.filter((e) => e.id !== id));
}

/** Delete every session and clear the index (keeps settings). */
export async function clearAllSessions() {
  const index = await getIndex();
  const keys = index.map((e) => sessionKey(e.id));
  if (keys.length) await areaRemove(chrome.storage.local, keys);
  await saveIndex([]);
}

/**
 * Merge imported sessions into storage without overwriting existing ones.
 * New ids are minted on collision so an import never destroys current data.
 * Returns the number of sessions added.
 */
export async function importSessions(sessions) {
  const index = await getIndex();
  const existingIds = new Set(index.map((e) => e.id));
  let added = 0;
  for (const s of sessions) {
    const session = { ...s };
    if (existingIds.has(session.id)) session.id = generateId();
    existingIds.add(session.id);
    await putSession(session);
    added += 1;
  }
  return added;
}
