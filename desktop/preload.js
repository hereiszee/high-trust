/* High Trust desktop: the window.HTDesktop bridge (contextIsolation on, sandboxed preload).
   The game checks for window.HTDesktop to know it is in the shell. Nothing here exposes Node or Electron to the page.
     HTDesktop.storage   localStorage-shaped (getItem/setItem/removeItem/key/clear), backed by <userData>/saves/save.json (Steam Cloud).
                         Reads come from a copy loaded once at start; writes go to the main process, which writes the file atomically
                         after a short debounce. storage.flush() writes it now (payouts, purchases); storage.onError(cb) hears a failed write.
     HTDesktop.deviceStorage  the same shape, for this machine only (desktop-settings.json): Graphics, Resolution scale, Frame rate cap
     HTDesktop.keepFile(name, text) -> path   copy a save the game couldn't read next to the save file
     HTDesktop.saveFrom / saveKept / refreshRate   how the save file loaded, where an unreadable one was kept, the display's Hz
     HTDesktop.flush()   write the save file now (sync)
     HTDesktop.quit()    flush and quit
     HTDesktop.fullscreen(on?) -> Promise<bool>; HTDesktop.onFullscreen(cb)
     HTDesktop.setDesktop('vsync', bool) -> Promise<{fullscreen,vsync}>; HTDesktop.desktop = settings at start
     HTDesktop.steam     {available, appId, placeholder, unlock(id) -> Promise<bool>, presence(key, value)} */
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const boot = ipcRenderer.sendSync('ht:boot') || { save: {}, desktop: {}, steam: { ok: false } };
const mem = Object.assign(Object.create(null), boot.save || {});
const storage = {
  getItem: k => { k = String(k); return k in mem ? mem[k] : null },
  setItem: (k, v) => { k = String(k); v = String(v); if (mem[k] === v) return; mem[k] = v; ipcRenderer.send('ht:save-set', k, v) },
  removeItem: k => { k = String(k); if (!(k in mem)) return; delete mem[k]; ipcRenderer.send('ht:save-remove', k) },
  key: i => Object.keys(mem)[i] ?? null,
  clear: () => { for (const k of Object.keys(mem)) storage.removeItem(k) },
  flush: () => ipcRenderer.sendSync('ht:save-flush'),
  onError: cb => { if (typeof cb === 'function') errCbs.push(cb) }
};
const errCbs = [];
ipcRenderer.on('ht:save-error', (_e, m) => { for (const f of errCbs) { try { f(m) } catch (e) { } } });
const dev = Object.assign(Object.create(null), boot.device || {});
const deviceStorage = {
  getItem: k => { k = String(k); return k in dev ? dev[k] : null },
  setItem: (k, v) => { k = String(k); v = String(v); if (dev[k] === v) return; dev[k] = v; ipcRenderer.send('ht:device-set', k, v) },
  removeItem: k => { k = String(k); if (!(k in dev)) return; delete dev[k]; ipcRenderer.send('ht:device-set', k, null) },
  key: i => Object.keys(dev)[i] ?? null
};
const fsCbs = [], susCbs = [];
ipcRenderer.on('ht:suspend', () => { for (const f of susCbs) { try { f() } catch (e) { } } });
ipcRenderer.on('ht:fullscreen', (_e, on) => { for (const f of fsCbs) { try { f(!!on) } catch (e) { } } });
const st = boot.steam || {};

contextBridge.exposeInMainWorld('HTDesktop', {
  shell: 'electron', deck: !!boot.deck, version: boot.version, electron: boot.electron, platform: boot.platform, dev: !!boot.dev, saveFrom: boot.saveFrom,
  saveKept: boot.saveKept || null, refreshRate: +boot.refreshRate || 0, deviceStorage,
  keepFile: (name, text) => ipcRenderer.sendSync('ht:keep-file', String(name), String(text)),
  desktop: Object.assign({}, boot.desktop),
  storage,
  flush: () => ipcRenderer.sendSync('ht:save-flush'),
  quit: () => ipcRenderer.send('ht:quit'),
  fullscreen: on => ipcRenderer.invoke('ht:fullscreen', typeof on === 'boolean' ? on : undefined),
  onFullscreen: cb => { if (typeof cb === 'function') fsCbs.push(cb) },
  onSuspend: cb => { if (typeof cb === 'function') susCbs.push(cb) },
  setDesktop: (k, v) => ipcRenderer.invoke('ht:desktop-set', String(k), v),
  steam: {
    available: !!st.ok, appId: st.appId || 0, placeholder: !!st.placeholder, why: st.why || '',
    unlock: id => ipcRenderer.invoke('ht:steam-unlock', String(id)),
    presence: (k, v) => ipcRenderer.send('ht:steam-presence', String(k), v == null ? null : String(v))
  }
});
