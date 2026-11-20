/* SPEC3 new small sites, pins and potholes in the world generator (docs/design/SPEC3.md section 2 table and 4.0 "New sites").
   node dev/sites.test.js   (also run by node dev/run-tests.js through dev/test-sites.js) */
const assert=require('assert'),{test,suite,done,load}=require('./harness');const HT=load(),Wd=HT.World,R=HT.Roads;
suite('sites');
const open=Wd.build({bridgeOpen:true}),closed=Wd.build({bridgeOpen:false});
const NEW=['school','walnut','storage','parkride','pawn','millshop','market','roof'];
const SOLID=open.solid,W=open.W,H=open.H;
const walk=(d,x,z)=>x>=0&&z>=0&&x<W&&z<H&&!SOLID.includes(d.map[z][x]);
function bfs(def,sx,sz){const seen=new Uint8Array(W*H),q=[sz*W+sx];seen[q[0]]=1;
  while(q.length){const c=q.pop(),x=c%W,z=(c/W)|0;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz;if(!walk(def,nx,nz))continue;const k=nz*W+nx;if(seen[k])continue;seen[k]=1;q.push(k)}}return seen}
const reach=bfs(open,open.vanStart.tx,open.vanStart.tz);
/* snapshot of the world before SPEC3 (sites: x0,z0,x1,z1,park,huddle; places; named buildings; doors; starts) */
const OLD={"S":{"rick":[1,51,28,70,4,53,7,53],"dave":[31,51,60,64,45,48,45,58],"doug":[62,51,90,75,65,53,67,53],"gary":[105,45,134,64,107,46,109,47],"earl":[160,66,185,78,163,67,167,67],"dee":[160,24,186,32,162,24,167,24],"rosa":[192,38,218,46,194,39,197,39],"duke":[192,66,218,78,195,67,200,67]},
  "P":{"home":[19,7],"hank":[22,8],"auto":[110,27],"gas":[113,14],"center":[213,22],"mart":[184,21],"autoBay":[110,28],"sale_workvan":[120,28],"sale_pickup":[123,28],"sale_suv":[126,28],"g_gary":[13,10],"g_rick":[37,24],"g_dave":[20,32],"g_doug":[44,18],"g_earl":[164,33],"g_dee":[165,19],"g_rosa":[205,40],"g_benny":[213,15],"stake":[170,21]},
  "B":{"gas":[115,8,122,11],"auto":[105,30,116,36],"church":[160,10,170,15],"mart":[182,16,186,18],"benny":[210,10,217,13],"center":[208,24,218,29]},
  "doors":{"home":[19,10],"store":[25,4],"auto":[110,29]},"start":[15,9],"van":[19,7]};

test('all 8 new sites exist with the shape the activation code expects',()=>{for(const id of NEW){const s=open.sites[id];assert(s,id);
  for(const k of['box','win','park','huddle','ring','place','hood','wall'])assert(s[k]!=null,id+'.'+k);
  for(const k of['spawns','items','bonus','stashes','ammo','waveSpawns','beds','solids'])assert(Array.isArray(s[k]),id+'.'+k);
  assert.strictEqual(s.ring.r,4);assert.deepStrictEqual(s.box,{x0:s.x0*2,z0:s.z0*2,x1:(s.x1+1)*2,z1:(s.z1+1)*2});assert.deepStrictEqual([s.ring.x,s.ring.z],[s.park.x,s.park.z])}
  assert.deepStrictEqual(open.newSites,NEW)});
test('new site tiles (SPEC3 table; walnut and parkride moved, see the report)',()=>{const b=id=>{const s=open.sites[id];return[s.x0,s.z0,s.x1,s.z1]};
  assert.deepStrictEqual(b('school'),[63,1,80,5]);assert.deepStrictEqual(b('walnut'),[57,24,62,28]);assert.deepStrictEqual(b('storage'),[104,66,135,77]);
  assert.deepStrictEqual(b('parkride'),[129,27,139,43]);assert.deepStrictEqual(b('pawn'),[176,10,181,18]);assert.deepStrictEqual(b('millshop'),[208,52,218,60]);
  assert.deepStrictEqual(b('market'),[175,19,203,23]);assert.deepStrictEqual(b('roof'),[208,24,219,29])});
test('park and huddle spots are walkable and reachable from the driveway (flood fill) and by the GPS',()=>{for(const id of NEW){const s=open.sites[id];
  for(const p of[s.park,s.huddle]){assert(walk(open,p.tx,p.tz),id+' walkable '+p.tx+','+p.tz);assert(reach[p.tz*W+p.tx],id+' reachable '+p.tx+','+p.tz);
    const r=R.gps(open,{x:open.vanStart.x,z:open.vanStart.z},p);assert(r&&r.tiles.length>1,id+' gps')}}});
test('bridge closed: Maple and Route 9 sites reachable, Riverside sites not',()=>{const s=bfs(closed,closed.vanStart.tx,closed.vanStart.tz);
  for(const id of NEW){const p=closed.sites[id].park;assert.strictEqual(!!s[p.tz*W+p.tx],p.tx<152,id)}});
test('no marker chars leak into the map; legend unchanged',()=>{const LEG=new Set(open.map.join(''));for(const c of'kLXP')assert(!LEG.has(c)||c==='P'&&open.map[9][15]==='P',c);
  for(const r of open.ground)for(const ch of r)assert(',.gsb=~'.includes(ch))});
test('every interactive tile in a new site is reachable from its huddle',()=>{for(const id of NEW){const st=open.sites[id];
  for(const p of[...st.spawns,...st.items,...st.bonus,...st.ammo,...st.waveSpawns])assert(reach[p.tz*W+p.tx],id)}
  assert.strictEqual(open.sites.walnut.items.length,2)});
test('school: building, bike rack, drop-off lane, crossing',()=>{const s=open.sites.school;assert.strictEqual(open.map[2][63],',');assert(walk(open,s.rack.tx,s.rack.tz));
  for(let x=65;x<=78;x++){assert.strictEqual(open.map[5][x],',');assert.strictEqual(open.map[2][x],'A')}assert(open.buildings.find(b=>b.id==='school'&&b.custom));
  assert.strictEqual(open.houses.filter(h=>h.z0===1&&h.x0>=63&&h.x1<=80).length,0);assert(s.crossing.a.z<s.crossing.b.z);assert.strictEqual(s.rack.slots.length,6)});
test('walnut: house, open garage with two items, garage walls as colliders',()=>{const s=open.sites.walnut;assert(open.houses.find(h=>h.x0===60&&h.z0===25&&h.x1===62&&h.z1===27));
  for(const p of s.items)assert(p.tx>=58&&p.tx<=59);assert.strictEqual(s.solids.length,2)});
test('storage: 47 roll-up units in rows A/B/C, unit 47 exists, gate and office reachable',()=>{const s=open.sites.storage;assert.strictEqual(s.units.length,47);assert.deepStrictEqual(s.units.map(u=>u.n),[...Array(47)].map((_,i)=>i+1));
  assert.strictEqual(s.unit47.row,'C');for(const u of s.units){const tx=Math.floor(u.front.x/2),tz=Math.floor(u.front.z/2);assert(reach[tz*W+tx],'unit '+u.n);assert.strictEqual(open.map[Math.floor((u.z-u.face[1]*.5)/2)][u.tx0],'#','unit body '+u.n)}
  for(const[x,z]of s.gate.tiles)assert(reach[z*W+x]);const d=s.office.door;assert(reach[Math.floor(d.z/2)*W+Math.floor(d.x/2)])});
test('parkride: 24 bays inside the lot, gate tiles open',()=>{const s=open.sites.parkride;assert.strictEqual(s.bays.length,24);
  for(const b of s.bays){assert(b.x-b.w/2>=s.lot.x0&&b.x+b.w/2<=s.lot.x1&&b.z-b.d/2>=s.lot.z0&&b.z+b.d/2<=s.lot.z1);assert(walk(open,Math.floor(b.x/2),Math.floor(b.z/2)))}
  for(const[x,z]of s.gate.tiles){assert.strictEqual(open.map[z][x],',');assert.strictEqual(open.map[z][x-1],',')}});
test('pawn: storefront and staff-only back room behind a door; millshop: office, shop, yard, gate',()=>{const p=open.sites.pawn;assert.strictEqual(open.map[15][178],'.');
  for(let x=177;x<=180;x++)for(const z of[13,14,16,17])assert.strictEqual(open.map[z][x],'.');assert(reach[13*W+177]);
  const m=open.sites.millshop;for(const[x,z]of m.gate.tiles)assert(reach[z*W+x]);assert(reach[53*W+209]&&reach[53*W+214]);assert.strictEqual(m.trucks.length,4)});
test('roof: the Community Center, roof at 7 m, ladder on the east wall over a sidewalk tile',()=>{const r=open.sites.roof,c=open.buildings.find(b=>b.id==='center');
  assert.strictEqual(r.roofY,7);assert.strictEqual(c.roofY,7);assert.strictEqual(r.ladder.tx,c.x1+1);assert.strictEqual(open.map[r.ladder.tz][r.ladder.tx],'s');assert(reach[r.ladder.tz*W+r.ladder.tx])});
test('market: box only, stalls on Main St, no tile changes',()=>{const m=open.sites.market;assert.strictEqual(m.stalls.length,16);for(const s of m.stalls)assert.strictEqual(open.map[Math.floor(s.z/2)][Math.floor(s.x/2)],',')});
test('potholes: 8 on Route 9, 6 in Riverside, on asphalt road tiles, deterministic',()=>{const P=open.potholes;assert.strictEqual(P.length,14);
  assert.strictEqual(P.filter(p=>p.hood==='route9').length,8);assert.strictEqual(P.filter(p=>p.hood==='river').length,6);
  const roadRect=(x,z)=>open.roads.some(r=>r.o==='h'?z>=r.k&&z<=r.k+2&&x>=r.a&&x<=r.b:x>=r.k&&x<=r.k+2&&z>=r.a&&z<=r.b);
  for(const p of P){const tx=Math.floor(p.x/2),tz=Math.floor(p.z/2);assert.strictEqual(open.map[tz][tx],',',p.id);assert(roadRect(tx,tz),p.id);assert(p.r>=.4&&p.r<=.9)}
  for(const p of P.filter(p=>p.hood==='route9'))assert(p.tz>=20&&p.tz<=22&&p.tx>=100&&p.tx<142);
  assert.deepStrictEqual(Wd.build({bridgeOpen:true}).potholes,P)});
test('pins: orthodontist on the Fill-Er-Up lot, 4 bus stops on Riverside sidewalks next to road nodes, a place per new site',()=>{const pl=open.places,G=R.build(open);
  assert(pl.ortho.pin&&pl.ortho.label==='Brace Yourself Orthodontics');assert.strictEqual(open.map[pl.ortho.tz][pl.ortho.tx],',');assert(open.buildings.find(b=>b.id==='ortho'&&b.x0===104));
  for(const id of['bus1','bus2','bus3','bus4']){const p=pl[id];assert(p&&p.pin&&p.bus&&p.hood==='river',id);assert.strictEqual(open.map[p.tz][p.tx],'s',id);
    const n=G.nodes[G.nearestNode(p.x,p.z)];assert(Math.abs(n.tx-p.tx)+Math.abs(n.tz-p.tz)<=8,id+' near a node');const f=p.face;assert.strictEqual(open.map[p.tz+f[1]*2][p.tx+f[0]*2],',',id+' faces the road')}
  for(const id of NEW)assert(pl[id]&&pl[id].site===id,id);
  for(const[k,p]of Object.entries(pl)){assert(walk(open,p.tx,p.tz),k+' walkable');assert(reach[p.tz*W+p.tx],k+' reachable')}});
test('porches: Maple house fronts plus Riverside porches',()=>{const hp=open.housePorches;assert(hp.length>=60);for(const p of hp){assert(walk(open,p.tx,p.tz));assert(p.tx<100)}
  assert.strictEqual(open.porchesAll.length,hp.length+open.porches.length);assert(open.porchesAll.some(p=>p.hood==='river'))});
test('no existing site, place, building, door or start moved',()=>{for(const id in OLD.S){const s=open.sites[id];assert.deepStrictEqual([s.x0,s.z0,s.x1,s.z1,s.park.tx,s.park.tz,s.huddle.tx,s.huddle.tz],OLD.S[id],id)}
  for(const k in OLD.P)assert.deepStrictEqual([open.places[k].tx,open.places[k].tz],OLD.P[k],k);
  for(const k in OLD.B){const b=open.buildings.find(q=>q.id===k);assert.deepStrictEqual([b.x0,b.z0,b.x1,b.z1],OLD.B[k],k)}
  for(const k in OLD.doors)assert.deepStrictEqual([open.doors[k].tx,open.doors[k].tz],OLD.doors[k],k);
  assert.deepStrictEqual([open.start.tx,open.start.tz],OLD.start);assert.deepStrictEqual([open.vanStart.tx,open.vanStart.tz],OLD.van)});
test('extra colliders are inside their site windows',()=>{for(const id of NEW){const s=open.sites[id];for(const c of s.solids){assert(c.x0<c.x1&&c.z0<c.z1&&c.ph>0);assert(c.x0>=s.win.x0*2&&c.x1<=(s.win.x1+1)*2,id)}}});
if(require.main===module)done();
