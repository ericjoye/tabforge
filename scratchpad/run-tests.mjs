// TabForge Phase 3 test runner.
// Runs from the project root. Exercises: JS syntax (node --check), JSON validity,
// manifest integrity, icon presence/dimensions, popup.html/popup.js ID parity,
// and functional unit tests against the pure helpers in utils.js.

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as U from '../utils.js';

const ROOT = new URL('..', import.meta.url).pathname;
let pass = 0;
let fail = 0;
const fails = [];

function ok(name, cond, detail = '') {
  if (cond) { pass += 1; console.log(`  PASS  ${name}`); }
  else { fail += 1; fails.push(name + (detail ? ` — ${detail}` : '')); console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}
function section(t) { console.log(`\n## ${t}`); }

// --- 1. JS syntax via node --check -----------------------------------------
section('JS syntax (node --check)');
for (const f of ['manifest is json', 'background.js', 'storage.js', 'utils.js', 'popup.js']) {
  if (f === 'manifest is json') continue;
  try {
    execFileSync(process.execPath, ['--check', ROOT + f], { stdio: 'pipe' });
    ok(`node --check ${f}`, true);
  } catch (e) {
    ok(`node --check ${f}`, false, String(e.stderr || e.message).split('\n')[0]);
  }
}

// --- 2. JSON validity -------------------------------------------------------
section('JSON validity');
for (const f of ['manifest.json', 'stripe.json']) {
  try { JSON.parse(readFileSync(ROOT + f, 'utf8')); ok(`${f} parses`, true); }
  catch (e) { ok(`${f} parses`, false, e.message); }
}

// --- 3. Manifest integrity --------------------------------------------------
section('Manifest V3 integrity');
const m = JSON.parse(readFileSync(ROOT + 'manifest.json', 'utf8'));
ok('manifest_version === 3', m.manifest_version === 3);
ok('has name', !!m.name);
ok('has semver version', /^\d+\.\d+\.\d+$/.test(m.version));
ok('service worker is module', m.background?.type === 'module' && m.background?.service_worker === 'background.js');
ok('background.js file exists', existsSync(ROOT + m.background.service_worker));
ok('action popup exists', existsSync(ROOT + m.action.default_popup));
ok('declares tabs+storage+alarms perms', ['tabs', 'storage', 'alarms'].every((p) => m.permissions.includes(p)));
ok('save-session command bound', m.commands?.['save-session']?.suggested_key?.default === 'Ctrl+Shift+S');
ok('restore-last command bound', m.commands?.['restore-last']?.suggested_key?.default === 'Ctrl+Shift+R');
for (const [size, rel] of Object.entries(m.icons)) {
  ok(`icon ${size} referenced & exists`, existsSync(ROOT + rel));
}

// --- 4. Icons present with correct PNG dimensions ---------------------------
section('Icons (PNG signature + dimensions)');
function pngSize(path) {
  const b = readFileSync(path);
  const sig = b.slice(0, 8).toString('hex') === '89504e470d0a1a0a';
  const w = b.readUInt32BE(16);
  const h = b.readUInt32BE(20);
  return { sig, w, h };
}
for (const s of [16, 48, 128]) {
  const p = `${ROOT}icons/icon${s}.png`;
  if (!existsSync(p)) { ok(`icon${s}.png exists`, false); continue; }
  const { sig, w, h } = pngSize(p);
  ok(`icon${s}.png valid ${s}x${s} PNG`, sig && w === s && h === s, `got ${w}x${h} sig=${sig}`);
}

// --- 5. popup.html ↔ popup.js ID parity -------------------------------------
section('popup.html / popup.js DOM id parity');
const html = readFileSync(ROOT + 'popup.html', 'utf8');
const js = readFileSync(ROOT + 'popup.js', 'utf8');
const ids = [...js.matchAll(/\$\('([\w-]+)'\)/g)].map((x) => x[1]);
const htmlIds = new Set([...html.matchAll(/id="([\w-]+)"/g)].map((x) => x[1]));
for (const id of ids) ok(`#${id} present in popup.html`, htmlIds.has(id));
ok('popup.html loads popup.js as module', /<script type="module" src="popup\.js">/.test(html));
ok('popup.html links popup.css', /href="popup\.css"/.test(html));

// --- 6. Functional unit tests: pure helpers in utils.js ---------------------
section('Functional unit tests (utils.js)');

// isRestorableUrl
ok('isRestorableUrl http ok', U.isRestorableUrl('https://example.com') === true);
ok('isRestorableUrl chrome:// rejected', U.isRestorableUrl('chrome://extensions') === false);
ok('isRestorableUrl about: rejected', U.isRestorableUrl('about:blank') === false);
ok('isRestorableUrl empty rejected', U.isRestorableUrl('') === false);
ok('isRestorableUrl non-string rejected', U.isRestorableUrl(null) === false);

// normalizeTabs filters & trims
const norm = U.normalizeTabs([
  { url: 'https://a.com', title: 'A', pinned: true, favIconUrl: 'https://a.com/f.ico' },
  { url: 'chrome://settings', title: 'nope' },
  { url: 'https://b.com', title: 'x'.repeat(500), favIconUrl: 'data:image/png;base64,xx' },
  null,
]);
ok('normalizeTabs drops unsupported + null', norm.length === 2);
ok('normalizeTabs keeps pinned flag', norm[0].pinned === true);
ok('normalizeTabs trims title to 300', norm[1].title.length === 300);
ok('normalizeTabs drops non-http favicon', norm[1].favIconUrl === '');
ok('normalizeTabs non-array -> []', Array.isArray(U.normalizeTabs('x')) && U.normalizeTabs('x').length === 0);

// canSaveMore freemium gate
const fiveManual = Array.from({ length: 5 }, (_, i) => ({ id: i, auto: false }));
ok('free blocked at 5 manual', U.canSaveMore(fiveManual, { pro: false }).allowed === false);
ok('free allowed under 5', U.canSaveMore(fiveManual.slice(0, 4), { pro: false }).allowed === true);
ok('auto-save bypasses free cap', U.canSaveMore(fiveManual, { pro: false }, { isAuto: true }).allowed === true);
ok('pro unlimited', U.canSaveMore(fiveManual, { pro: true }).allowed === true);

// clampInterval tier floors + ceiling
ok('free clamps below 15 -> 15', U.clampInterval(2, { pro: false }) === 15);
ok('pro allows 1', U.clampInterval(1, { pro: true }) === 1);
ok('clamps above 1440 -> 1440', U.clampInterval(99999, { pro: true }) === 1440);
ok('non-finite -> floor', U.clampInterval('abc', { pro: false }) === 15);

// dedupeTabs (Pro helper) ignores hash
const dd = U.dedupeTabs([{ url: 'https://x.com#a' }, { url: 'https://x.com#b' }, { url: 'https://y.com' }]);
ok('dedupeTabs collapses by url sans-hash', dd.unique.length === 2 && dd.duplicates === 1);

// validateImport round-trips buildExport
const exported = U.buildExport([{ id: '1', name: 'S', tabs: [{ url: 'https://z.com', title: 'Z' }] }]);
const vi = U.validateImport(exported);
ok('validateImport accepts buildExport output', vi.valid === true && vi.sessions.length === 1);
ok('validateImport rejects junk', U.validateImport({ nope: 1 }).valid === false);
ok('validateImport rejects empty/unrestorable', U.validateImport({ sessions: [{ tabs: [{ url: 'chrome://x' }] }] }).valid === false);

// escapeHtml prevents injection
ok('escapeHtml neutralizes tags', U.escapeHtml('<img onerror=x>') === '&lt;img onerror=x&gt;');

// formatRelativeTime buckets
const now = 1_000_000_000_000;
ok('relTime <60s -> just now', U.formatRelativeTime(now - 30_000, now) === 'just now');
ok('relTime minutes', U.formatRelativeTime(now - 5 * 60_000, now) === '5m ago');
ok('relTime hours', U.formatRelativeTime(now - 3 * 3600_000, now) === '3h ago');
ok('relTime days', U.formatRelativeTime(now - 2 * 86_400_000, now) === '2d ago');

// pluralizeTabs
ok('pluralize 1 tab', U.pluralizeTabs(1) === '1 tab');
ok('pluralize 3 tabs', U.pluralizeTabs(3) === '3 tabs');

// generateId uniqueness
ok('generateId unique', U.generateId() !== U.generateId());

// toIndexEntry shape
const ie = U.toIndexEntry({ id: 'a', name: 'n', createdAt: 1, updatedAt: 2, auto: true, tabs: [{}, {}] });
ok('toIndexEntry computes tabCount', ie.tabCount === 2 && ie.auto === true);

// DEFAULT_SETTINGS / LIMITS sanity
ok('DEFAULT_SETTINGS sane', U.DEFAULT_SETTINGS.intervalMinutes === 15 && U.DEFAULT_SETTINGS.pro === false);
ok('LIMITS free cap = 5', U.LIMITS.FREE_MAX_SESSIONS === 5);

// --- 7. Monetization wiring -------------------------------------------------
section('Monetization wiring');
const stripe = JSON.parse(readFileSync(ROOT + 'stripe.json', 'utf8'));
const LINK = 'https://buy.stripe.com/8x2eVe9Da7AZbxY21ObAs0g';
ok('stripe.json holds live link', stripe.payment_link_url === LINK && stripe.livemode === true);
ok('landing.html embeds Stripe link', readFileSync(ROOT + 'landing.html', 'utf8').includes(LINK));
ok('popup.js upgrade button uses live Stripe link', js.includes(LINK));
ok('popup.js has no placeholder upgrade url', !js.includes('tabforge.app/upgrade'));

// --- summary ---------------------------------------------------------------
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
if (fail) { console.log('FAILURES:\n- ' + fails.join('\n- ')); process.exit(1); }
