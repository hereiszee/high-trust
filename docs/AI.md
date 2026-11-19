# Game AI (`js/ai.js`)

`window.HT.AI` handles navigation, enemy squads, the crew, wave pacing and barks for the tile levels. It is engine-agnostic: it takes plain data and returns intents, and it never touches THREE or the DOM. The game keeps ownership of collision, damage, surrender, rendering and subtitles.

**Status: wired into `index.html`** (all 13 steps below; see "In the game" at the end) and checked in the real 3D game with `node dev/ai-ingame.js` (evidence and screenshots in `docs/screenshots/ai-ingame/`).

- Tests: `node dev/ai.test.js` (`--quick` runs fewer seeds, `--sync-maps` recopies the maps from `index.html`)
- Visualiser: open `dev/ai.html` (served or from `file://`). It shows the real mission maps with the module driving every enemy and crewman against a scripted dad. URL params: `m`, `seed`, `t` (fast-forward), `until=combat`, `pause=1`, `tView=1`.
- Screenshots: `docs/screenshots/ai/`

## API

| Call | Returns |
|---|---|
| `AI.buildNav(L.g,{colliders:L.colliders})` | nav: `walk`, `los(ax,az,bx,bz,crouch)` (`crouch`: `'a'`/`'b'` = that end is crouched, `true` = both), `path(ax,az,bx,bz,{cost})` → `{pts,cells,len}` (8-way A*, no corner cutting, string-pulled), `distField(cell)` (cached), `covers[]` (`{i,x,z,dirs,high,low,door,room}`), `hides(spot,tx,tz)` → `'stand'`, `'crouch'` or `null`, `peekFrom(spot,tx,tz,hide)`, `rooms[]` (`name`, `indoor`, `adj`), `doors[]`, `roomAt`, `isDoor`, `roomDepth(room)` |
| `AI.pool({maxShooters:3})` | shared shooting budget across squads |
| `AI.squad(nav,{difficulty|diff,pool,barker})` | blackboard (`neighbours()` = squads in the same or an adjacent room through the shared pool): `add(e)`, `update(dt,world)`, `morale`, `requests[]`, `event({type:'down'\|'surrender'\|'hurt',agent})`, `tokens`, `threats` |
| `AI.think(e,world,dt)` | enemy intent (below) |
| `AI.move(e,intent,dt)` | moves `e.pos` along `intent.dir*speed` and turns `e.yaw` toward `intent.face`. It does no collision, so call `collide()` after it. |
| `AI.ally(a,world,dt)` | crew intent |
| `AI.director(nav,{spawns,defend,waves})` | `update(dt,world)` → spawn orders, plus `wave`, `state`, `hunt` and `finished` |
| `AI.hitChance(...)`, `AI.shotDamage(gun,dist)` | the accuracy model |
| `AI.shotFired(fx,fz,tx,tz,enemies,t)` | applies suppression to enemies near the path of a round |
| `AI.surrenderChance(e,base)` | the surrender chance, which rises as squad morale drops |
| `AI.barker()`, `AI.BARKS` | throttled lines (114) |
| `AI.GUNS`, `AI.ALLY_GUNS`, `AI.ROLES`, `AI.DIFFICULTY`, `AI.seed(n)` | tables and a deterministic RNG |
| `AI.missionDiff(i)`, `AI.MISSION_DIFF` | per-mission tuning used by the game and the node sims (missions 0 and 3 are gentler) |

Enemy intent: `{dir,speed,face,stance:'stand'|'crouch',peek:'left'|'right'|'over'|'flanked'|null,fire,targetId,hitChance,dmg,aiming,reloading,bark:{text,event,priority},state,role,moveTo,path,token,wantsSurrender}`.

Crew intent: `{dir,speed,face,stance,fire,targetId,hitChance,dmg,bark,callout:{dir,id,room},state:'follow'|'cover'|'stack'|'revive'|'down',revive,reviving,yield,teleport}`.

Conventions: `e.yaw` uses the character convention, forward = (sin yaw, cos yaw), which is what `faceTo` produces. `player.yaw` and `camera.yaw` use the camera convention, forward = (−sin yaw, −cos yaw).

## Integration steps for `index.html`

1. Load the module after three.js: `<script src="js/ai.js"></script>`. Inside the IIFE, add `const AI=window.HT.AI;`.
2. **Level build.** At the end of `buildLevel()`, after the bounce-house cells are written into `g`, add `lvl.nav=AI.buildNav(g,{colliders:lvl.colliders});`. Leave the hub alone: the module is only used in missions.
3. **Squads.** In `startMission()`, before spawning, add `M.pool=AI.pool({maxShooters:AI.DIFFICULTY.normal.pool});M.squads=new Map();M.barker=AI.barker();`. Then add a helper:
   ```js
   function squadFor(x,z){const r=L.nav.roomAt(x,z),key=L.nav.rooms[r]&&L.nav.rooms[r].indoor?r:'out';
     let s=M.squads.get(key);if(!s){s=AI.squad(L.nav,{pool:M.pool,barker:M.barker});M.squads.set(key,s)}return s}
   ```
4. **`spawnEnemy`.** After `e` is built, add `e.maxHp=e.maxhp;e.role=AI.roleFor(gun,boss);e.dmgMul=(M&&M.i===0?.8:1)*(boss?1.4:1);if(M&&L.nav)squadFor(x,z).add(e);`. `e.state` keeps its game meaning (`'idle'` means alive). The module reads `e.state`, `e.hp`, `e.maxHp`, `e.pos`, `e.yaw`, `e.gun` and `e.boss`, and keeps its own memory in `e.ai`.
5. **Per-frame world.** Build this once per frame before the enemy loop, in both `frame()` and `__ht.step()`:
   ```js
   const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
   aiWorld={nav:L.nav,t:simT,diff:AI.DIFFICULTY.normal,noises:noiseQ.filter(n=>simT-n.t<.5),agents:enemies.filter(e=>e.state==='idle'),
     threats:[{id:'player',x:P.pos.x,z:P.pos.z,fx,fz,fov:.96,isPlayer:true,crouch:P.crouch,moving:P.moving,sprint:!!keys.shift&&P.moving,reloading:P.reloadT>0,busy:!!(keys.e&&P.moving===false),down:false},
       ...allies.map(a=>({id:a.id,x:a.pos.x,z:a.pos.z,crouch:a.ai&&a.ai.stance==='crouch',down:a.down}))]};
   for(const s of M.squads.values())s.update(dt,aiWorld);
   ```
   `noiseQ` is a new array. Push `{x,z,r:26,t:simT,kind:'gun',id:'player'}` in `fire()`, and `{...,r:22,id:a.id}` when an ally shoots.
6. **`updEnemy`.** Keep the dead, cuffed and surrender branches as they are. Replace everything from `e.thinkT-=dt;` through the strafe and burst block with:
   ```js
   if(mode!=='mission'||!L.nav){/* hub: keep the old idle sway */}
   const I=AI.think(e,aiWorld,dt);AI.move(e,I,dt);collide(e.pos,.35);
   if(I.bark)radio(e.boss?'The King':'Hoodie',I.bark.text,I.bark.priority>=2);
   if(I.fire){const t=I.targetId==='player'?P:allies.find(a=>a.id===I.targetId);if(t&&!t.down)shootAt(e,t,I.hitChance,I.dmg,true)}
   if(I.wantsSurrender&&!e.triedSurr){e.triedSurr=true;surrender(e)}
   e.alert=e.ai.mode!=='idle';
   d.root.position.set(e.pos.x,0,e.pos.z);d.root.rotation.y=e.yaw;
   pose(d,dt,{moving:I.speed>.2,speed:I.speed/3.4,aim:e.alert,mode:I.stance==='crouch'?'crouch':'stand'});
   if(I.aiming&&e.ai.gun.laser){/* hunter: draw the 0.8 s red laser (SPEC A.1) */}
   ```
   Remove the old idle-separation loop: local avoidance is now inside `think`. The `shootAt` signature is unchanged, since `acc` is now `I.hitChance` and `dmg` already includes the mission and boss multipliers.
7. **Surrender chance.** In `hurtEnemy`, replace `Math.random()<.5` with `Math.random()<AI.surrenderChance(e,.5)`. Morale is updated automatically from `e.state` in `squad.update`.
8. **Suppression.** In `fire()`, after the pellet loop, add `AI.shotFired(shoulder.x,shoulder.z,end.x,end.z,enemies,simT)` for the last `end`. Do the same in `shootAt` when `!isEnemy`.
9. **Boss reinforcements.** After the enemy loop, drain the requests:
   ```js
   for(const s of M.squads.values())while(s.requests.length){const r=s.requests.shift();
     if(r.kind==='reinforce'){for(const p of r.points){const e=spawnEnemy(p.x,p.z,false);s.add(e);AI.mem(e,aiWorld);e.ai.mode='combat';e.ai.sub='react';e.ai.react=simT+.6;e.ai.lkp={x:P.pos.x,z:P.pos.z,t:simT}}rebuildTargets()}}
   ```
10. **`updAlly`.** Keep the `a.down` branch. Replace the targeting, formation and fire code with:
    ```js
    const I=AI.ally(a,{nav:L.nav,t:simT,barker:M.barker,player:{x:P.pos.x,z:P.pos.z,yaw:P.yaw,crouch:P.crouch,moving:P.moving,reloading:P.reloadT>0,busy:holdBusyFlag,hp:P.hp},
      camera:{x:camera.position.x,z:camera.position.z,yaw:P.yaw},enemies,allies},dt);
    if(I.teleport){a.pos.set(I.teleport.x,0,I.teleport.z)}AI.move(a,I,dt);collide(a.pos,.35);
    if(I.bark)radio(a.id,I.bark.text,I.bark.priority>=2);
    if(I.fire){const e=enemies.find(x=>x.id===I.targetId);if(e)shootAt(a,e,I.hitChance,I.dmg,false)}
    if(I.reviving){const o=allies.find(x=>x.id===I.revive);if(o)o.downT-=dt*2}
    pose(d,dt,{moving:I.speed>.2,aim:mode==='mission',mode:I.stance==='crouch'?'crouch':'stand'});
    ```
    Enemies need an `id`: add `id:'e'+(eidSeq++)` in `spawnEnemy`. Keep the hub path (`mode!=='mission'`) on the old formation code, or pass `enemies:[]`.
11. **Waves (Block Party).** In `startMission`, if `m.type==='waves'`, add `M.dir=AI.director(L.nav,{spawns:L.waveSpawns,defend:L.grill,waves:m.waves})`. In `updMission`, replace the spawn block (the `M.waveT` countdown and its spawning loop) with:
    ```js
    const orders=M.dir.update(dt,{t:simT,threats:aiWorld.threats,alive,agents:live});
    for(const od of orders){const e=spawnEnemy(od.x,od.z,false);e.lane=od.lane;e.wave=true;collide(e.pos,.35)}if(orders.length)rebuildTargets();
    if(M.dir.wave!==M.wave){M.wave=M.dir.wave;M.waveAge=0;banner('WAVE '+M.wave,...)}   // keep the existing banner and radio lines
    if(M.dir.finished&&!surr.length)return endMission(true);
    ```
    Delete the `M.hunt` block, since the director sets `e.hunt` on stragglers. Keep the objective text and markers.
12. **Line of sight consistency.** The module treats tables `T` and hedges `f` like crates: they hide a crouched man and can be shot over standing up. For the player's own perception to match, change `LOS_NOCRATE` to `'#htV'`. If you'd rather keep the old rule, pass `lowCover:'c'` to `buildNav`.
13. **Crouch pose.** Enemies now crouch behind low cover. `pose(...,{mode:'crouch'})` must keep the head below about 1.1 m, or player raycasts will hit them through crates.

## Difficulty knobs (`AI.DIFFICULTY`)

`maxShooters` (per squad), `pool` (shooters across all squads at once), `reaction` (seconds before the first response), `first` (extra seconds the first time a squad makes contact), `acc`, `moveAcc` / `sprintAcc` (accuracy multiplier while the dad moves / sprints), `aim` (telegraph multiplier), `aggression` (cover-hop rate and peek cadence), `flank`, `hear`. `AI.ALLY_SUPPORT` (0.7) scales crew accuracy so the dad stays the main actor.

## Cover geometry (nav options)

- `lowReach` (2.4 m): low cover (crates, hedges) only hides a crouched man it is close to. A crate next to a standing dad 15 m away does not hide a crouched hoodie: the dad's eye and the third-person camera (about 2 m up) look straight over it.
- `lowBox` / `hiBox`: real footprints of props inside their 2 m cell (`c` 1.7 x 1.7, `f` 2 x 0.8, `T` 1.8 x 1.1; the game passes `hiBox:{t:[.3,.3]}` for tree trunks). Lines are tested against the box exactly, so a sight line through the empty margin of a crate's cell is not blocked.
- `hides(spot,x,z)` also checks lines to both shoulders (±0.3 m), so a crate corner that covers half a body is not cover.

## In the game (`index.html`)

- Script tag after `js/world.js`; glue lives in the `AI` section: `aiStart` (squads, pool, barkers, wave director), `squadFor`, `aiTick` (per-frame world, squad updates; called in `frame()` and `__ht.step()`), `aiAfter` (the King's reinforcement requests), `aiEnemy`, `aiAlly`, `aiShot` (noise + suppression hook in `fire()` and `shootAt()`), `deepCrouch`.
- `buildLevel` ends with one line that builds `lvl.nav` for missions (`losBlock:'#htVcf'`: stash tables are 0.85 m, too low to hide a crouched man, so they are not cover).
- `updEnemy` / `updAlly` keep their dead / cuffed / surrender / down branches and hand off to `aiEnemy` / `aiAlly` when a nav exists; the old code stays as the hub fallback.
- `hurtEnemy` uses `AI.surrenderChance(e,.5)`; the Block Party wave block uses `AI.director` and resets squad morale each wave.
- Crouch pose (`deepCrouch`): crouched enemies and crew kneel, lean in and sink so every hitbox stays under 0.95-1.1 m (crate top 1.15 m), measured from the model's own height, so the taller King fits too.
- `window.__ht` adds `AI`, `aiWorld`, `aiStats` (think() timing, bark log), `rayTargets` and `simT` for the headless checks.

## Known weaknesses

- Third-person camera: from ~2 m up and 2.7 m behind, the camera can see a sliver of a man hiding behind a wall corner or the edge of a crate that the dad's shoulder can't. `fire()`'s shoulder check stops those shots, but the player can see him.
- Grid resolution: cover is per 2 m cell. Diagonal (outside-corner) crate spots are the weakest; a grazing ray still reaches 1-2 of 75 probe points in some cases.
- The park has little real cover (eight crates; tree trunks are 0.5 m), so wave crews mostly fight in the open or behind crates.
- The crouch pose is a whole-body lean on box characters; if the character models change height, `deepCrouch` re-measures them, but the look of the pose is approximate.
