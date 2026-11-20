# Writing a job (SPEC3 wave 0)

Every mission in High Trust goes through one registry, `HT.Jobs` (`js/jobs/_registry.js`). The nine original jobs are wrapped by it; every new job is **one file**, `js/jobs/<id>.js`, that registers itself. This page is the contract for waves 1–5 of `docs/design/SPEC3.md`.

**The rule: no job edits `index.html`.** A job file talks to the game through its registration, the eight hook points, `HT.Jobs.api`, `HT.Save` and the HUD kit. If you think you need an `index.html` change, you don't: add a hook handler, or ask the wave-0 owner for a new hook. Shared files (`js/ai.js`, `js/carai.js`, `js/roadgraph.js`, `js/vehicles.js`, `js/save.js`, `index.html` *SKY*) are only touched by the one named owner per wave (see the ownership table at the end).

## 1. Quick start

1. `js/jobs/<id>.js` already exists as a one-line stub for every SPEC3 id (`taxi blitz talk mower overwatch sabotage hoa tail tow cargo crossing pawn cones moving arrest brake roundup bike heist patrol porch carwash finale`, and helpers `_stops _race _escort _props _runner`). Replace the whole file. Start from `js/jobs/_template.js`.
2. `js/jobs/porch.js` (*Porch Light*) is the worked example: a home giver, two stages with a checkpoint, a delivery truck, a carried prop, unarmed runners, payout lines, medals and a scripted test player.
3. Run `node dev/jobs-check.js <id> --retry --replay` until it says `all ok`. Then `node dev/jobs-registry.test.js`.

Job files are loaded **after Stage A**, in idle time, one by one, in the order of `HT.Jobs.FILES` (helpers `_*.js` first). A file that is missing or empty registers nothing and is skipped. `await __ht.jobs.ready` resolves when all are in. A job that registers while the hub is up gets its giver and destination ring immediately.

## 2. `HT.Jobs.register(id, spec)`

```js
HT.Jobs.register('taxi',{
  def:{...},                 // the MISSIONS entry (below). register() pushes it into MISSIONS and prices it in HT.CATALOG.missions
  start(M,o){},              // job start. o.checkpoint = a [CP] snapshot (load() runs right after), o.replay = calendar replay
  upd(dt,M,F){},             // every frame while M.state==='go'
  save(M){return{...}},      // [CP] JSON-safe job state (≤ 16 KB)          load(M,state){}   restores it after start()
  payout(M,ok){return[['Label',amount],...]},   // extra result-card lines (the trust multiplier and rerun ×0.5 apply)
  medal(M){return 1|2|3},    // calendar medal; bronze = finished. Gold is capped to silver after a stage retry (M.retried)
  end(M,ok){},               // story effects: HT.Save.household(), storefront(), flags. NEVER runs on a replay
  result(M,ok,res){},        // edit the result card before it shows: res.title (headline), res.text, res.stats [[label,value,sub],...]. Never patch the card's DOM
  perceive(e,world){}, noise(n){}, vehicle(car,dt){}, camera(dt){}, interact(prompt){}, fire(){}, hud(state){}, home(id){},
  test:{give(api){}, step(api,frame,opts){}}    // for dev/jobs-check.js
});
```

### `def` fields

Standard MISSIONS fields: `giver, hood ('maple'|'river'), role, title, place, lines[3], crew[], weapons[], radio[[who,text]], endLine, arms, boss` as in the existing jobs. Registry fields:

| Field | Meaning |
|---|---|
| `obj` | One sentence on the brief card ("Job: …"). Required. |
| `from` | Where the giver is: `{place:'g_doug'}` (a `WORLD.places` key), `{tile:[x,z]}`, `{x,z}` (metres), or `{home:'laptop'|'fridge'|'calendar'|...}` (a home interactable: using it offers the brief; "Not now" declines for the day). Default: `WORLD.places['g_'+giver]`. |
| `giverName`, `giverLook` | A giver who isn't in `HOMIES` yet (Barb, Hank, Jen…): name and a `makeDude` look. |
| `start` | Where the job begins (the yellow destination ring): `{place}`, `{tile:[x,z]}` or `{x,z}`. A getter is fine. Default: the site's ring, else the giver. |
| `site` | A `WORLD.sites` id to activate (items, stashes, spawns, nav window, huddle spot). Default: `WORLD.sites[id]` if it exists. The 8 SPEC3 sites exist (`school walnut storage parkride pawn millshop market roof`). |
| `unlock` | `{done:[ids], trust, trustR, cuffed, flags:[…], when:p=>bool}`. `done` ids work for old and new jobs. |
| `pay`, `par` | Base pay ($) and par time (s, gives "Quick work"). |
| `stages`, `stageLabels` | `['scope','gear',...]` and `{scope:'Scope the lot'}`. The first stage is marked automatically. |
| `failPolicy` | `'escalate'` (default) or `'soft'`. What `api.spotted()` does (owner decision 2: soft only for *Grand Opening* and *Sign of the Times*). |
| `medals` | Plain-word criteria `['Finished','…silver…','…gold…']`, shown on the result card and the calendar. |
| `repeatable` | Side jobs: stay available after they're done; finishing one doesn't advance the in-game day. |
| `night` | `true`: the night preset is on for this job (`setNight(1)` at start, back to day when you leave). |
| `noGuns` | `true` or a line: firing is blocked (with that line). Also settable live: `M.noGuns`. |
| `stay` | The dad stays at the wheel when the job starts (taxi, tail, cargo). |
| `roam` | No "get back to the job" leash (jobs that move around the map). |
| `winTrust` | Trust on success instead of the default (+16 Maple / +14 Riverside). Use 0 and call `api.addTrust` yourself for small-step jobs. |
| `order` | Giver priority (lower first). One person, one place: a giver with several jobs (Dee, Dave, Doug, Earl, Sal…) offers them one at a time — built-in jobs first, then story jobs before repeatables, then `order`; two jobs on the same spot take turns the same way (see `docs/JOBS-ORDER.md`). |
| `payLabel` | What the base pay line on the result card is called ("Hank's promotion"). Default: "Bake sale fund" (the four Maple originals). |
| `peaceful` | The card drops "Neutralized" (unless somebody was) and an empty "Zip-tied", and wins with a peaceful headline. Default: `!!noGuns`. A job with no `crew` says "Nobody got hurt" instead of "Nobody pulled a hamstring". |
| `aimToggle` | Right-click (AIM) is a pure toggle in this job whatever the player's Aim setting (the sign, a scope): never a held button plus another input. Also settable live: `M.aimToggle`. |

### `M` (the running mission) and `F` (the frame)

`M` has everything the old jobs use (`M.def, M.elapsed, M.state, M.car, M.cuffs, M.kills, M.exitOpen, M.phase, M.payX`) plus: `M.stage`, `M.replay`, `M.retried`, `M.clean`, `M.spotted`, `M.medal`, `M.trustGain`, `M.noGuns`, `M.item`, `M.score` (a number the calendar keeps as "best").

Set `M.exitOpen=true` when the job is won: "Back to your ride" appears and getting in ends it (`endMission(true)`). Fail with `api.endMission(false, line, title)`.

`F` is filled by `upd` each frame (same object the Riverside jobs use):

| `F.` | |
|---|---|
| `objs.push([text, done, 'warn'?])` | Objective lines. |
| `target={x,z,label}` | The marker and minimap route. |
| `holds.push({x,z,r,o,txt,time,fn})` | Hold-E actions (`o.prog` keeps progress). |
| *E arbitration* | One action per press and the prompt always names it: a surrendered enemy (zip-tie) > the nearest of your placed holds/taps (a hold in progress keeps E) > `{d}` taps > the interact hook (system handlers yield when the job already has an action) > cars ("Get in" is dropped while a job tap/hold is within its radius + 1.5 m and nearer than the car). |
| `taps.push({x,z,r,txt,fn})` or `{d,r,txt,fn}` | Press-E actions (`d` = your own distance). |
| `prompt`, `promptP` | A raw prompt. |
| `meters.push({...})` | HUD meters (below), max 3. |
| `widgets.push({...})` | HUD timer/score/combo widgets. |

## 3. Hook reference (8 from SPEC3, plus `pose`)

Each hook calls the **running job's** handler first, then every **system** handler registered with `HT.Jobs.on(hook, fn)` (stealth, photo, tow… modules register system-wide). Errors in a handler are caught and logged, never fatal. Hooks with no handlers cost one property check.

| Hook | Call site in `index.html` | Signature / return | Typical use |
|---|---|---|---|
| `JH.perceive(e,world)` | *AI*, `aiEnemy()`, right before `AI.think` | per enemy per frame; return ignored. Set `e.ai.blind`, read `world.threats` | [STEALTH] gating sight, [SOCIAL] |
| `JH.noise(n)` | *AI* `aiShot()` (gunshots, `n.kind='gun'`) and *PLAYER* `stepSnd()` (footsteps, `kind='step'`, `r` 1 crouch / 2.5 walk / 7 run / 9 sprint, `player:true`) | `{x,z,r,t,kind}`; return ignored | [STEALTH] hearing |
| `JH.vehicle(car,dt)` | *MINIVAN* `updVan()`, right after the drive physics | per frame while the dad drives; `car` = the driven entry (`car.pos, yaw, spd, car.hp`) | [TOW], g-force, [TAIL] |
| `JH.camera(dt)` | *PLAYER* top of `updCamera()` (missions only) | return `true` = you placed the camera this frame (normal camera skipped) | viewfinder, planning cam, the roof |
| `JH.interact(prompt)` | *MISSION LOGIC* `updMission()` and *WORLD MISSIONS* `wmFrame()`, after the job's own holds/taps | gets the current prompt (string or null). Return `null`, a string, `{txt,fn}` (press E) or `{txt,hold:secs,fn,o?}` (hold E) | anything adding an E action outside `F` |
| `JH.fire()` | *WEAPONS* top of `fire()` | return `true` = the trigger is consumed (no shot). The core already blocks `M.noGuns` and routes `M.item` to `HT.Jobs.item(id).use(M)` | phone, stop sign, tool belt |
| `JH.hud(state)` | *HUD* `hud()`, right before `HUD.update(state)` | mutate `state` (`meters`, `widgets`, `gadgets`…). `F.meters`/`F.widgets` are copied in before your handler runs | meters, viewfinder, band bar |
| `JH.pose(dt)` | *LOOP* `frame()` and `__ht.step`, right after `HT.People.update` | per frame; return ignored. Layer bone poses on characters (added for wave 1) | [SOCIAL] tells |
| `JH.home(id)` | *META* `updHome()`, before the built-in actions | `id` = the interactable (`laptop fridge calendar bed tv grill locker workbench door garage family`). Return `true` = handled. **Called for every registered job, running or not** (`home(id, isActive)`) | jobs offered from home, Doug's corkboard, Jen's note |

`HT.Jobs.item(id,{name,use(M),hud(state)})` registers a special held item; a job sets `M.item=id` while it is held.

## 4. `HT.Jobs.api` (the game surface for job files)

**Cast and givers.** Crew and giver ids resolve to People models through `HT.People.roles` (register a stand-in with `HT.People.roles.hank='nb_pops'`); unknown ids are skipped by the cast preload, never fetched. Givers of jobs that unlock mid-session appear within a second (no hub rebuild needed).

**Sound.** Never make your own `AudioContext`: `HT.Audio.tone({f,to,type,d,gain,at,bus})` plays a short enveloped tone on the game's sfx bus (`bus:'ui'` for UI blips), and `HT.Audio.bus('sfx'|'ui'|'music')` gives the GainNode to connect your own nodes to (`HT.Audio.ctx` is the context), so the volume sliders and ducking apply.


Getters: `P M L VAN CV WORLD mode enemies allies npcs keys simT useTap(settable) stage`. Objects: `THREE scene camera MISSIONS HOMIES WEAPONS CP JH HUD`.
Car damage: `carHp(car) carHpMax(car) carFrac(car) carDamage(car,amt,cause) carRepair(car,amt,o) crash(car,speed,{angle,rear})` (docs/car-damage.md). `carFeel(type,row,seats)` and `CAR_FEEL`/`SEATS`: give a new vehicle type its handling row (label, seats, speeds, camera) and seat positions. `registerCar(obj,x,z)`: make a vehicle borrowable in free roam. Weapons and people: `give(id,{mag,extra,slot,auto})` (put a gun in the dad's loadout, e.g. the hunter for overwatch), `swap(id,force)`, `reload()`, `hurtEnemy(e,dmg,by,opt)`, `pose(dude,dt,o)`. `holster(true|false)`: put the dad's gun away (no gun in hand, no aim pose, firing blocked); `def.noGuns` or a live `M.noGuns` holsters automatically.
Functions: `radio(who,text,front) banner(t,sub,dur) feed(text,kind,sub) addTrust(v,hood) spawnEnemy(x,z,boss) spawnAlly(id,x,z) surrender(e) equip(dude,gun) makeDude(look) makeVehicle(type,color) makeVanBox(color) wmAdd(obj,solid) wmCol(box) wmCarry(kind,mesh,it) wmDrop() wmSign(lines,x,z,yaw,o) wmSnap(x,z) wmSnapRoad(x,z) wmWindow(cx,cz,r) wmSetWindow(w) wmNearest(list,ok) wmCuff(e) box(w,h,d,col,x,y,z,parent) mat(col) lin(col) rand pick clamp V3 tileC tx walkable groundAt collide carSize syncCar owStopCar enterCar exitCar nearCar puff snd rebuildTargets project endMission(ok,why,title) spotted(why) CarAI() roads() setNight(k) SV() save() overlay(id,el)`.

Everything you add to the scene goes through `wmAdd` (it is removed when the job ends). Enemies: `e.script={kind:'to',x,z,speed,then}` drives a character without the combat AI (`'home'`, `'flee'` also exist); `e.noLeash=true` lets it leave the site window.

## 5. Stage checkpoints [CP]

`api.CP.mark(stage)` at the start of each stage (the first is automatic). It snapshots the player (position, health, loadout, ammo), your car (pose, hp, in or out), the crew, borrowed cars and `save(M)`; it shows the "Checkpoint" toast. On a failure, the result card offers **Retry from <stage>** (`result:retry`) and **Restart job** (`result:restart`). A retry calls `start(M,{checkpoint})`, restores the snapshot, then `load(M,snap.job)`; `M.retried=true`, ammo comes back as it was at the snapshot, and gold is capped to silver. Keep `save()` small and only what the stage needs to resume. `api.spotted(why)`: `failPolicy:'soft'` ends the job (retry from the stage); `'escalate'` clears `M.clean`, alerts every idle enemy into combat and releases `M.stealth` if you set one.

## 6. Results, payout, save, calendar

On `endMission`: `payout(M,ok)` lines and `medal(M)` are computed, `end(M,ok)` runs (not on replays), then `HT.Save.recordRun(s,id,{ok,t,score,medal,replay,trustGain,clean,story})` updates `SAVE.jobs[id]` (`done best medal runs replays plan medalPaid`), the calendar pin (`SAVE.calendar.entries`), and `SAVE.day`. A first silver/gold reached on a later run pays +$100/+$250 once (a "medal" payout line). Base pay `def.pay` and par come from `HT.CATALOG.missions` (the registry adds your entry). Riverside jobs move `prog.trustR`, Maple ones `prog.trust` (`api.addTrust(v,hood)` to choose).

Save v3 helpers (`js/save.js`, `HT.Save`): `jobRec(s,id) recordRun(...) album(s,photo) household(s,id) storefront(s,id[,state]) gadget(s,id) perk(s,id[,true])`, fields `day calendar album world.households world.storefronts gear perks jobs flags.hankDiscount gadgets`. Pass `null` for the live save. Crew perks are `SAVE.perks[crewId]` (not `crew[id].perk`: `crew[id]` stays a boolean).

**Replay** (the fridge calendar at home, or the calendar above the laptop desk): half pay, trust gains ×0.25, no `done`/day/households/storefronts/flags changes, the site's after-sign hidden, `M.replay=true`. Gate story effects on `!M.replay` in your own code too.

## 7. HUD for jobs (`js/hud.js`)

`F.meters` / `state.meters`: `{id,label,v,max,warn,icon,style:'bar'|'ring'|'pips'|'bands',zones,marker,sub,color}` (top centre, max 3). `F.widgets`: `{id,kind:'timer'|'score'|'combo',label,v,max,hot,sub}`. `HUD.overlay(id, el|null)` mounts a full-screen layer; `HUD.kit.viewfinder()`, `HUD.kit.choices({...})`, `HUD.kit.roles({...})` build the photo viewfinder, the dialogue strip and the crew-roles card shell; `HUD.checkpoint(label)` is the stage toast. Full reference: `docs/design/HUD.md` → "Mission widgets". Never edit `js/hud.js`; if a widget is missing, compose it from these in your own file.

## 8. Night

`def.night:true` turns the night preset on for the job. Night lowers enemy sight range (24 m → 14 m), lights lamps, porches, windows and headlights. The player has a flashlight (F) and, if bought at Hank's Hardware → Gadgets, night-vision goggles (N, battery). `nightLight(x,z)` (0.4–1) is the light factor for [STEALTH]. Preview: `__ht.setNight(0..1)`.

## 9. Testing a job: `node dev/jobs-check.js <id>`

It starts a new game, waits for the job files, unlocks your job (`unlock.done` + `test.give(api)`), takes it from its giver (home interactable or world giver), accepts the brief, drives the van into the ring, then calls your `test.step(api, frame, opts)` every frame until the job ends, and checks: won, paid, `SAVE.jobs[id]`, the calendar pin, zero console errors. Flags: `--retry` (first a run with `opts.fail=true` that must lose; then the fail card must offer retry/restart; retry from the stage and win; gold capped), `--replay` (the fridge calendar → Replay → half pay, same day, households unchanged), `--shots` (jpgs in `docs/screenshots/jobs/<id>/`), `--no-giver` (start directly). Your bot may teleport (`api.P.pos.set`), press E (`api.useTap=true`) or hold it (`api.keys.e=true`). Also write `dev/jobs/<id>.js` for anything job-specific (SPEC3 section 5).

`node dev/jobs-registry.test.js` (Node, no browser): registration, MISSIONS/CATALOG entries, hook dispatch order and error isolation, gating, a 404'd file is skipped, the [CP] save/load round trip of every job file that registers in Node (`test.sample()` returns a mid-job `M`; set `test.cpNode:false` if your `load()` needs the game, and make sure `--retry` passes instead), save v2→v3 migration.

`window.__ht.jobs`: `ready list() index(id) start(id,{replay,checkpoint}) lock(id) CP JRS calendar() calEntries() replay(id) spotted() homeUse(id) openBrief(id) finish(ok) registry api`.

## 10. File ownership, waves 1–5 (SPEC3 section 5)

A job worker owns `js/jobs/<id>.js`, `dev/jobs/<id>.js` and `docs/screenshots/jobs/<id>/`. A system worker also owns its module.

| Wave | Job / system | Owns (new files) | Shared-file exception |
|---|---|---|---|
| 1 | *Dad Taxi* | `js/jobs/taxi.js`, `js/jobs/_stops.js` | — |
| 1 | *Honey-Do Blitz* | `js/jobs/blitz.js` | — |
| 1 | *Small Talk* | `js/jobs/talk.js`, `js/social.js` (conversation part), `css/social.css` | — |
| 1 | *The Grass Is Greener* | `js/jobs/mower.js`, `js/jobs/_race.js` | `js/carai.js` (`VEH.mower`), `js/vehicles.js` (mower model) |
| 1 | *Higher Ground* | `js/jobs/overwatch.js`, `js/jobs/_escort.js` | — |
| 2 | *Sign of the Times* + [STEALTH] | `js/jobs/sabotage.js`, `js/stealth.js` | `js/ai.js` (`a.blind`), `js/vehicles.js` (deflate). (`MOODS.night` already exists, wave 0) |
| 2 | *Exhibit HOA* + [PHOTO] | `js/jobs/hoa.js`, `js/photo.js` | — |
| 2 | *Following Distance* + [TAIL] | `js/jobs/tail.js`, `js/tail.js` | — |
| 2 | *Hitch Happens* + [TOW] | `js/jobs/tow.js`, `js/tow.js` | `js/carai.js` (`towMul`, the `hitch` catalog item) |
| 2 | *Handle With Care* | `js/jobs/cargo.js` | — (potholes: `WORLD.potholes`) |
| 2 | [CAL] (system) | `js/calendar.js` | — (the calendar card and fridge/calendar interactables already exist, wave 0) |
| 3 | *Crossing Guard* | `js/jobs/crossing.js` | — |
| 3 | *Grand Opening* | `js/jobs/pawn.js`, disguise section of `js/social.js` | — |
| 3 | *Cone Zone* | `js/jobs/cones.js`, `js/jobs/_props.js` | `js/carai.js` (`ctx.speedCap`), `js/roadgraph.js` (edge-cost override) |
| 3 | *Heavy Lifting* | `js/jobs/moving.js` | `js/ai.js` (`AI.ally` role commands) |
| 3 | *Hands Off* | `js/jobs/arrest.js` | — |
| 4 | *Brake Check* | `js/jobs/brake.js` | `js/tail.js` (`slot`, `boxed`) |
| 4 | *Minivan Roundup* | `js/jobs/roundup.js`, `js/convoy.js` | — |
| 4 | *Chain Reaction* | `js/jobs/bike.js`, `js/jobs/_runner.js` | `js/save.js` (laptop Resale tab) |
| 4 | *Good Fences* + [ROLES] | `js/jobs/heist.js`, `js/crewplan.js`, `css/plan.css` | — |
| 5 | *Watch Your Step* | `js/jobs/patrol.js` | — |
| 5 | *Porch Light* | `js/jobs/porch.js` (exists as the wave-0 smoke test; wave 5 deepens it: Riverside porches, car pirates, `done.hoa` gate, every 2nd day) | — |
| 5 | *Suds Up* | `js/jobs/carwash.js` | — |
| 5 | *Everybody Waves* | `js/jobs/finale.js` | — |

New system modules (`js/stealth.js`, `js/photo.js`…) are loaded by their job file (`document.createElement('script')`) or listed by their owner in their job file's header; they register system hooks with `HT.Jobs.on`.
