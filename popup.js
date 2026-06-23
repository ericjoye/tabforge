// popup.js — TabForge popup controller (ES module).
// Thin UI layer: reads/writes via storage.js, delegates tab operations to the
// service worker via chrome.runtime.sendMessage, and renders the session list.

import {
  listSessions,
  getSettings,
  saveSettings,
  deleteSession,
  clearAllSessions,
  getAllSessions,
  importSessions,
} from './storage.js';
import {
  formatRelativeTime,
  pluralizeTabs,
  suggestSessionName,
  escapeHtml,
  clampInterval,
  minAutoSaveMinutes,
  validateImport,
  buildExport,
  LIMITS,
} from './utils.js';

// ---- Element references --------------------------------------------------
const $ = (id) => document.getElementById(id);
const els = {
  toast: $('toast'),
  nameInput: $('session-name'),
  saveBtn: $('save-btn'),
  settingsToggle: $('settings-toggle'),
  settingsPanel: $('settings-panel'),
  autosaveToggle: $('autosave-toggle'),
  intervalInput: $('interval-input'),
  exportBtn: $('export-btn'),
  importBtn: $('import-btn'),
  importFile: $('import-file'),
  proBanner: $('pro-banner'),
  upgradeBtn: $('upgrade-btn'),
  sessionList: $('session-list'),
  sessionCount: $('session-count'),
  clearAll: $('clear-all'),
  emptyState: $('empty-state'),
  planTag: $('plan-tag'),
};

let settings = null;

// ---- Messaging helper ----------------------------------------------------
function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response || { ok: false, error: 'No response from background.' });
      }
    });
  });
}

// ---- Toast ---------------------------------------------------------------
let toastTimer = null;
function toast(message, kind = 'info', ms = 2600) {
  els.toast.textContent = message;
  els.toast.className = `toast show ${kind}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.toast.className = 'toast'; }, ms);
}

// ---- Render --------------------------------------------------------------
function applyTheme() {
  document.body.dataset.theme = settings.theme === 'light' ? 'light' : 'dark';
}

function renderPlan() {
  const pro = Boolean(settings.pro);
  els.planTag.textContent = pro ? 'Pro' : 'Free';
  els.planTag.classList.toggle('pro', pro);
  els.proBanner.classList.toggle('hidden', pro);
}

function renderSettings() {
  els.autosaveToggle.checked = Boolean(settings.autoSave);
  els.intervalInput.value = settings.intervalMinutes;
  els.intervalInput.min = String(minAutoSaveMinutes(settings));
}

function faviconRow(tabs) {
  const shown = tabs.slice(0, 6);
  const imgs = shown
    .map((t) => (t.favIconUrl
      ? `<img src="${escapeHtml(t.favIconUrl)}" alt="" loading="lazy">`
      : '<img alt="" src="data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22/>">'))
    .join('');
  const more = tabs.length > 6 ? `<span class="more">+${tabs.length - 6}</span>` : '';
  return `<div class="favs">${imgs}${more}</div>`;
}

async function render() {
  const [sessions, full] = await Promise.all([listSessions(), getAllSessions()]);
  const byId = new Map(full.map((s) => [s.id, s]));

  const hasSessions = sessions.length > 0;
  els.emptyState.classList.toggle('hidden', hasSessions);
  els.clearAll.classList.toggle('hidden', !hasSessions);
  els.sessionCount.textContent = hasSessions
    ? `${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'}`
    : 'No sessions yet';

  els.sessionList.innerHTML = '';
  for (const entry of sessions) {
    const fullSession = byId.get(entry.id);
    const tabs = fullSession ? fullSession.tabs : [];
    const li = document.createElement('li');
    li.className = 'session-item';
    li.dataset.id = entry.id;
    li.innerHTML = `
      <div class="session-top">
        <span class="session-name ${entry.auto ? 'auto' : ''}" title="${escapeHtml(entry.name)}">${escapeHtml(entry.name)}</span>
      </div>
      <div class="session-meta">
        <span>${pluralizeTabs(entry.tabCount)}</span>
        <span>·</span>
        <span>${formatRelativeTime(entry.updatedAt)}</span>
      </div>
      ${tabs.length ? faviconRow(tabs) : ''}
      <div class="session-actions">
        <button class="mini-btn restore" data-action="restore">Restore</button>
        <button class="mini-btn" data-action="rename">Rename</button>
        <button class="mini-btn delete" data-action="delete">Delete</button>
      </div>`;
    els.sessionList.appendChild(li);
  }
}

// ---- Actions -------------------------------------------------------------
async function handleSave() {
  els.saveBtn.disabled = true;
  const name = els.nameInput.value.trim() || suggestSessionName();
  const res = await sendMessage({ type: 'save-current', name });
  els.saveBtn.disabled = false;
  if (res.ok) {
    els.nameInput.value = '';
    const extra = res.skipped ? ` (${res.skipped} unsupported skipped)` : '';
    toast(`Saved “${res.session.name}”${extra}`, 'success');
    await render();
  } else {
    toast(res.error || 'Save failed.', 'error', 4000);
  }
}

async function handleListClick(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const li = e.target.closest('.session-item');
  if (!li) return;
  const id = li.dataset.id;
  const action = btn.dataset.action;

  if (action === 'restore') {
    btn.disabled = true;
    const res = await sendMessage({ type: 'restore-session', id });
    if (res.ok) toast(`Opened ${pluralizeTabs(res.count)} in a new window`, 'success');
    else toast(res.error || 'Restore failed.', 'error', 4000);
    btn.disabled = false;
  } else if (action === 'delete') {
    await deleteSession(id);
    toast('Session deleted', 'info');
    await render();
  } else if (action === 'rename') {
    const current = li.querySelector('.session-name').textContent;
    const next = prompt('Rename session:', current);
    if (next && next.trim() && next.trim() !== current) {
      const { renameSession } = await import('./storage.js');
      await renameSession(id, next.trim().slice(0, 120));
      await render();
    }
  }
}

async function handleClearAll() {
  if (!confirm('Delete all saved sessions? This cannot be undone.')) return;
  await clearAllSessions();
  toast('All sessions cleared', 'info');
  await render();
}

async function handleAutosaveToggle() {
  settings = await saveSettings({ autoSave: els.autosaveToggle.checked });
  await sendMessage({ type: 'sync-alarm' });
  toast(settings.autoSave ? `Auto-save on · every ${settings.intervalMinutes} min` : 'Auto-save off', 'info');
}

async function handleIntervalChange() {
  const clamped = clampInterval(els.intervalInput.value, settings);
  if (clamped !== Number(els.intervalInput.value)) {
    els.intervalInput.value = clamped;
    if (!settings.pro && clamped === LIMITS.FREE_MIN_AUTOSAVE_MINUTES) {
      toast(`Free plan minimum is ${LIMITS.FREE_MIN_AUTOSAVE_MINUTES} min. Upgrade for faster.`, 'info', 3500);
    }
  }
  settings = await saveSettings({ intervalMinutes: clamped });
  await sendMessage({ type: 'sync-alarm' });
}

async function handleExport() {
  const sessions = await getAllSessions();
  if (sessions.length === 0) {
    toast('Nothing to export yet.', 'info');
    return;
  }
  const payload = buildExport(sessions);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `tabforge-sessions-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`Exported ${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'}`, 'success');
}

async function handleImportFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const result = validateImport(parsed);
    if (!result.valid) {
      toast(result.error, 'error', 4000);
      return;
    }
    const added = await importSessions(result.sessions);
    toast(`Imported ${added} ${added === 1 ? 'session' : 'sessions'}`, 'success');
    await render();
  } catch (err) {
    toast('Could not read file: ' + err.message, 'error', 4000);
  } finally {
    e.target.value = ''; // allow re-importing the same file
  }
}

// Live Stripe checkout for TabForge Pro ($4.99 one-time). Kept here as the single
// source of truth for the in-extension purchase entry point; mirrors stripe.json
// and the landing page CTA.
const CHECKOUT_URL = 'https://buy.stripe.com/8x2eVe9Da7AZbxY21ObAs0g';

function handleUpgrade() {
  // Pro purchase flow — opens the Stripe payment link in a new tab.
  // window.TABFORGE_CHECKOUT_URL lets a future build override the link without a code change.
  const url = (typeof window !== 'undefined' && window.TABFORGE_CHECKOUT_URL) || CHECKOUT_URL;
  chrome.tabs.create({ url });
}

// ---- Init ----------------------------------------------------------------
async function init() {
  settings = await getSettings();
  applyTheme();
  renderPlan();
  renderSettings();
  await render();

  els.saveBtn.addEventListener('click', handleSave);
  els.nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSave(); });
  els.settingsToggle.addEventListener('click', () => els.settingsPanel.classList.toggle('hidden'));
  els.sessionList.addEventListener('click', handleListClick);
  els.clearAll.addEventListener('click', handleClearAll);
  els.autosaveToggle.addEventListener('change', handleAutosaveToggle);
  els.intervalInput.addEventListener('change', handleIntervalChange);
  els.exportBtn.addEventListener('click', handleExport);
  els.importBtn.addEventListener('click', () => els.importFile.click());
  els.importFile.addEventListener('change', handleImportFile);
  els.upgradeBtn.addEventListener('click', handleUpgrade);

  els.nameInput.placeholder = suggestSessionName();
}

document.addEventListener('DOMContentLoaded', init);
