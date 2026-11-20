/* High Trust · HT.World
 * Deterministic world generator for the continuous map (docs/design/SPEC2.md section A).
 * Pure data: no THREE, no DOM. Works in the browser (window.HT.World) and in Node (module.exports).
 *
 *   const def = HT.World.build({save, bridgeOpen, missions});
 *   def.map            232 strings x 80 rows in the buildLevel legend (+ SPEC2 extensions)
 *   def.sites[id]      mission lots with park/huddle/ring and per-site entity lists
 *   def.chunks[i]      per-32x32-tile object lists for an instanced renderer
 *   HT.World.regionAt(x,z), HT.World.site(id), HT.World.dressing(def, trustR, scrubbed)
 * Units: tiles (tx,tz) are grid indices; x,z are world metres at the tile centre (tx*2+1). TILE=2.
 */
(function(root){'use strict';
const HT=root.HT=root.HT||{};
const TILE=2,W=232,H=80,CHUNK=32,CW=Math.ceil(W/CHUNK),CH=Math.ceil(H/CHUNK);
const tc=i=>i*TILE+TILE/2, tx=m=>Math.floor(m/TILE);
const SOLID='#hctTfVQ'+'rxAz~|!Go&';      // world-relevant solids (index.html SOLID + SPEC2 A.2)
const LOSBLOCK='#htVcTf'+'rxA';
const COLCH=',.gs';                         // chars that are their own ground colour
const HOODS={maple:{name:'Maple Heights',tx0:0,tx1:99},route9:{name:'Route 9',tx0:100,tx1:151},river:{name:'Riverside Flats',tx0:152,tx1:231}};
const BRIDGE_UNLOCK_JOB=1;                  // owner decision: the bridge opens after Rick's job (prog.done[1])

/* Mission maps. The first four are copies of index.html MISSIONS[i].map; build({missions}) can override them with the live ones. */
const MAPS={
  gary:{wall:'#8d9096',floor:',',map:[ // Chop shop, Industrial Way (copy of index.html MISSIONS map)
   ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
   ",,X,,,,,,,,,,,,,,,,,,,,,,,,,,,",
   ",,,,P,,,,,,,,,c,,,,,,,,,,E,,,,",
   ",,,,,,,,,,,,,,,,,,,,c,,,,,,,,,",
   ",,,,,,,,,c,,,,,,E,,,,,,,,,,,,,",
   "##############..##############",
   "#.......c....#..#.....I......#",
   "#..E....c....#..#....cc..E...#",
   "#............#..#............#",
   "#...cc...E..........E........#",
   "#...cc.......#..#......cc....#",
   "#.I..........#..#......cc.a..#",
   "######..######..######..######",
   "#.......#..............#.....#",
   "#...E...#...c....c.....#..I..#",
   "#.......#...c....c..E..#.....#",
   "#..a.........................#",
   "#....I..#.....E........#..E..#",
   "#.......#..............#.....#",
   "##############################"]},
  rick:{wall:'#a39382',floor:',',map:[ // The old duplex on Birch (copy of index.html MISSIONS map)
   "tttttttttttttttttttttttttttt",
   "t,,,,,,,,,,,,,,,,,,,,,,,,,,t",
   "t,,X,,P,,,,,,,,,,,,,,,,,,,,t",
   "t,,,,,,,,,,,,f,,,,,,,,f,,,,t",
   "t,,,,ffff,,,,f,,E,,,,,f,,,,t",
   "t,,,,,,,,,,,,,,,,,,,,,,,,,,t",
   "t########.####.#########.#,t",
   "t#.....#....#.....#......#,t",
   "t#..T..#.E..#..E..#..T...#,t",
   "t#.....#....#.....#......#,t",
   "t#..E.......c...........E#,t",
   "t###.#####.####.#####.####,t",
   "t#.....#.........#.......#,t",
   "t#..E..#..cc..E..#...E...#,t",
   "t#.....#.........#.......#,t",
   "t#..a.......T........a...#,t",
   "t#.....#.........#.......#,t",
   "t#########################,t",
   "t,,,,,,,,,,,,,,,,,,,,,,,,,,t",
   "tttttttttttttttttttttttttttt"]},
  dave:{wall:'#888',floor:'g',map:[ // Linden Park (copy of index.html MISSIONS map)
   "tttttttttttttttttttttttttttttt",
   "tggggggggggggSgggggggggggggggt",
   "tggggtggggggggggggggggtggggggt",
   "tggggggggggggggggggggggggggggt",
   "tSggggggcggggggggggggcggggggSt",
   "tggggggggggggggggggggggggggggt",
   "tggtgggggggccgQgccgggggggtgggt",
   "tgggggggggggggPggggggggggggggt",
   "tggggggggcggggggggggcggggggggt",
   "tggggggggggggggggggggggggggggt",
   "tSggggggggggtgggggtgggggggggSt",
   "tggggggggggggggggggggggggggggt",
   "tggggggggggggSgggggggggggggggt",
   "tttttttttttttttttttttttttttttt"]},
  doug:{wall:'#c9c1b0',floor:',',map:[ // The compound on Ridgeview (copy of index.html MISSIONS map)
   "ttttttttttttttttttttttttttttt",
   "t,,,,,,,,,,,,,,,,,,,,,,,,,,,t",
   "t,,X,P,,,,,,,,,,,,,,,,,,,,,,t",
   "t,,,,,,,,,,,,,,,,,,,,,,,,,,,t",
   "tfffffffffff,,,,,ffffffffffft",
   "tgggggggggggggggggggggggggggt",
   "tggEgggcgggggggggggggcgggEggt",
   "tggggggggggEgggggEggggggggggt",
   "tggggcggggggggggggggggggcgggt",
   "tgg##########.#####.#######gt",
   "tgg#........#.....#.......#gt",
   "tgg#..E..cc.......#.cc..E.#gt",
   "tgg#........#.....#.......#gt",
   "tgg####.#######.#####.#####gt",
   "tgg#.......#.........#....#gt",
   "tgg#..E....#...E.....#..a.#gt",
   "tgg#.......#.........#....#gt",
   "tgg#..........cc.......E..#gt",
   "tgg#####.########.#########gt",
   "tgg#.......#........#.....#gt",
   "tgg#..a....#...B....#..E..#gt",
   "tgg#.......#..E..E..#.....#gt",
   "tgg#......................#gt",
   "tgg########################gt",
   "ttttttttttttttttttttttttttttt"]},
  earl:{wall:'#7e8a8f',floor:',',map:[ // The Spoke Shop, Dock St
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
   "zzzzzzzzzzzzzzzzzzzzzzzzzz"]},
  dee:{wall:'#b9a98f',floor:',',map:[ // Spin City Laundromat, Main St
   ",,X,,,,P,,,,,,,,,,,,,,,,,,,",
   "####..#############..######",
   "#c..........c#.....#......#",
   "#c..E.......c#..T..#..T...#",
   "#c....cc..........E....B..#",
   "#c..........c#.....#..E...#",
   "######.#######..E..#......#",
   "z,,,,,,,,,,,,#.....###.####",
   "z,,E,,,,a,,,,,,,,,,,,,,,,E,"]},
  rosa:{wall:'#888',floor:',',map:[ // Riverside Community Garden. & = tool shed (defend point)
   "zzzzzzzzzzz,,S,,zzzzzzzzzzz",
   "z,X,,P,,,,,,,,,,,,,,,,,,,,S",
   "z,oooo,oooo,,,,,oooo,oooo,z",
   "z,,,,,,,,,,,c,,,,,,,,,,,,,z",
   "S,oooo,oooo,,&,,oooo,oooo,z",
   "z,,,,,,,,,,,,,,,,,,,,,,,,,z",
   "z,oooo,oooo,,c,,oooo,oooo,z",
   "z,,,,,,,,,,,,,,,,,,,,,,,,,S",
   "zzzzzzzzzzz,,S,,zzzzzzzzzzz"]},
  duke:{wall:'#8a8f93',floor:',',map:[ // The scrapyard, Dock St. v = getaway car
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
   "zzzzzzzzzzzzzz###########zz"]}
};

/* SPEC3 small sites (section 2 table, 4.0 "New sites"). Stamped like the mission lots, but not overridable by build({missions}).
   Marker chars never reach def.map: X park, P huddle, k (school bike rack / pawn back room) become site data and their `under` tile.
   at = top-left tile; under = tile written for a marker. Tile changes against the SPEC3 table are listed in docs (worker report):
   walnut is the real house at x58-62 (the table's x57-61 is one tile off), parkride moved east of Dad's Auto (the chop shop lot fills the chain-link ring),
   pawn takes rows z10-18 of the mart block's west end (z16-18 alone has no room for a back room). */
const NEW_SITES={
  school:{at:[63,1],wall:'#b5654a',floor:',',under:{X:',',P:'s',k:','},map:[ // Maple Heights Elementary: building x65-78, bike pad x63-64, drop-off lane on z5
   ",,AAAAAAAAAAAAAAgg",
   "k,AAAAAAAAAAAAAAgg",
   ",,AAAAAAAAAAAAAAgg",
   "sslsssssPsssssslst",
   "ss,,,X,,,,,,,,,,ss"]},
  walnut:{at:[57,24],wall:'#d9c7a3',floor:'.',under:{X:',',P:'g'},map:[ // 1418 Walnut Dr: house x60-62, open garage x58-59 (walls are colliders), driveway x57
   "Pggggt",
   ",..hhh",
   "X.Ihhh",
   ",I.hhh",
   "gggggg"]},
  storage:{at:[104,66],wall:'#a9b0b3',floor:',',under:{X:',',P:','},map:[ // Discount Storage Unlimited: rows A/B/C of roll-up units, office, gate on Industrial Way (north side: the chop shop's fence)
   "z,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,z",
   "z,##########################,,,z",
   "z,##########################,,,z",
   "z,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,z",
   "z,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,z",
   "z,,,########################,,,z",
   "z,,,########################,,,z",
   ",P,,,,,,,,,,,,,,,,,,,,,,,,,,,,,z",
   ",,X,,,,,,,,,,,,,,,,,,,,,,,,,,,,z",
   "z##.###,####################,,,z",
   "z#....#,####################,,,z",
   "z######zzzzzzzzzzzzzzzzzzzzzzzzz"]},
  parkride:{at:[129,27],wall:'#9aa0a6',floor:',',under:{X:',',P:','},map:[ // Route 9 Park & Ride: 24 bays, gate on the west into Dad's Auto lot
   "zzzzzzzzzzz",
   "z,,,,,,,,,z","z,,,,,,,,,z","z,,,,,,,,,z",
   ",,P,,,,,,,z",
   ",X,,,,,,,,z",
   "z,,,,,,,,,z","z,,,,,,,,,z","z,,,,,,,,,z","z,,,,,,,,,z","z,,,,,,,,,z","z,,,,,,,,,z","z,,,,,,,,,z","z,,,,,,,,,z","z,,,,,,,,,z","z,,,,,,,,,z",
   "zzzzzzzzzzz"]},
  pawn:{at:[176,10],wall:'#b9a98f',floor:'.',under:{k:'.'},park:[179,20],huddle:[177,19],map:[ // Cash-4-Yer-Stuff: back lot, back office (k), staff door, shop floor, front doors on Main St
   ",,,,,,",
   ",,,,,,",
   "######",
   "#kkkk#",
   "#kkkk#",
   "##.###",
   "#....#",
   "#....#",
   "##..##"]},
  millshop:{at:[208,52],wall:'#8a8f93',floor:'.',under:{X:',',P:','},map:[ // Mill St Auto Recovery: office, shop bay on Mill St, tow yard, gate on Dock St
   "#####..####",
   "#...#.....#",
   "#...#....c#",
   "##.##...###",
   "z,,,,P,,,,z",
   "z,,,,,,,,,z",
   "z,,,,X,,,,z",
   "z,,,,,,,,,z",
   "zzzz,,,zzzz"]},
  market:{box:[175,19,203,23],wall:'#888',floor:',',park:[189,25],huddle:[187,23]},     // Main St, Saturday mornings: props only
  roof:{box:[208,24,219,29],wall:'#cfd8cf',floor:',',park:[221,27],huddle:[219,27]}};    // the Community Center (places.center) roof, ladder on the east wall
const NEW_META={school:{place:'Maple Heights Elementary, Oak St',hood:'maple'},walnut:{place:'1418 Walnut Dr',hood:'maple'},
  storage:{place:'Discount Storage Unlimited, Industrial Way',hood:'route9'},parkride:{place:'Route 9 Park & Ride',hood:'route9'},
  pawn:{place:'Cash-4-Yer-Stuff, Main St',hood:'river'},millshop:{place:'Mill St Auto Recovery',hood:'river'},
  market:{place:"Riverside Farmers' Market, Main St",hood:'river'},roof:{place:'Community Center roof',hood:'river'}};
const NEW_AFTER={pawn:'RAMOS BAKERY',millshop:'UNDER NEW MANAGEMENT · CALL SAL · HONEST TOWING'};
const ROOF_Y=7;
/* bus stops (Earl's Shortcuts perk): sidewalk tiles beside Riverside intersections; face = direction of the road from the stop */
const BUS_STOPS=[['bus1',160,19,[0,1],'Bus stop · Main St & River Rd'],['bus2',201,23,[0,-1],'Bus stop · Main St & 4th St'],
  ['bus3',176,47,[0,1],'Bus stop · Mill St & 2nd St'],['bus4',209,65,[0,-1],'Bus stop · Dock St & 4th St']];

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function shuffle(arr,rnd){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const pt=(x,z,extra)=>Object.assign({tx:x,tz:z,x:tc(x),z:tc(z)},extra||{});

/* ---------- the generator (SPEC2 A.2, plus the four Maple giver markers 1-4 from the old HUB) ---------- */
function generate(maps){
  const g=[...Array(H)].map(()=>Array(W).fill('g'));
  const inb=(x,z)=>x>=0&&z>=0&&x<W&&z<H;
  const set=(x,z,c)=>{if(inb(x,z))g[z][x]=c};
  const rect=(x0,z0,x1,z1,c)=>{for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)set(x,z,c)};
  const roads=[],road=(o,k,a,b,name)=>roads.push({o,k,a,b,name});
  for(const[z,n]of[[6,'Oak St'],[34,'Elm St']])road('h',z,1,99,n);
  road('h',20,1,230,'Maple Ave / Route 9 / Main St');
  road('h',47,1,99,'Birch St');
  for(const[x,n]of[[6,'Cedar Ln'],[30,'Linden Ave'],[53,'Walnut Dr'],[88,'Ridgeview Dr']])road('v',x,1,49,n);
  road('v',100,20,77,'Industrial Way');
  for(const[z,n]of[[6,'Oak St'],[34,'Ash St'],[48,'Mill St'],[62,'Dock St']])road('h',z,154,230,n);
  for(const[x,n]of[[156,'River Rd'],[172,'2nd St'],[188,'3rd St'],[204,'4th St'],[220,'5th St']])road('v',x,1,78,n);
  for(const r of roads){if(r.o==='h')rect(r.a,r.k-1,r.b,r.k+3,'s');else rect(r.k-1,r.a,r.k+3,r.b,'s')}
  for(const r of roads){if(r.o==='h')rect(r.a,r.k,r.b,r.k+2,',');else rect(r.k,r.a,r.k+2,r.b,',')}
  for(const[x0,x1]of[[10,28],[34,51],[57,86]])for(const[z0,z1]of[[1,3],[11,13],[15,17],[25,27],[29,31],[38,40],[42,44]])
    for(let x=x0+1;x+4<=x1;x+=6)rect(x,z0,x+4,z1,'h');
  for(const z of[4,10,18,24,32,41,45])for(const x of[16,22,40,46,62,68,74,80])if(g[z][x]==='g')set(x,z,'t');
  for(let z=2;z<50;z+=3){if(g[z][2]==='g')set(2,z,'t')}
  for(let z=1;z<H-1;z+=2)for(const x of[93,96])if(g[z][x]==='g')set(x,z,'t');
  rect(142,0,151,H-1,'~');
  for(let z=1;z<H-1;z+=2){set(140,z,'t');set(153,z+1,'t')}
  rect(142,19,151,19,'|');rect(142,23,151,23,'|');rect(140,20,153,22,',');rect(142,20,151,22,'=');
  set(141,20,'!');set(141,21,'!');set(141,22,'!');
  const buildings=[],B=(kind,x0,z0,x1,z1,o)=>{rect(x0,z0,x1,z1,kind);buildings.push({kind,x0,z0,x1,z1,...o})};
  rect(104,7,123,18,',');
  B('A',115,8,122,11,{id:'gas',sign:'FILL-ER-UP · GAS · SNACKS · BAIT',face:'s',col:'#d9d2c0'});
  for(const[x,z]of[[107,12],[107,15],[111,12],[111,15]])set(x,z,'G');
  rect(104,24,128,39,',');
  B('A',105,30,116,36,{id:'auto',sign:"DAD'S AUTO · SINCE 1987 · WE FIX IT RIGHT",face:'n',col:'#c7c2b5'});
  const colX=[[160,170],[176,186],[192,202],[208,218]],rowZ=[[10,18],[24,32],[38,46],[52,60]];
  const special=new Set(['0,0','1,0','2,0','3,0','0,1','1,1','3,1','2,2','3,2','3,3']);   /* 3,3 = Mill St Auto Recovery (SPEC3) */
  colX.forEach(([x0,x1],ci)=>rowZ.forEach(([z0,z1],ri)=>{if(special.has(ci+','+ri))return;
    rect(x0,z0,x1,z0+2,'r');rect(x0,z1-2,x1,z1,'r');rect(x0,z0+4,x1,z0+4,'z');
    for(let x=x0+1;x<=x1;x+=3){if(g[z0-1][x]==='s')set(x,z0-1,'p');if(g[z1+1][x]==='s')set(x,z1+1,'p')}}));
  B('A',160,10,170,15,{id:'church',sign:'RIVERSIDE COMMUNITY CHURCH & YOUTH CENTER',face:'s',col:'#d8cfc0'});rect(160,16,170,18,'g');
  rect(176,10,186,18,'r');rect(176,13,186,15,'g');B('A',182,16,186,18,{id:'mart',sign:'RAMOS CORNER MART',face:'s',col:'#e1b866'});
  rect(192,10,202,18,'z');rect(193,11,201,17,'b');set(197,10,',');set(197,18,',');
  rect(208,10,218,18,',');B('A',210,10,217,13,{id:'benny',sign:"BENNY'S BRAIN FREEZE · DEPOT",face:'s',col:'#f0e6f0'});
  B('A',208,24,218,29,{id:'center',sign:'RIVERSIDE FLATS COMMUNITY CENTER',face:'s',col:'#cfd8cf'});rect(208,30,218,32,'g');
  rect(160,66,218,78,'x');
  for(let x=160;x<=218;x+=1)if((x-160)%12>=10)rect(x,66,x,78,',');
  rect(154,66,158,78,'g');for(let z=67;z<78;z+=3)for(let x=106;x<139;x+=5)set(x+(z%2)*2,z,'t');rect(224,1,230,78,'g');for(let z=2;z<H-1;z+=3)set(227,z,'t');
  const sites={};
  const stamp=(id,x0,z0,gate)=>{const mp=maps[id].map,h=mp.length,w=mp[0].length;
    for(let z=0;z<h;z++)for(let x=0;x<w;x++){let c=mp[z][x];
      if(c==='P'){sites[id]={...(sites[id]||{}),huddle:{x:x0+x,z:z0+z}};c=maps[id].floor}
      if(c==='X'){sites[id]={...(sites[id]||{}),park:{x:x0+x,z:z0+z}};c=','}
      set(x0+x,z0+z,c)}
    if(gate)for(const[gx,gz]of gate)set(x0+gx,z0+gz,',');
    sites[id]={...sites[id],id,x0,z0,x1:x0+w-1,z1:z0+h-1}};
  stamp('rick',1,51,[[2,0],[3,0],[4,0],[5,0]]);
  stamp('dave',31,51,[[13,0],[14,0],[15,0],[16,0]]);sites.dave.park={x:45,z:48};
  stamp('doug',62,51,[[2,0],[3,0],[4,0],[5,0]]);
  rect(104,44,135,65,'z');stamp('gary',105,45);
  for(let z=45;z<=48;z++)set(104,z,',');
  stamp('earl',160,66);
  set(172,65,',');
  rect(160,24,186,32,',');stamp('dee',160,24);
  rect(192,38,218,46,'g');stamp('rosa',192,38);
  stamp('duke',192,66);
  /* SPEC3 small sites */
  for(const id in NEW_SITES){const ns=NEW_SITES[id];
    if(ns.map){const[x0,z0]=ns.at,marks={};
      for(let z=0;z<ns.map.length;z++)for(let x=0;x<ns.map[z].length;x++){let c=ns.map[z][x];const X=x0+x,Z=z0+z;
        if(c==='P'){sites[id]={...(sites[id]||{}),huddle:{x:X,z:Z}};c=ns.under.P}
        else if(c==='X'){sites[id]={...(sites[id]||{}),park:{x:X,z:Z}};c=ns.under.X}
        else if(ns.under[c]){(marks[c]||(marks[c]=[])).push({x:X,z:Z});c=ns.under[c]}
        set(X,Z,c)}
      sites[id]={...(sites[id]||{}),id,x0,z0,x1:x0+ns.map[0].length-1,z1:z0+ns.map.length-1,marks,isNew:true}}
    else{const[x0,z0,x1,z1]=ns.box;sites[id]={id,x0,z0,x1,z1,marks:{},isNew:true}}
    if(ns.park)sites[id].park={x:ns.park[0],z:ns.park[1]};if(ns.huddle)sites[id].huddle={x:ns.huddle[0],z:ns.huddle[1]}}
  B('A',65,1,78,3,{id:'school',sign:'MAPLE HEIGHTS ELEMENTARY',face:'s',col:'#b5654a',custom:true});
  B('A',104,2,111,6,{id:'ortho',sign:'BRACE YOURSELF ORTHODONTICS',face:'s',col:'#e6eef0'});
  {const c=buildings.find(b=>b.id==='center');c.roofY=ROOF_Y;c.parapet=.9}
  for(let x=0;x<W;x++){if(g[0][x]!=='~')g[0][x]='t';if(g[H-1][x]!=='~')g[H-1][x]='t'}for(let z=0;z<H;z++){g[z][0]='t';g[z][W-1]='t'}
  for(const r of roads){for(let i=r.a+3;i<r.b-1;i+=8){
    if(r.o==='h'){for(const z of[r.k-1,r.k+3])if(g[z]&&g[z][i]==='s')set(i,z,'l')}else{for(const x of[r.k-1,r.k+3])if(g[i]&&g[i][x]==='s')set(x,i,'l')}}}
  [['P',15,9],['D',19,7],['H',19,10],['R',25,4],['V',25,6],['V',44,22],['V',12,36],['V',48,8],['U',110,29],['V',165,8],['V',213,36],['V',183,50],
   ['1',13,10],['2',37,24],['3',20,32],['4',44,18]].forEach(([c,x,z])=>set(x,z,c));
  return{g,roads,buildings,sites};
}

const PLACES={
  home:{x:19,z:7,yaw:-Math.PI/2,label:'Home',hood:'maple',pin:true},
  hank:{x:22,z:8,yaw:-Math.PI/2,label:"Hank's Hardware",hood:'maple',pin:true},
  auto:{x:110,z:27,yaw:Math.PI,label:"Dad's Auto",hood:'route9',pin:true},
  gas:{x:113,z:14,yaw:-Math.PI/2,label:'Fill-Er-Up',hood:'route9',pin:true},
  center:{x:213,z:22,yaw:-Math.PI/2,label:'Community Center',hood:'river',pin:true},
  mart:{x:184,z:21,yaw:-Math.PI/2,label:'Ramos Corner Mart',hood:'river',pin:true},
  autoBay:{x:110,z:28},
  sale_workvan:{x:120,z:28,yaw:Math.PI/2},sale_pickup:{x:123,z:28,yaw:Math.PI/2},sale_suv:{x:126,z:28,yaw:Math.PI/2},
  g_gary:{x:13,z:10},g_rick:{x:37,z:24},g_dave:{x:20,z:32},g_doug:{x:44,z:18},
  g_earl:{x:165,z:35},g_dee:{x:165,z:19},g_rosa:{x:205,z:40},g_benny:{x:213,z:15},
  stake:{x:170,z:21},
};
const SITE_META={gary:{place:'Chop shop, Industrial Way',hood:'route9'},rick:{place:'The old duplex on Birch',hood:'maple'},dave:{place:'Linden Park',hood:'maple'},
  doug:{place:'The compound on Ridgeview',hood:'maple'},earl:{place:'The Spoke Shop, Dock St',hood:'river'},dee:{place:'Spin City Laundromat, Main St',hood:'river'},
  rosa:{place:'Riverside Community Garden',hood:'river'},duke:{place:'The scrapyard on Dock St',hood:'river'}};
const SITE_AFTER={gary:'INDUSTRIAL WAY CLIMBING GYM',rick:'SOLD',dave:'BOUNCE HOUSE STAYS UP ALL SUMMER',doug:'FUTURE HOME OF RIDGEVIEW T-BALL',
  earl:'FREE BIKE LIBRARY · RETURN BY SUNDAY',dee:'SPIN CITY · UNDER NEW MANAGEMENT · YOUTH GROUP FOLDS ON TUESDAYS',rosa:'(garden blooms one tier early)',duke:'SECOND GEAR AUTO SCHOOL'};

/* Riverside trust tiers (SPEC2 A.7). Cumulative. */
const TIERS=[
  {t:0, neighbours:0, line:'Riverside Flats. People keep their blinds down here.'},
  {t:20,neighbours:4, line:'Somebody put the trash out on the right day.'},
  {t:35,neighbours:10,line:'The street lights on Ash St are back on.'},
  {t:50,neighbours:18,line:'Kids are drawing on the sidewalk again. One of them drew you.'},
  {t:70,neighbours:28,line:'Riverside Flats. People wave at the minivan.'},
  {t:90,neighbours:28,line:'Your van has its own parking spot at the block party.'}];
const FLAGS={nets:35,kids:35,chalk:50,churchSign:50,awning:50,gardenSeedlings:50,mural:70,flowerBoxes:70,stringLights:70,gardenBloom:70,waving:70,iceCreamTruck:70,banner:90,picnic:90};
const LAMP_SPLIT=[[0,.30],[20,.20],[35,.20],[50,.30]];   // brokenUntil value, share of Riverside lamps

/* ---------- helpers on a built grid ---------- */
function runs(g,ch,axis){/* contiguous runs of ch. axis 'h': per row; 'v': per column. returns [{x0,z0,x1,z1}] */
  const out=[];if(axis==='h'){for(let z=0;z<H;z++){let x=0;while(x<W){if(g[z][x]===ch){const s=x;while(x<W&&g[z][x]===ch)x++;out.push({x0:s,z0:z,x1:x-1,z1:z})}else x++}}}
  else{for(let x=0;x<W;x++){let z=0;while(z<H){if(g[z][x]===ch){const s=z;while(z<H&&g[z][x]===ch)z++;out.push({x0:x,z0:s,x1:x,z1:z-1})}else z++}}}return out}
function blocks(g,ch){/* same merge as buildLevel's 'h' loop: x-run on the first row, then extend down */
  const seen=new Uint8Array(W*H),out=[];for(let z=0;z<H;z++)for(let x=0;x<W;x++){if(g[z][x]!==ch||seen[z*W+x])continue;let x1=x;while(x1<W&&g[z][x1]===ch)x1++;let z1=z;while(z1<H&&g[z1][x]===ch)z1++;
    for(let zz=z;zz<z1;zz++)for(let xx=x;xx<x1;xx++)seen[zz*W+xx]=1;out.push({x0:x,z0:z,x1:x1-1,z1:z1-1})}return out}
function fenceRuns(g,ch){/* horizontal runs for tiles with an east/west neighbour, vertical runs for the rest */
  const h=runs(g,ch,'h').filter(r=>r.x1>r.x0),inH=new Set();for(const r of h)for(let x=r.x0;x<=r.x1;x++)inH.add(r.z0*W+x);
  const v=runs(g,ch,'v').flatMap(r=>{const out=[];let s=null;for(let z=r.z0;z<=r.z1;z++){const free=!inH.has(z*W+r.x0);if(free&&s===null)s=z;if((!free||z===r.z1)&&s!==null){out.push({x0:r.x0,z0:s,x1:r.x0,z1:free?z:z-1});s=null}}return out});
  return[...h.map(r=>({...r,o:'h'})),...v.map(r=>({...r,o:'v'}))]}
const N4=[[1,0],[-1,0],[0,1],[0,-1]],N8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
function groundAt(g,x,z,floor){const c=g[z][x];if(COLCH.includes(c))return c;if(c==='b'||c==='='||c==='~')return c;
  if(c==='h'||c==='t'||c==='f'||c==='r'||c==='x'||c==='A')return 'g';
  if(c==='l'||c==='p')return 's';if('DVU!G|'.includes(c))return ',';
  const n={};for(const[dx,dz]of N8){const cc=g[z+dz]&&g[z+dz][x+dx];if(cc&&COLCH.includes(cc))n[cc]=(n[cc]||0)+1}
  let best=floor,bn=0;for(const k in n)if(n[k]>bn){bn=n[k];best=k}return best}
const yawOf=(dx,dz)=>Math.atan2(-dx,-dz);   // game convention: forward = (-sin yaw, -cos yaw)
function hoodOfTile(t){return t<=HOODS.maple.tx1?'maple':t<=HOODS.route9.tx1?'route9':'river'}

/* SPEC3 site data the jobs need (metres unless a field says tiles). solids: extra static colliders {x0,z0,x1,z1,ph,h?,k} that js/openworld.js adds */
function siteExtras(id,S,marks,g,buildings){const T=TILE,box=(x0,z0,x1,z1)=>({x0:x0*T,z0:z0*T,x1:(x1+1)*T,z1:(z1+1)*T,tx0:x0,tz0:z0,tx1:x1,tz1:z1});const o={solids:[]};
  if(id==='school'){const k=marks.k[0];o.building=box(65,1,78,3);o.door={x:144,z:8,face:[0,1]};
    o.rack={x:tc(k.x),z:tc(k.z),tx:k.x,tz:k.z,yaw:0,len:5.2,pad:box(63,1,64,3),slots:[0,1,2,3,4,5].map(i=>({x:tc(k.x),z:2.8+i*.95,yaw:Math.PI/2}))};
    o.crossing={x0:142.6,x1:145.4,z0:10,z1:18,a:{x:144,z:9},b:{x:144,z:19}};o.guard={x:146.6,z:19.2,yaw:0};
    o.loop={lane:box(65,5,78,5),enter:{x:tc(78),z:tc(5),yaw:Math.PI/2},stop:{x:144,z:tc(5),yaw:Math.PI/2},exit:{x:tc(65),z:tc(5),yaw:Math.PI/2}};
    o.flag={x:tc(79)+.4,z:4.6};o.solids.push({x0:158.5,z0:6.0,x1:161.5,z1:6.9,ph:1.55,h:1.55,k:'sign'},{x0:159.25,z0:2.65,x1:159.55,z1:2.95,ph:8,k:'pole'})}
  else if(id==='walnut'){o.address='1418 Walnut Dr';o.house=box(60,25,62,27);o.garage={...box(58,25,59,27),door:{x:116,z:53,face:[-1,0],w:3.4},roofY:2.9};o.driveway=box(57,25,57,27);
    o.saleSign={x:125.2,z:49,yaw:0};o.solids.push({x0:116,z0:50,x1:120,z1:50.3,ph:2.9,k:'wall'},{x0:116,z0:55.7,x1:120,z1:56,ph:2.9,k:'wall'})}
  else if(id==='storage'){const U=[];const row=(r,tx0,n,z,face,first)=>{for(let i=0;i<n;i++){const x0=tx0+2*i,cx=x0*T+2;U.push({n:first+i,row:r,x:cx,z,face,w:4,tx0:x0,tx1:x0+1,front:{x:cx,z:z+face[1]*1.2}})}};
    row('A',106,13,138,[0,1],1);row('B',108,12,142,[0,-1],14);row('B',108,12,146,[0,1],26);row('C',112,10,150,[0,-1],38);
    o.units=U;o.unit47=U.find(u=>u.n===47);o.office={...box(105,75,110,77),inside:box(106,76,109,76),door:{x:tc(107),z:tc(75)},laptop:{x:tc(109),z:tc(76)}};
    o.gate={tiles:[[104,73],[104,74]],x:208,z:148,w:4,keypad:{x:207.2,z:145.6}};o.board={x:tc(109),z:149.8,face:[0,-1]};
    o.dock={x0:264,z0:142,x1:265.6,z1:146,h:1.2,face:[1,0]};o.solids.push({x0:264,z0:142,x1:265.6,z1:146,ph:1.2,h:1.2,k:'dock'});
    o.solids.push({x0:269.1,z0:139.8,x1:269.5,z1:140.2,ph:7,k:'lamp'},{x0:269.1,z0:151.8,x1:269.5,z1:152.2,ph:7,k:'lamp'});
    o.cameras=[{x:209.6,z:133.6,y:3.4,yaw:yawOf(1,1)},{x:270.4,z:133.6,y:3.4,yaw:yawOf(-1,1)},{x:270.4,z:153.4,y:3.4,yaw:yawOf(-1,-1)},{x:221.6,z:150.2,y:3.6,yaw:yawOf(0,-1)}]}
  else if(id==='parkride'){const bays=[];[[58.25,0],[68.75,Math.PI],[73.25,0],[83.75,Math.PI]].forEach(([z,yaw],r)=>{for(let k=0;k<6;k++)bays.push({i:bays.length,row:r,x:264.25+2.5*k,z,yaw,w:2.5,d:4.5})});
    o.bays=bays;o.lot={x0:260,z0:56,x1:278,z1:86};o.gate={tiles:[[129,31],[129,32]],x:259,z:64,w:4,barrier:{x:259.4,z:61.9}};o.booth={x:261.6,z:58.3};
    o.solids.push({x0:260.6,z0:57,x1:262.6,z1:59.6,ph:2.6,k:'booth'})}
  else if(id==='pawn'){o.backroom=box(177,13,180,14);o.floor=box(177,16,180,17);o.staffDoor={x:tc(178),z:tc(15)};o.door={x:358,z:38,face:[0,1],w:4};
    o.desk={x:tc(180),z:tc(13)};o.sign={x:358,z:38.06,y:3.05,face:[0,1],w:9};o.backLot=box(176,10,181,11);
    o.solids.push({x0:358.4,z0:32.2,x1:361.75,z1:32.9,ph:1.1,h:1.1,k:'counter'},{x0:354,z0:32.4,x1:354.6,z1:35.6,ph:2,k:'shelf'},
      {x0:359.8,z0:26,x1:361.9,z1:26.7,ph:.8,h:.8,k:'table'},{x0:361.25,z0:27.1,x1:361.85,z1:27.75,ph:.8,h:.8,k:'safe'})}
  else if(id==='millshop'){o.office=box(209,53,211,54);o.shop=box(213,53,217,54);o.yard=box(209,56,217,59);o.door={x:428,z:104,face:[0,-1],w:4};o.officeDoor={x:tc(210),z:tc(55)};
    o.gate={tiles:[[212,60],[213,60],[214,60]],x:427,z:121,w:6};o.sign={x:427,z:103.94,y:3.05,face:[0,-1],w:9};
    o.trucks=[{x:421.5,z:113.4,yaw:-Math.PI/2},{x:432.5,z:113.4,yaw:Math.PI/2},{x:421.5,z:118.6,yaw:-Math.PI/2},{x:432.5,z:118.6,yaw:Math.PI/2}];
    o.dogBed={x:432.2,z:108.9};o.vault={x:437,z:116,face:[1,0]}}
  else if(id==='market'){const st=[];for(const[z,yaw]of[[tc(20),yawOf(0,1)],[tc(22),yawOf(0,-1)]])for(const x of[177,180,183,186,192,195,198,201])st.push({x:tc(x),z,yaw});
    o.stalls=st;o.closures=[{x:351,z:43,yaw:Math.PI/2,w:6},{x:407,z:43,yaw:Math.PI/2,w:6}];o.street=box(175,20,203,22)}
  else if(id==='roof'){const b=buildings.find(q=>q.id==='center');o.building=box(b.x0,b.z0,b.x1,b.z1);o.roofY=ROOF_Y;o.parapet=b.parapet;
    o.roof={x0:b.x0*T+.35,z0:b.z0*T+.35,x1:(b.x1+1)*T-.35,z1:(b.z1+1)*T-.35,y:ROOF_Y};
    o.ladder={x:(b.x1+1)*T+.15,z:tc(27),tx:b.x1+1,tz:27,yaw:Math.PI/2,h:ROOF_Y+b.parapet,bottom:{x:tc(b.x1+1),z:tc(27)},top:{x:(b.x1+1)*T-1.2,y:ROOF_Y,z:tc(27)}};
    o.overlook={x:(b.x0+b.x1+1)*T/2,z:b.z0*T+.8,y:ROOF_Y,yaw:0}}
  return o}

/* graffiti tags (SPEC2 A.7): 48 street faces in Riverside, deterministic */
function genTags(g,seed){const rnd=mulberry32(seed),cand=[];
  for(let z=1;z<H-1;z++)for(let x=152;x<W-1;x++){const c=g[z][x];if(!'rxAz'.includes(c))continue;
    for(const[dx,dz]of N4){const n=g[z+dz][x+dx];if('sp,'.includes(n)){cand.push({x,z,dx,dz,c});break}}}
  const picked=[],CLR=[20,35,35,50,50,70];
  for(const c of shuffle(cand,rnd)){if(picked.length>=48)break;if(picked.some(p=>Math.abs(p.x-c.x)+Math.abs(p.z-c.z)<4))continue;picked.push(c)}
  return picked.map((c,i)=>{const half=c.c==='z'?.5:1,off=c.c==='z'?0:TILE/2+.01;
    return{id:'tag'+i,tx:c.x,tz:c.z,face:[c.dx,c.dz],kind:c.c,x:tc(c.x)+c.dx*off,y:c.c==='z'?1.1:1.2+rnd()*1.2,z:tc(c.z)+c.dz*off,ry:yawOf(-c.dx,-c.dz),
      w:(1.6+rnd()*.8)*half,h:(.7+rnd()*.4)*half,design:Math.floor(rnd()*8),clearAt:CLR[Math.floor(rnd()*CLR.length)]}})}

/* ---------- build ---------- */
let LAST=null;
function build(opts){opts=opts||{};
  const maps={};for(const k in MAPS)maps[k]={...MAPS[k]};
  for(const m of opts.missions||[])if(m&&m.id&&m.map&&maps[m.id])maps[m.id]={...maps[m.id],map:m.map,floor:m.floor||maps[m.id].floor,wall:m.wall||maps[m.id].wall};
  const save=opts.save||null;
  const bridgeOpen=opts.bridgeOpen!=null?!!opts.bridgeOpen:!!(save&&((save.world&&save.world.bridgeOpen)||(save.prog&&save.prog.done&&save.prog.done[BRIDGE_UNLOCK_JOB])));
  const G=generate(maps),g=G.g;
  const barricade=[];for(let z=0;z<H;z++)for(let x=0;x<W;x++)if(g[z][x]==='!')barricade.push(pt(x,z));
  if(bridgeOpen)for(const b of barricade)g[b.tz][b.tx]=',';
  const rnd=mulberry32(1987);
  /* sites: rectangles, rings, entity lists */
  const sites={};
  for(const id in G.sites){const s=G.sites[id],m=maps[id]||NEW_SITES[id];
    const S={id,...(SITE_META[id]||NEW_META[id]),wall:m.wall,after:SITE_AFTER[id]||NEW_AFTER[id]||null,x0:s.x0,z0:s.z0,x1:s.x1,z1:s.z1,
      box:{x0:s.x0*TILE,z0:s.z0*TILE,x1:(s.x1+1)*TILE,z1:(s.z1+1)*TILE},win:{x0:s.x0-6,z0:s.z0-6,x1:s.x1+6,z1:s.z1+6},
      park:pt(s.park.x,s.park.z),huddle:pt(s.huddle.x,s.huddle.z),ring:{x:tc(s.park.x),z:tc(s.park.z),r:4},
      spawns:[],items:[],bonus:[],stashes:[],ammo:[],waveSpawns:[],grill:null,bounce:null,getaway:null,beds:[]};
    if(id==='dee')S.stake=pt(PLACES.stake.x,PLACES.stake.z,{ring:{x:tc(PLACES.stake.x),z:tc(PLACES.stake.z),r:4}});
    for(let z=s.z0;z<=s.z1;z++)for(let x=s.x0;x<=s.x1;x++){const c=g[z][x];
      if(c==='E'||c==='B')S.spawns.push(pt(x,z,{boss:c==='B'}));else if(c==='I')S.items.push(pt(x,z));else if(c==='i')S.bonus.push(pt(x,z));
      else if(c==='T')S.stashes.push(pt(x,z));else if(c==='a')S.ammo.push(pt(x,z));else if(c==='S')S.waveSpawns.push(pt(x,z));
      else if(c==='Q'){S.grill=pt(x,z);S.bounce={x:tc(x),z:tc(z)+9}}else if(c==='&')S.grill=pt(x,z,{shed:true});else if(c==='v')S.getaway=pt(x,z)}
    sites[id]=S}
  for(const id in NEW_SITES)Object.assign(sites[id],siteExtras(id,sites[id],G.sites[id].marks,g,G.buildings));
  /* garden beds: horizontal runs of 'o' */
  const beds=runs(g,'o','h').map((r,i)=>({id:'bed'+i,...r,x:(tc(r.x0)+tc(r.x1))/2,z:tc(r.z0),tiles:r.x1-r.x0+1}));
  sites.rosa.beds=beds.filter(b=>b.x0>=sites.rosa.x0&&b.x1<=sites.rosa.x1&&b.z0>=sites.rosa.z0&&b.z0<=sites.rosa.z1).map(b=>b.id);
  /* places, doors, starts */
  const places={};for(const k in PLACES){const p=PLACES[k];places[k]={...p,tx:p.x,tz:p.z,x:tc(p.x),z:tc(p.z)}}
  /* SPEC3: the orthodontist (a business pin on the Fill-Er-Up lot), Riverside bus stops (Earl's perk), each new site's door / giver spot */
  places.ortho={x:tc(108),z:tc(8),tx:108,tz:8,yaw:-Math.PI/2,label:'Brace Yourself Orthodontics',hood:'route9',pin:true,door:pt(107,7)};
  for(const[id,x,z,f,label]of BUS_STOPS)places[id]={x:tc(x),z:tc(z),tx:x,tz:z,yaw:yawOf(f[0],f[1]),label,hood:'river',pin:true,bus:true,face:f};
  for(const[id,x,z,label]of[['school',71,4,'Maple Heights Elementary'],['walnut',61,24,'1418 Walnut Dr'],['storage',107,74,'Discount Storage Unlimited'],
    ['parkride',131,31,'Route 9 Park & Ride'],['pawn',178,19,'Cash-4-Yer-Stuff'],['millshop',213,51,'Mill St Auto Recovery'],['market',185,19,"Riverside Farmers' Market"],['roof',219,27,'Community Center roof']])
    places[id]={x:tc(x),z:tc(z),tx:x,tz:z,label,hood:hoodOfTile(x),site:id};
  const find=ch=>{for(let z=0;z<H;z++)for(let x=0;x<W;x++)if(g[z][x]===ch)return pt(x,z);return null};
  const doors={home:find('H'),store:find('R'),auto:find('U')};
  const markers=['1','2','3','4'].map((c,i)=>({i,...find(c)}));
  /* static props */
  const trees=[],lamps=[],crates=[],tables=[],pumps=[],parked=[],porches=[];
  for(let z=0;z<H;z++)for(let x=0;x<W;x++){const c=g[z][x];
    if(c==='t')trees.push(pt(x,z,{v:Math.floor(rnd()*3)}));
    else if(c==='l')lamps.push(pt(x,z,{hood:hoodOfTile(x),brokenUntil:0}));
    else if(c==='c')crates.push(pt(x,z,{v:Math.floor(rnd()*3)}));
    else if(c==='T')tables.push(pt(x,z));
    else if(c==='G')pumps.push(pt(x,z));
    else if(c==='V'){let off=0;if(g[z-1]&&g[z-1][x]==='s')off=-.5;else if(g[z+1]&&g[z+1][x]==='s')off=.5;
      parked.push({tx:x,tz:z,x:tc(x),z:tc(z)+off,yaw:-Math.PI/2,col:['#b9c0c7','#8a2f2a','#2e4a6b','#d8d4c8','#3d4a3a'][Math.floor(rnd()*5)],
        aabb:{x0:tc(x)-2.3,z0:tc(z)+off-1.1,x1:tc(x)+2.3,z1:tc(z)+off+1.1}})}
    else if(c==='p'){let face=null;for(const[dx,dz]of N4)if(g[z+dz]&&g[z+dz][x+dx]==='r'){face=[-dx,-dz];break}
      if(!face)for(const[dx,dz]of N4)if(g[z+2*dz]&&g[z+2*dz][x+2*dx]==='r'){face=[-dx,-dz];break}
      face=face||[0,1];porches.push(pt(x,z,{face,yaw:yawOf(face[0],face[1])}))}}
  /* Riverside lamps: who is broken until which tier */
  {const rl=shuffle(lamps.filter(l=>l.hood==='river'),mulberry32(35));let k=0;
   for(const[val,share]of LAMP_SPLIT){const n=Math.round(share*rl.length);for(let i=0;i<n&&k<rl.length;i++)rl[k++].brokenUntil=val}while(k<rl.length)rl[k++].brokenUntil=50}
  shuffle(porches.map((p,i)=>i),mulberry32(56)).forEach((pi,order)=>porches[pi].order=order);
  /* houses (door side: SPEC.md H rule first, then the side with more sidewalk) */
  const HC=['#d9c7a3','#a9c1cf','#c9a9a0','#b9c9a0','#e0d6c2','#9fb3c8'];
  const sw=(z,x0,x1)=>{let n=0;if(z<0||z>=H)return 0;for(let x=x0;x<=x1;x++)if('sp'.includes(g[z][x]))n++;return n};
  const houses=blocks(g,'h').map(b=>{const north=sw(b.z0-1,b.x0,b.x1)+sw(b.z0-2,b.x0,b.x1),south=sw(b.z1+1,b.x0,b.x1)+sw(b.z1+2,b.x0,b.x1);
    let face=south>=north?'s':'n',home=false;for(let x=b.x0;x<=b.x1;x++)if(g[b.z0-1]&&g[b.z0-1][x]==='H'){face='n';home=true}
    return{...b,face,home,col:home?'#e8d9b0':HC[Math.floor(rnd()*HC.length)],cx:(b.x0+b.x1+1)*TILE/2,cz:(b.z0+b.z1+1)*TILE/2,w:(b.x1-b.x0+1)*TILE,d:(b.z1-b.z0+1)*TILE}});
  /* rowhouse units: 2 tiles wide along the long axis, door on the street side */
  const RC=['#8a4b3a','#9c5b45','#7a4a3f','#a9774f','#6e5a4c'],rowUnits=[];
  for(const b of blocks(g,'r')){const wide=b.x1-b.x0>=b.z1-b.z0,len=wide?b.x1-b.x0+1:b.z1-b.z0+1,n=Math.max(1,Math.floor(len/2));
    const sideA=wide?sw(b.z0-1,b.x0,b.x1)+sw(b.z0-2,b.x0,b.x1):0,sideB=wide?sw(b.z1+1,b.x0,b.x1)+sw(b.z1+2,b.x0,b.x1):0;
    const face=wide?(sideB>=sideA?'s':'n'):'e';
    for(let i=0;i<n;i++){const a=i*2,e=i===n-1?len-1:a+1;const u=wide?{x0:b.x0+a,z0:b.z0,x1:b.x0+e,z1:b.z1}:{x0:b.x0,z0:b.z0+a,x1:b.x1,z1:b.z0+e};
      const porch=porches.find(p=>p.tx>=u.x0&&p.tx<=u.x1&&(p.tz===u.z0-1||p.tz===u.z1+1))||null;
      rowUnits.push({id:'ru'+rowUnits.length,...u,face,col:RC[Math.floor(rnd()*RC.length)],porch:porch?porch.order:null,
        boardedUntil:rnd()<1/3?(rnd()<.5?35:70):0,cx:(u.x0+u.x1+1)*TILE/2,cz:(u.z0+u.z1+1)*TILE/2,w:(u.x1-u.x0+1)*TILE,d:(u.z1-u.z0+1)*TILE})}}
  /* walls per site colour, warehouses, fences, rails, water */
  const siteAt=(x,z)=>{for(const id in sites){const s=sites[id];if(x>=s.x0&&x<=s.x1&&z>=s.z0&&z<=s.z1)return s}return null};
  const walls=runs(g,'#','h').map(r=>({...r,col:(siteAt(r.x0,r.z0)||{wall:'#999'}).wall}));
  const warehouses=blocks(g,'x'),chainlink=fenceRuns(g,'z'),hedges=fenceRuns(g,'f'),rails=runs(g,'|','h');
  const water=blocks(g,'~'),bridge={x0:142,z0:19,x1:151,z1:23,deck:{x0:142,z0:20,x1:151,z1:22}};
  const court={x0:193,z0:11,x1:201,z1:17,hoops:[{x:tc(193)+.4,z:tc(14),yaw:-Math.PI/2},{x:tc(201)-.4,z:tc(14),yaw:Math.PI/2}]};
  /* dressing pools */
  const tags=genTags(g,9);
  const rs=mulberry32(77),rivSidewalk=[];for(let z=1;z<H-1;z++)for(let x=154;x<W-1;x++)if(g[z][x]==='s')rivSidewalk.push(pt(x,z));
  const nearPorch=rivSidewalk.filter(s=>porches.some(p=>Math.abs(p.tx-s.tx)+Math.abs(p.tz-s.tz)<=2&&!(p.tx===s.tx&&p.tz===s.tz)));
  const chalk=shuffle(nearPorch,rs).slice(0,30).map((s,i)=>({id:'chalk'+i,...s,design:Math.floor(rs()*6),yaw:Math.floor(rs()*4)*Math.PI/2,appearAt:50}));
  const trashPool=shuffle(rivSidewalk.filter(s=>!nearPorch.includes(s)),rs);
  const trash=trashPool.slice(0,24).map((s,i)=>({id:'trash'+i,kind:'bag',...s,clearAt:20})).concat(trashPool.slice(24,30).map((s,i)=>({id:'cart'+i,kind:'cart',...s,yaw:rs()*6.28,clearAt:20})));
  /* SPEC3 2.22 Porch Light: Maple house fronts (the tile in front of each neighbour's door) next to the Riverside 'p' porches */
  const housePorches=[];houses.forEach((h,i)=>{if(h.home||(h.z1===3&&h.x0<=25&&h.x1>=25&&g[4][25]==='R'))return;const n=h.face==='s'?1:-1,tz=n>0?h.z1+1:h.z0-1,c=Math.floor((h.x0+h.x1)/2);
    for(const tx of[c,c+1,c-1])if(g[tz]&&!SOLID.includes(g[tz][tx])){housePorches.push(pt(tx,tz,{id:'hp'+housePorches.length,house:i,face:[0,n],yaw:yawOf(0,n),hood:hoodOfTile(tx),kind:'house'}));break}});
  const porchesAll=[...housePorches,...porches.map(p=>({...p,id:'rp'+p.order,hood:'river',kind:'row'}))];
  /* SPEC3 2.18 potholes: 8 on Route 9's lanes, 6 in Riverside (3 on Main St), on asphalt road tiles away from intersections. Deterministic. */
  const potholes=[];{const rp=mulberry32(918),onRoad=(x,z)=>g[z][x]===','&&G.roads.some(r=>r.o==='h'?z>=r.k&&z<=r.k+2&&x>=r.a&&x<=r.b:x>=r.k&&x<=r.k+2&&z>=r.a&&z<=r.b);
    const inter=(x,z)=>{let h=0,v=0;for(const r of G.roads){if(r.o==='h'&&z>=r.k-1&&z<=r.k+3&&x>=r.a&&x<=r.b)h=1;if(r.o==='v'&&x>=r.k-1&&x<=r.k+3&&z>=r.a&&z<=r.b)v=1}return h&&v};
    const pick=(cands,n,gap,hood)=>{let k=0;for(const c of shuffle(cands,rp)){if(k>=n)break;if(potholes.some(p=>Math.abs(p.tx-c[0])+Math.abs(p.tz-c[1])<gap))continue;
      potholes.push({id:'ph'+potholes.length,tx:c[0],tz:c[1],x:+(tc(c[0])+(rp()-.5)*.9).toFixed(2),z:+(tc(c[1])+(rp()-.5)*.9).toFixed(2),r:+(.5+rp()*.3).toFixed(2),hood});k++}};
    const R9c=[],MAIN=[],RIV=[];for(let z=1;z<H-1;z++)for(let x=1;x<W-1;x++){if(!onRoad(x,z)||inter(x,z))continue;
      if(z>=20&&z<=22&&x>=104&&x<=139)R9c.push([x,z]);else if(x>=158){if(z>=20&&z<=22&&x<=200)MAIN.push([x,z]);else RIV.push([x,z])}}
    pick(R9c,8,4,'route9');pick(MAIN,3,8,'river');pick(RIV,3,12,'river')}
  /* chunks */
  const chunks=[];for(let cz=0;cz<CH;cz++)for(let cx=0;cx<CW;cx++){const x0=cx*CHUNK,z0=cz*CHUNK,x1=Math.min(W,x0+CHUNK)-1,z1=Math.min(H,z0+CHUNK)-1;
    chunks.push({i:chunks.length,cx,cz,x0,z0,x1,z1,box:{x0:x0*TILE,z0:z0*TILE,x1:(x1+1)*TILE,z1:(z1+1)*TILE},
      trees:[],lamps:[],houses:[],rowUnits:[],walls:[],warehouses:[],chainlink:[],hedges:[],rails:[],crates:[],tables:[],pumps:[],parked:[],
      buildings:[],water:[],tags:[],chalk:[],trash:[],porches:[],barricade:[],beds:[]})}
  const ci=(t,z)=>Math.floor(z/CHUNK)*CW+Math.floor(t/CHUNK);
  const put=(list,key,f)=>{for(const o of list){const[x,z]=f?f(o):[o.tx,o.tz];chunks[ci(Math.min(W-1,Math.max(0,Math.floor(x))),Math.min(H-1,Math.max(0,Math.floor(z))))][key].push(o)}};
  const mid=o=>[(o.x0+o.x1)/2,(o.z0+o.z1)/2];
  put(trees,'trees');put(lamps,'lamps');put(crates,'crates');put(tables,'tables');put(pumps,'pumps');put(parked,'parked');put(porches,'porches');
  put(houses,'houses',mid);put(rowUnits,'rowUnits',mid);put(walls,'walls',mid);put(warehouses,'warehouses',mid);put(chainlink,'chainlink',mid);
  put(hedges,'hedges',mid);put(rails,'rails',mid);put(G.buildings,'buildings',mid);put(water,'water',mid);put(tags,'tags');put(chalk,'chalk');put(trash,'trash');
  put(bridgeOpen?[]:barricade,'barricade');put(beds,'beds',mid);
  /* ground (colour char per tile, for the per-chunk canvas) */
  const ground=[];for(let z=0;z<H;z++){let r='';for(let x=0;x<W;x++)r+=groundAt(g,x,z,'g');ground.push(r)}
  const def={id:'world',world:true,W,H,TILE,CHUNK,chunksX:CW,chunksZ:CH,pad:'g',floor:'g',inside:'.',wall:'#999',
    map:g.map(r=>r.join('')),ground,roads:G.roads,lines:G.roads.map(r=>[r.o,r.k+1,r.a,r.b]),
    under:{D:',',V:',',l:'s',H:'g',R:'g',U:',',p:'s','!':',',G:',','=':',','|':','},
    solid:SOLID,losblock:LOSBLOCK,hoods:HOODS,bridgeOpen,bridgeUnlockJob:BRIDGE_UNLOCK_JOB,barricade,bridge,
    sites,places,doors,markers,start:pt(15,9),vanStart:pt(19,7,{yaw:-Math.PI/2}),buildings:G.buildings,
    trees,lamps,crates,tables,pumps,parked,porches,houses,rowUnits,walls,warehouses,chainlink,hedges,rails,water,court,beds,
    tags,chalk,trash,tiers:TIERS,flags:FLAGS,chunks,
    potholes,housePorches,porchesAll,newSites:Object.keys(NEW_SITES),roofY:ROOF_Y};
  LAST=def;return def}

/* ---------- queries ---------- */
function regionAt(x,z){return hoodOfTile(tx(x))}
function regionAtTile(t){return hoodOfTile(t)}
function site(id,def){def=def||LAST||build();return def.sites[id]||null}
function siteAt(x,z,def){def=def||LAST;const t=tx(x),u=tx(z);for(const id in def.sites){const s=def.sites[id];if(t>=s.x0&&t<=s.x1&&u>=s.z0&&u<=s.z1)return s}return null}
function chunkIndex(tX,tZ){return Math.floor(tZ/CHUNK)*CW+Math.floor(tX/CHUNK)}
function chunkAt(x,z){return chunkIndex(Math.min(W-1,Math.max(0,tx(x))),Math.min(H-1,Math.max(0,tx(z))))}
function chunksNear(x,z,r,def){def=def||LAST;return def.chunks.filter(c=>{const dx=Math.max(c.box.x0-x,0,x-c.box.x1),dz=Math.max(c.box.z0-z,0,z-c.box.z1);return dx*dx+dz*dz<=r*r}).map(c=>c.i)}
function isSolid(def,t,u){if(t<0||u<0||t>=W||u>=H)return true;return SOLID.includes(def.map[u][t])}
function openBridge(def){def=def||LAST;if(def.bridgeOpen)return def;def.bridgeOpen=true;
  for(const b of def.barricade){const r=def.map[b.tz];def.map[b.tz]=r.slice(0,b.tx)+','+r.slice(b.tx+1);const q=def.ground[b.tz];def.ground[b.tz]=q.slice(0,b.tx)+','+q.slice(b.tx+1)}
  for(const c of def.chunks)c.barricade=[];return def}
function tierOf(t){let k=0;for(let i=0;i<TIERS.length;i++)if(t>=TIERS[i].t)k=i;return k}
/* what is visible at Riverside trust t. scrubbed = ids of tags the player scrubbed. */
function dressing(def,t,scrubbed){def=def||LAST;const sc=new Set(scrubbed||[]),k=tierOf(t);
  const flags={};for(const f in FLAGS)flags[f]=t>=FLAGS[f];
  return{tier:k,line:TIERS[k].line,flags,
    tags:def.tags.filter(g=>t<g.clearAt&&!sc.has(g.id)).map(g=>g.id),
    lampsLit:def.lamps.filter(l=>l.hood!=='river'||t>=l.brokenUntil).map(l=>l.tx+','+l.tz),
    lampsBroken:def.lamps.filter(l=>l.hood==='river'&&t<l.brokenUntil).map(l=>l.tx+','+l.tz),
    trash:def.trash.filter(o=>t<o.clearAt).map(o=>o.id),chalk:t>=50?def.chalk.map(o=>o.id):[],
    boarded:def.rowUnits.filter(u=>t<u.boardedUntil).map(u=>u.id),
    neighbourAnchors:def.porches.filter(p=>p.order<TIERS[k].neighbours).map(p=>p.order),
    garden:t>=70?'bloom':t>=50?'seedlings':'weeds'}}
/* the up-to-n eligible porch anchors nearest to (x,z) within r metres: the neighbour pool */
function neighbourSlots(def,t,x,z,n,r){def=def||LAST;const k=tierOf(t),lim=TIERS[k].neighbours;n=n||10;r=r||50;
  return def.porches.filter(p=>p.order<lim).map(p=>({p,d:Math.hypot(p.x-x,p.z-z)})).filter(o=>o.d<=r).sort((a,b)=>a.d-b.d).slice(0,n).map(o=>o.p)}

HT.World={build,regionAt,regionAtTile,site,siteAt,chunkIndex,chunkAt,chunksNear,isSolid,openBridge,dressing,neighbourSlots,tierOf,genTags:(def,seed)=>genTags(def.map.map(r=>r.split('')),seed),
  get last(){return LAST},TILE,W,H,CHUNK,SOLID,LOSBLOCK,HOODS,TIERS,FLAGS,PLACES,MAPS,NEW_SITES,BUS_STOPS,ROOF_Y,tc,tx,mulberry32};
HT.WorldGen=HT.World;   /* js/world.js (the dressing module) also claims HT.World; the game reads the generator as HT.WorldGen */
if(typeof module!=='undefined'&&module.exports)module.exports=HT.World;
})(typeof window!=='undefined'?window:globalThis);
