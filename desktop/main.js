/* High Trust desktop shell (Electron). See docs/steam/BUILD.md.
   - serves the game from local files under app://game/ (a privileged standard scheme: fetch, relative URLs, CORS and workers behave
     like https), never touches the network: every request that is not app:, data:, blob: or devtools: is cancelled
   - single instance, fullscreen by default, F11 / Alt+Enter toggle, windowed option remembered in desktop-settings.json
   - no menu bar, devtools only in dev (--dev or unpackaged), background throttling off, hardware acceleration on
   - the save lives in <userData>/saves/save.json (desktop/save-store.js) for Steam Auto-Cloud
   - Steamworks (desktop/steam.js) when available, silently absent otherwise
   Flags: --dev (devtools), --windowed, --fullscreen, --no-steam. Env: HT_USER_DATA (alternate profile folder, used by tests). */
'use strict';
const { app, BrowserWindow, protocol, ipcMain, session, Menu, shell, powerMonitor } = require('electron');
const path = require('path'), fs = require('fs'), { Readable } = require('stream');
const { SaveStore } = require('./save-store.js');
const steam = require('./steam.js');

const argv = process.argv.slice(1), flag = f => argv.includes('--' + f);
const DEV = flag('dev') || !app.isPackaged;
const DEVTOOLS = flag('dev') || (!app.isPackaged && !flag('no-devtools'));
/* game files: packaged -> resources/game (electron-builder extraResources), dev -> the repo root */
const GAME_ROOT = app.isPackaged ? path.join(process.resourcesPath, 'game') : path.resolve(__dirname, '..');
const ORIGIN = 'app://game';

/* one profile folder for dev and packaged builds, overridable for tests */
app.setName('High Trust');
app.setPath('userData', process.env.HT_USER_DATA ? path.resolve(process.env.HT_USER_DATA) : path.join(app.getPath('appData'), 'High Trust'));
const USER = app.getPath('userData');
fs.mkdirSync(USER, { recursive: true });

/* ---------- log ---------- */
const LOG = path.join(USER, 'high-trust.log');
try { fs.writeFileSync(LOG, `High Trust ${app.getVersion()} · Electron ${process.versions.electron} · ${process.platform} ${process.arch} · ${new Date().toISOString()}\n`) } catch (e) { }
function log(...a) { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(s); try { fs.appendFileSync(LOG, s + '\n') } catch (e) { } }

/* ---------- single instance ---------- */
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0) }

/* ---------- desktop settings (machine-local, not cloud-synced) ---------- */
const CFG_FILE = path.join(USER, 'desktop-settings.json');
const DECK = process.env.SteamDeck === '1';
const cfg = Object.assign({ fullscreen: true, vsync: true }, (() => { try { return JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')) } catch (e) { return {} } })());
if (flag('windowed')) cfg.fullscreen = false; if (flag('fullscreen')) cfg.fullscreen = true;
/* Interface size: the player's choice, else 110% on a Steam Deck, else 100% */
const curScale = () => cfg.uiScale != null ? cfg.uiScale : (DECK ? 1.1 : 1);
const saveCfg = () => { try { fs.writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 2)) } catch (e) { } };

/* ---------- Chromium switches (before ready) ---------- */
app.commandLine.appendSwitch('ignore-gpu-blocklist');                  /* older/Deck drivers: stay on the GPU */
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required'); /* a controller-only player still gets sound */
if (cfg.vsync === false) { app.commandLine.appendSwitch('disable-gpu-vsync'); app.commandLine.appendSwitch('disable-frame-rate-limit') }

/* ---------- Steam ---------- */
if (!steam.init(app, { disabled: flag('no-steam') })) { app.quit(); process.exit(0) }
log('[steam]', steam.info());

/* ---------- save ---------- */
const store = new SaveStore(path.join(USER, 'saves'));
store.load(); log('[save] loaded from', store.lastLoad, store.file);

/* ---------- app:// ---------- */
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true } }]);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.hdr': 'application/octet-stream', '.bin': 'application/octet-stream',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };
let OPT = null;
function optFor(src) {
  if (OPT === null) { try { OPT = JSON.parse(fs.readFileSync(path.join(GAME_ROOT, 'assets/opt/manifest.json'), 'utf8')).files || {} } catch (e) { OPT = {} } }
  const e = OPT[src]; if (!e) return null;
  for (const t of ['l', 'm']) { const f = e[t] && e[t].f; if (!f) continue; const u = f.glb || f.hdr || f.webp || f.jpg || f.png; if (u && fs.existsSync(path.join(GAME_ROOT, u))) return u }
  return null;
}
function serve(req) {
  const u = new URL(req.url);
  if (u.host !== 'game') return new Response('not found', { status: 404 });
  let rel = decodeURIComponent(u.pathname); if (rel === '/' || rel === '') rel = '/index.html';
  /* the shell has no service worker: offline is the default here */
  if (rel === '/sw.js') return new Response('', { status: 404 });
  const file = path.normalize(path.join(GAME_ROOT, rel));
  if (!file.startsWith(GAME_ROOT + path.sep)) return new Response('forbidden', { status: 403 });
  let st; try { st = fs.statSync(file) } catch (e) {
    /* the package ships assets/opt, not the source assets: a loader that asks for a source path before the manifest is in
       (js/world.js furniture, for one) gets the optimised file the manifest maps it to */
    const alt = optFor(rel.slice(1));
    if (alt) return serve({ url: ORIGIN + '/' + alt });
    log('[app] 404', rel); return new Response('not found', { status: 404 }) }
  if (!st.isFile()) return new Response('not found', { status: 404 });
  const headers = { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'content-length': String(st.size), 'cache-control': 'no-cache', 'access-control-allow-origin': '*' };
  return new Response(Readable.toWeb(fs.createReadStream(file)), { status: 200, headers });
}

/* ---------- window ---------- */
let win = null;
const [WIN_W, WIN_H] = (/^(\d+)x(\d+)$/.exec(process.env.HT_WINDOW_SIZE || '') || [0, DECK ? 1280 : 1600, DECK ? 800 : 900]).slice(1).map(Number); /* windowed size; tests use a small one */
const ICON = path.join(__dirname, 'build', 'icon.png');
function setFullscreen(on) { if (!win) return; on = !!on; win.setFullScreen(on); cfg.fullscreen = on; saveCfg() }
function createWindow() {
  win = new BrowserWindow({
    width: WIN_W, height: WIN_H, minWidth: 960, minHeight: 540, show: false, fullscreen: !!cfg.fullscreen, fullscreenable: true,
    title: 'High Trust', backgroundColor: '#16181c', autoHideMenuBar: true, icon: fs.existsSync(ICON) ? ICON : undefined,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true,
      devTools: DEVTOOLS, backgroundThrottling: false, spellcheck: false, autoplayPolicy: 'no-user-gesture-required' }
  });
  win.setMenuBarVisibility(false);
  win.once('ready-to-show', () => { win.show(); win.focus() });
  /* Interface size (Deck default 110%: the smallest HUD text is 10-11 px CSS at 1280x800) */
  win.webContents.on('did-finish-load', () => win.webContents.setZoomFactor(uiScale(curScale())));
  win.on('enter-full-screen', () => { cfg.fullscreen = true; saveCfg(); win.webContents.send('ht:fullscreen', true) });
  win.on('leave-full-screen', () => { cfg.fullscreen = false; saveCfg(); win.webContents.send('ht:fullscreen', false) });
  win.on('page-title-updated', e => e.preventDefault());
  const wc = win.webContents;
  /* F11 and Alt+Enter toggle fullscreen; Esc is left alone (the game's pause key). Devtools key only in dev. */
  wc.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    if (i.key === 'F11' || (i.alt && (i.key === 'Enter' || i.code === 'Enter' || i.code === 'NumpadEnter'))) { e.preventDefault(); setFullscreen(!win.isFullScreen()); return }
    if (DEVTOOLS && (i.key === 'F12' || (i.control && i.shift && i.key.toLowerCase() === 'i'))) { e.preventDefault(); wc.toggleDevTools(); return }
    if (!DEV && (i.control || i.meta) && ['r', 'w', '=', '-', '0'].includes(i.key.toLowerCase())) e.preventDefault(); /* no reload / zoom / close-tab accelerators */
  });
  wc.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url).catch(() => { }); return { action: 'deny' } });
  wc.on('will-navigate', (e, url) => { if (!url.startsWith(ORIGIN + '/')) e.preventDefault() });
  wc.on('console-message', (e, ...a) => { const d = typeof a[0] === 'object' ? a[0] : { level: a[0], message: a[1], lineNumber: a[2], sourceId: a[3] };
    const lvl = typeof d.level === 'string' ? d.level : ['verbose', 'info', 'warning', 'error'][d.level] || d.level; if (lvl === 'error' || lvl === 'warning') log('[page ' + lvl + ']', d.message, d.sourceId ? '(' + d.sourceId + ':' + d.lineNumber + ')' : '') });
  let reloads = 0;
  wc.on('render-process-gone', (e, d) => { log('[page] renderer gone:', d.reason); store.flush(); if (d.reason !== 'clean-exit' && reloads++ < 2) wc.reload() });
  win.on('close', () => store.flush());
  win.loadURL(ORIGIN + '/index.html');
}

/* ---------- IPC (the HTDesktop bridge in preload.js) ---------- */
const fromGame = e => { try { return (e.senderFrame && e.senderFrame.url || '').startsWith(ORIGIN + '/') } catch (_) { return false } };
ipcMain.on('ht:boot', e => { e.returnValue = fromGame(e) ? { save: Object.assign({}, store.data), saveFrom: store.lastLoad, desktop: { fullscreen: !!cfg.fullscreen, vsync: cfg.vsync !== false, uiScale: curScale() },
  steam: steam.info(), deck: DECK, version: app.getVersion(), electron: process.versions.electron, platform: process.platform, dev: DEV } : null });
ipcMain.on('ht:save-set', (e, k, v) => { if (fromGame(e) && typeof k === 'string' && typeof v === 'string' && k.length < 128 && v.length < 32e6) store.set(k, v) });
ipcMain.on('ht:save-remove', (e, k) => { if (fromGame(e) && typeof k === 'string') store.remove(k) });
ipcMain.on('ht:save-flush', e => { e.returnValue = fromGame(e) ? store.flush() : false });
ipcMain.on('ht:quit', e => { if (!fromGame(e)) return; store.flush(); app.quit() });
ipcMain.handle('ht:fullscreen', (e, on) => { if (!fromGame(e)) return null; if (typeof on === 'boolean') setFullscreen(on); return win ? win.isFullScreen() : null });
const uiScale = v => Math.min(1.5, Math.max(.8, +v || 1));
ipcMain.handle('ht:desktop-set', (e, k, v) => { if (!fromGame(e)) return null;
  if (k === 'vsync') { cfg.vsync = !!v; saveCfg() }
  else if (k === 'uiScale') { cfg.uiScale = uiScale(v); saveCfg(); if (win) win.webContents.setZoomFactor(cfg.uiScale) }
  return { fullscreen: !!cfg.fullscreen, vsync: cfg.vsync !== false, uiScale: curScale() } });
ipcMain.handle('ht:steam-unlock', (e, id) => fromGame(e) ? steam.unlock(id) : false);
ipcMain.on('ht:steam-presence', (e, k, v) => { if (fromGame(e)) steam.presence(k, v) });

/* ---------- lifecycle ---------- */
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus() } });
app.on("before-quit", () => store.flush());
app.on('window-all-closed', () => { store.flush(); app.quit() });
process.on('uncaughtException', err => { log('[main] uncaught', err && err.stack || String(err)); store.flush() });

app.whenReady().then(() => {
  /* no menu bar, except macOS's app menu, which carries Cmd+Q / Cmd+H and Ctrl+Cmd+F (fullscreen) */
  Menu.setApplicationMenu(process.platform === 'darwin' ? Menu.buildFromTemplate([{ role: 'appMenu' }, { label: 'Window', submenu: [{ role: 'togglefullscreen' }, { role: 'minimize' }] }]) : null);
  protocol.handle('app', serve);
  /* nothing leaves the machine: block every request that is not local */
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (d, cb) => {
    const ok = /^(app|data|blob|devtools|chrome-extension):/.test(d.url);
    if (!ok) log('[net] blocked', d.url); cb({ cancel: !ok });
  });
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(['pointerLock', 'fullscreen', 'clipboard-sanitized-write'].includes(perm)));
  createWindow();
  /* sleep (Steam Deck suspend, laptop lid): write the save and pause the game before the process is frozen */
  powerMonitor.on('suspend', () => { store.flush(); if (win && !win.isDestroyed()) win.webContents.send('ht:suspend') });
  powerMonitor.on('lock-screen', () => { if (win && !win.isDestroyed()) win.webContents.send('ht:suspend') });
});
