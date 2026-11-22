/* High Trust desktop: the save file.
   The game's storage is a small key/value store (js/save.js keeps 'ht-save', 'ht-save-bak' and a few side keys; index.html keeps
   'ht-cfg'). In the browser that is localStorage; in the desktop shell it is this: one JSON object in <userData>/saves/save.json,
   so Steam Auto-Cloud can sync a single small folder.
   Writes are atomic (write save.json.tmp, fsync, rename over save.json) and the previous good file is kept as save.json.bak.
   Loading falls back to the backup when save.json is missing or unreadable, and keeps an unreadable file as save.json.corrupt-<date>
   (the 3 newest; this.kept is its path). urgent: flush() is called by the game for payouts/results/purchases (SAV-08). */
'use strict';
const fs = require('fs'), path = require('path');

class SaveStore {
  constructor(dir, o = {}) {
    this.dir = dir; this.file = path.join(dir, o.file || 'save.json'); this.bak = this.file + '.bak'; this.tmp = this.file + '.tmp';
    this.debounceMs = o.debounceMs == null ? 400 : o.debounceMs; this.data = {}; this.timer = null; this.dirty = false; this.lastLoad = null; this.kept = null; this.onError = null;
  }
  static parse(txt) {
    try { const o = JSON.parse(txt); if (o && typeof o === 'object' && !Array.isArray(o) && o.format === 'ht-desktop-save' && o.keys && typeof o.keys === 'object') return o.keys } catch (e) { }
    return null;
  }
  /* returns the key/value map; never throws */
  load() {
    let raw = null;
    try { raw = fs.readFileSync(this.file, 'utf8') } catch (e) { }
    let keys = raw != null ? SaveStore.parse(raw) : null, from = 'file';
    if (!keys) {
      if (raw != null) { this.kept = this.keepAside(raw) }
      let b = null; try { b = fs.readFileSync(this.bak, 'utf8') } catch (e) { }
      keys = b != null ? SaveStore.parse(b) : null; from = keys ? 'backup' : (raw != null ? 'reset' : 'fresh');
    }
    this.data = {}; for (const k in (keys || {})) if (typeof keys[k] === 'string') this.data[k] = keys[k];
    this.lastLoad = from; if (from === 'backup') { this.dirty = true; this.flush() }
    return Object.assign({}, this.data);
  }
  /* never lose a file we couldn't read: save.json.corrupt-YYYY-MM-DD_HH-MM-SS, newest 3 kept */
  keepAside(raw) {
    const d = new Date(), z = n => String(n).padStart(2, '0'), st = `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}_${z(d.getHours())}-${z(d.getMinutes())}-${z(d.getSeconds())}`;
    const f = this.file + '.corrupt-' + st;
    try { fs.mkdirSync(this.dir, { recursive: true }); fs.writeFileSync(f, raw) } catch (e) { return null }
    try { const base = path.basename(this.file) + '.corrupt-'; const old = fs.readdirSync(this.dir).filter(n => n.startsWith(base)).sort(); while (old.length > 3) fs.unlinkSync(path.join(this.dir, old.shift())) } catch (e) { }
    return f;
  }
  get(k) { return Object.prototype.hasOwnProperty.call(this.data, k) ? this.data[k] : null }
  set(k, v) { k = String(k); v = String(v); if (this.data[k] === v) return; this.data[k] = v; this.schedule() }
  remove(k) { k = String(k); if (!(k in this.data)) return; delete this.data[k]; this.schedule() }
  schedule() { this.dirty = true; if (this.debounceMs <= 0) return this.flush(); clearTimeout(this.timer); this.timer = setTimeout(() => this.flush(), this.debounceMs) }
  /* synchronous, atomic; safe to call from before-quit */
  flush() {
    clearTimeout(this.timer); this.timer = null; if (!this.dirty) return true;
    const body = JSON.stringify({ format: 'ht-desktop-save', v: 1, t: Date.now(), keys: this.data });
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      const fd = fs.openSync(this.tmp, 'w'); try { fs.writeSync(fd, body); fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
      /* keep the previous file as the backup, but only if it is a good one */
      try { const cur = fs.readFileSync(this.file, 'utf8'); if (SaveStore.parse(cur)) fs.writeFileSync(this.bak, cur) } catch (e) { }
      fs.renameSync(this.tmp, this.file);
      this.dirty = false; return true;
    } catch (e) { console.error('[save] write failed:', e && e.message); try { if (this.onError) this.onError(e && e.message) } catch (_) { } return false }
  }
}
module.exports = { SaveStore };
