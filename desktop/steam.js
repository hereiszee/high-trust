/* High Trust desktop: Steamworks behind a guard.
   The game must run without Steam (dev machines, CI, a Steam outage): every call here is a no-op unless init succeeded.
   App id, first match wins:
     1. SteamAppId env var (Steam sets it when it launches the game)
     2. HT_STEAM_APPID env var (local testing)
     3. steam_appid.txt next to the executable, in the working directory, or in desktop/ (dev).
        desktop/steam_appid.txt holds 480 (Valve's public "Spacewar" test app): a PLACEHOLDER for local testing only.
        Do not ship a steam_appid.txt in the depot.
   RELEASE_APP_ID: set it to the real app id once Steamworks assigns one. Packaged builds then call SteamAPI_RestartAppIfNecessary,
   so a copy started outside Steam relaunches through Steam (DRM-free builds can leave it at 0). */
'use strict';
const fs = require('fs'), path = require('path');
const RELEASE_APP_ID = 0; /* TODO(owner): your Steam app id */

const S = { ok: false, client: null, appId: 0, why: 'not started', unlocked: new Set(), presence: {} };

function readAppId(app) {
  for (const v of [process.env.SteamAppId, process.env.HT_STEAM_APPID]) if (v && /^\d+$/.test(v.trim())) return +v.trim();
  const dirs = [path.dirname(process.execPath), process.cwd(), __dirname];
  if (app && app.isPackaged) dirs.push(process.resourcesPath);
  for (const d of dirs) { try { const t = fs.readFileSync(path.join(d, 'steam_appid.txt'), 'utf8').trim(); if (/^\d+$/.test(t)) return +t } catch (e) { } }
  return 0;
}

/* call before app 'ready' (the overlay needs command-line switches). Returns true to keep running, false if Steam is relaunching us. */
function init(app, o = {}) {
  if (o.disabled) { S.why = 'disabled (--no-steam)'; return true }
  let sw;
  try { sw = require('steamworks.js') } catch (e) { S.why = 'steamworks.js not available: ' + (e && e.message); return true }
  if (app.isPackaged && RELEASE_APP_ID && !process.env.SteamAppId) {
    try { if (sw.restartAppIfNecessary(RELEASE_APP_ID)) { S.why = 'relaunching through Steam'; return false } } catch (e) { }
  }
  const id = readAppId(app) || RELEASE_APP_ID;
  if (!id) { S.why = 'no app id (no SteamAppId, HT_STEAM_APPID or steam_appid.txt)'; return true }
  try {
    S.client = sw.init(id); S.ok = true; S.appId = id; S.why = 'ok';
    try { sw.electronEnableSteamOverlay() } catch (e) { console.warn('[steam] overlay:', e && e.message) }
  } catch (e) { S.ok = false; S.client = null; S.why = 'init failed (is Steam running?): ' + (e && e.message) }
  console.log('[steam] ' + (S.ok ? 'ready, app ' + id : S.why));
  return true;
}

function unlock(id) {
  id = String(id || ''); if (!/^[A-Z0-9_]{1,64}$/.test(id)) return false;
  if (!S.ok) return false; if (S.unlocked.has(id)) return true;
  try { const a = S.client.achievement; if (a.isActivated(id) || a.activate(id)) { S.unlocked.add(id); return true } } catch (e) { console.warn('[steam] achievement', id, e && e.message) }
  return false;
}
function presence(key, value) {
  key = String(key || '').slice(0, 64); value = value == null ? null : String(value).slice(0, 255);
  if (!S.ok || !key || S.presence[key] === value) return; S.presence[key] = value;
  try { S.client.localplayer.setRichPresence(key, value) } catch (e) { }
}
function info() {
  let name = null; try { if (S.ok) name = S.client.localplayer.getName() } catch (e) { }
  return { ok: S.ok, appId: S.appId, why: S.why, placeholder: S.appId === 480, name };
}
module.exports = { init, unlock, presence, info, readAppId, RELEASE_APP_ID };
