/* node --test desktop/test/ : the desktop save file (atomic write, backup, recovery) */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), os = require('os'), path = require('path');
const { SaveStore } = require('../save-store.js');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ht-save-'));

test('fresh folder loads empty, writes on flush, reloads the same keys', () => {
  const d = tmp(), s = new SaveStore(d, { debounceMs: 0 });
  assert.deepEqual(s.load(), {}); assert.equal(s.lastLoad, 'fresh');
  s.set('ht-save', JSON.stringify({ v: 3, cash: 500 })); s.set('ht-cfg', '{"sens":9}');
  assert.ok(fs.existsSync(path.join(d, 'save.json'))); assert.ok(!fs.existsSync(path.join(d, 'save.json.tmp')));
  const s2 = new SaveStore(d); const k = s2.load();
  assert.equal(JSON.parse(k['ht-save']).cash, 500); assert.equal(k['ht-cfg'], '{"sens":9}'); assert.equal(s2.lastLoad, 'file');
});

test('second write keeps the first as save.json.bak', () => {
  const d = tmp(), s = new SaveStore(d, { debounceMs: 0 }); s.load();
  s.set('ht-save', 'one'); s.set('ht-save', 'two');
  const bak = SaveStore.parse(fs.readFileSync(path.join(d, 'save.json.bak'), 'utf8'));
  assert.equal(bak['ht-save'], 'one'); assert.equal(new SaveStore(d).load()['ht-save'], 'two');
});

test('a corrupt save.json falls back to the backup, keeps the broken copy, and repairs the file', () => {
  const d = tmp(), s = new SaveStore(d, { debounceMs: 0 }); s.load(); s.set('ht-save', 'good'); s.set('ht-save', 'newer');
  fs.writeFileSync(path.join(d, 'save.json'), '{"format":"ht-desktop-save","keys":{"ht-save":"tru');
  const s2 = new SaveStore(d); const k = s2.load();
  assert.equal(s2.lastLoad, 'backup'); assert.equal(k['ht-save'], 'good');
  assert.ok(fs.readFileSync(path.join(d, 'save.json.corrupt'), 'utf8').includes('"tru'));
  assert.equal(SaveStore.parse(fs.readFileSync(path.join(d, 'save.json'), 'utf8'))['ht-save'], 'good');
});

test('a corrupt file never overwrites a good backup', () => {
  const d = tmp(), s = new SaveStore(d, { debounceMs: 0 }); s.load(); s.set('a', '1'); s.set('a', '2');
  fs.writeFileSync(path.join(d, 'save.json'), 'garbage');
  const s2 = new SaveStore(d, { debounceMs: 0 }); s2.load(); /* recovers '1' from .bak */ s2.set('a', '3');
  assert.equal(SaveStore.parse(fs.readFileSync(path.join(d, 'save.json.bak'), 'utf8')).a, '1');
});

test('both files unreadable: starts empty', () => {
  const d = tmp(); fs.writeFileSync(path.join(d, 'save.json'), 'x'); fs.writeFileSync(path.join(d, 'save.json.bak'), 'y');
  const s = new SaveStore(d); assert.deepEqual(s.load(), {}); assert.equal(s.lastLoad, 'reset');
});

test('debounced writes coalesce and flush() writes synchronously', () => {
  const d = tmp(), s = new SaveStore(d, { debounceMs: 10000 }); s.load();
  for (let i = 0; i < 50; i++) s.set('k', String(i));
  assert.ok(!fs.existsSync(path.join(d, 'save.json'))); s.flush();
  assert.equal(new SaveStore(d).load().k, '49'); s.remove('k'); s.flush(); assert.equal(new SaveStore(d).load().k, undefined);
});

test('works as the storage behind js/save.js (HT.Save round trip through the file)', () => {
  const d = tmp(), store = new SaveStore(d, { debounceMs: 0 }); store.load();
  const adapter = { getItem: k => store.get(k), setItem: (k, v) => store.set(k, v), removeItem: k => store.remove(k) };
  require('../../js/carai.js'); const HT = require('../../js/save.js');
  HT.Save.useStorage(adapter); HT.Save.load(); HT.Save.data.cash = 1234; HT.Save.saveNow();
  const fresh = new SaveStore(d); fresh.load(); HT.Save.useStorage({ getItem: k => fresh.get(k), setItem: (k, v) => fresh.set(k, v), removeItem: k => fresh.remove(k) });
  HT.Save.load(); assert.equal(HT.Save.data.cash, 1234); assert.equal(HT.Save.lastLoad.status, 'ok');
});
