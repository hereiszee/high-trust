/* High Trust desktop: the window.HTDesktop bridge (contextIsolation on, sandboxed preload).
   The game checks for window.HTDesktop to know it is in the shell. Nothing here exposes Node or Electron to the page.
     HTDesktop.storage   localStorage-shaped (getItem/setItem/removeItem/key/length), backed by <userData>/saves/save.json.
                         Reads come from a copy loaded once at start; writes go to the main process, which writes the file atomically.
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
  clear: () => { for (const k of Object.keys(mem)) storage.removeItem(k) }
};
const fsCbs = [];
ipcRenderer.on('ht:fullscreen', (_e, on) => { for (const f of fsCbs) { try { f(!!on) } catch (e) { } } });
const st = boot.steam || {};

contextBridge.exposeInMainWorld('HTDesktop', {
  shell: 'electron', deck: !!boot.deck, version: boot.version, electron: boot.electron, platform: boot.platform, dev: !!boot.dev, saveFrom: boot.saveFrom,
  desktop: Object.assign({}, boot.desktop),
  storage,
  flush: () => ipcRenderer.sendSync('ht:save-flush'),
  quit: () => ipcRenderer.send('ht:quit'),
  fullscreen: on => ipcRenderer.invoke('ht:fullscreen', typeof on === 'boolean' ? on : undefined),
  onFullscreen: cb => { if (typeof cb === 'function') fsCbs.push(cb) },
  setDesktop: (k, v) => ipcRenderer.invoke('ht:desktop-set', String(k), v),
  steam: {
    available: !!st.ok, appId: st.appId || 0, placeholder: !!st.placeholder, why: st.why || '',
    unlock: id => ipcRenderer.invoke('ht:steam-unlock', String(id)),
    presence: (k, v) => ipcRenderer.send('ht:steam-presence', String(k), v == null ? null : String(v))
  }
});
