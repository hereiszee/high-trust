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
  const special=new Set(['0,0','1,0','2,0','3,0','0,1','1,1','3,1','2,2','3,2']);
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
  for(const id in G.sites){const s=G.sites[id],m=maps[id];
    const S={id,...SITE_META[id],wall:m.wall,after:SITE_AFTER[id],x0:s.x0,z0:s.z0,x1:s.x1,z1:s.z1,
      box:{x0:s.x0*TILE,z0:s.z0*TILE,x1:(s.x1+1)*TILE,z1:(s.z1+1)*TILE},win:{x0:s.x0-6,z0:s.z0-6,x1:s.x1+6,z1:s.z1+6},
      park:pt(s.park.x,s.park.z),huddle:pt(s.huddle.x,s.huddle.z),ring:{x:tc(s.park.x),z:tc(s.park.z),r:4},
      spawns:[],items:[],bonus:[],stashes:[],ammo:[],waveSpawns:[],grill:null,bounce:null,getaway:null,beds:[]};
    if(id==='dee')S.stake=pt(PLACES.stake.x,PLACES.stake.z,{ring:{x:tc(PLACES.stake.x),z:tc(PLACES.stake.z),r:4}});
    for(let z=s.z0;z<=s.z1;z++)for(let x=s.x0;x<=s.x1;x++){const c=g[z][x];
      if(c==='E'||c==='B')S.spawns.push(pt(x,z,{boss:c==='B'}));else if(c==='I')S.items.push(pt(x,z));else if(c==='i')S.bonus.push(pt(x,z));
      else if(c==='T')S.stashes.push(pt(x,z));else if(c==='a')S.ammo.push(pt(x,z));else if(c==='S')S.waveSpawns.push(pt(x,z));
      else if(c==='Q'){S.grill=pt(x,z);S.bounce={x:tc(x),z:tc(z)+9}}else if(c==='&')S.grill=pt(x,z,{shed:true});else if(c==='v')S.getaway=pt(x,z)}
    sites[id]=S}
  /* garden beds: horizontal runs of 'o' */
  const beds=runs(g,'o','h').map((r,i)=>({id:'bed'+i,...r,x:(tc(r.x0)+tc(r.x1))/2,z:tc(r.z0),tiles:r.x1-r.x0+1}));
  sites.rosa.beds=beds.filter(b=>b.x0>=sites.rosa.x0&&b.x1<=sites.rosa.x1&&b.z0>=sites.rosa.z0&&b.z0<=sites.rosa.z1).map(b=>b.id);
  /* places, doors, starts */
  const places={};for(const k in PLACES){const p=PLACES[k];places[k]={...p,tx:p.x,tz:p.z,x:tc(p.x),z:tc(p.z)}}
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
    tags,chalk,trash,tiers:TIERS,flags:FLAGS,chunks};
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
  get last(){return LAST},TILE,W,H,CHUNK,SOLID,LOSBLOCK,HOODS,TIERS,FLAGS,PLACES,MAPS,tc,tx,mulberry32};
HT.WorldGen=HT.World;   /* js/world.js (the dressing module) also claims HT.World; the game reads the generator as HT.WorldGen */
if(typeof module!=='undefined'&&module.exports)module.exports=HT.World;
})(typeof window!=='undefined'?window:globalThis);
