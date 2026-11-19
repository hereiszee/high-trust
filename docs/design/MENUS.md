# Save, economy, shops and gun locker (`js/save.js`, `css/menus.css`)

Self-contained module; everything hangs off `window.HT`. Vehicle data comes from `js/carai.js` (`HT.Garage`), so load that first. `dev/shop.html` is the test bench (`?thumbs=3d` for real 3D thumbnails).

Load order in `index.html`: `css/hud.css`, `css/menus.css`, then `js/hud.js`, `js/carai.js`, `js/audio.js`, `js/save.js`, then the main script.

## Single sources of truth

| Data | Lives in | Read it as |
|---|---|---|
| Guns: stats, feel, sound, NPC profiles | `HT.CATALOG.guns` (this file) | `HT.CATALOG.guns[id]` (raw), `HT.Economy.weaponStats(id)` (with the saved attachments applied) |
| Vehicles: base stats, upgrades, cosmetics, horns | `HT.Garage` (`js/carai.js`) | `HT.Economy.vehicleStats()` = `HT.Garage.apply(active, vehicle, util)` + cosmetics + `makeOpts` |
| Attachments, furniture, supplies, missions, payouts | `HT.CATALOG` (this file) | |

### Gun fields (`HT.CATALOG.guns[id]`; ids `pistol revolver nailer shotgun double beanbag rifle smg hunter`, order in `HT.CATALOG.gunOrder`)

Field names follow SPEC.md A.1. Times are in seconds, distances in metres and angles in radians.

| field | meaning |
|---|---|
| `name`, `short`, `cls`, `blurb` | display names, class label, shop flavour text |
| `slot` | `'side'` or `'prim'` |
| `ammo` | key into `HT.CATALOG.ammo` (`{name, cap, col}`) |
| `auto` | hold to fire |
| `dmg`, `head`, `pellets` | damage per pellet, headshot multiplier, pellets per shot |
| `rate` | seconds between shots (`double`: between the barrels) |
| `mag`, `reserve` | magazine and carried reserve |
| `range`, `fall:[near,far,minMul]` | max range, damage fall-off (SPEC `fallMul`) |
| `spread:{hip,ads,move,bloomAdd,bloomMax,bloomDec}` | accuracy model (SPEC A.2 spread formula) |
| `rc:{v,h,hBias,adsMul,rec,pat}` | recoil: vertical per shot, horizontal jitter, bias, ADS multiplier, recovery rate, `pat` per-shot `[vScale,hBias]` (the last entry repeats) |
| `ads:{zoom,t,speed}` | FOV multiplier, time to full ADS, move multiplier while aiming |
| `speed` | move multiplier while held |
| `reload` | `{tac,empty}` or `{shell:{start,each,end,emptyExtra}}` |
| `equip`, `fsa` | equip time, first-shot-accurate |
| `bolt` | (`hunter`) bolt cycle after each shot |
| `vm:{back,rise,roll,side,k,damp,reloadStyle}` | view-model spring kick |
| `snd:{crack,body,thump,tail,mech,reloadMech?,secondPitch?,impact?}` | `gunSnd` recipe layers exactly as in the SPEC A.2 sound table |
| `att` | compatible attachment slots (`optic mag under muzzle`) |
| `price`, `unlock:{start\|gift\|buyAfter\|trust\|any, collect}` | shop price and unlock rules (SPEC D.3 and B.5) |
| `nonlethal`, `special` | beanbag flag; per-gun extras (`nailer.special.rootChance/rootT/quietR`, `smg.special.adsBreak`, `hunter.special.scope/sway/laser`, `double.special.bothBarrelsWindow`, `beanbag.special.surrenderBelow/tracer`) |

`HT.CATALOG.npcGuns[id] = {enemy:[acc,dmg,burst,cooldown,wantMin,wantMax], ally:[acc,dmg,cooldown], laser?}` per SPEC A.3. A `dmg` written as `[near,far,within]` means near damage inside `within` metres.

`weaponStats(id, attOn?)` returns a deep copy with the attachments applied (SPEC D.4), plus `attMul:{spread,adsT,rv,rh,equip,dmg}`, `muffled`, `hearR` and `hearLos`. The catalogue itself is never mutated.

## API

| | |
|---|---|
| `HT.Save.data` | The live save, **schema v2** (SPEC.md E + SPEC2.md D): `prog` (9 jobs, `trust`, `trustR`, `act`), `loadout` (`side p1 p2 p3`), `garage` (exactly `HT.Garage.defaultGarage()` shape), `world`, `crew`, `flags`, plus the v1 keys. |
| `HT.Save.load()` | Migrates v0 → v1 → v2 (a v1 player who beat the Kingpin lands in Act 2; this module's old `vehicle` extension is carried into `garage`). Repairs every field (SPEC2 D validation: active vehicle owned, tiers clamped, unknown cosmetics back to stock, HP clamped, `p3` dropped without the rack). Corrupt JSON → restores `ht-save-bak` and keeps the text in `ht-save-corrupt`; a newer-version save is parked in `ht-save-future`. `lastLoad.status` = `fresh` / `ok` / `migrated` / `recovered` / `reset`. |
| `save()` / `saveNow()` / `flush()` / `reset()` | Debounced (250 ms) / immediate / write-if-pending (runs on `pagehide`) / wipe to defaults (`ht-cfg` untouched). |
| `bindProg(prog)`, `on(key,fn)`, `touch(...keys)`, `get/set(path)`, `addCash(n)`, `export()`, `import(code)` | Same as before. Keys include `garage`. Codes look like `HT1-<base64>-<checksum>`. |
| `HT.Economy.computePayout(r)` | SPEC D.1 for all 9 jobs. Riverside jobs use `prog.trustR` for the multiplier. Inputs: `mission` (index or id), `ok, cuffs, confiscated, allyDowns, elapsed, exec, trust, rerun`, plus per job `got` (gary), `timeLeft` (rick), `bossDone` (doug, dee, duke), `bikes, converters` (earl), `cleanStakeout, ids` (dee), `beds` (rosa), `truckHp, chaseT` (benny), `chaseT, vanHp` (duke), and optional `extra:[{label,amount}]`. |
| `applyPayout(p)`, `renderPayout(el,p,{speed,delay,instant,onDone})`, `resultLines(p)` | Pass `HT.HUD.payoutEl` as `el`: the rows match `.ht-pay-row`. |
| `status / buy / sell / priceOf (kind, id, store)` | Kinds: `gun att furn sup` and, for Dad's Auto, `gar` (an `HT.Garage.CATALOG` id: `eng1 … aid`, `v_pickup` …), `car` (vehicle type), `cos` (`paint:silver`, `rims:alloy`, `tint:light`, `lightBar:amber`, `spoiler:on`, `horn:ode`), `stick` (sticker index), `rep` (`'active'`: $2/HP). Discounts: Hank's 10% at Maple trust ≥ 60, Corner Mart 10% at Riverside trust ≥ 60, Dad's Auto 5% after 5 purchases. |
| `garUse(kind,id)` | Free actions on owned things: drive another owned vehicle, re-apply an owned paint/rims/tint/horn, stick or peel a sticker. |
| `vehicleStats(save?, type?)` | `HT.Garage.apply(...)` fields (`maxSpeed boostMax accel boostAccel brake hbrake grip steerResp turn hp bulletMul ramDealtFront impactTakenFront sport* ammoBonus slots firstAid`) plus `curHp`, `paint{id,hex,finish}`, `rims`, `tint`, `lightBar`, `spoiler`, `horn{id,notes}`, `stickers`, `makeOpts` (the `HT.Vehicles.make` options). |
| `vanStatsWith(kind,id)`, `vanBars(st)`, `ammoFor()` | Preview after a purchase; the 5 bars from SPEC2 C.7; ammo per type (the gun rack slot and `ammoBonus` are included). |
| `setLoadout(slot,gun)` (`p3` needs the rack), `swapPrimaries()`, `setAttachment()`, `collectGun()`, `deliverPending()` | As before. |
| `HT.Shop.open({kind:'dadazon'\|'hardware'\|'mart'\|'auto', tab, select, onClose, onBuy, onPreview})` | `onBuy({kind,id,price,store,delivered,use?})` fires after a purchase or a free "use". `onPreview({type,opts}\|null)` fires in Dad's Auto when the selected item changes the look: call `handle.setUpgrades(opts.upgrades)` on the van in the bay, and `null` means revert. |
| `HT.Locker.open({tab:'loadout'\|'attach'\|'ammo', onClose, onChange})` | 4 slots. The 4th (gun rack) is locked until `garage.util.rack`. |
| `HT.Shop.thumbRenderer`, `HT.Shop.gltfThumbs(THREE, loader, {kinds, base, zoom})` | 3D thumbnails: `item.model` glTF paths (furniture), `HT.Guns.model(type)` for guns, and `HT.Vehicles.make(type, opts)` for vehicles and previews (`item.vehicle = {type, opts}`, already carrying the selected upgrade). Studio light, transparent background over the pegboard, room or garage backdrop, cached per look. Vector art is shown while rendering and whenever a hook is missing. |
| `HT.Menus.isOpen()`, `close()`, `volume`, `playHorn(opt)`, `sfx(name)`; `HT.icon(kind,id)` | UI sounds go to `HT.Audio.ui` (`hover click back cash objective denied pickup`) when `HT.Audio.ready`, otherwise to a small built-in synth. `HT.Shop.sfx = name => true` overrides both. |

Look and feel: the chrome (scrim, panel, tabs, buttons, keycaps, type scale, colours, motion) uses the `css/hud.css` tokens. Menus mount inside `.ht-root` when the HUD exists, so they inherit the tokens directly; standalone, they use identical fallbacks. Store branding (logo plate, colour band, item backdrops) stays inside the panel.

Input: arrows/WASD move by screen position, Enter/Space act, Esc/Backspace back, Q/E (or `[` `]`, PageUp/PageDown) switch tabs, 1-4 pick a locker slot, X sells. Gamepad: d-pad or left stick, A, B, LB/RB, X. Touch: tapping a card opens a bottom sheet. Buying takes two presses. The menu stops `keydown` in the capture phase on `window`. **Note:** `js/hud.js` also listens there (M opens the map, registered first), so it should skip when `HT.Menus.isOpen()`.

## Integration steps for `index.html`

1. Load order as above.
2. `const prog=HT.Save.bindProg({...defaults incl. trustR, act})`. `HT.Save.data.garage` is `SAVE.garage` from SPEC2 (feed `VAN.stats` from `HT.Economy.vehicleStats()` or `HT.Garage.apply`).
3. Open menus with `running=false; releaseLock();` and resume in `onClose`:
   `HT.Shop.open({kind:'hardware'|'dadazon'|'mart'|'auto', onClose, onBuy, onPreview})` and `HT.Locker.open({tab, onClose, onChange})`.
   Dad's Auto: in `onBuy`, rebuild the player vehicle when `kind` is `car`/`gar`/`cos`/`stick`. In `onPreview`, call `h.setUpgrades(...)` on the bay van.
4. Keydown handler (and the HUD's): return early when `HT.Menus.isOpen()`.
5. `endMission`: `const p=HT.Economy.computePayout({...})`, `HUD.show('result',{...})`, `HT.Economy.renderPayout(HUD.payoutEl,p)`, `HT.Economy.applyPayout(p)`, `HT.Save.saveNow()`.
6. Cash in the HUD: `HT.Save.on('cash',v=>HUD.update({cash:v}))`.
7. `enterHome()`: `HT.Economy.deliverPending()`. Also restore the van to at least 60% HP (SPEC2 C.3) by setting `HT.Save.data.garage.hp[type]`.
8. Pickups: `HT.Economy.collectGun(gun)`.
9. `startMission`: loadout from `HT.Save.data.loadout` (`p3` only with the rack), `HT.Economy.weaponStats(id)`, extra mags from `HT.Economy.ammoFor()`. Consume `flags.rangeDay/zipPack/icePack`.
10. Horn: `HT.Menus.playHorn({notes:HT.Economy.vehicleStats().horn.notes})`, or route the same notes through `HT.Audio`.
11. Pause "Reset save": `HT.Save.reset()`. Export/import via `HT.Save.export()` / `HT.Save.import(code)`.
12. 3D thumbnails once `HT.Guns`/`HT.Vehicles` exist: `HT.Shop.thumbRenderer=HT.Shop.gltfThumbs(THREE,new THREE.GLTFLoader(),{kinds:['furn','gun','car','gar','cos']})`.

## Tests

- `node --test dev/save.test.js`: schema v2, v0→v2 and v1→v2 migration, corruption, export/import, events, debounce, payouts (SPEC L3-2 and SPEC2 B), buy rules, Dad's Auto against `HT.Garage`, loadout incl. `p3`, armory, catalogue integrity.
- `node dev/menus.e2e.js`: keyboard, gamepad, touch at 390×844, the payout animation, no key leaks, sounds routed to `HT.Audio.ui`, and stat bars fitting at 1280×720.
- `node dev/shots.js [filter]`: JPEG screenshots of every tab and state at 1280×720 and 390×844 into `docs/screenshots/menus/`.
