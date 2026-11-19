# Save, economy, shops and gun locker (`js/save.js`, `css/menus.css`)

Self-contained module. No dependencies, works without the game loaded (see `dev/shop.html`). Everything hangs off `window.HT`.

## API

| | |
|---|---|
| `HT.CATALOG` | All data: `guns` (SPEC A.2 numbers, `price`, `unlock`, `blurb`), `gunOrder`, `ammo`, `attachments` (+`compat`, `fx`), `attSlots`, `furniture` (`price`, `cells:[w,d]`, `zone`, `tags`, `model` path under `assets/home/` or `null` = procedural, `max`, `hw` = sold at Maple Hardware, `fans`), `supplies`, `vehicle` (tiered upgrades with `fx`), `vehOrder`, `cosmetics` (paint/rims/horn options), `stores`, `missions` (base pay, par). |
| `HT.Save.data` | The live save object (SPEC E schema v1 plus optional `vehicle`, `world`, `flags.zipPack/icePack`). Auto-loads on first access. |
| `HT.Save.load()` | Reads `localStorage['ht-save']`, migrates (v0 prototype → v1), repairs every field, drops unknown guns/attachments/furniture, keeps unknown top-level keys (so other modules can store their own). Corrupt JSON → restores `ht-save-bak` (previous good save) and keeps the broken text in `ht-save-corrupt`; a save from a newer version is parked in `ht-save-future`. `HT.Save.lastLoad.status` = `fresh` / `ok` / `migrated` / `recovered` / `reset`. |
| `HT.Save.save()` / `saveNow()` / `flush()` | Debounced (250 ms) / immediate / write-if-pending. Flushes on `pagehide`. |
| `HT.Save.reset()` | Wipes `ht-save` + backup and writes defaults. `ht-cfg` is untouched. |
| `HT.Save.bindProg(prog)` | Makes `SAVE.prog` the game's live `prog` object (values loaded into it; saves read from it). |
| `HT.Save.on(key, fn)` | Change events: `fn(value, old, key)`. Keys are top-level save keys (`cash`, `loadout`, `owned`, `attOn`, `furniture`, `vehicle`, `pending`, `flags`, …) plus `'*'`, `'load'`, `'saved'`. Returns an unsubscribe function. |
| `HT.Save.touch(...keys)` | After mutating `HT.Save.data` directly: emit for those keys and schedule a save. |
| `HT.Save.get(path)` / `set(path, v)` / `addCash(n)` | Small helpers (`set('loadout.p2','rifle')`). |
| `HT.Save.export()` / `import(code)` | Text save code `HT1-<base64>-<checksum>`. `import` returns `{ok}` or `{ok:false,error}` (bad checksum, wrong format, newer version); whitespace from copy/paste is ignored. |
| `HT.Economy.computePayout(r)` | SPEC D.1. `r = {mission (index or id), ok, cuffs, confiscated, allyDowns, got, timeLeft, elapsed, bossDone, exec, trust, rerun}` → `{lines:[{id,label,amount,kind,note}], subtotal, multiplier, penalties, total, ok, rerun, mission}`. |
| `HT.Economy.applyPayout(p)` | Adds cash + `stats.earned`, pushes `win_<giver>` / `fail` to `events`. |
| `HT.Economy.renderPayout(el, p, {speed, delay, instant, onDone})` | Appends the animated itemised payout (lines count up, total, "PAID" stamp) to `el`. Click skips. Returns `{done: Promise, skip()}`. Honors reduced motion. |
| `HT.Economy.resultLines(p)` | `[{label, text:'+$180', neg, kind, note}]` if you want to render it yourself. |
| `HT.Economy.status(kind, id, store)` | What a buy button should say: `state` = `buy` / `poor` (with `short`) / `locked` (with `reason`) / `owned` / `equipped` / `pending` / `maxed`, plus `price`, `base`, `discount`. Kinds: `gun`, `att`, `furn`, `sup`, `veh` (id = upgrade, buys next tier), `cos` (id = `paint:red`). |
| `HT.Economy.buy(kind, id, store)` / `sell(kind, id)` | Applies the rules (unlocks, cash, Maple Hardware 10% at trust ≥ 60, Dadazon → `pending`, one-per-house items, auto-fill empty `p2`, auto-mount new attachments). `sell` refunds half; start/gift guns and van parts can't be sold. |
| `HT.Economy.deliverPending()` | Call on `enterHome()`. Returns the delivered entries and pushes `boughtGun/boughtFurniture/boughtAttachment` events. |
| `HT.Economy.collectGun(id)` | SPEC B.5 armory count for one distinct enemy. Returns `{unlocked, n, need, name}`. |
| `HT.Economy.setLoadout(slot, gun)` / `swapPrimaries()` / `setAttachment(gun, slot, att)` | SPEC C.4 rules; return `{ok, reason}`. |
| `HT.Economy.weaponStats(id, attOn?)` | Effective stats with attachments (SPEC D.4), incl. `attMul`, `muffled`, `hearR`, `hearLos`. Defaults to the saved `attOn`. |
| `HT.Economy.vehicleStats()` | Multipliers for the minivan: `top, accel, grip, brake, armor, crewDmg, ram, frontDmg, notice, spareMags, vanSwap, vanHeal, revive, surrender`, plus `paint{col}`, `rims{style}`, `horn{notes,wave}`, `levels`, booleans `bullBar/roofBox/lightBar/gunRack/medkit`, `tint`. |
| `HT.Economy.ammoFor()` | Per-type reserve for the current loadout including roof box / Range Day extras. |
| `HT.Shop.open({kind:'dadazon'\|'hardware'\|'auto', tab, select, onClose, onBuy})` | Full-screen store. `onBuy({kind,id,price,store,delivered})`. Returns `{close, setTab, select}`. |
| `HT.Locker.open({tab:'loadout'\|'attach'\|'ammo', onClose, onChange})` | Gun locker / workbench. `onChange(loadout, attOn)` after every edit (already saved). |
| `HT.Shop.thumbRenderer` | Optional `item => canvas \| img \| url \| html \| Promise<…> \| null`. `null` keeps the vector icon. `HT.Shop.gltfThumbs(THREE, loader, {kinds, base, zoom})` is a ready-made glTF renderer (used by `dev/shop.html?thumbs=3d`). |
| `HT.Menus.isOpen()`, `HT.Menus.close()`, `HT.Menus.volume` (0..1), `HT.Menus.playHorn(opt)`, `HT.icon(kind,id)` | Misc. |

Input while a menu is open: arrows/WASD browse (spatial navigation), Enter/Space act, Esc/Backspace back, Q/E (or `[` `]`, PageUp/Down) switch tabs, 1-3 pick a locker slot, X sells. Gamepad: d-pad/left stick, A, B, LB/RB, X. Touch: tap a card for a bottom sheet. Buying always takes two presses (confirm). The menu swallows `keydown` in the capture phase, so the game's handlers never see it; `keyup` passes through so held keys get released.

## Integration steps for `index.html`

1. In `<head>`: `<link rel="stylesheet" href="css/menus.css">`. Optionally add the italic to the font URL: `family=Rubik:ital,wght@0,400;0,600;0,800;1,600`.
2. Before the main `<script>`: `<script src="js/save.js"></script>`.
3. Replace `const prog={...}` with
   ```js
   const SAVE_API=HT.Save, ECON=HT.Economy;
   const prog=SAVE_API.bindProg({done:[false,false,false,false],trust:12,cuffed:0,downed:0,shotSurr:0,missionsRun:0});
   const SAVE=()=>SAVE_API.data;   // or read HT.Save.data directly
   ```
   `prog` keeps working everywhere; saves include it.
4. A helper to open menus without the game reacting:
   ```js
   function openMenu(open){if(!running&&!(mode==='hub'||mode==='home'))return;running=false;releaseLock();setPrompt(null);
     open({onClose:()=>{running=true;last=performance.now();canvasFocus();requestLock()}})}
   const openShop=kind=>openMenu(o=>HT.Shop.open({...o,kind,onBuy:r=>{if(r.kind==='gun'&&r.delivered==='now')banner('NEW GUN',HT.CATALOG.guns[r.id].name+' is in your locker',2)}}));
   const openLocker=tab=>openMenu(o=>HT.Locker.open({...o,tab,onChange:()=>{/* rebuild P.weapons from HT.Save.data.loadout */}}));
   ```
   Call `openShop('hardware')` at the store door, `openShop('dadazon')` at the laptop, `openShop('auto')` wherever the auto shop lives (e.g. a `Lug Nuts & Sons` door on Industrial Way, or the home garage roll door `Z`), `openLocker('loadout')` at `L`, `openLocker('attach')` at `W`.
5. Keydown handler: first line `if(HT.Menus.isOpen())return;` (belt and braces; the menu already stops propagation). The `wheel` listener already checks `running`.
6. `endMission(ok,…)`:
   ```js
   const pay=HT.Economy.computePayout({mission:M.i,ok,cuffs:M.cuffs,confiscated:M.confiscated||0,allyDowns:M.allyDowns||0,got:M.got||0,
     timeLeft:M.t,elapsed:M.elapsed,bossDone:M.bossDone,exec:M.exec||0,trust:prog.trust,rerun:!!M.rerun});
   // add <b>Payout</b><span>${HT.Economy.money(pay.total)}</span> to the .meta grid, then:
   HT.Economy.renderPayout($('rsBody'),pay);HT.Economy.applyPayout(pay);HT.Save.saveNow();
   ```
   `rsGo` becomes "Head home" (`enterHome()`), plus a ghost "Back to the cul-de-sac".
7. Cash HUD: add a row to `#trust` and keep it live: `HT.Save.on('cash',v=>$('cashV').textContent=HT.Economy.money(v))`.
8. `enterHome()`: `const got=HT.Economy.deliverPending(); if(got.length) radio('biscuit','*Your Dadazon order has arrived. Biscuit has opened it.*')`, then place furniture from `HT.Save.data.furniture.placed` (models: `HT.CATALOG.furniture[id].model`).
9. Pickups/armory: on a counted pickup or confiscation `const r=HT.Economy.collectGun(gun); if(r.unlocked) banner('ARMORY',r.name+' added to your gun locker',2.4)`.
10. `startMission`: loadout from `HT.Save.data.loadout`; weapon numbers via `HT.Economy.weaponStats(id)`; extra mags `HT.Economy.ammoFor()` (`extra`); consume `flags.rangeDay/zipPack/icePack` (set false, `HT.Save.touch('flags')`).
11. Minivan: `const vs=HT.Economy.vehicleStats(); makeVan(vs.paint.col)`, multiply speed/accel/grip/brake/armor; `honk()` can become `HT.Menus.playHorn(vs.horn)`.
12. Pause: "Reset save" → `HT.Save.reset()`; optional "Copy save code" → `navigator.clipboard.writeText(HT.Save.export())` and an import textarea → `HT.Save.import(text)`.
13. Optional 3D thumbnails: `HT.Shop.thumbRenderer=HT.Shop.gltfThumbs(THREE,new THREE.GLTFLoader(),{kinds:['furn']})`.
14. `__ht`: expose `SAVE` (getter for `HT.Save.data`), `saveGame:HT.Save.saveNow`, `loadGame:HT.Save.load`, `resetSave:HT.Save.reset`, `computePayout:HT.Economy.computePayout`, `buy:(id,store)=>HT.Economy.buy(kindOf(id),id,store)`.

## Tests

- `node --test dev/save.test.js`: schema, migration, corruption recovery, export/import, events, debounce, payout maths (SPEC L3-2), buy/sell/unlock rules (L4-1/2/3), loadout rules (L3-8), armory, van upgrades, catalogue integrity (every model path exists), economy balance.
- `node dev/menus.e2e.js`: keyboard, gamepad (fake pad), touch at 390×844, payout animation, no key leaks to the game.
- `node dev/shots.js [filter]`: screenshots of every tab/state at 1280×720 and 390×844 into `docs/screenshots/menus/`.
- Manual: open `dev/shop.html` (`?thumbs=3d` for glTF thumbnails).
