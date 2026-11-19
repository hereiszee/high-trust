# Home (js/home.js) — API and integration

`js/home.js` is a self-contained module that builds the family house: garage with gun safe, workbench and pegboard; entry, living room, open kitchen with island, dining nook, hallway, bedroom, and a fenced back yard with deck, pergola, grill, doghouse, swing set and toys. It also handles furniture and decorating, the family (spouse, son, daughter, dog) and their lines. Test page: `dev/home.html`. Screenshots: `docs/screenshots/home/`.

Units are metres. The group's origin sits at the world origin: x points east, z points south (toward the back yard), and the street/front door is at z<0. The house covers x −7.2…15.2 and z −0.2…10.2, and the yard reaches z 24.

## API (`window.HT.Home`)

| call | what |
|---|---|
| `init({assets, renderer, makePerson, base='assets/'}) → Promise` | Loads `assets/home/*.glb`, `assets/home/tex/*`, the family glbs, and the game textures it needs. With `assets:ASSETS` it reuses `ASSETS.tex(n)`, `ASSETS.gltf(n)` and `ASSETS.clips()`. |
| `build({layout, owned, trust, timeOfDay, renderer?, scene?}) → H` | Builds the house. Pass `renderer`+`scene` to add the group and bake reflections in one step. |
| `H.group` | Root Object3D. Add it to the scene. |
| `H.colliders` | Live array of `{x0,z0,x1,z1}`: walls, fixtures, fence, doors, placed furniture. Door colliders clear themselves while the door is open. |
| `H.solids` | Live array of meshes for camera-boom and bullet raycasts: walls, ceiling, cabinets, furniture taller than 0.8 m. |
| `H.spawn` | `{x:1.48, z:1.25, yaw:π}`, just inside the front door, facing in. Uses the game's yaw convention. |
| `H.exits` | `[{id:'front',…,label:'Head outside'},{id:'garage',…,label:'Take the van'}]` |
| `H.interactables` | Fixed: `locker` (safe), `workbench`, `laptop`, `fridge`, `grill`, `bed`, `door`. Plus `tv` for each placed TV, which updates with the layout. |
| `H.familyInteractables()` | `[{id:'family', who, x, z, r, label:'Talk to Jen' / 'Pet Biscuit'}]`, rebuilt each call. |
| `H.update(dt, playerPos)` | Runs family AI, auto-doors (garage door, bedroom, garage back door, slider), the TV broadcast, the fan and the fire pit. |
| `H.onEnter({event, trust, shotSurrUp}) → line` | Greeting. The spouse walks over and waves, the dog runs up, the others turn to look. Returns `{who, name, text}`. |
| `H.talk(who, {trust, event}) → line` / `H.pet() → line` | The member faces you and plays a talk or happy animation. |
| `H.forceActivity(who, id)` | Scripted moments or debugging (`'cook'`, `'island'`, `'dogbed'`, `'seat:<uid>'`…). |
| `H.lights.setTimeOfDay(h)` | Lamps run brighter in the evening and at night. Daylight comes from the game's sun. |
| `H.setCutaway(on)` | Hides roof, ceiling and ceiling fixtures; they still cast shadows. Use it for decorate mode or a top-down camera. |
| `H.bakeReflections(renderer, scene)` | One cube render plus PMREM used as the interior IBL. Call it after `scene.environment` is ready and the group is in the scene. Without it, interiors fall back to a turned-down sky IBL. |
| `H.setLayout(layout)`, `H.layout` | Applies or reads the furniture layout. |
| `H.vanSpot` | `{x:-3.7, z:4.5, yaw:0}` (nose to the garage door). Park the game's van here. The cells are blocked for decor; the van brings its own collider. |
| `H.aoHint` | `{radius:.45, power:2.5}`. The game's SSAO radius of 1 m leaves dark halos indoors; use about .45 / 1.6–2.5 while home. |
| `H.dispose()` | Removes the group and frees the probe. |
| `catalog`, `catalogById` | 39 items: `{id,name,price,fp:[w,d] cells of 0.5 m, zone:'in'/'out'/'any', h, tags, layer?, seats?, wall?, ww, wh, y}`. Covers SPEC D.5 plus extras. Starter items (price 0) are flagged `starter`. |
| `starterLayout()`, `fullLayout()`, `allOwned()` | The sparse starter house, a fully furnished house, and an owned map for testing. |
| `validate(layout, owned) → {layout, dropped}` | Drops unknown, invalid or not-owned entries, each with a `why`. Refund the dropped items. |
| `autoPlace(layout, id) → layout/null` | Puts a new purchase in the first valid spot. |
| `decorate.*` | See below. |
| `familyLine(ctx) → {who,name,text,pool}` | SPEC C.6 lines. Pools are tried in order: `firstVisit > event > trust band > idle`. `ctx: {event, who, trust, shotSurrUp}`. Events: `firstVisit, win, win_gary, win_rick, win_dave, win_doug, fail, boughtGun, boughtFurniture, boughtAttachment, flamingo, pet`. |
| `lineState()` / `setLineState(s)` | Persist this in `SAVE.family` so lines don't repeat until a pool is exhausted. |
| `makeStandIn(role)` | Default person for roles `spouse, son, daughter, dog, dad`: the family glbs plus `dad_casual` clips, with a bone-bent sit pose. Any `makePerson(role)` must return `{root, setAnim(name), update(dt)}`. Animation names used: `idle walk run sit wave talk cook phone play lie eat happy`. `person.seatH` (metres) is set before `setAnim('sit')`. |

Layout format: `{v:1, items:[{uid,id,x,z,r}]}` for floor items, where `x,z` is the min-corner cell (0.5 m cells, so `x*0.5` metres) and `r` is the number of quarter turns (0 = faces +z). Wall items use `{uid,id,wx,wz,y,r}`.

Decorate rules: the zone must be indoor or yard; the item must not sit on a blocked fixture or a reserved doorway/fixture front; it must not overlap other items (rugs use their own floor layer); it must not be within 0.3 m of the people passed in; and a BFS from the front door must still reach the locker, workbench, laptop, slider, yard, garage, bedroom and grill. Items are pushed flush against a wall within 0.45 m behind them. Wall items snap to painted wall spans every 0.25 m and avoid windows, cabinets and the TV wall's fixtures.

## Integration steps for index.html

1. Load the module after the three.js add-ons: `<script src="js/home.js"></script>`.
2. At boot: `HT.Home.init({assets:ASSETS, renderer, makePerson: (window.HT.People && HT.People.make) || undefined})`. Await it together with `ASSETS.ready`.
3. In `enterHome()`, replace `buildLevel(HOME)` with:
   ```js
   if(L&&L.group)scene.remove(L.group);
   HT.Home.setLineState(SAVE.family);
   const H=HOME3=HT.Home.build({layout:SAVE.furniture.layout||HT.Home.starterLayout(), owned:SAVE.furniture.owned, trust:prog.trust, timeOfDay:15});
   scene.add(H.group); H.bakeReflections(renderer,scene);
   for(const d of H.dropped) refund(d.id);
   L={def:{id:'home',type:'home'},group:H.group,colliders:H.colliders,solids:H.solids,W:1,H:1,g:[['#']],start:V3(H.spawn.x,0,H.spawn.z),items:[],stashes:[],spawns:[],markers:[],ammo:[]};
   setMood({id:'hub'}); P.pos.copy(L.start); P.yaw=H.spawn.yaw;
   RENDER.mats.aoMat.uniforms.radius.value=.45; RENDER.mats.aoMat.uniforms.power.value=2;   // restore 1 / 4 on exit
   VAN.pos.set(H.vanSpot.x,0,H.vanSpot.z) … (or a parked van mesh + collider)
   const line=H.onEnter({event:SAVE.events.shift(),trust:prog.trust}); if(line)radio(line.name,line.text);
   ```
   `L.g` is only used by enemy and ally pathing, which never runs at home, so the 1×1 placeholder is enough.
4. In `updHome(dt)`: call `HOME3.update(dt,P.pos)`, then show prompts from `HOME3.interactables`, `HOME3.familyInteractables()` and `HOME3.exits` (nearest one within `r`). On E: `locker` → `openLocker('loadout')`, `workbench` → `openLocker('attach')`, `laptop` → `openShop('dadazon')`, family → `const l=HOME3.talk(who,{trust:prog.trust}); radio(l.name,l.text)`, dog → `HOME3.pet()`, `front` exit → `exitHome()`.
5. Decorate (B key, or the Dadazon card button):
   ```js
   HT.Home.decorate.start({owned:SAVE.furniture.owned, cutaway:true, people:[P.pos],
     onChange:L=>{SAVE.furniture.layout=L;saveGame()}, onExit:L=>{SAVE.furniture.layout=L;saveGame()}});
   // each frame: HT.Home.decorate.aim(camera.position, camFwd(), [P.pos]); show decorate.aimInfo.why as the prompt
   // click/E: decorate.place()   R: decorate.rotate()   X/right-click: decorate.remove()   M: decorate.move()
   // Tab/wheel: decorate.cycle(±1)   Esc: decorate.exit()   inventory strip: decorate.inventory()
   ```
   Pitch the camera down (or raise the boom) while decorating; with cutaway on, you see the room from above.
6. Purchases: `SAVE.furniture.owned[id]++`, then optionally `SAVE.furniture.layout=HT.Home.autoPlace(SAVE.furniture.layout,id)||SAVE.furniture.layout`. Push `'boughtFurniture'` (or `'flamingo'`) to `SAVE.events`.
7. `exitHome()`: `SAVE.family=HT.Home.lineState(); HOME3.dispose();` restore the AO uniforms, then `enterHub({at:'home'})`.
8. `__ht`: expose `get home(){return HOME3}`.

## Cost

Starter layout: about 360k triangles. Fully furnished house and yard: about 490k triangles in the whole level, roughly 600–880 meshes before frustum culling; the static architecture and fixtures are merged per material. Five point lights (no shadows), one cube-map probe. New assets: about 8.9 MB.
