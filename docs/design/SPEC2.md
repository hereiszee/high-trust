# High Trust: World, Riverside Flats & Dad's Auto, implementation spec (SPEC2)

Extends `docs/design/SPEC.md` (approved: weapon feel, pickups, home, family, economy, shops, furniture, save). Everything in SPEC.md still holds unless a section below says it replaces something. Same conventions: refer to code by function/constant name, never by line number. `TILE=2` m. Char-grid maps. `SOLID` / `LOSBLOCK` strings. `window.__ht` for tests.

What this adds, for the owner's request *"car upgrades maybe could be a thing. somewhat larger world, ability to drive to a new neighborhood for more missions/other upgrades"*:

- **A. World**: one continuous drivable map, 232×80 tiles (464×160 m), with no loading screen. It contains Maple Heights (enlarged, home and Hank's Hardware), Route 9 (Fill-Er-Up gas station, Dad's Auto, Industrial Way), a bridge over the river, and **Riverside Flats**, a denser, older neighborhood with its own trust meter that visibly improves. All 9 mission sites are real places in the world. Fast travel, a minimap and a GPS route line.
- **B. Missions**: 5 new jobs in Riverside (Earl the retired bus driver, Pastor Dee, Rosa the ER nurse who becomes the first Honorary Dad, Benny the ice-cream man, then the Duke). New objective types (stakeout, escort, vehicle chase, defend the garden) reuse existing systems. Two repeatable side activities.
- **C. Dad's Auto**: performance, protection, utility and cosmetic upgrades for the van, a van health model, and three more vehicles to buy.
- **D. Save v2**, migrating from `ht-save` v1.
- **E. Build order** in 6 layers with tests, and which parts can be built in parallel as separate `js/` modules.

New `mode` values: none. The world *is* the hub (`mode==='hub'`), and missions in the world keep `mode==='mission'` while `L` stays the world level. New flags live in `SAVE.world`, `SAVE.garage` and `prog.trustR` (section D).

---

## A) World

### A.1 Layout

Overview, 1 character = 2×2 tiles (north is up, x grows east). `H` = houses, `R` = rowhouses, `B` = commercial buildings, `W` = warehouses, `#` = mission-site walls, `:` = chain-link, `~` = river, `=` = bridge, `X` = bridge barricade, `b` = basketball court, `o` = garden beds, `^` = trees.

```
^^^^^HHHHHHHHH^^^HHHHHHHHH^^^HHHHHHHHHHHHHHH^^^^^^^^^^^^^^^^^^^^^^^^^^^~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
^^   HHHHHHHHH   HHHHHHHHH   HHHHHHHHHHHHHHH  ^ ^                     ^~~~~~^                                    ^ ^
^       ^  ^H       ^  ^       ^     ^  ^                             ^~~~~~^                                    ^ ^
^                                                                     ^~~~~~^                                      ^
^                                                        BBBBB        ^~~~~~^                                    ^ ^
^^   HHHHHHHHH   HHHHHHHHH   HHHHHHHHHHHHHHH  ^ ^        BBBBB        ^~~~~~^   BBBBBB  RRRRRR  ::::::   BBBB    ^ ^
^    HHHHHHHHH   HHHHHHHHH   HHHHHHHHHHHHHHH  ^ ^    B B              ^~~~~~^   BBBBBB  RRRRRR  :bbbb:   BBBB      ^
^^   HHHHHHHHH   HHHHHHHHH   HHHHHHHHHHHHHHH  ^ ^    B B              ^~~~~~^   BBBBBB          :bbbb:           ^ ^
^^   HHHHHHHHH   HHHHHHHHH   HHHHHHHHHHHHHHH  ^ ^                     ^~~~~~^           RRRBBB  :bbbb:           ^ ^
^       ^  ^        ^  ^       ^     ^  ^                             ^~~~~~^           RRRBBB  ::::::             ^
^                                                                     X=====                                     ^ ^
^                                                                     X=====                                     ^ ^
^    HHHHHHHHH   HHHHHHHHH   HHHHHHHHHHHHHHH  ^ ^                     ^~~~~~^   ## ###########  RRRRRR  BBBBBB     ^
^^   HHHHHHHHH   HHHHHHHHH   HHHHHHHHHHHHHHH  ^ ^                     ^~~~~~^   #     #  #   #  RRRRRR  BBBBBB   ^ ^
^^   HHHHHHHHH   HHHHHHHHH   HHHHHHHHHHHHHHH  ^ ^      B              ^~~~~~^   #     #  #   #  ::::::  BBBBBB   ^ ^
^    HHHHHHHHH   HHHHHHHHH   HHHHHHHHHHHHHHH  ^ ^   BBBBBBB           ^~~~~~^   #######  #####  RRRRRR             ^
^^      ^  ^        ^  ^       ^     ^  ^           BBBBBBB           ^~~~~~^   :               RRRRRR           ^ ^
^                                                   BBBBBBB           ^~~~~~^                                    ^ ^
^                                                   BBBBBBB           ^~~~~~^                                      ^
^^   HHHHHHHHH   HHHHHHHHH   HHHHHHHHHHHHHHH  ^ ^                     ^~~~~~^   RRRRRR  RRRRRR  ::::::  ::::::   ^ ^
^^   HHHHHHHHH   HHHHHHHHH   HHHHHHHHHHHHHHH  ^ ^                     ^~~~~~^   RRRRRR  RRRRRR  :ooooo  ooooo:   ^ ^
^    HHHHHHHHH   HHHHHHHHH   HHHHHHHHHHHHHHH  ^ ^                     ^~~~~~^   ::::::  ::::::  :oooooo ooooo:     ^
^^   HHHHHHHHH   HHHHHHHHH   HHHHHHHHHHHHHHH  ^ ^   ::::::::::::::::  ^~~~~~^   RRRRRR  RRRRRR  :ooooo  ooooo:   ^ ^
^                                                                  :  ^~~~~~^   RRRRRR  RRRRRR  ::::::  ::::::   ^ ^
^                                                   :              :  ^~~~~~^                                      ^
^^ ^^^ ^^^ ^^^ ^^^ ^^^  ^^ ^^^ ^   ^^^ ^^^ ^^^  ^   ################  ^~~~~~^                                    ^ ^
^             ^^  ^       ^   ^^             ^^ ^   #      ##      #  ^~~~~~^   RRRRRR  RRRRRR  RRRRRR  RRRRRR   ^ ^
^             ^^              ^              ^^ ^   #      ##      #  ^~~~~~^   RRRRRR  RRRRRR  RRRRRR  RRRRRR     ^
^#############^^ ^          ^ ^^             ^^ ^   ################  ^~~~~~^   ::::::  ::::::  ::::::  ::::::   ^ ^
^#  # #  #   #^^              ^^             ^^ ^   #   #       #  #  ^~~~~~^   RRRRRR  RRRRRR  RRRRRR  RRRRRR   ^ ^
^#  # #  #   #^^     ^  ^     ^^#############^^ ^   #   #       #  #  ^~~~~~^   RRRRRR  RRRRRR  RRRRRR  RRRRRR     ^
^#############^^              ^^#    #  #   #^^ ^   #   #       #  #  ^~~~~~^                                    ^ ^
^#  #    #   #^^^^^^^^^^^^^^^^^^#############^^ ^   ################  ^~~~~~^                                    ^ ^
^#  #    #   #^                ^#   #    #  #^^ ^     ^ ^  ^ ^  ^ ^  ^^~~~~~^   ::   ::::::::WWW::::  ::::::::     ^
^#############^                ^#############^^ ^                     ^~~~~~^   :           :WWW:            :   ^ ^
^^^^^^^^^^^^^^^                ^#   # B  #  #^^ ^    ^ ^  ^ ^  ^ ^  ^ ^~~~~~^   ############:WWW:            :   ^ ^
^                              ^#   #    #  #^^ ^     ^ ^  ^ ^  ^ ^  ^^~~~~~^   #  #   #   #:WWW:   #########:     ^
^                              ^#############^^ ^                     ^~~~~~^   #  #   #   #:WWW:   #  # B  #:   ^ ^
^                                             ^ ^    ^ ^  ^ ^  ^ ^  ^ ^~~~~~^   ############:WWW:   ####    #:   ^ ^
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^~~~~~^^^^:::::::::::::WWW:::::::######:^^^^^^
```

| Region | Tiles (x) | What's there |
|---|---|---|
| **Maple Heights** | 0–99 | The old HUB, unchanged at x<60, z<41 (so SPEC.md's home block x17–21 z11–13, the `H` door at (19,10) and the hardware `R` door at (25,4) are still valid). Enlarged east (x57–86 house column, Ridgeview Dr at x88) and south (Birch St at z47). The south strip holds three mission sites: the **Birch St duplex** (Rick), **Linden Park** (Dave), the **Ridgeview compound** (Doug). |
| **Route 9** | 100–141 | Maple Ave becomes Route 9 east of x99. **Fill-Er-Up** gas station (north side), **Dad's Auto** (south side), **Industrial Way** (x100–102, runs south) with Gary's **chop shop** behind chain-link. Tree belt at x93/96 separates it from the houses. |
| **River + bridge** | 142–151 | 20 m of water, full height. The **Route 9 bridge** at z19–23 (deck `=`, rails `|`). A **barricade** `!` at x141 ("BRIDGE CLOSED FOR INSPECTION") stays until Act 2 opens it. |
| **Riverside Flats** | 152–231 | A 5×5 grid of narrow streets (RX at 156/172/188/204/220, RZ at 6/20/34/48/62). Blocks of attached **rowhouses** with chain-link back yards, porches on the sidewalk. Main St is the continuation of Route 9. **Church & Youth Center**, **Ramos Corner Mart**, **basketball court**, **Benny's Brain Freeze depot**, **Community Center**, **Spin City Laundromat** (Dee), **Community Garden** (Rosa). **Warehouse Row** on Dock St along the south: the **Spoke Shop** (Earl) and the **Duke's scrapyard**. |

Street names (shown in the minimap tooltip and in `place` strings): z6 **Oak St**, z20 **Maple Ave → Route 9 → Main St**, z34 **Elm St** (Maple) / **Ash St** (Riverside), z47 **Birch St**, x6 **Cedar Ln**, x30 **Linden Ave**, x53 **Walnut Dr**, x88 **Ridgeview Dr**, x100 **Industrial Way**, Riverside: z48 **Mill St**, z62 **Dock St**, x156 **River Rd**, x172 **2nd St**, x188 **3rd St**, x204 **4th St**, x220 **5th St**.

Driving from home to the Duke's scrapyard is about 400 m, roughly 25 s at the stock van's boost speed. Fast travel (A.9) removes the commute after the first visit.

### A.2 `WORLD` generator (replaces `HUB`)

`const HUB=WORLD;` stays as an alias so SPEC.md references keep working. The generator reads every mission map from `MISSIONS[i].map` (the 5 new maps are in B), so `MISSIONS` must be declared before it, which is already the case. Validated: every row is 232 wide; every site's park spot, huddle spot and every place below is reachable from the driveway `D` with the barricade open; Riverside is unreachable with it closed; every `I i T E B a S v &` inside each site is reachable from its huddle spot without leaving the site.

```js
const WORLD=(()=>{const W=232,H=80;
  const g=[...Array(H)].map(()=>Array(W).fill('g'));
  const inb=(x,z)=>x>=0&&z>=0&&x<W&&z<H;
  const set=(x,z,c)=>{if(inb(x,z))g[z][x]=c};
  const rect=(x0,z0,x1,z1,c)=>{for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)set(x,z,c)};
  const roads=[];                       // {o:'h'|'v', k:first asphalt row/col, a, b}  (3 tiles wide)
  const road=(o,k,a,b)=>roads.push({o,k,a,b});
  /* ---- road network ---- */
  // Maple Heights (keeps the old HUB coordinates: x<60, z<41 are unchanged)
  for(const z of[6,34])road('h',z,1,99);
  road('h',20,1,230);                   // Maple Ave -> Route 9 -> Main St (Riverside), the spine
  road('h',47,1,99);                    // Birch St
  for(const x of[6,30,53,88])road('v',x,1,49);
  // Arterial
  road('v',100,20,77);                  // Industrial Way (T-junction with Route 9)
  // Riverside Flats
  for(const z of[6,34,48,62])road('h',z,154,230);
  for(const x of[156,172,188,204,220])road('v',x,1,78);
  for(const r of roads){if(r.o==='h')rect(r.a,r.k-1,r.b,r.k+3,'s');else rect(r.k-1,r.a,r.k+3,r.b,'s')}
  for(const r of roads){if(r.o==='h')rect(r.a,r.k,r.b,r.k+2,',');else rect(r.k,r.a,r.k+2,r.b,',')}
  /* ---- Maple Heights houses (same rule as the old HUB) ---- */
  for(const[x0,x1]of[[10,28],[34,51],[57,86]])for(const[z0,z1]of[[1,3],[11,13],[15,17],[25,27],[29,31],[38,40],[42,44]])
    for(let x=x0+1;x+4<=x1;x+=6)rect(x,z0,x+4,z1,'h');
  for(const z of[4,10,18,24,32,41,45])for(const x of[16,22,40,46,62,68,74,80])if(g[z][x]==='g')set(x,z,'t');
  for(let z=2;z<50;z+=3){if(g[z][2]==='g')set(2,z,'t')}
  for(let z=1;z<H-1;z+=2)for(const x of[93,96])if(g[z][x]==='g')set(x,z,'t');      // tree belt between Maple and Route 9 businesses
  /* ---- river + bridge ---- */
  rect(142,0,151,H-1,'~');
  for(let z=1;z<H-1;z+=2){set(140,z,'t');set(153,z+1,'t')}
  rect(142,19,151,19,'|');rect(142,23,151,23,'|');rect(140,20,153,22,',');rect(142,20,151,22,'=');
  set(141,20,'!');set(141,21,'!');set(141,22,'!');      // bridge barricade (removed when flags.bridgeOpen)
  /* ---- arterial businesses ---- */
  const buildings=[];const B=(kind,x0,z0,x1,z1,o)=>{rect(x0,z0,x1,z1,kind);buildings.push({kind,x0,z0,x1,z1,...o})};
  rect(104,7,123,18,',');                                   // Fill-Er-Up forecourt
  B('A',115,8,122,11,{id:'gas',sign:'FILL-ER-UP · GAS · SNACKS · BAIT',face:'s',col:'#d9d2c0'});
  for(const[x,z]of[[107,12],[107,15],[111,12],[111,15]])set(x,z,'G');
  rect(104,24,128,39,',');                                  // Dad's Auto lot
  B('A',105,30,116,36,{id:'auto',sign:"DAD'S AUTO · SINCE 1987 · WE FIX IT RIGHT",face:'n',col:'#c7c2b5'});
  /* ---- Riverside blocks: rowhouses with chain-link back yards ---- */
  const colX=[[160,170],[176,186],[192,202],[208,218]],rowZ=[[10,18],[24,32],[38,46],[52,60]];
  const special=new Set(['0,0','1,0','2,0','3,0','0,1','1,1','3,1','2,2','3,2']);   // blocks used by places/lots below
  colX.forEach(([x0,x1],ci)=>rowZ.forEach(([z0,z1],ri)=>{if(special.has(ci+','+ri))return;
    rect(x0,z0,x1,z0+2,'r');rect(x0,z1-2,x1,z1,'r');rect(x0,z0+4,x1,z0+4,'z');     // fronts face both streets; fence down the yards
    for(let x=x0+1;x<=x1;x+=3){if(g[z0-1][x]==='s')set(x,z0-1,'p');if(g[z1+1][x]==='s')set(x,z1+1,'p')}}));                                       // porch anchors (neighbours appear here)
  // specials
  B('A',160,10,170,15,{id:'church',sign:'RIVERSIDE COMMUNITY CHURCH & YOUTH CENTER',face:'s',col:'#d8cfc0'});rect(160,16,170,18,'g');
  rect(176,10,186,18,'r');rect(176,13,186,15,'g');B('A',182,16,186,18,{id:'mart',sign:'RAMOS CORNER MART',face:'s',col:'#e1b866'});
  rect(192,10,202,18,'z');rect(193,11,201,17,'b');                                           // basketball court, chain-link all round
  set(197,10,',');set(197,18,',');                                                          // gates
  rect(208,10,218,18,',');B('A',210,10,217,13,{id:'benny',sign:"BENNY'S COLD FRONT · DEPOT",face:'s',col:'#f0e6f0'});
  B('A',208,24,218,29,{id:'center',sign:'RIVERSIDE FLATS COMMUNITY CENTER',face:'s',col:'#cfd8cf'});rect(208,30,218,32,'g');
  rect(160,66,218,78,'x');                                                                  // Warehouse Row (lots overwrite parts)
  for(let x=160;x<=218;x+=1)if((x-160)%12>=10)rect(x,66,x,78,',');                           // service alleys
  rect(154,66,158,78,'g');for(let z=67;z<78;z+=3)for(let x=106;x<139;x+=5)set(x+(z%2)*2,z,'t');rect(224,1,230,78,'g');for(let z=2;z<H-1;z+=3)set(227,z,'t');
  /* ---- mission lots ---- */
  const sites={};
  const MAP=id=>MISSIONS.find(m=>m.id===id).map;
  const stamp=(id,map,x0,z0,gate)=>{const h=map.length,w=map[0].length;
    for(let z=0;z<h;z++)for(let x=0;x<w;x++){let c=map[z][x];
      if(c==='P'){sites[id]={...(sites[id]||{}),huddle:{x:x0+x,z:z0+z}};c=MISSIONS.find(m=>m.id===id).floor}
      if(c==='X'){sites[id]={...(sites[id]||{}),park:{x:x0+x,z:z0+z}};c=','}
      set(x0+x,z0+z,c)}
    if(gate)for(const[gx,gz]of gate)set(x0+gx,z0+gz,',');
    sites[id]={...sites[id],id,x0,z0,x1:x0+w-1,z1:z0+h-1}};
  stamp('rick',MAP('rick'),1,51,[[2,0],[3,0],[4,0],[5,0]]);                  // Birch St duplex
  stamp('dave',MAP('dave'),31,51,[[13,0],[14,0],[15,0],[16,0]]);sites.dave.park={x:45,z:48};   // Linden Park. Waves job: no X in the map, the van parks on Birch St at the gate
  stamp('doug',MAP('doug'),62,51,[[2,0],[3,0],[4,0],[5,0]]);                 // Ridgeview compound
  rect(104,44,135,65,'z');stamp('gary',MAP('gary'),105,45);                  // chop shop on Industrial Way, chain-link ring
  for(let z=45;z<=48;z++)set(104,z,',');                                      // gate onto Industrial Way
  stamp('earl',MAP('earl'),160,66);
  set(172,65,',');                                                            // (RX172 meets Dock St; keeps the corner clear)
  rect(160,24,186,32,',');stamp('dee',MAP('dee'),160,24);                      // laundromat swallows the RX172 stub between Main and RZ34
  rect(192,38,218,46,'g');stamp('rosa',MAP('rosa'),192,38);                    // garden swallows RX204 stub between RZ34 and RZ48
  stamp('duke',MAP('duke'),192,66);
  /* ---- border ---- */
  for(let x=0;x<W;x++){if(g[0][x]!=='~')g[0][x]='t';if(g[H-1][x]!=='~')g[H-1][x]='t'}for(let z=0;z<H;z++){g[z][0]='t';g[z][W-1]='t'}
  /* ---- street lights and fixed placements ---- */
  for(const r of roads){const step=8;for(let i=r.a+3;i<r.b-1;i+=step){
    if(r.o==='h'){for(const z of[r.k-1,r.k+3])if(g[z]&&g[z][i]==='s')set(i,z,'l')}else{for(const x of[r.k-1,r.k+3])if(g[i]&&g[i][x]==='s')set(x,i,'l')}}}
  [['P',15,9],['D',19,7],['H',19,10],['R',25,4],['V',25,6],['V',44,22],['V',12,36],['V',48,8],['U',110,29],['V',165,21],['V',200,35],['V',183,49]].forEach(([c,x,z])=>set(x,z,c));
  const places={ // world tile coords. pins = fast-travel spots (van parks at x,z facing yaw)
    home:{x:19,z:7,yaw:-Math.PI/2,label:'Home',hood:'maple'},
    hank:{x:22,z:8,yaw:-Math.PI/2,label:"Hank's Hardware",hood:'maple'},
    auto:{x:110,z:27,yaw:Math.PI,label:"Dad's Auto",hood:'route9'},
    autoBay:{x:110,z:28},                       // service ring in front of the shop door U
    sale_workvan:{x:120,z:28,yaw:Math.PI/2}, sale_pickup:{x:123,z:28,yaw:Math.PI/2}, sale_suv:{x:126,z:28,yaw:Math.PI/2},
    gas:{x:113,z:14,yaw:-Math.PI/2,label:'Fill-Er-Up',hood:'route9'},
    center:{x:213,z:22,yaw:-Math.PI/2,label:'Community Center',hood:'river'},
    mart:{x:184,z:21,yaw:-Math.PI/2,label:'Ramos Corner Mart',hood:'river'},
    // job givers
    g_earl:{x:165,z:35}, g_dee:{x:165,z:19}, g_rosa:{x:205,z:40}, g_benny:{x:213,z:15},
    // stakeout spot for Pastor Dee's job (north side of Main St, across from the laundromat)
    stake:{x:170,z:21},
  };
  return{id:'world',world:true,W,H,pad:'g',floor:'g',inside:'.',wall:'#999',map:g.map(r=>r.join('')),roads,buildings,sites,places,
    lines:roads.map(r=>[r.o,r.k+1,r.a,r.b]),
    under:{D:',',V:',',l:'s',H:'g',R:'g',U:',',p:'s','!':',',G:',','=':',','|':','}}})();
```

New mission maps (they go in the new `MISSIONS` entries in B as `map`; reproduced here because the generator stamps them):

```js
const RMAPS= // move each into its MISSIONS entry as `map`
{
 earl:[ // 26x13  The Spoke Shop, Dock St. Gate on the north row.
 "zzzz,,,,,,zzzzzzzzzzzzzzzz",
 "z,,X,,,P,,,,,c,,,,,E,,,,,z",
 "z,,,,,,,,,,,,,,,,,,,,,,c,z",
 "z,,c,,,E,,,,,,cc,,,,,,,,,z",
 "z####..#######..#######,,z",
 "z#....#...I...#..i.E..#,,z",
 "z#.E..#.......c.......#,iz",
 "z#....c...E...#..cc...#,,z",
 "z#I.......cc......E.I.#,,z",
 "z#..i.#.......#.......#E,z",
 "z#.I..#..E..I.#..a..I.#,,z",
 "z######################,iz",
 "zzzzzzzzzzzzzzzzzzzzzzzzzz"],
 dee:[ // 27x9  Spin City Laundromat, Main St. Front row faces Main St (north).
 ",,X,,,,P,,,,,,,,,,,,,,,,,,,",
 "####..#############..######",
 "#c..........c#.....#......#",
 "#c..E.......c#..T..#..T...#",
 "#c....cc..........E....B..#",
 "#c..........c#.....#..E...#",
 "######.#######..E..#......#",
 "z,,,,,,,,,,,,#.....###.####",
 "z,,E,,,,a,,,,,,,,,,,,,,,,E,"],
 rosa:[ // 27x9  Riverside Community Garden (merged block). & = Rosa's tool shed (defend point)
 "zzzzzzzzzzz,,S,,zzzzzzzzzzz",
 "z,X,,P,,,,,,,,,,,,,,,,,,,,S",
 "z,oooo,oooo,,,,,oooo,oooo,z",
 "z,,,,,,,,,,,c,,,,,,,,,,,,,z",
 "S,oooo,oooo,,&,,oooo,oooo,z",
 "z,,,,,,,,,,,,,,,,,,,,,,,,,z",
 "z,oooo,oooo,,c,,oooo,oooo,z",
 "z,,,,,,,,,,,,,,,,,,,,,,,,,S",
 "zzzzzzzzzzz,,S,,zzzzzzzzzzz"],
 duke:[ // 27x13 The Duke's scrapyard, Dock St. v = getaway car. Gate north row.
 "zzzzzzz,,,,,zzzzzzzzzzzzzzz",
 "z,,X,,,,P,,,,,,,,V,,,,,E,,z",
 "z,,,,,,,,,,,,c,,,,,,,,,,,,z",
 "z,V,,,,E,,,,,,,,,,cc,,V,,,z",
 "z,,,,,,,,,,V,,,,E,,,,,,,,,z",
 "z,cc,,E,,,,,,,,,,,,,,,E,,,z",
 "z,,,,,,,,########..######,z",
 "z,V,,,,,,#....#......E..#,z",
 "z,,,,a,,,#..E.c...B.....#,z",
 "z,,E,,,,,#....#.........#,z",
 "z,,,,,,,,###.##..E...a..#,z",
 "z,,v,,,,,,,,,,#.........#,z",
 "zzzzzzzzzzzzzz###########zz"]};
```

**New legend chars** (none clash with the current legend or SPEC.md's `w k O Z L W F K Y q n m j J d u H R`):

| char | meaning | `SOLID` | `LOSBLOCK` | build (world mode) |
|---|---|---|---|---|
| `~` | river | yes | no | no per-tile mesh. One `PlaneGeometry` per contiguous water rectangle at y −0.35, `MeshStandardMaterial({color:'#3f6f86',roughness:.15,metalness:.1,transparent:true,opacity:.9})` and a scrolling normal map if the overhaul ships one. Banks: a 0.4 m drop (dark strip box along each `~` edge). Colliders merged per run, like walls. |
| `=` | bridge deck | no | no | ground colour `COL[',']`, plus one deck slab box under the whole run (2 m thick, `#6f6f6f`) and two concrete piers in the water. |
| `\|` | guardrail | yes | no | `box(TILE,.9,.25,'#b8b8b8')` merged per run. Low, so you can shoot over it. |
| `!` | barricade | yes while closed | no | two sawhorses (orange/white striped canvas texture) and a sign "BRIDGE CLOSED FOR INSPECTION · SORRY · THE CITY". `lvl.barricade=[{x,z,meshes,col}]`. `openBridge()` hides the meshes, removes the colliders and sets `L.g` to `,`. |
| `r` | rowhouse | yes | yes | Merge contiguous runs like `h`. Each run is split into 2-tile-wide **units** along its long axis. Unit: brick body `box(w-.1, 6.2, d-.2)` in one of `['#8a4b3a','#9c5b45','#7a4a3f','#a9774f','#6e5a4c']`, flat roof with a cornice strip, front stoop (3 steps, `box(1.2,.2,.6)` ×3) and a door on the **street side** (the side whose neighbour row/column has `s`/`p`), two windows per floor. Units with a `p` in front get a porch rail. |
| `x` | warehouse | yes | yes | Merge runs. Corrugated metal body 7 m tall (`tex/metal` or `#7e8a8f`), roll-up door decal on the street face, a stencilled number. |
| `A` | commercial building | yes | yes | Rendered from `WORLD.buildings[]` (one entry per block, with `sign`, `face`, `col`). 4.2 m body, flat roof, storefront glass band on `face`, sign board via canvas texture (bold condensed caps, 2.4 m wide per 20 characters). The tile char only drives collision and pathing. |
| `z` | chain-link fence | yes | **no** (see-through) | Posts every tile (`box(.08,2,.08)`, instanced), plus one fabric plane per run with an alpha-tested diamond canvas texture (`alphaTest:.5`, `side:DoubleSide`). Orientation from neighbours (same rule SPEC.md C.2 adds for `f`). |
| `b` | court surface | no | no | ground colour `#b5523b`, white key/three-point lines painted into the chunk canvas. Two hoops (pole + backboard + rim torus; the net is a tier-35 dressing). |
| `o` | garden bed | yes | no | raised bed `box(TILE,.45,TILE*.8,'#6b4a2f')` with soil top. Plants per tier (A.7). In Rosa's job each bed has HP (B.4). |
| `&` | defend point | yes | no | Rosa's tool shed (`box(1.6,2.2,1.4)` with a slanted roof). Sets `lvl.grill` for the waves logic without the bounce house. |
| `G` | gas pump island | yes | no | island curb + 2 pumps. The canopy over the 4 pumps is one extra box on 4 posts. |
| `U` | Dad's Auto door | no | no | `lvl.doors.auto={x,z}`. Prompt `E · Dad's Auto` (on foot); the van uses the service ring at `places.autoBay`. |
| `p` | porch anchor | no | no | `lvl.porches.push({x,z,face})`. Neighbours stand here (A.7). |
| `i` | bonus loot | no | no | a catalytic converter on the floor (`box(.5,.18,.3,'#9aa0a6')` + two pipe stubs). Same hold-E as `I` (B.1). |
| `v` | getaway car spawn | no | no | `site.getaway={x,z}`. Nothing is built until the job needs it. |

Add `'rxAz~|!Go&'` to `SOLID`. Add `'rxA'` to `LOSBLOCK`. `losClear` also returns false on `~` only when `blk===LOSBLOCK_WATER` (not needed now, reserved).

### A.3 `buildLevel(def)` changes for `def.world`

1. **Cache.** The world is built once. `buildLevel(WORLD)` stores the result in `LEVEL_CACHE.world`. On later calls it re-adds `L.group` to the scene, calls `resetWorldDynamic()` (clears `items/stashes/spawns/ammo/waveSpawns/boss/grill/exit`, deactivates any site, removes mission-only meshes) and returns. Entering and leaving home (SPEC.md C.3) costs a scene swap, not a rebuild.
2. **Chunks.** The ground and all static props are built per 32×32-tile chunk (8×3 = 24 chunks), see A.4. Everything below happens inside `buildChunk(cx,cz)`.
3. **Ground colour for non-COL chars** (`E I i a T B S v c & Q P X D V l p U` …): the most common `COL` char among the 8 neighbours, else `def.floor`. This replaces the `def.inside`/`def.floor` rule in world mode only, because the world has outdoor and indoor tiles side by side.
4. **Road markings.** `def.lines` entries become `[o,k,a,b]` (centreline index plus tile extents) instead of spanning the whole map. Skip dashes where the centre tile isn't `,` or `=` (intersections, sites).
5. **House door side.** Replace `fz=z>H/2?back:front` with: count `s`/`p` tiles in the two rows just south of the block vs the two rows just north, and face the side with more (ties go south). This gives the same result as today for every old house, and SPEC.md's `H` rule (door north when `H` is directly north) still runs first.
6. **Sites.** `lvl.sites={}` from `def.sites`. While scanning tiles, any `E B I i T a S Q & v` inside a site rectangle goes into that site's own lists (`site.spawns`, `site.items`, `site.bonus`, `site.stashes`, `site.ammo`, `site.waveSpawns`, `site.grill`, `site.getaway`, `site.bounce`) instead of the level lists. Item/ammo/stash-bag meshes are built hidden (`visible=false`). `T` tables and `Q`/`&` are permanent furniture. `X` and `P` never reach `buildLevel` in world mode (the generator converted them into `site.park` and `site.huddle`), so **no parked van is built at `X`**: the player's own van is the exit (A.8).
7. **Parked `V`.** The hub-only offset `if(def.id==='hub')` becomes `if(def.world)`.
8. **Places.** `lvl.places=def.places`, `lvl.doors={home,store,auto}`, `lvl.barricade`, `lvl.porches`, `lvl.lamps` (with `hood`), `lvl.decals` (A.7).
9. **Outer ground plane** grows to 900×500 and the four boundary colliders use `W*TILE`, `H*TILE` as today.
10. `setMood(def)`: world uses `MOODS.world` (below), blended per region every frame by `updRegion()` (A.5).

### A.4 Performance budget (the reason this can be one level)

Counts from the generator above:

| Element | Count | Meshes if built the current way (1 mesh per box) | World plan |
|---|---|---|---|
| tiles | 18,560 (old HUB: 2,520) | n/a | 24 chunks of 32×32 |
| trees `t` | 1,125 | 2,250 | per chunk: 1 `InstancedMesh` trunk + 1 crown (low LOD). glTF trees (overhaul) only in the camera's chunk and its 8 neighbours, also instanced per sub-mesh |
| street lights `l` | 251 | 753 | per chunk: pole+arm merged geometry instanced, head instanced with `instanceColor` (lit / dark) |
| houses `h` blocks | 77 | 385 | per chunk: body instanced (box + `instanceColor`), roof instanced (cone), doors instanced, windows instanced |
| rowhouse units | ~93 | ~560 | per chunk: body, cornice, stoop, windows, doors (5 instanced) |
| wall runs `#` | 210 | 420 | per chunk: one merged `BufferGeometry` per wall colour + one for caps (`THREE.BufferGeometryUtils.mergeBufferGeometries`, load `examples/js/utils/BufferGeometryUtils.js` from the same three@0.128.0 CDN path as the other examples) |
| chain-link `z` | 396 tiles | 396 | per chunk: posts instanced + fabric planes merged |
| crates, hedges, tables, beds, pumps | ~160 | ~160 | instanced per type per chunk |
| parked vehicles | 12 + 3 for sale + 1 player | ~160 | ordinary meshes |
| commercial/warehouse buildings | 9 + 4 runs | ~80 | ordinary meshes |
| decals (graffiti ≤ 48, chalk ≤ 30) | ≤ 78 | ≤ 78 | one `InstancedMesh` per design (≤ 8 designs) |
| **total** | | **≈ 5,300** (the current HUB is ≈ 880) | **≈ 25 draw calls per chunk** |

Rules:
- **Chunk visibility**: every frame, a chunk group is `visible` if the distance from the camera to its AABB is < `CHUNK_R=175` m and the AABB intersects the camera frustum (`frustum.intersectsBox`). With the camera inside a 464×160 m corridor, at most 9 chunks are visible.
- **InstancedMesh culling**: in r128 an `InstancedMesh` is culled by its geometry's bounding sphere, not by its instances, so set `frustumCulled=false` on all instanced meshes and let chunk visibility do the culling.
- **Fog and far plane**: `MOODS.world={...MOODS.sun, near:55, far:165}`, `camera.far=220` in the world (restore 420 elsewhere). Things fade out before chunks pop.
- **Shadows**: only chunks whose AABB intersects the sun shadow camera box cast shadows (`castShadow` toggled per chunk, 2–4 chunks).
- **Budget**: ≤ 450 draw calls in the main pass and ≤ 120 in the shadow pass at any position (`renderer.info.render.calls`), ≤ 700k triangles. Measured with `RENDER.q='med'` at the 6 probe points in test W1-6.
- **Ground textures**: one 512×512 canvas per chunk (16 px per tile, the current density). On `RENDER.q==='low'`, use 256×256. GPU memory: 24 × 1 MB = 24 MB (6 MB on low).
- **Colliders**: about 2,300 static AABBs. Replace the linear scan in `collide(p,r)` with a spatial hash: `L.cgrid` is a `Map` from `(cx<<8)|cz` (8×8-tile cells, 16 m) to arrays of collider indices. `collide` checks the cells overlapping `p±r`, plus `L.dyn` (the van collider, furniture, live vehicles), which is always scanned. Old levels keep working because `buildLevel` fills the hash for every level.
- **Pathing**: `nextStep(fx,fz,gx,gz,win)` takes an optional window `{x0,z0,x1,z1}` in tiles. The BFS ignores tiles outside it and allocates its `prev` array for the window only. Enemies use their site window (site rect + 6 tiles). Allies use a 24-tile box around themselves. `updAlly` already teleports an ally who is more than 30 m behind the player.
- **Raycasts**: `rebuildTargets()` uses `L.solidsNear`, the solids of the chunks within 96 m of the player (bullet range is 90 m), rebuilt every 0.5 s and on chunk change. `updDriveCam`'s camera ray uses the same list.
- **Build time**: a full `buildLevel(WORLD)` must finish in < 600 ms on a mid laptop (test W1-5). Painting 18.5k tiles with 6 speckles each is about 110k `fillRect` calls, roughly 60 ms.

Fallback if the budget can't be met on low-end devices: keep the world as **two levels** split at the river. The bridge deck becomes the seam: drive onto it, the screen does a 0.4 s fade to the sky colour, `buildLevel(WORLD_EAST)` runs, and you come out at the other end of the bridge with the same speed and heading. The generator already places nothing on the deck, so the split is `map.map(r=>r.slice(0,152))` and `map.map(r=>r.slice(140))` with x offsets. This is *not* the plan of record; build it only if W1-6 fails on the target devices.

### A.5 Regions, banners and mood

```js
const HOODS={maple:{name:'Maple Heights',x0:0,x1:99}, route9:{name:'Route 9',x0:100,x1:141}, river:{name:'Riverside Flats',x0:152,x1:231}};
function hoodAt(x){const t=tx(x);return t<=99?'maple':t<=151?'route9':'river'}   // world metres in, uses tx()
```
- `updRegion(dt)` (called from `updHub` and `updMission` in world mode): when `hoodAt(P.pos.x)` changes, `banner(name.toUpperCase(), trust line, 2.2)`, for example `RIVERSIDE FLATS` / `Trust 22% · The street lights on Ash St are back on.` (the newest tier line, A.7). On the first entry to Riverside: `SAVE.world.visited.river=true`, unlock its fast-travel pins, `saveGame()`.
- **Trust HUD**: `#trust` shows the current region's meter: Maple → `prog.trust`, Riverside → `prog.trustR`, Route 9 → both, as two thin bars labelled `MAPLE` and `RIVERSIDE`.
- **`addTrust(v, hood)`**: `hood` defaults to `M ? (M.def.hood||'maple') : hoodAt(P.pos.x)`, and Route 9 counts as Maple. Riverside changes `prog.trustR`. Every existing call site stays as it is.
- **Mood blend**: `const k=smoothstep(140,156,tx(P.pos.x))`. The mood is a lerp between `MOODS.world` and `riverMood(prog.trustR)`, where `riverMood(t)=lerpMood(MOODS.over, MOODS.world, clamp((t-10)/60,0,1))`. Riverside starts overcast and literally gets sunnier as its trust rises. `applyMood()` runs only when the blended values change by more than 0.5%.
- A mission's own mood (`over` for dens, `dusk` for bosses) blends in over 1.5 s at mission start and back out at mission end.

### A.6 The bridge (Act 2 gate)

- Closed at a fresh start: the barricade is solid, and a sign faces west. Walking up to it shows `The bridge is closed for inspection.` Doug's line on the first visit: "I've been asking the city about that bridge since 2019."
- `openBridge()` runs when `prog.done[3]` (the Kingpin) becomes true. It is called from the Act 1 finale card (B.0) and again on every world build if `SAVE.world.bridgeOpen`. It sets the flag and calls `saveGame()`.
- Riverside is visible across the river from the start, at a lower tier (graffiti, dark lamps), as a teaser.

### A.7 Riverside Flats dressing (visible trust)

`dressRiverside(t)` is called on world build, whenever `prog.trustR` crosses a tier, and after a scrub. Each tier is cumulative. Objects are created once (pooled) and toggled; nothing is rebuilt.

| tier | `trustR` ≥ | what changes | tier line (banner + minimap toast) |
|---|---|---|---|
| 0 | 0 | 48 graffiti tags. 70% of Riverside street lights broken (pole tilted 0.22 rad, head dark). 24 trash bags (`trashbag` prop) and 6 shopping carts on sidewalks. Boarded windows on 1/3 of rowhouse units. Court hoops without nets. Church sign missing letters ("R VERS DE COMM NITY CH RCH"). Garden beds full of weeds. No neighbours. | "Riverside Flats. People keep their blinds down here." |
| 1 | 20 | Trash bags and carts gone. Lamps 50% working. 4 neighbours on porches. | "Somebody put the trash out on the right day." |
| 2 | 35 | Tags with `clearAt≤35` gone (about half). Lamps 70% working. Nets on the hoops, 2 kids shooting around (on the court). Boards off half the windows. 10 neighbours. | "The street lights on Ash St are back on." |
| 3 | 50 | All lamps fixed. Chalk drawings (hopscotch, suns, "HI MOM", a lopsided van with 5 stick dads) on 30 sidewalk tiles near porches. Church sign repaired. Corner store gets its striped awning and an "OPEN" neon. 18 neighbours. Garden: seedlings. | "Kids are drawing on the sidewalk again. One of them drew you." |
| 4 | 70 | All tags gone. A kids' mural on the warehouse at Dock St/3rd St (canvas texture: river, sun, tomatoes, a minivan). Flower boxes on rowhouse windows. String lights over the court. Garden in full bloom (tomato cages, sunflowers). Neighbours wave as you drive past (raise an arm when within 12 m and the van is moving > 4 m/s). Benny's ice-cream truck loops the neighbourhood (B.6). | "Riverside Flats. People wave at the minivan." |
| 5 | 90 | A "RIVERSIDE BLOCK PARTY" banner across Main St at 2nd St. Picnic tables in the community garden. 28 neighbours. | "Your van has its own parking spot at the block party." |

**Graffiti**: `genTags(seed=9)` picks 48 wall faces with a seeded `mulberry32`. Candidates are the street faces of `r`, `x` and `A` buildings and chain-link runs (on the fabric, half size), at most one tag per face. Each tag is `{id, x, y, z, ry, w, h, design, clearAt}`, where `clearAt` is uniform over {20, 35, 35, 50, 50, 70} so that tiers clear them in batches. Designs (one 1024×256 canvas atlas, 8 cells drawn with wavy strokes): bubble letters "BRZ", "K9", "LOL", "MOOP", a crowned "DUKE" (the boss's crew marking turf), a smiley with x-eyes, a squiggle, a tag that just says "HI". Nothing rude. Rendered as planes 1 cm off the wall, `polygonOffset:true`.

**Cleanup Saturday** (player scrubbing): on foot, within 1.6 m of a visible tag, facing it → `Hold E · Scrub it off` for 2.0 s (spray-bottle `snd`, foam puffs). This hides the tag, records `SAVE.world.scrubbed.push(id)`, gives `addTrust(+0.5,'river')` (capped at +15 total from scrubbing, tracked in `SAVE.world.scrubTrust`) and `+$5` ("Earl's coffee can"). A neighbour bark after every 5th tag: "You missed a spot. Kidding. Thank you." A scrubbed tag never comes back.

**Neighbours**: there are 56 porch anchors. The tier sets how many are *eligible* (first N anchors in a fixed shuffled order). A pool of **10** `makeDude` NPCs is assigned to the 10 nearest eligible anchors within 50 m of the player, reassigned every 1 s, so that at most 10 neighbour dudes ever exist. Looks are random from a Riverside palette (older, more varied: cardigans, scrubs, work shirts, a grandma with a cane). Pose `'stand'` (or `'sit'` if the overhaul adds one). Barks on `E` from 2 m (pool per tier, 6 lines each; examples: tier 0 "You lost? ... Oh. You're the dads." tier 2 "My grandson can walk to practice now." tier 4 "Tell the bald one his potato salad is famous over here." No quest logic.

**Street lights**: `lvl.lamps` entries in Riverside get `brokenUntil` (a value from {20,35,50}, assigned by shuffled order: 30% stay working from tier 0). `dressRiverside` straightens the pole (`rotation.z=0`) and sets the head's instance colour to lit (`#fff6c8`, emissive 1.2) when `trustR ≥ brokenUntil`.

### A.8 Mission sites in the world

**Flow** (replaces driving to `L.dests[JOB]` and calling `startMission`):
1. Accept a job at the giver (`openBrief`, unchanged). This sets `JOB=i`. The objective becomes `Drive the crew to <place>` with a GPS route to `site.park`. The destination ring (radius 4, the current `destRings` look) sits at `site.park`.
2. The van stops (`|VAN.spd|<3`) inside the ring → `startMissionWorld(i)`.
3. **Skip the drive** in the brief = fast travel to `site.park` (A.9 fade), then step 2.

```js
function startMissionWorld(i){const m=MISSIONS[i],st=L.sites[m.id];
  engine(false);JOB=null;exitVanQuiet();               // exitVanQuiet: exitVan() without lines/sounds, player on the kerb side
  mode='mission';clearChars(true);                      // clearChars(keepWorldNpcs): neighbours/givers despawn only inside site box + 20 m
  activateSite(st);                                     // L.spawns=st.spawns, L.items=st.items (got=false, visible), L.bonus, L.stashes (bags back), L.ammo,
                                                        // L.waveSpawns, L.grill, L.bounce, L.getaway; L.win={x0:st.x0-6,z0:st.z0-6,x1:st.x1+6,z1:st.z1+6}
  L.exit={x:VAN.pos.x+Math.cos(VAN.yaw)*2.6, z:VAN.pos.z-Math.sin(VAN.yaw)*2.6}; showExitRing(L.exit);   // the player's own van is the way home
  M={i,def:m,site:st, ...same fields as startMission...};
  P.pos.set(tileC(st.huddle.x),0,tileC(st.huddle.z)); /* then the same loadout, crew, enemy spawn, radio, banner code as startMission */
  blendMood(m, 1.5); prog.missionsRun++; running=true;
}
```
- `startMission(i)` keeps its body for the fallback path (`CFG.inWorld===false` or a mission with `m.inWorld===false`). It builds `m` as its own level, exactly as today. Both paths share a `beginMission(i,startPos)` helper for the loadout/crew/enemy/radio code, so there is one implementation.
- **Leash**: enemies path only inside `L.win`. An enemy outside `L.win` walks back to its spawn and forgets its target.
- **Leaving the job**: the player more than 30 m outside the site rect (on foot or by van, except during a chase phase) → objective line `Get back to the job (8)` counting down, then `endMission(false,"The crew went home. Doug left a note on your windshield.")`.
- **End**: `endMission` works as today. Its result card buttons become **Keep driving** (default focus: `deactivateSite()`, `mode='hub'`, the player stands next to the van at the site, the crew climbs in) and **Head home** (SPEC.md: `enterHome()`). Cuffed enemies fade out 2 s after the card closes ("Officer Dana's cruiser picked them up.").
- **After dressing** (`site.after` when `prog.done[i]`): Gary's chop shop → sign "INDUSTRIAL WAY CLIMBING GYM" (the finale text already promises it). Rick's duplex → "SOLD" sign and flower pots. Linden Park → the bounce house stays up all summer. Ridgeview compound → "FUTURE HOME OF RIDGEVIEW T-BALL" (Doug's end line). Spoke Shop → "FREE BIKE LIBRARY · RETURN BY SUNDAY". Laundromat → "SPIN CITY · UNDER NEW MANAGEMENT · YOUTH GROUP FOLDS ON TUESDAYS". Garden → blooms one tier early. Scrapyard → "SECOND GEAR AUTO SCHOOL" (Pastor Dee's youth program).
- Reruns (SPEC.md D.1, half pay) reactivate the same site. The geometry is permanent, so nothing needs rebuilding.

### A.9 Fast travel

- **Pins** (`WORLD.places` with a `label`): Home, Hank's Hardware, Dad's Auto, Fill-Er-Up (open from the start), Community Center, Ramos Corner Mart (unlocked by the first Riverside visit). Each mission site becomes a pin after its job is won. `SAVE.world.pins` holds the unlocked ids.
- **How**: open the full map (`M` key, or the minimap tap on touch), click a pin → `Fast travel to Dad's Auto?` → yes. Allowed when `mode==='hub'`, the player is in the van or within 30 m of it, and not in a chase. Disabled when `VAN.hp<=0` (call a tow instead, C.3).
- **Effect**: 0.35 s fade to the sky colour, then the van is placed at the pin (`x,z,yaw`), the player is inside, the crew too, `spd=0`, and `sunFollow` is reset. Then a 0.35 s fade back. If `JOB` is set and the pin is the job's site, `startMissionWorld` runs straight away.
- The 2D map shows travel time saved as a joke subtitle: "Saved you 26 seconds and one argument about directions."

### A.10 Minimap, full map, GPS

- **Overview canvas**: built once per world build at 3 px per tile (696×240). Roads `#3b3d43`, sidewalks `#8f8b82`, grass `#5d8a4a`, water `#3f6f86`, buildings by kind (houses `#c9b49a`, rowhouses `#9c5b45`, commercial `#d9d2c0`, warehouses `#7e8a8f`), chain-link 1 px lines. Riverside is drawn at 45% saturation until `visited.river`.
- **Minimap** `#mm`: a 168 px circle (desktop) or 120 px (touch) under `#trust` in the top-right corner. Heading-up by default, with a north-up option in pause (`CFG.mmNorth`). Scale 1 px = 0.9 m (about 150 m across), zooming out to 1 px = 1.4 m above 15 m/s. Redrawn at 20 Hz into a 2D canvas: clip circle, rotate, draw the overview, then route line, icons, arrow.
- **Icons**: player arrow (white), van (blue rounded rect when on foot), job giver (yellow diamond, the same as `#mk`), job site (yellow ring), Home (house), Hank's (hammer), Dad's Auto (wrench), Fill-Er-Up (pump), Corner Mart (cart), Community Center (star), active chase target (red pulsing dot). Off-edge icons clamp to the rim.
- **Full map** `#cMap`: a card with the overview at fit-to-width, pins, current route, region trust bars, and a legend. Esc or M closes it. Desktop: click a pin to fast travel. Touch: tap.
- **GPS route**: Dijkstra on the tile grid (232×80 = 18.5k nodes, binary heap). Cost: `,` and `=` cost 1, `s` `p` `l` 3, `g` `b` 8, everything in `SOLID` is impassable, and the closed barricade is impassable. The route goes from the van's tile (or the player's tile on foot) to the target tile. Recompute when the target changes, every 1.5 s while moving, or immediately when the player is more than 4 tiles off the current path. Simplify collinear runs. It takes about 3–6 ms per solve, at most once per 1.5 s. Drawn on the minimap as a 3 px `--sun` line, and in the world as up to 20 instanced ground chevrons (0.9 m, `MeshBasicMaterial`, opacity 0.55, `depthWrite:false`) every 4 m along the next 80 m of route, shown only while driving.
- Targets, in priority order: active chase car > `JOB` site > the next job giver (if no job) > none.

### A.11 Places on Route 9 and in Riverside

| place | what you do there |
|---|---|
| **Dad's Auto** (`autoBay` ring, door `U`) | Drive into the service ring and stop → `#cGarage` (C.7). On foot, the door opens the same card without the live preview. Owner: **Sal Benedetto**, 64, "everybody calls me Dad, including my actual dad." The for-sale lot shows the workvan, pickup and SUV at `sale_*` with price signs. |
| **Fill-Er-Up** | Flavour and one service: **car wash** (drive through the bay between the pumps at < 6 m/s) clears `SAVE.garage.dirt` for $10. Dirt builds at 1% per 100 m driven and shows as a brown tint lerp on the body plus a "WASH ME" finger-scrawl decal above 60%. Officer Dana stands here after Act 1: talking to her shows lifetime stats (SPEC.md armory and zip-tie counts). |
| **Ramos Corner Mart** | `openShop('mart')`: SPEC.md's shop card with the **Ammo** tab (same "Range day" item as Hank's), **Stickers** (C.5), and the first-aid kit restock if it's used (C.4). **Neighbour discount 10%** at `trustR ≥ 60` (mirrors Hank's at Maple trust 60). Owner Mrs. Ramos: "Your friend with the mustache bought all my beef jerky." |
| **Hank's Hardware** | SPEC.md's `openShop('hardware')`. Sign text changes to "HANK'S HARDWARE & SPORTING" to match the owner's name for it. |
| **Community Center** | Riverside trust board: a cork board card listing the tier lines reached and the next one ("Next: 50% · The kids want to paint a mural."). Also a fast-travel pin. |
| **Church & Youth Center** | Pastor Dee's marker. After Act 2 the youth group's "Second Gear" auto program sells the supercharger (C.1). |

---

## B) Missions (Act 2: Riverside Flats)

### B.0 People, unlock order, trust gates

**New `HOMIES`** (the `makeDude` fields already exist. `hairLong:1` is new: a ponytail box behind the head, or the overhaul's female model if there is one):
```js
earl: {name:'Earl',  shirt:'#3d5a80',pants:'#5b5b5b',hair:'#d8d8d8',cap:'#3d5a80',glasses:1,mustache:1,belly:1,skin:'#8d5a3b'},          // retired No. 9 bus driver, 36 years, never late once
dee:  {name:'Pastor Dee',shirt:'#6a4c93',pants:'#2b2d42',hair:'#1d1d1d',glasses:1,hairLong:1,skin:'#a8714c'},                         // youth pastor; carries a megaphone, not a gun
rosa: {name:'Rosa',  shirt:'#5fa8a0',pants:'#5fa8a0',hair:'#2a1a12',hairLong:1,gun:'smg',medic:1,skin:'#c68e66'},                     // ER night nurse, scrubs, single mom of Lucia (9) and Mateo (6)
benny:{name:'Benny', shirt:'#f4f1ea',pants:'#c9b27c',apron:1,cap:'#e86a92',belly:1,mustache:1,skin:'#f1c7a3'},                        // Benny's Brain Freeze, 22 years on the route
sal:  {name:'Sal',   shirt:'#4a5a6a',pants:'#3a3a3a',hair:'#b8b8b8',vest:1,mustache:1,skin:'#e0b48f'},                                // Dad's Auto (shop NPC, never on raids)
```
Rosa is the first crew member who isn't a dad. After her job she joins every Riverside raid **and** every Maple rerun, with the HUD tag "Rosa · Honorary Dad". **Medic**: a downed ally within 14 m of Rosa recovers in 3 s instead of 9 (she walks over, `pose 'kneel'`, line "Hold still. I've seen worse on a Tuesday."). She also gives the player +25 HP once per mission when the player drops below 30 HP within 10 m of her ("Drink some water. That's an order.").

**Mission bosses** generalise the hard-coded King. `spawnEnemy(x,z,boss)` reads `M.def.boss`, which defaults to the current King values for Doug's mission:
```js
boss:{name:'THE COURIER', hp:150, gun:'smg', look:{shirt:'#e0a030',pants:'#2a2a2a',hood:1,shoes:'#f2f2f2'}, surrBias:.6}            // Dee
boss:{name:'THE DUKE OF CATALYTIC CONVERTERS', hp:380, gun:'double', look:{shirt:'#1f3b4d',pants:'#111',crown:1,shades:1,scale:1.15,shoes:'#c0c0c0'}, flee:{atHp:.5}}   // Duke
```
`surrBias` adds to the existing surrender roll. `flee` is described in B.5.

**Act 1 finale → Act 2**: `finale()` runs when Maple's 4 jobs are done, as today. Its button becomes **Next Saturday →** (instead of resetting `prog`). That calls `openBridge()`, sets `prog.act=2` and shows a short `#cBrief`-style card: "One week later. Earl Booker, retired, calls Gary's landline. Gary still has a landline. 'You the fellas who fixed Maple Heights? The King's cousin set up shop across the river. Calls himself the Duke. Of catalytic converters. Bring the van.'" The objective becomes `Drive across the Route 9 bridge to Riverside Flats`, with the GPS to `places.g_earl`. The **New Saturday** reset from SPEC.md moves to the Act 2 finale (B.5).

**Unlock table** (`MISSIONS[i].unlock`, checked by `jobAvailable(i)`):

| # | id | giver | marker | unlock |
|---|---|---|---|---|
| 0–3 | gary rick dave doug | unchanged | unchanged (`1`–`4`, still in the old HUB area) | in order, as today |
| 4 | earl | Earl | `places.g_earl` (his stoop on Ash St) | `prog.done[3]` (bridge open) |
| 5 | dee | Pastor Dee | `places.g_dee` (church steps) | `done[4]` and `trustR ≥ 15` |
| 6 | rosa | Rosa | `places.g_rosa` (garden gate) | `done[5]` and `trustR ≥ 25` |
| 7 | benny | Benny | `places.g_benny` (depot) | `done[6]` and `trustR ≥ 35` |
| 8 | duke | Earl (again) | `places.g_earl` | `done[7]` and `trustR ≥ 50` |

`enterHub` spawns **every** available giver (one per neighbourhood at most, so 0–2 markers) instead of the single `next`. A giver whose job is locked only by trust still stands at the marker, with the tag "Earl · needs Riverside trust 50%" and a talk line: "Folks around here don't know you well enough yet. Help out a little. Scrub a wall. Wave at people."

`prog.trustR` starts at **5**. A typical run without executions: Earl's win +14 and 3 cuffs +12 → 31; Dee's +14 and cuffs → about 50; and so on. The gates only block a player who executes people (−10 each) and never scrubs or does side jobs. That's intended.

Trust awards (in `endMission`): win +14 (Duke: +20 if he's cuffed, +8 if not), each zip-tie +4, each execution −10 (all through `addTrust(v,'river')`).

**Crew per job** (allies ride in the van; the minivan seats 7):

| job | crew | why |
|---|---|---|
| earl | gary, dave | Earl rides along to point out bikes ("That blue one's Tasha's.") but stays in the van |
| dee | gary, rick, doug | Doug: "Stakeouts are my whole personality." |
| rosa | gary, rick, dave, doug, plus Rosa herself | it's her garden |
| benny | gary, dave, rosa | Benny drives the truck |
| duke | gary, rick, dave, doug, rosa | everybody |

### B.1 "Exact Change" (Earl): recover stolen bikes

```js
{id:'earl',giver:'earl',hood:'river',role:'Earl · Retired, Route 9 Bus, 36 Years',title:'Exact Change',place:'The Spoke Shop, Dock St',
 lines:["Thirty-six years I drove the number nine. Never late once. Know every kid in this neighborhood by their stop.",
        "Somebody's been stealing their bikes. Clipping locks right off the school racks. And the converters off every car on 3rd Street.",
        "It all goes to a warehouse on Dock Street they call the Spoke Shop. Six bikes in there belong to kids I know by name. Get 'em back. If you see converters, grab those too."],
 crew:['gary','dave'],type:'loot',goal:6,pad:',',floor:',',inside:'.',wall:'#7e8a8f',map:/* RMAPS.earl */,
 arms:{pistol:45,nailer:20,smg:20,shotgun:15},
 radio:[['earl',"That's the place. Used to be a mattress outlet. Nobody bought a mattress there either."],['gary',"Six bikes. Hold E on each one. I'll keep the list."],['dave',"Converters are a bonus. They're heavy. Lift with your legs."]],
 pickupLines:["Tasha's. She's been walking to school for a month.","That one's the Okafor twins'. They share it. Mostly they fight over it.","Little Danny's. Still has the playing card in the spokes.","Three left. Earl says the red one's got a bell.","That's the red one. Hear that bell? Earl's crying a little.","That's all six. Back to the van."],
 bonusLines:["Converter. Mr. Hollis on 3rd is going to be so happy.","Another one. These things are worth more than my first car."],
 endLine:"Earl: Thirty-six years and that's the best stop I ever made. I'm starting a bike library. Free. Bring 'em back by Sunday."}
```
- **Objective**: `loot` generalised. `M.goal=m.goal||4`, hold time 1.1 s for `I` (bikes). `i` items are optional: they appear as a second objective line `Bonus: catalytic converters · n/4`, hold 1.4 s. The exit opens at `got>=goal`. `pickupLines`/`bonusLines` replace Gary's hard-coded array (keep Gary's as his mission's `pickupLines`).
- **Enemies**: 8 `E`, `arms` as above, profile `over` mood. Two of the yard `E`s start facing the gate.
- **Payout** (SPEC.md D.1 shape): base **$650**; bikes +$40 each; converters +$60 each ("donated to the bike library fund"); quick work par 300 s; the usual zip-tie / confiscation / hamstring / legal-fee lines. The trust multiplier uses `trustR`.

### B.2 "Fellowship Hall" (Pastor Dee): stakeout, then raid

```js
{id:'dee',giver:'dee',hood:'river',role:'Pastor Dee · Youth Pastor, Riverside Community Church',title:'Fellowship Hall',place:'Spin City Laundromat, Main St',
 lines:["I run the youth group. Basketball Tuesdays, homework Wednesdays, pizza whenever I can afford it.",
        "Three of my kids have been missing Tuesdays. They're standing outside Spin City Laundromat being paid to watch for cars. Twelve years old.",
        "There's a back room. A courier comes by and collects. I need you to watch first, find out who's who, and then go in. My kids walk away from this. That part isn't negotiable."],
 crew:['gary','rick','doug'],type:'stakeout',pad:',',floor:',',inside:'.',wall:'#b9a98f',map:/* RMAPS.dee */,
 stake:{spot:'stake', ids:3, watchT:1.5, maxT:120, alertDist:12, honkAlert:true},
 arms:{pistol:40,smg:40,shotgun:20}, boss:{name:'THE COURIER',hp:150,gun:'smg',look:{shirt:'#e0a030',pants:'#2a2a2a',hood:1},surrBias:.6},
 radio:[['doug',"Park across the street. Engine off. Nobody eat anything crunchy."],['dee',"Look at each of them. Through your sights, nice and steady. Find me the courier."],['gary',"I brought snacks. They're not crunchy. They're string cheese."]],
 endLine:"Pastor Dee: Three kids at basketball tonight. The courier's nineteen. Sal says he can start at the shop Monday."}
```
- **Phase 1, `stake`**: the destination ring is `places.stake` (across Main St), not `site.park`. On arrival, `M.phase='stake'`, the engine goes off, and the player **stays in the van** with the camera free-look (driving disabled; `E` exits early, which skips to the raid). Four lookout NPCs spawn (three `kind:'lookout'` kids, in a hoodie palette, unarmed, never shot at by the crew, plus the courier (`B`)) and walk scripted loops on the laundromat sidewalk and alley.
  - **ID**: hold aim (right mouse; the touch aim button) on a suspect within 45 m with LOS for `watchT` cumulative seconds → `snd('cuff')` shutter, the tag changes to "LOOKOUT · ID'd" or "COURIER · ID'd". A progress ring shows on the `#xh` crosshair.
  - **Suspicion** `M.sus` (0–100, HUD bar "They're getting suspicious"): +35/s while the player is on foot within `alertDist` of any suspect, +40 once for a honk, +25/s while the van moves > 4 m/s within 20 m, −5/s otherwise.
  - Ends when all 3 kids and the courier are ID'd, or `maxT` runs out, or `M.sus≥100`. On a clean ID: Dee walks out (NPC, megaphone) and talks the three kids into the church van. They despawn walking away with her: "Boys. Pizza. Now." If `sus≥100`: the kids scatter (they despawn running), every `E` is alerted, and the courier starts at the back door instead of inside the office.
- **Phase 2, `raid`**: the site activates (`startMissionWorld`, player at `site.huddle`). It's the existing `stash` logic with `goal=L.stashes.length` (2 here) and **no clock** (`m.time` unset → skip the timer branch), plus the courier, who must be zip-tied or downed. The exit opens when both stashes are smashed and the courier is handled.
- **Payout**: base **$800**; "Clean stakeout" (never above 60% suspicion) +$200; each ID +$50; "Courier gets a second chance" (cuffed) +$250; the usual lines.

### B.3 "Garden Variety" (Rosa): defend the community garden

```js
{id:'rosa',giver:'rosa',hood:'river',role:'Rosa · ER Nurse, Nights · Mom of Two',title:'Garden Variety',place:'Riverside Community Garden',
 lines:["I work nights in the ER. Days, I sleep four hours and then I'm in that garden with my kids. Lucia's growing tomatoes. Mateo's growing one very serious pumpkin.",
        "The Duke's crew cuts through it. They've been stashing things under the compost. Yesterday they told me they're going to pave it for a parking lot. Saturday is Plant Day. Forty families.",
        "I've been doing everything alone for six years. This Saturday I'd like some help. I'll bring my own gun, and I'll patch you up when you pull something. You will pull something."],
 crew:['gary','rick','dave','doug'],self:true,type:'waves',waves:[6,8,10],defend:'&',pad:',',floor:',',inside:',',wall:'#888',map:/* RMAPS.rosa */,
 bedHp:60, arms:{pistol:35,smg:30,shotgun:20,rifle:15},
 radio:[['rosa',"Families are in the church hall. We hold the garden. Stay off the beds, please, I mean it."],['rick',"Set up behind the shed. Make them come to us."],['dave',"If anybody touches that pumpkin I'm going to lose my religion."]],
 endLine:"Rosa: Forty families planted today. You guys are idiots and I love you. Fine. I'll take the polo."}
```
- **Objective**: existing `waves`, with `L.grill` = the `&` shed and `self:true` meaning the giver (Rosa) spawns as a crew ally. `S` spawns are on the lot edges facing the streets.
- **Beds**: every `o` bed (48 tiles, grouped into 12 beds of 4) has `bedHp` (60). An enemy whose path crosses a bed tile tramples it (−20/s, leaves flattened plants). Wave enemies' `last` target becomes a random bed or the shed (50/50) instead of the grill ring. Objective line: `Beds standing · 11/12`. Losing beds never fails the job.
- **Rosa joins**: on the win, `SAVE.crew.rosa=true`, banner `HONORARY DAD`, `Rosa joined the crew`. Gary: "We'll need to get you a polo." Rosa: "Absolutely not." The next home visit gets a SPEC.md `events` entry `'rosa_joined'`, and Jen's line: "Rosa's coming to the barbecue? Good. Somebody in that group needs to know CPR."
- **Payout**: base **$900**; "Tomatoes saved" ≥ 10/12 beds standing +$200, else +$15 per standing bed; the usual lines.

### B.4 "Brain Freeze" (Benny): escort the ice-cream truck, then chase it

```js
{id:'benny',giver:'benny',hood:'river',role:"Benny · Benny's Brain Freeze, 22 Years on the Route",title:'Brain Freeze',place:"Benny's route, Riverside Flats",
 lines:["Twenty-two years I drove this route. Last summer the Duke's guys started 'taxing' me. Then they slashed my tires. Then they took my cash box.",
        "I stopped coming. You know what a summer with no ice-cream truck does to a neighborhood? Neither did I. It's bad.",
        "First run back is Saturday, ending at the basketball court. Free cones. I need an escort. Follow me close. If I stop, it's because somebody's in the road, and that somebody is not getting a cone."],
 crew:['gary','dave','rosa'],type:'escort',pad:',',floor:',',inside:',',wall:'#999',
 route:[[213,21],[205,21],[205,35],[189,35],[157,35],[157,21],[197,21]],        // road-graph tiles (B.7); depot exit to the court gate
 truck:{type:'workvan',paint:'#f4eef4',hp:300,speed:6,waitDist:28,jingle:'entertainer'},
 ambush:[{at:2,n:4,from:[[187,30],[191,40],[181,37]]},{at:3,n:5,from:[[155,30],[155,42],[160,37]]},{at:5,n:5,from:[[176,18],[186,24],[170,24]]}],
 chase:{car:'truck',driver:{surrBias:.8},max:19,start:'court'},
 arms:{pistol:45,smg:35,shotgun:20},
 radio:[['benny',"Stay on my bumper. Not literally. It's a new bumper."],['dave',"If we get through this, I'm getting the Patriot Pop."],['rosa',"Nobody eats ice cream in my van. Your van. Anybody's van."]],
 endLine:"Benny: Two hundred and eleven free cones. A record. The Duke's going to hear about this, and I hope he's lactose intolerant."}
```
- **Escort**: Benny's truck is a live vehicle (`HT.Vehicles.make('workvan',{color:'#f4eef4',upgrades:{lightBar:false}})`, plus a fibreglass cone prop on the roof and a canvas "BENNY'S COLD FRONT" side panel). It follows `route` along road centrelines (B.7 `followPath`) at `speed` (6 m/s), playing "The Entertainer" (C.5 jingle, 0.25 gain, panned). It stops whenever the van is more than `waitDist` behind ("I'm not going without my escort!"), or the path ahead within 10 m is blocked by a character or vehicle.
- **Ambush** `k`: when the truck reaches `route[at]`, it stops and the horn plays. `n` enemies spawn at the `from` tiles (spread ±1.5 m) with `e.last` = the truck. Crew line "Everybody out!": the player has to get out (prompt) and the crew bails with them. Enemies shoot at the truck (`truck.hp`, 4 per hit) and at people. When the ambush is cleared (all down, cuffed or surrendered), Benny says "Back in the van, I'm moving!" and the truck goes when the player is back in the van, or after 20 s anyway. Surrendered enemies left behind are cuffed automatically by the crew ("Doug's got him.") so the player isn't forced to backtrack, and they count toward `M.cuffs`. `truck.hp<=0` → fail: "They tipped the truck. Benny's okay. The Patriot Pops are not."
- **Twist and chase**: at the court gate, Benny gets out to hand out cones. 4 s later a Duke goon jumps in the driver's seat and drives off (banner `THEY TOOK THE TRUCK`, the jingle starts playing at half speed). This is the first **chase** (B.7) with `chase.max` 19 m/s, deliberately slower than the stock van's 25 m/s boost: a tutorial chase. The driver bails when the truck's HP hits 0 and surrenders easily (`surrBias .8`). Zip-tie him → the exit opens at the van ("Drive Benny's truck back?" is not offered: Benny walks over and takes it).
- **Payout**: base **$1000**; "Truck in one piece" (truck HP > 66% at the court) +$200; "Chase it down under 45 s" +$150; the usual lines.
- After this job, `SAVE.flags.hotPursuit=true` (B.6) and Benny's truck loops the neighbourhood at tier 4.

### B.5 "The Duke" (Earl): scrapyard raid and getaway chase

```js
{id:'duke',giver:'earl',hood:'river',role:'Earl · Retired, Still Never Late',title:'The Duke',place:'The scrapyard on Dock St',
 lines:["The Duke runs it all out of the scrapyard on Dock Street. Bikes, converters, the lookouts, the 'taxes.' His cousin was your Porch Pirate King.",
        "He keeps a fast car by the back gate. Folks say nobody's ever caught him on the road.",
        "You give him the chance to put his hands up. Same deal as last time. Then you catch him. I'll ride shotgun. I know every shortcut in this neighborhood."],
 crew:['gary','rick','dave','doug','rosa'],type:'boss',pad:',',floor:',',inside:'.',wall:'#8a8f93',map:/* RMAPS.duke */,
 boss:{name:'THE DUKE OF CATALYTIC CONVERTERS',hp:380,gun:'double',look:{shirt:'#1f3b4d',pants:'#111',crown:1,shades:1,scale:1.15},flee:{atHp:.5}},
 chase:{car:'sedan',max:27,driver:'boss',passenger:{gun:'smg'},start:'getaway'},
 arms:{rifle:30,smg:25,double:15,shotgun:15,revolver:15},
 radio:[['earl',"Back gate's got a car parked behind it. That's his ride."],['doug',"Yard first, office second. He's in the office."],['rosa',"If he runs, we follow. I'm not doing paperwork on a man who got away."]],
 endLine:"Earl: Thirty-six years, the number nine was never late. Today the Duke was. Folks are already calling it the Second Gear Auto School. I like that."}
```
- **Phase 1**: the existing `boss` logic. When the Duke drops to `flee.atHp` (50%) and hasn't surrendered, he gets `state:'flee'`: he runs to `site.getaway` (`v`) on the path, ignores the crew, and has 6 s of i-frames from player fire after he enters the car ("Get to the van!"). He and a passenger (`smg`) drive out of the north gate. If he surrenders before fleeing, the job ends as today (zip-tie → `bossDone='cuffed'`), with no chase.
- **Phase 2, chase** (B.7): `sedan`, `max` 27 m/s (more than the stock boost of 25; the Tier 1 engine gives 27, Tier 2 gives 30). Rubber-banding keeps it winnable in a stock van. The passenger shoots the van. The Duke bails when the car's HP reaches 0 (`state:'flee'` on foot for 25 m, then `surrender` with `surrBias 1` if the player is within 15 m). Cuff him → `bossDone='cuffed'` → back to the van. If he gets away (gap > 110 m for 8 s): "The Duke got away. Earl: 'He'll be back. They always come back to the scene.'" Fail, retry from the chase checkpoint (the van at the scrapyard gate, the Duke's car 30 m ahead).
- **Payout**: base **$1400**; "The Duke's bail refund" (cuffed) +$600; "Caught him under 60 s" +$150; "Sal's no-dents bonus" (van HP ≥ 90% at the end) +$100; the usual lines.
- **Act 2 finale**: after this win, `finale2()` (same card as `finale`): trust line depending on `trustR ≥ 70`, Rosa's line, Earl's line, then **New Saturday** (resets `prog` for both neighbourhoods, keeps cash/guns/home/garage/Rosa, closes the bridge again only for the first-visit flavour line, not mechanically) or **Keep driving** (free roam with side jobs).

### B.6 Side activities (repeatable)

- **Hot Pursuit** (after Benny): while driving in Riverside or on Route 9, with no job and `trustR < 90`, roll every 60 s with p=0.35 (at most one active, at least 4 min apart) to spawn a getaway `hatch` or `sedan` at a road node 60–90 m away, out of view. Radio: Earl on the scanner: "Blue hatchback just pulled the converter off Mrs. Kim's Corolla. Heading up 3rd!" Then a B.7 chase with `max` = 24 (hatch) or 26 (sedan). On the stop: 1–2 occupants, cuff them. Pays $150 + $60 per cuff + `addTrust(3,'river')`. Declined by ignoring it for 40 s ("Let it go, it's a Corolla.").
- **Cleanup Saturday**: graffiti scrubbing (A.7).
- **Reruns**: SPEC.md D.1, half pay, for every job including Riverside ones.

### B.7 New systems these jobs need

**Road graph** (`js/roadgraph.js`, pure data, testable in Node). Nodes are centreline intersections and dead ends. An edge exists only if every centreline tile between two nodes is still `,` `=` `V` or `l`, because sites swallowed some road stubs. Nodes with no edges are dropped. On the generator above with the bridge open: **64 nodes, 85 edges** (35 nodes in Riverside), 1 isolated stub dropped. With the barricade closed the Route 9 edge disappears (84 edges) and Riverside is a separate component.
```js
function buildRoadGraph(roads,g){            // roads = WORLD.roads, g = L.g (rows of chars)
  const DRIVE=',=Vl',H=roads.filter(r=>r.o==='h').map(r=>({z:r.k+1,a:r.a,b:r.b})),V=roads.filter(r=>r.o==='v').map(r=>({x:r.k+1,a:r.a,b:r.b}));
  const nodes=[],key=new Map(),id=(x,z)=>{const k=x+','+z;if(!key.has(k)){key.set(k,nodes.length);nodes.push({x,z,e:[]})}return key.get(k)};
  for(const h of H)for(const v of V)if(v.x>=h.a&&v.x<=h.b&&h.z>=v.a&&h.z<=v.b&&',='.includes(g[h.z][v.x]))id(v.x,h.z);
  for(const h of H)for(const x of[h.a+1,h.b-1])if(',='.includes(g[h.z][x]))id(x,h.z);
  for(const v of V)for(const z of[v.a+1,v.b-1])if(',='.includes(g[z][v.x]))id(v.x,z);
  const clear=(x0,z0,x1,z1)=>{const n=Math.max(Math.abs(x1-x0),Math.abs(z1-z0));for(let i=0;i<=n;i++){const x=x0+Math.sign(x1-x0)*i,z=z0+Math.sign(z1-z0)*i;if(!DRIVE.includes(g[z][x]))return false}return true};
  const link=(list,ax)=>{for(const r of list){const on=nodes.map((n,i)=>[n,i]).filter(([n])=>ax==='h'?n.z===r.z&&n.x>=r.a&&n.x<=r.b:n.x===r.x&&n.z>=r.a&&n.z<=r.b)
      .sort((p,q)=>ax==='h'?p[0].x-q[0].x:p[0].z-q[0].z);
    for(let k=1;k<on.length;k++){const[a,i]=on[k-1],[b,j]=on[k];if(clear(a.x,a.z,b.x,b.z)){const d=Math.abs(a.x-b.x)+Math.abs(a.z-b.z);a.e.push({to:j,d});b.e.push({to:i,d})}}}};
  link(H,'h');link(V,'v');
  const keep=nodes.map(n=>n.e.length>0);/* drop isolated nodes and remap */const map=[];let c=0;keep.forEach((k,i)=>map[i]=k?c++:-1);
  return nodes.filter((n,i)=>keep[i]).map(n=>({x:n.x,z:n.z,e:n.e.map(e=>({to:map[e.to],d:e.d}))}));
}
```
Rebuild it after `openBridge()` (the Route 9 edge 89→157 only exists when the barricade is gone).

**Lanes**: vehicles drive 1.5 m right of the centreline (a 6 m road has two 3 m lanes). Turning at a node uses a quarter-circle arc of radius 4.5 m.

**Live vehicles** `L.cars=[]`: `{type, obj, pos, yaw, spd, hp, maxHp, stats, ai, occupants:[enemy specs], col}`. Each car's collider goes in `L.dyn`. Built with `HT.Vehicles.make(type,{color})` (C.6). One update function `updCar(c,dt)` is shared by Benny's truck, getaway cars and ambient traffic, with an `ai` mode:
- `followPath`: target = next lane point; steer toward it at ≤ 2.2 rad/s; target speed = `ai.speed`, or 7 m/s within 10 m of a turn node.
- `flee` (getaway): at each node, pick the outgoing edge (no U-turns unless it's a dead end) that maximises `dot(edgeDir, normalize(car−van)) + rand(0,.6)`. Target speed: straights `ai.max`, 9 m/s within 12 m of a turn. **Rubber band** on the distance `d` to the van: `d>70` → speed ×0.75; `d<20` → ×1.05; `d>110` for 8 s → escaped (fail, or Hot Pursuit lost). **Stuck**: speed < 1 for 1.5 s → reverse for 1 s, re-pick the edge.
- Physics: the same kinematic model as the van (C.2) with the car's own `VEH` stats.

**Ramming and stopping**: each vehicle is 2 circles of radius `wid/2+.1` at ±`len/4` along its axis. On overlap: separate along the contact normal, then `vn` = relative speed along the normal.
- if `vn>3`: `car.hp -= (vn-3)*4*VAN.stats.ram*(bullBar&&front?2:1)` (front = the contact is within the van's front quarter), and `VAN.hp -= (vn-3)*1.2*car.stats.ram*(bullBar&&front?.5:1)` (C.3).
- Speeds exchange like a mass-weighted impulse: `van.spd -= vn*1.3*mc/(mv+mc)` along the normal component, and the same for the car with the masses swapped.
- **PIT**: contact on the car's rear 40% while `car.spd>8` and the angle between headings is < 50° → the car spins for 1.2 s (`yaw += 4 rad/s`, `spd *= .4`) and takes +10 damage. Radio: Rick: "Textbook! I teach that to nobody!"
- **Crew fire**: while `VAN.on` and a chase is active, up to 3 non-down allies in the van each deal 3 HP/s to the car if it's within 18 m with `losClear`. First time, Gary: "Aim for the tyres!" Dave: "Which ones?" Gary: "The round ones!"
- **Passenger fire**: an armed passenger fires at the van every 1.2 s within 25 m, hits on a 55% roll, 3 HP each, ×0.75 / ×0.5 with Reinforced Panels I/II (C.1).
- **Stop**: `car.hp<=0` → smoke, the car coasts to a stop in 1.5 s, occupants bail (`spawnEnemy` at the doors, `state:'flee'` for 25 m, then normal AI or surrender per `surrBias`). The chase objective becomes `Zip-tie the driver`. A car boxed in (speed < 1 for 2 s with the van within 6 m) also counts as stopped.

**Chase HUD**: objective lines `Stop the getaway car` + `Gap 34 m` (warn colour above 70 m), a red pulsing minimap dot, a red `#mk` diamond over the car with the label "Duke".

**Stakeout** (B.2): `M.phase`, lookout NPCs on scripted loops (arrays of tiles, walked with `moveToward`), ID meter, suspicion meter. All of it lives in `updMission` under `m.type==='stakeout'`, with the raid branch delegating to the existing `stash` code.

**Escort** (B.4): `m.type==='escort'` drives `L.cars[0]` with `followPath`, triggers ambushes by route index, then hands off to the chase code.

**Objective copy in `openBrief`** (extends the `obj` table): `stakeout:'Watch the laundromat and ID the lookouts and the courier. Then go in and smash the stash.'`, `escort:"Escort Benny's truck to the basketball court."`, and `loot` uses `m.goal`: `Recover ${goal} stolen bikes. Converters are a bonus.`

---

## C) Dad's Auto: car upgrades

### C.1 Data

Base stats per vehicle type (m, m/s, m/s², rad/s). The **minivan row is exactly today's `updVan` numbers**, so a stock van drives as it does now.
```js
const VEH={
 minivan:{name:'Family Minivan',      seats:7,len:4.4,wid:2.0,hp:100,max:17,boostMax:25,acc:8,  boostAcc:11,  brake:24,hbrake:20,coast:3.5,revMax:8,revAcc:7,steerResp:7,turn:1.55,turnFade:.75,grip:9,  ram:1.0,mass:1.0,cargo:0,price:0},
 workvan:{name:'The Contractor',      seats:3,len:5.0,wid:2.1,hp:130,max:16,boostMax:23,acc:7,  boostAcc:9.5, brake:22,hbrake:18,coast:3.2,revMax:7,revAcc:6,steerResp:6.5,turn:1.40,turnFade:.75,grip:8,ram:1.2,mass:1.3,cargo:2,price:3500},
 pickup: {name:'The Tailgater',       seats:5,len:5.2,wid:2.0,hp:120,max:19,boostMax:27,acc:9.5,boostAcc:13,  brake:25,hbrake:21,coast:3.5,revMax:8,revAcc:7,steerResp:7.5,turn:1.60,turnFade:.75,grip:9.5,ram:1.3,mass:1.2,cargo:2,price:5500},
 suv:    {name:'The Suburbanite',     seats:7,len:4.8,wid:2.0,hp:140,max:20,boostMax:29,acc:10, boostAcc:14,  brake:27,hbrake:22,coast:3.5,revMax:8,revAcc:7,steerResp:8,turn:1.60,turnFade:.75,grip:10.5,ram:1.4,mass:1.4,cargo:1,price:7500},
 sedan:  {name:'Sedan',               seats:5,len:4.6,wid:1.9,hp:100,max:22,boostMax:27,acc:12, boostAcc:14,  brake:28,hbrake:22,coast:3.5,revMax:8,revAcc:8,steerResp:8.5,turn:1.75,turnFade:.75,grip:10,ram:.9,mass:.9,cargo:0,price:null},  // getaway / traffic
 hatch:  {name:'Hatchback',           seats:4,len:3.9,wid:1.8,hp:80, max:20,boostMax:26,acc:13, boostAcc:15,  brake:28,hbrake:22,coast:3.5,revMax:8,revAcc:8,steerResp:9,turn:1.85,turnFade:.75,grip:11,ram:.8,mass:.8,cargo:0,price:null},
};
```
`cargo` = extra reserve mags per carried ammo type at mission start, built into the vehicle (the pickup's bed).

**Upgrade catalog** (`GARAGE`). Prices are set against SPEC.md D.1 (Maple clean run about $4.5–6.5k; Riverside adds about $7–9k, B). `req` is checked by `garageReq(item)` and shown as the locked reason.

| group | id | name ("joke blurb") | effect | price | req |
|---|---|---|---|---|---|
| Engine | `eng1` | Tune-Up & Fresh Plugs ("It's been 'due' since 2016") | max +2, boostMax +2, acc/boostAcc ×1.18 | $500 | — |
| | `eng2` | V6 Swap ("Sal had one lying around. Don't ask.") | max +4, boostMax +5, acc ×1.37 | $1,200 | eng1, Maple trust ≥ 40 |
| | `eng3` | The Soccer-Mom Special (supercharger) ("Built by the Second Gear kids") | max +6, boostMax +8, acc ×1.62 | $2,200 | eng2, `done.dee`, trustR ≥ 50 |
| Tyres | `tyre1` | All-Season Radials ("Tread you can trust") | grip ×1.25, steerResp ×1.2, turn ×1.05 | $250 | — |
| | `tyre2` | Performance Rubber ("For the school run you're late for") | grip ×1.55, steerResp ×1.45, turn ×1.10 | $600 | tyre1 |
| Brakes | `brk1` | Ceramic Pads ("Squeak-free since this morning") | brake ×1.25, hbrake ×1.15 | $200 | — |
| | `brk2` | Big Brake Kit ("Stops faster than Gary's jokes") | brake ×1.5, hbrake ×1.35, braking keeps grip (no slide under braking, C.2) | $450 | brk1 |
| Sport | `sport` | Sport Mode ("The van always had it. You just never pressed the button.") | `N` key or the touch **SPORT** button: 3.5 s burst, acc ×1.6, top speed = boostMax + 6, 14 s recharge, FOV +8, turbo whistle. Includes the spoiler cosmetic. | $900 | eng1 |
| Protection | `bull` | Bull Bar ("Off a snowplow. Sal says it's fine.") | front ram damage dealt ×2, front impact damage taken ×0.5, +0.15 m length | $450 | `done.dee` or trustR ≥ 30 |
| | `armor1` | Reinforced Panels I ("Kevlar? No. Plywood? Also no.") | van max HP +40, bullet damage ×0.75 | $350 | — |
| | `armor2` | Reinforced Panels II | van max HP +90 (replaces +40), bullet damage ×0.5 | $800 | armor1, trustR ≥ 40 |
| Utility | `cargo` | Roof Cargo Box ("The good cooler goes up top") | +2 reserve mags per carried ammo type at mission start (adds to the vehicle's `cargo`) | $300 | — |
| | `rack` | Gun Rack ("Three is a reasonable number of guns for a soccer dad") | unlocks a 4th loadout slot `p3` (key 4), another primary | $700 | Maple trust ≥ 60 |
| | `aid` | Rosa's First-Aid Kit ("Labelled. Alphabetised. Do not touch the scissors.") | once per mission: when the player would die, revive at 50 HP instead (2 s slow-mo, Rosa's voice line even if she's not there: "Not on my watch."). Or tap E on a downed ally for an instant revive. Restocks free at mission start. | $400 | `done.rosa` |

Cosmetics are in C.5. Vehicles: `workvan` $3,500 (after Act 1), `pickup` $5,500 (after `done.earl`), `suv` $7,500 (after `done.benny`).

**Ownership model**: performance, protection and paint/rims/tint are **per vehicle** (`SAVE.garage.vehicles[type]`). Utility items, stickers and horns are **owned once** and move with you to whichever vehicle is active (Sal installs them free). That way buying the pickup isn't a full reset.

```js
function vehStats(type,v){const b=VEH[type],u=v.perf,s={...b};
  const E=[{m:0,b:0,a:1},{m:2,b:2,a:1.18},{m:4,b:5,a:1.37},{m:6,b:8,a:1.62}][u.engine], T=[{g:1,s:1,t:1},{g:1.25,s:1.2,t:1.05},{g:1.55,s:1.45,t:1.10}][u.tyres],
        B=[{b:1,h:1},{b:1.25,h:1.15},{b:1.5,h:1.35}][u.brakes];
  s.max+=E.m;s.boostMax+=E.b;s.acc*=E.a;s.boostAcc*=E.a;s.grip*=T.g;s.steerResp*=T.s;s.turn*=T.t;s.brake*=B.b;s.hbrake*=B.h;s.absGrip=u.brakes>=2;
  s.sport=!!u.sport;s.maxHp=b.hp+[0,40,90][v.prot.armor];s.bulletMul=[1,.75,.5][v.prot.armor];s.bullBar=!!v.prot.bullBar;if(s.bullBar)s.len+=.15;
  s.cargo=b.cargo+(SAVE.garage.util.cargo?2:0);return s}
```
Resulting top speeds for the minivan (mph = m/s × 2.237):

| engine | cruise | boost | sport burst | 0→17 m/s |
|---|---|---|---|---|
| stock | 17 (38 mph) | 25 (56 mph) | n/a | 2.1 s |
| eng1 | 19 (43) | 27 (60) | 33 (74) | 1.8 s |
| eng2 | 21 (47) | 30 (67) | 36 (81) | 1.6 s |
| eng3 | 23 (51) | 33 (74) | 39 (87) | 1.3 s |

### C.2 `updVan` rewrite (drop-in shape)

```js
VAN.stats=vehStats(SAVE.garage.active,SAVE.garage.vehicles[SAVE.garage.active]);   // recomputed on purchase/swap
VAN.vdir=V3(-Math.sin(VAN.yaw),0,-Math.cos(VAN.yaw));                                 // velocity direction (slides behind the heading)
function updVan(dt){const S=VAN.stats;/* thr, st from keys/touch as today */
  if(VAN.hp<=0){thr=0}                                                                // disabled: coasts (C.3)
  if(keys.n&&S.sport&&VAN.sportCd<=0){VAN.sportT=3.5;VAN.sportCd=14;sportFx()}        // touch: #tSport
  VAN.sportT=Math.max(0,VAN.sportT-dt);VAN.sportCd=Math.max(0,VAN.sportCd-dt);
  const boost=keys.shift,sp=VAN.sportT>0,dmgMul=VAN.hp<VAN.stats.maxHp*.3?.75:1;
  const MAX=((sp?S.boostMax+6:boost?S.boostMax:S.max))*dmgMul, A=(boost||sp?S.boostAcc:S.acc)*(sp?1.6:1);
  if(thr>0)v+=(v<0?S.brake:A)*dt*thr;else if(thr<0)v-=(v>0?S.brake:S.revAcc)*dt*-thr;else v-=Math.sign(v)*Math.min(Math.abs(v),S.coast*dt);
  const hb=keys[' '];if(hb)v-=Math.sign(v)*Math.min(Math.abs(v),S.hbrake*dt);
  v=clamp(v,-S.revMax,MAX);VAN.steer+=(st-VAN.steer)*Math.min(1,dt*S.steerResp);
  VAN.yaw+=VAN.steer*clamp(Math.abs(v)/5,0,1)*(S.turn-Math.min(S.turnFade,Math.abs(v)/35))*Math.sign(v)*(hb?1.5:1)*dt;
  if(VAN.hp>0&&VAN.hp<S.maxHp*.3)VAN.yaw+=Math.sin(simT*9)*.004*Math.abs(v)/S.max;  // wobbly steering when wrecked
  const f=V3(-Math.sin(VAN.yaw),0,-Math.cos(VAN.yaw));
  const braking=thr<0&&v>2, k=S.grip*(hb?.25:1)*(braking&&!S.absGrip?.6:1);
  VAN.vdir.lerp(f,1-Math.exp(-k*dt)).normalize();VAN.slip=VAN.vdir.angleTo(f);       // slip > .12 rad → tyre squeal snd + optional skid decals
  VAN.pos.addScaledVector(VAN.vdir,v*dt);
  /* collision probes as today; on hit: vanImpact(Math.abs(v), frontHit) (C.3) */
  /* rest unchanged: syncVan, crew hidden, engine pitch (+15% pitch with eng≥2, +supercharger whine layer with eng3) */
}
```
- Stock `grip:9` gives a 0.11 s time constant, so at today's speeds it reads as kinematic (test C-2 checks that a stock 90° turn radius is within 10% of the current code). Performance tyres (≈14) feel planted. The handbrake (×0.25) gives a short slide, which is what PIT and quick turns need.
- `VAN.spd` stays the forward speed, so `hud()` mph, `engine()` pitch and `updDriveCam` all keep working.
- Touch: add `#tSport` (shown only with `S.sport`, while driving), with a radial recharge ring.

### C.3 Van health and damage

- `VAN.hp` persists in `SAVE.garage.hp[type]` (default = maxHp). HUD while driving: a thin bar under the mph readout in `#wpn`, labelled `VAN`, warn colour < 30%. If owned, the sport meter sits next to it.
- **Wall/prop impact** (`vanImpact(speed, front)`): `dmg = max(0, speed-9) * 2.2 * (front&&S.bullBar ? .5 : 1) * (M ? 1 : .5)`. Free roam takes half. At 17 m/s that's 17.6 in a mission and 8.8 in free roam; at 25 m/s, 35.2 and 17.6. Existing bump sounds/lines stay.
- **Rams, bullets**: B.7.
- **Visual states** (via `HT.Vehicles` handle `setDamage(f)` if present, else fallback): < 60% grey smoke puffs from the hood every 0.3 s (`puff`), < 30% black smoke, one headlight off, a loose bumper (rotation jitter), max speed ×0.75, wobble. 0% = **disabled**: the engine stalls (`engine(false)`), no throttle, hood smoke.
- **Disabled**: in a chase-critical phase, `endMission(false,"The van's done. Rick: 'She gave everything she had, boys.'")`. In other mission phases, the player continues on foot, and the exit ring still works because the van is still there. In free roam, prompt `E · Call a tow ($75)`: fade, the van appears at the Dad's Auto bay, `hp` = 1, and the garage card opens on the Repair tab.
- **Repair**: Dad's Auto Repair tab, `$2 per HP` (full repair of the stock van ≤ $200). Free partial repair: entering home (SPEC.md `enterHome`) restores the van to at least 60% ("Tyler hammered the dents out. Mostly.").

### C.4 Utility effects, wiring

- **Cargo**: in `fillAmmo()` (SPEC.md B.6), each carried ammo type gets `+VAN.stats.cargo*W.mag` reserve (W = the carried gun of that ammo type with the largest mag), capped by `AMMO.cap`, once per mission start.
- **Gun rack**: `SLOT_KEYS=['side','p1','p2','p3']`, key `4`. The `p3` slot is usable only if `SAVE.garage.util.rack`. The locker card (SPEC.md C.4) shows slot 3 "Gun rack (Dad's Auto)" locked otherwise. `SAVE.loadout.p3` defaults to null. If the rack isn't owned at mission start, p3 is ignored, not deleted.
- **First-aid kit**: `M.aid = SAVE.garage.util.aid ? 1 : 0` at mission start. In `hurtPlayer`, if `P.hp<=0 && M.aid` → `M.aid=0; P.hp=50; slowMo(2)`. In `updMission`, near a downed ally (1.6 m), the prompt is `E · First-aid kit (1)`.

### C.5 Cosmetics (mapped to `HT.Vehicles`)

| slot | options (id: label, price) | `make()` option |
|---|---|---|
| paint | `slate` Slate Blue (stock hub van `#35577d`) $0 · `silver` Minivan Silver `#b9c0c7` $120 · `cranberry` `#8a2f2a` $120 · `forest` `#3d4a3a` $120 · `sand` Sandstone `#d8d4c8` $120 · `white` Soccer-Ball White `#f2f2ee` $120 · `orange` Hi-Vis Orange `#e8742a` $120 · `black` Grill-Master Black `#1f2226` $120 · `twotone` Two-Tone Sunday (cream over brown) $250 · `wood` Wood-Grain Side Panels $300 · `mural` Riverside Mural Wrap $400 (trustR ≥ 70) | `color` = hex (base colour), `upgrades.paint` = `'solid'`/`'twotone'`/`'wood'`/`'mural'` |
| rims | `steel` stock · `alloy` $150 · `chrome` $250 · `spinner` Hubcap Spinners $350 · `gold` "For the dad who has everything" $400 | `upgrades.rims` |
| tint | `none` · `light` (35%) $80 · `limo` (70%) $120 | `upgrades.tint` 0 / .35 / .7 |
| roof | `rails` stock · `cargo` (the utility item shows as a box) | `upgrades.roofRack` `'rails'` or `'cargo'` |
| bull bar | the protection item | `upgrades.bullBar` true |
| light bar | `amber` "Neighborhood Watch" amber/white bar $300 (trustR ≥ 35). Flashes amber/white while H is held > 0.4 s. **Never red/blue**: this is a dad, not a police car. | `upgrades.lightBar` `'amber'` |
| spoiler | free with Sport Mode, or $180 on its own ("Adds 0 mph. Adds 40 cool.") | `upgrades.spoiler` true |
| stickers | 3 slots, $15 each: "My Kid Is On The Honor Roll" · "I Brake For Garage Sales" · "Proud Soccer Dad" · "Ask Me About My Lawn" · "World's Okayest Driver" · "Honk If You Love Potato Salad" · "My Other Car Is Also A Minivan" · "Coach Rick Made Me Do Laps" · "I ♥ Linden Park" · "Powered By Brisket" · "Free Bike Library · Riverside" (after Earl) · "I ♥ Riverside Flats" (Corner Mart only, trustR ≥ 70) | not a `make()` option. Canvas texture applied to the handle's `parts.rear` (C.6) |
| horn | `stock` two-tone (today's `honk()`) · `shave` "Shave and a Haircut" $40 · `ode` "Ode to Joy" $80 · `ballgame` "Take Me Out to the Ball Game" $80 · `elise` "Für Elise" $80 · `tell` "William Tell Finale" $150 (good for chases) · `entertainer` "The Entertainer" $200 (after Benny's job; Benny's truck uses it) | not a `make()` option. `honk()` plays `HORNS[id]` |

**Horns** are synthesised (square + triangle oscillators, the same envelope as `honk()`), from compositions in the public domain: Beethoven (1824), Rossini (1829), Joplin (1902), von Tilzer/Norworth (1908), Beethoven's *Für Elise* (pub. 1867), and the 1899 "Shave and a Haircut" figure. No recordings. A tap plays the phrase, capped at 2.4 s. MIDI note, length in beats:
```js
const HORNS={
 stock:null,
 shave:{bpm:220,n:[[72,1],[67,.5],[67,.5],[69,1],[67,1],[0,1],[71,1],[72,1]]},
 ode:{bpm:260,n:[[64,1],[64,1],[65,1],[67,1],[67,1],[65,1],[64,1],[62,1]]},
 ballgame:{bpm:320,n:[[60,2],[72,1],[69,1],[67,1],[64,1],[67,3],[62,3]]},
 elise:{bpm:170,n:[[76,.5],[75,.5],[76,.5],[75,.5],[76,.5],[71,.5],[74,.5],[72,.5],[69,1.5]]},
 tell:{bpm:150,n:[[67,.33],[67,.33],[67,.67],[67,.33],[67,.33],[67,.67],[67,.33],[67,.33],[72,.67],[74,.67],[76,.67]]},
 entertainer:{bpm:100,n:[[62,.25],[63,.25],[64,.25],[72,.5],[64,.25],[72,.5],[64,.25],[72,1.25],[0,.25],[72,.25],[74,.25],[75,.25],[76,.25],[72,.25],[74,.25],[76,.5],[71,.25],[74,.5],[72,1]]},
};
```

### C.6 Vehicle module interface

The game consumes `window.HT.Vehicles` (a separate `js/vehicles.js`; if it's absent, fall back to `makeVan(col)`/`makeHubVan()`):
```js
const h = HT.Vehicles.make(type, {color, upgrades:{paint, rims, roofRack, bullBar, lightBar, tint, spoiler}});
// type ∈ 'minivan','sedan','suv','hatch','pickup','workvan'. Unknown upgrade keys must be ignored. Missing keys = stock.
```
What the game needs back (request this from the module author; if the module only returns a `THREE.Group`, wrap it with defaults):
```js
h = { group,                       // THREE.Group, +x forward to match makeVan (syncVan adds PI/2 to yaw)
      len, wid,                    // metres, for colliders/ram circles (default from VEH)
      parts:{body, glass, wheels:[], rear},   // rear = a mesh/plane for the sticker texture
      setUpgrades(u),              // live cosmetic preview in the garage, no rebuild
      setDamage(f),                // 0..1 (optional): dents/smoke anchors
      setLights(on), flashBar(t),  // optional
      dispose() }
```
Mapping from save to options:
```js
function vehicleOpts(type){const v=SAVE.garage.vehicles[type],c=COSMETICS.paint[v.paint];
  return{color:c.hex,upgrades:{paint:c.finish,rims:v.rims,roofRack:SAVE.garage.util.cargo?'cargo':'rails',bullBar:!!v.prot.bullBar,
    lightBar:v.lightBar?'amber':false,tint:{none:0,light:.35,limo:.7}[v.tint],spoiler:!!(v.spoiler||v.perf.sport)}}}
```
`makeHubVan()` becomes `makePlayerVehicle()`: `HT.Vehicles.make(SAVE.garage.active, vehicleOpts(active))`, adds the sticker canvas to `parts.rear`, sets `VAN.stats`, `VAN.hp`, and the collider half-extents from `len/wid` (replacing the hard-coded 2.2/1.0 in `syncVan`). Getaway cars and Benny's truck use the same `make()` with their own colours.

**Other vehicles**: `workvan` (3 seats, crew capped at 2 allies, `cargo 2`; "for the dad who owns a ladder"), `pickup` (5 seats, cargo bed `cargo 2`, ram 1.3), `suv` (7 seats, the toughest and fastest stock). Owned vehicles you aren't driving park in your home driveway (`D` and the two tiles west). Swap at Dad's Auto (Vehicles tab) or by walking up to one in the driveway (`E · Drive the Tailgater`). Crew size is `min(m.crew.length, seats-1)`, and the brief shows "Rick stays home (not enough seats)".

### C.7 `#cGarage` (Dad's Auto card)

- Same `.card` markup as SPEC.md's `#cShop`. Tabs: **Performance · Protection · Utility · Looks · Vehicles · Repair**. Rows: name, blurb, stat effect, price, `Buy` / `Installed` / locked reason ("Needs Riverside trust 50%").
- **Live preview**: opened from the bay ring, the van is placed on the bay, `mode` stays `hub` with `running=false`, and a turntable camera orbits (radius 7 m, height 2.2, 0.25 rad/s, or drag to rotate). Hovering a cosmetic calls `h.setUpgrades()` to preview it. Leaving reverts anything not bought.
- **Stat bars** for the active vehicle, with ghost segments for the hovered upgrade: Top speed (boostMax/40), Acceleration (boostAcc/20), Handling (grip/16), Braking (brake/40), Toughness (maxHp/240).
- **Sal's lines** (one per open, no repeats until exhausted): "Every van's a sports car if you believe in it." · "I put a V6 in a minivan once. The man cried. Good tears." · "Bull bar's off a snowplow. It's fine. It's mostly fine." · "You want the spinners? I'm not going to stop you. I'm going to judge you." · after Rosa: "Your nurse friend told me to stop eating gas station sushi. I'm considering it."
- Purchases: `SAVE.cash -= price`, `SAVE.stats.spent += price`, apply to `SAVE.garage`, `VAN.stats` recomputed, `saveGame()`, `events.push('boughtCar')` (the family line pool at home: Jen: "Did you put a *spoiler* on the minivan?").
- **Loyalty**: after 5 purchases at Dad's Auto, 5% off everything ("Family discount. You're basically family. Don't move in.").

### C.8 Economy check

| | approx. |
|---|---|
| Maple clean run (SPEC.md) | $4.5–6.5k |
| Riverside clean run: earl ≈1.3k, dee ≈1.65k, rosa ≈1.5k, benny ≈1.7k, duke ≈2.9k | ≈ $9k |
| SPEC.md sinks: guns ≈ $3.5k, attachments $1.15k, furniture ≈ $6k | ≈ $10.6k |
| Car perf (all) $6.3k + protection $1.6k + utility $1.4k | $9.3k |
| Cosmetics (a typical look) | $0.5–1k |
| Vehicles | $3.5k / $5.5k / $7.5k |

By the end of Act 2 a player can afford about two guns, most attachments, a decorated living room, **plus** Engine 1–2, tyres, bull bar, panels I and the cargo box. The third engine tier, the second panels, and the extra vehicles are the long tail (reruns, Hot Pursuit at $150–300 each, scrubbing). One wallet (`SAVE.cash`) for everything.

---

## D) Save v2 (`localStorage['ht-save']`)

`SAVE_V=2`. All v1 keys stay. New and changed keys:
```js
// SAVE_DEFAULT() additions
prog:{done:[false,false,false,false,false,false,false,false,false], trust:12, trustR:5, act:1, cuffed:0, downed:0, shotSurr:0, missionsRun:0},
loadout:{side:'pistol',p1:'shotgun',p2:null,p3:null},
crew:{rosa:false},
world:{bridgeOpen:false, visited:{river:false}, pins:['home','hank','auto','gas'], scrubbed:[], scrubTrust:0, tier:0,
       lastPos:null /* {x,z,yaw} van position on save, restored on boot if mode was hub */, hotPursuitAt:0},
garage:{active:'minivan', owned:['minivan'], purchases:0, dirt:0,
  vehicles:{minivan:{paint:'slate',rims:'steel',tint:'none',lightBar:false,spoiler:false,
                     perf:{engine:0,tyres:0,brakes:0,sport:false}, prot:{bullBar:false,armor:0}}},
  hp:{minivan:100},
  util:{cargo:false,rack:false,aid:false}, stickers:[null,null,null], ownedStickers:[], horn:'stock', ownedHorns:['stock'], ownedCos:{paint:['slate'],rims:['steel'],tint:['none']}},
flags:{...v1 flags, hotPursuit:false, act2Intro:false},
```
Migration:
```js
MIGRATIONS[1]=s=>{
  const d=s.prog&&s.prog.done||[];s.prog=s.prog||{};s.prog.done=[...d,...Array(9).fill(false)].slice(0,9);
  if(s.prog.trustR==null)s.prog.trustR=5;
  s.prog.act=s.prog.done.slice(0,4).every(Boolean)?2:1;                 // a v1 player who beat the Kingpin lands in Act 2
  s.world={...(s.world||{}),bridgeOpen:s.prog.act===2};
  if(s.loadout&&!('p3' in s.loadout))s.loadout.p3=null;
  s.v=2;return s};
```
- `deepMerge` fills `garage`, `world`, `crew` from defaults. Arrays in the save replace default arrays, which is why `done` is padded in the migration.
- **Validation** in `loadGame`: `garage.active` must be in `owned` (else `minivan`). Every `vehicles[type]` gets defaults merged. Clamp `perf.engine` 0–3, `tyres`/`brakes` 0–2, `prot.armor` 0–2. Drop unknown cosmetic ids back to stock. Clamp `hp` to `[0, maxHp]`. Drop `p3` from the loadout if `!util.rack`. `world.pins` keeps only known ids. Clamp `trustR` 0–100.
- **Saved** also on: every garage purchase/repair/vehicle swap, `openBridge()`, fast travel, each scrub (debounced 2 s), entering Riverside the first time, tier changes, and van disabled/towed.
- `__ht` additions: `WORLD`, `hoodAt`, `region` (getter), `openBridge`, `fastTravel(id)`, `roadGraph` (getter), `cars` (getter), `garage:{buy(id), stats(), swap(type), repair()}`, `vehStats`, `dress(t)`, `gps` (getter: the current path), `chunks` (getter: `[{cx,cz,visible}]`), `drawCalls()` (`renderer.info.render.calls` of the last frame), `jobAvailable(i)`.

---

## E) Implementation order (6 layers, each shippable and tested)

Same harness as SPEC.md F: serve the folder, Playwright Chromium headless with `--use-gl=swiftshader`, `page.evaluate` against `window.__ht`, `localStorage.clear()` first, no `pageerror`, `step(300)` survives in each mode. SPEC.md layers 1–4 can land before or after these. The only shared touch points are `fillAmmo` (cargo), `SLOT_KEYS` (p3), `computePayout` (new givers' bases and lines), `SAVE` (v2), and `endMission`'s buttons.

**Parallel modules** (plain scripts, no build step, each attaches to `window.HT` and is loaded with `<script src="js/….js">` before the main script). Each can be written and unit-tested in Node or a bare page by a separate worker:

| module | owns | depends on | Node-testable |
|---|---|---|---|
| `js/world-gen.js` | `HT.makeWorld(MISSIONS)` → the `WORLD` object (A.2 code verbatim) | the mission maps only | yes |
| `js/roadgraph.js` | `buildRoadGraph`, `shortestPath`, lane points, `HT.gpsSolve(grid,from,to,costs)` (Dijkstra) | world grid | yes |
| `js/chunks.js` | chunked instanced static renderer `HT.Chunks.build(lvl, THREE, opts)` → `{groups, update(camera), solidsNear(p,r), dispose}` | THREE r128, BufferGeometryUtils | no (browser) |
| `js/minimap.js` | overview canvas, `#mm` draw, `#cMap` card, icons | world grid, places, gps path | partly |
| `js/vehicles.js` | `HT.Vehicles` (C.6), possibly already in progress elsewhere | THREE | no |
| `js/riverside.js` | `genTags`, tier tables, `dressRiverside`, neighbour pool | world, lvl | `genTags` yes |
| `js/garage.js` | `VEH`, `GARAGE`, `COSMETICS`, `HORNS`, `vehStats`, `garageReq` (pure data and functions) + `#cGarage` UI | SAVE shape | data/functions yes |

### Layer W1: World geometry and performance (modules: world-gen, chunks)
Scope: `WORLD` replaces `HUB` (alias kept), new legend chars, `SOLID`/`LOSBLOCK`, world-mode `buildLevel` (cache, ground colour rule, house door rule, extents on lines, parked-V rule, sites registered but inert), chunk renderer with instancing and visibility, collider hash, windowed `nextStep`, `solidsNear`, world fog/far plane. Missions still use the old separate levels and drive to `site.park` rings (`L.dests` = the site park spots). The barricade works.
Tests:
1. Node: `makeWorld(MISSIONS).map` is 80 rows × 232. Every site has `park` and `huddle`. Byte-for-byte identical to the A.2 reference (hash the joined map).
2. Node: BFS from `D` over non-`SOLID` tiles reaches every `site.park`, `site.huddle` and every place with the barricade open. Every Riverside place is unreachable with it closed. Inside each site, every `I i T E B a S v &` is reachable from `huddle` within the site box (+1).
3. Browser: `enterHub()`. `L.def.id==='world'`. The old home door is at world (39,21) and the hardware store at the `R` tile (SPEC.md tests still pass). `L.g[10][19]==='H'`.
4. Colliders: drop the player at 50 random walkable tiles, `step(30)`. Nobody ends up inside a solid AABB. The hash result equals a brute-force scan for 1,000 random queries.
5. Build time: `performance.now()` around `buildLevel(WORLD)` < 600 ms (swiftshader: < 2,500 ms). A second call (cache) < 30 ms.
6. Budget: at 6 probe points (home, Maple SE corner, Dad's Auto, mid-bridge, Riverside Main/3rd, scrapyard gate), facing 4 headings each, `drawCalls()` ≤ 450 and `chunks.filter(c=>c.visible).length ≤ 9`.
7. Drive: put the van at `D`, hold W+Shift for `step(150)` along Maple Ave: the van moves > 80 m east with no errors, and `L.solidsNear` changes as chunks change.
8. Barricade: drive into it at 20 m/s: blocked (x stays < 141 tiles). `openBridge()`, drive again: the van reaches x > 152 tiles.

### Layer W2: Regions, minimap, GPS, fast travel (modules: roadgraph (GPS part), minimap)
Scope: `hoodAt`, `updRegion` banners, per-region trust HUD, mood blend, `addTrust(v,hood)`, `prog.trustR`, overview canvas, `#mm`, `#cMap`, GPS Dijkstra + simplification + chevrons, pins and `fastTravel`, Save v2 (migration, validation, new keys).
Tests:
1. `hoodAt` at x = 50, 120, 200 (tile centres in metres) → maple, route9, river.
2. Teleport the player across x = 152 tiles: a banner with "RIVERSIDE FLATS", `SAVE.world.visited.river===true`, `pins` includes `center` and `mart`.
3. `addTrust(4)` while standing in Riverside (no mission) raises `trustR` by 4 and `trust` by 0. During a Maple mission it goes to `trust`.
4. GPS: from `D` to `site.park` of earl with the bridge open → the path exists, and every node is non-solid. The solve takes < 15 ms (median of 10). With the barricade closed, no path.
5. Minimap: `#mm` canvas exists, visible in hub, hidden in home and on cards. In the canvas pixel data, the centre pixel is the player arrow colour.
6. Fast travel: `fastTravel('auto')` with the player in the van → `VAN.pos` within 1 m of `places.auto`. Refused while `VAN.hp<=0` or in a mission.
7. Save: write a v1 save with `done:[true,true,true,true]`, reload → `v===2`, `done.length===9`, `act===2`, `world.bridgeOpen===true`, `trustR===5`, `loadout.p3===null`.

### Layer W3: Missions in the world (no new mission types yet)
Scope: `startMissionWorld`, `activateSite`/`deactivateSite`, `beginMission` shared helper, leash windows, "leaving the job" countdown, result card **Keep driving**, site after-dressing, `CFG.inWorld` fallback, multiple givers and `jobAvailable`, Act 1 finale → `openBridge()` → Act 2 intro card, `MISSIONS` 4–8 data (maps, lines, arms, bosses, unlocks) and `loot` generalisation (`goal`, `i` bonus, `pickupLines`). **Earl's job is fully playable at the end of this layer.**
Tests:
1. Take Gary's job, teleport the van into the gary park ring, `step(10)` → `mode==='mission'`, `L.def.id==='world'`, `enemies.length===10`, `L.items.length===4`.
2. Win (`M.got=4`, walk to `L.exit`) → result card shows **Keep driving**. Click it → `mode==='hub'`, no enemies left after `step(90)`, `prog.done[0]===true`, the climbing gym sign is visible.
3. Leash: teleport an alerted enemy 20 tiles outside `L.win` → it heads back (distance to spawn decreases over `step(60)`).
4. Leaving: put the player 40 m outside the site → after `step(9*30)`, the mission failed with the windshield-note text.
5. Fallback: `CFG.inWorld=false` → `startMission(0)` builds the old separate level (`L.def.id==='gary'`).
6. Act 2: `prog.done=[1,1,1,1,0,0,0,0,0]`, `enterHub()` → finale card → click **Next Saturday** → `SAVE.world.bridgeOpen`, `prog.act===2`, the Earl giver exists at `places.g_earl`.
7. Earl: start, collect 6 `I` → the exit opens. Collect 2 `i` → `computePayout` includes "converters" at 2×60, base 650, trust multiplier from `trustR`.
8. Gates: with `done[4]` and `trustR=10`, Dee's giver shows the "needs Riverside trust 15%" tag and `openBrief` is not offered.

### Layer W4: Riverside dressing and side activities (module: riverside)
Scope: tier table, `dressRiverside`, graffiti atlas + `genTags` + scrubbing, lamp states, neighbour pool, chalk, garden and court props, Community Center board, Ramos Corner Mart shop flavour, Hank's sign text, car wash and dirt, Officer Dana.
Tests:
1. Node: `genTags(9)` returns 48 tags on distinct faces, all on `r x A z` faces, deterministic (same output twice).
2. `dress(0)`: 48 tags visible, about 70% of Riverside lamps dark. `dress(50)`: 0 tags with `clearAt≤50`, all lamps lit, chalk visible. `dress(70)`: no tags, mural visible.
3. Scrub: next to a tag, hold E for 61 ticks → the tag is hidden, `trustR` +0.5, cash +5, `SAVE.world.scrubbed` has its id. Reload the page → it's still hidden. 31 scrubs → total trust from scrubbing capped at 15.
4. Neighbour pool: at `trustR=90` walk the length of Main St → never more than 10 neighbour dudes in the scene.
5. Tier banner fires once when `trustR` goes from 34 to 36.
6. Car wash: `SAVE.garage.dirt=80`, drive through the bay at 4 m/s → dirt 0, cash −10.

### Layer W5: Car upgrades, van health, vehicles (modules: garage, vehicles)
Scope: `VEH`, `GARAGE`, `COSMETICS`, `HORNS`, `vehStats`, the `updVan` rewrite (grip, sport, damage), `vanImpact`, damage states, tow, repair, `#cGarage` with turntable preview, purchases and reqs, stickers, horns, light bar, cargo/rack/aid wiring, `makePlayerVehicle` via `HT.Vehicles` with fallback, vehicle purchase and swap, driveway parking.
Tests:
1. `vehStats('minivan', stock)` equals `{max:17,boostMax:25,acc:8,boostAcc:11,brake:24,…}` (the current constants). With eng2+tyre2+brk2 → max 21, boostMax 30, acc 10.96, grip 13.95, brake 36.
2. Feel parity: a stock van, full throttle + steer left from rest for `step(90)` → the end position is within 10% (distance) of the same run on a recorded reference from the pre-rewrite code (store the reference numbers in the test).
3. Top speed: the stock van holding W+Shift for `step(300)` on Route 9 → `VAN.spd` ≈ 25 (±0.3). With eng3 → 33. Sport burst (`keys.n`) → peaks at 39, recharge 14 s before it can fire again.
4. Damage: drive the stock van into a wall at 20 m/s in a mission → `VAN.hp` ≈ 100 − 24.2 (±2). In free roam ≈ −12.1. Bull bar front hit halves it. Five such impacts → disabled, the throttle does nothing, the tow prompt shows. Tow → at Dad's Auto, hp 1.
5. Garage: cash 2,000, `garage.buy('eng1')` → cash 1,500, `perf.engine===1`, `VAN.stats.max===19`. `buy('eng2')` with Maple trust 30 → refused with reason containing "trust". Buy the paint `cranberry` → the vehicle rebuilds with that colour (`h.parts.body.material.color` ≈ the hex).
6. Utility: the cargo box + loadout with 9mm → at mission start, the 9mm reserve = base + 2×12 (pistol mag). Gun rack: key 4 selects `p3`. Aid kit: set `P.hp=1`, `hurtPlayer(10)` → hp 50 and the mission continues; a second lethal hit ends it.
7. Vehicles: buy the pickup (cash 6,000, after `done.earl`) → `owned` includes it. `garage.swap('pickup')` → `VAN.stats.max===19`, the minivan appears in the driveway. Crew size for the duke job is capped at 4.
8. Horns: `SAVE.garage.horn='shave'`, press H → 7 oscillator notes scheduled (spy on `AC.createOscillator`), no errors. The light bar never uses red or blue (assert the material colours).

### Layer W6: New mission types (modules: roadgraph (cars))
Scope: road graph + lanes, `L.cars`, `updCar` (`followPath`, `flee`), rubber band, ram/PIT/crew fire/passenger fire, the stop/bail/surrender flow, chase HUD; `stakeout`; `escort` + ambushes + truck twist; garden bed HP + Rosa joins + medic; Duke flee → chase → finale2; Hot Pursuit side job; payouts for all new givers.
Tests:
1. Node: `buildRoadGraph` on the reference world (bridge open) → 64 nodes, 85 edges, connected. With the bridge closed → 84 edges, and no Riverside node is reachable from a Maple node.
2. `followPath` along Benny's `route` with no van check (`waitDist=1e9`) → the truck reaches the court gate within `step(70*30)` and never leaves road tiles (`L.g` under it is `,` `=` `V` or `l` every tick).
3. Flee AI: spawn a sedan at (189,35) with the van parked 10 m behind it. After `step(300)` the car is > 40 m away and on road tiles. With the van teleported 200 m away, it slows (rubber band) and `escaped` fires after 8 s.
4. Ram: van at 15 m/s into a stopped sedan, head-on → `car.hp` drops by (15−3)×4=48 (±5). With a bull bar, 96. A second ram above 4 m/s stops it: occupants bail and the objective says "Zip-tie the driver".
5. Stakeout: hold aim on each of the 4 suspects for 46 ticks → `M.phase==='raid'` with the clean bonus flag. Honk 3 times instead → `M.sus≥100` → every `E` is alerted.
6. Escort: `truck.hp=0` → fail with the Patriot Pops line. A complete escort → the chase starts with the truck as the car and `max` 19.
7. Garden: wave enemies walk through beds → `bedsStanding` < 12. A win sets `SAVE.crew.rosa`. The next Riverside job's `allies` include `rosa`. A downed ally near Rosa is back up in ≤ 3.5 s.
8. Duke: `hurtEnemy(boss, 200)` → `state==='flee'`, he enters the car, the chase starts. Kill the car → he bails → surrenders within 15 m → cuff → `M.bossDone==='cuffed'` → the exit opens → the win gives payout lines including "bail refund 600" → the `finale2` card.
9. Hot Pursuit: `SAVE.flags.hotPursuit=true`, force the roll → a car spawns 60–90 m away on the road graph. Stop it and cuff → +$150 + $60/cuff, `trustR` +3.

---

## F) Decisions for the owner

1. **When the bridge opens.** Plan of record: after the Kingpin, so Riverside is Act 2 (cleaner story, and Riverside is visible from day one as a teaser). Alternative: open it after Rick's job (mission 2) so the neighbourhoods interleave. That's a one-line change to `MISSIONS[4].unlock` and `openBridge()`'s trigger, but the Act 1 finale text and Earl's intro would need rewording.
2. **One world vs. split at the river.** The plan is one continuous level with chunked instancing (A.4). If the low-end target device misses the draw-call budget, fall back to two levels with a fade on the bridge deck. Worth deciding which devices count as the target (a mid phone?).
3. **Mission sites in the world.** All 9 jobs happen in place, in the open world, with the old separate-level path kept behind `CFG.inWorld`. The owner may prefer to keep Maple's 4 original jobs as separate levels (zero regression risk) and only put Riverside jobs in the world.
4. **Free-roam van damage.** Half damage in free roam with a free 60% repair at home. Set this to zero if the owner wants free roam to be consequence-free.
5. **Rosa's look.** She needs a female character model. The overhaul's glTF set (`assets/family/spouse_casual.glb`) could be reused with scrubs colours, or `makeDude` gets a `hairLong` flag. Same for Pastor Dee.
6. **Store name.** SPEC.md called it "Maple Hardware & Sporting"; the owner's brief says Hank's Hardware. This spec renames the sign to "HANK'S HARDWARE & SPORTING".
