const assert=require('assert'),{test,suite,done,load}=require('./harness');const HT=load(),Wd=HT.World;
suite('worldgen');
const REF_HASH=process.env.HT_REF_HASH||require('./world-ref.json').hash;
const open=Wd.build({bridgeOpen:true}),closed=Wd.build({bridgeOpen:false});
const SOLID=open.solid;
function bfs(def,sx,sz,box){const W=def.W,H=def.H,seen=new Uint8Array(W*H),q=[sz*W+sx];seen[q[0]]=1;
  while(q.length){const c=q.pop(),x=c%W,z=(c/W)|0;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=W||nz>=H)continue;
    if(box&&(nx<box.x0||nx>box.x1||nz<box.z0||nz>box.z1))continue;const k=nz*W+nx;if(seen[k]||SOLID.includes(def.map[nz][nx]))continue;seen[k]=1;q.push(k)}}return seen}
test('grid is 152 rows x 232 columns (rows 80-126: Fort Sensible, docs/base.md; 127-150: Sensible Dragway, docs/dragstrip.md)',()=>{assert.strictEqual(open.map.length,152);for(const r of open.map)assert.strictEqual(r.length,232);assert.strictEqual(open.ground.length,152)});
test('deterministic: two builds are identical',()=>{const a=Wd.build({bridgeOpen:true}),b=Wd.build({bridgeOpen:true});
  assert.strictEqual(a.map.join('\n'),b.map.join('\n'));assert.deepStrictEqual(a.tags,b.tags);assert.deepStrictEqual(a.houses,b.houses);assert.deepStrictEqual(a.lamps,b.lamps);assert.deepStrictEqual(a.porches.map(p=>p.order),b.porches.map(p=>p.order))});
test('reference hash of the open-bridge map is stable',()=>{let h=2166136261;for(const ch of open.map.join('\n')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}assert.strictEqual(h.toString(16),REF_HASH)});
test('old HUB coordinates kept: home door, store, markers',()=>{assert.strictEqual(open.map[10][19],'H');assert.strictEqual(open.map[4][25],'R');assert.deepStrictEqual([open.doors.home.x,open.doors.home.z],[39,21]);
  assert.deepStrictEqual(open.markers.map(m=>[m.tx,m.tz]),[[13,10],[37,24],[20,32],[44,18]])});
test('every site has park, huddle, ring, box and window',()=>{assert.deepStrictEqual(Object.keys(open.sites).sort(),['dave','dee','doug','duke','earl','gary','market','millshop','parkride','pawn','rick','roof','rosa','school','storage','walnut']);   /* + SPEC3 sites (dev/sites.test.js) */
  for(const s of Object.values(open.sites)){assert(s.park&&s.huddle&&s.ring&&s.box&&s.win,s.id);assert.strictEqual(s.ring.r,4)}});
test('site entity counts',()=>{const c=id=>{const s=open.sites[id];return[s.spawns.length,s.items.length,s.bonus.length,s.stashes.length,s.ammo.length,s.waveSpawns.length]};
  assert.deepStrictEqual(c('gary'),[10,4,0,0,2,0]);assert.deepStrictEqual(c('rick'),[8,0,0,3,2,0]);assert.deepStrictEqual(c('dave'),[0,0,0,0,0,6]);assert.deepStrictEqual(c('doug'),[13,0,0,0,2,0]);
  assert.deepStrictEqual(c('earl'),[8,6,4,0,1,0]);assert.deepStrictEqual(c('dee'),[7,0,0,2,1,0]);assert.deepStrictEqual(c('rosa'),[0,0,0,0,0,5]);assert.deepStrictEqual(c('duke'),[10,0,0,0,2,0]);
  assert(open.sites.dave.grill&&open.sites.dave.bounce);assert(open.sites.rosa.grill.shed);assert(open.sites.duke.getaway);assert.strictEqual(open.sites.rosa.beds.length,12);
  assert.strictEqual(open.sites.doug.spawns.filter(s=>s.boss).length,1);assert.strictEqual(open.sites.dee.spawns.filter(s=>s.boss).length,1)});
test('reachability with the bridge open: every site and place from the driveway',()=>{const s=bfs(open,open.vanStart.tx,open.vanStart.tz);
  for(const st of Object.values(open.sites))for(const p of[st.park,st.huddle])assert(s[p.tz*open.W+p.tx],st.id);
  for(const[k,p]of Object.entries(open.places))assert(s[p.tz*open.W+p.tx],k);for(const d of Object.values(open.doors))assert(s[d.tz*open.W+d.tx])});
test('bridge closed: Riverside unreachable, Maple and Route 9 reachable',()=>{const s=bfs(closed,closed.vanStart.tx,closed.vanStart.tz);
  for(const[k,p]of Object.entries(closed.places)){const reach=!!s[p.tz*closed.W+p.tx];assert.strictEqual(reach,p.tx<152,k)}
  assert.strictEqual(closed.barricade.length,3);assert(closed.barricade.every(b=>closed.map[b.tz][b.tx]==='!'));assert(open.barricade.every(b=>open.map[b.tz][b.tx]===','))});
test('inside each site, every interactive tile is reachable from the huddle',()=>{for(const st of Object.values(open.sites)){const box={x0:st.x0-1,z0:st.z0-1,x1:st.x1+1,z1:st.z1+1},s=bfs(open,st.huddle.tx,st.huddle.tz,box);
    for(const p of[...st.spawns,...st.items,...st.bonus,...st.ammo,...st.waveSpawns,...(st.getaway?[st.getaway]:[])])assert(s[p.tz*open.W+p.tx],st.id+' '+p.tx+','+p.tz);
    for(const p of[...st.stashes,...(st.grill?[st.grill]:[])])assert([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>s[(p.tz+dz)*open.W+p.tx+dx]),st.id+' furniture')}});
test('bridge unlock follows the save (after Rick\'s job)',()=>{assert.strictEqual(Wd.build({save:{prog:{done:[1,0,0,0]}}}).bridgeOpen,false);
  assert.strictEqual(Wd.build({save:{prog:{done:[1,1,0,0]}}}).bridgeOpen,true);assert.strictEqual(Wd.build({save:{world:{bridgeOpen:true},prog:{done:[]}}}).bridgeOpen,true)});
test('openBridge() mutates map, ground and chunk lists',()=>{const d=Wd.build({bridgeOpen:false});assert(d.chunks.some(c=>c.barricade.length));Wd.openBridge(d);
  assert(d.bridgeOpen);assert(d.barricade.every(b=>d.map[b.tz][b.tx]===','));assert(!d.chunks.some(c=>c.barricade.length))});
test('regionAt uses world metres',()=>{assert.strictEqual(Wd.regionAt(50*2+1,40),'maple');assert.strictEqual(Wd.regionAt(120*2+1,40),'route9');assert.strictEqual(Wd.regionAt(200*2+1,40),'river');assert.strictEqual(Wd.regionAt(151*2+1,0),'route9');assert.strictEqual(Wd.regionAt(152*2,0),'river');
  assert.strictEqual(Wd.regionAt(60*2+1,100*2+1),'base');assert.strictEqual(Wd.regionAt(130*2+1,79*2+1),'route9');assert.strictEqual(Wd.regionAt(160*2+1,100*2+1),'river')});
test('chunks: 8x5, cover the grid, every object in exactly one chunk',()=>{assert.strictEqual(open.chunks.length,40);let n=0;for(const c of open.chunks)n+=c.trees.length;assert.strictEqual(n,open.trees.length);
  for(const key of['lamps','houses','rowUnits','walls','chainlink','tags','porches','parked'])assert.strictEqual(open.chunks.reduce((s,c)=>s+c[key].length,0),open[key].length,key);
  for(const t of open.trees){const c=open.chunks[Wd.chunkIndex(t.tx,t.tz)];assert(c.trees.includes(t))}
  assert.strictEqual(Wd.chunkAt(0,0),0);assert.strictEqual(Wd.chunkAt(463,159),23);assert.strictEqual(Wd.chunkAt(463,255),31);assert.deepStrictEqual(Wd.chunksNear(10,10,1,open),[0])});
test('counts match SPEC2 A.4 (after SPEC3: school replaced 3 houses, Mill St Auto Recovery replaced block 3,3; Fort Sensible strip added; Sensible Dragway rows 127-150)',()=>{assert.strictEqual(open.trees.length,1572);assert.strictEqual(open.lamps.length,255);   /* +379 trees, +4 lamps: the base strip's borders and Industrial Way's extension; +94 net: the dragway's border, tree line and paddock trees, minus the corridor's riverbank trees */
  assert.strictEqual(open.houses.length,74);
  assert.strictEqual(open.walls.length,245);assert.strictEqual(open.porches.length,48);assert.strictEqual(open.tags.length,48)});
test('house door rule keeps SPEC.md home facing north',()=>{const home=open.houses.find(h=>h.home);assert(home);assert.strictEqual(home.face,'n');assert.deepStrictEqual([home.x0,home.z0,home.x1,home.z1],[17,11,21,13])});
test('ground chars are all colour chars',()=>{for(const r of open.ground)for(const ch of r)assert(',.gsb=~'.includes(ch),ch)});
test('tags: 48 distinct Riverside faces, spaced, valid clearAt',()=>{const ids=new Set();for(const t of open.tags){assert(t.tx>=152);assert('rxAz'.includes(open.map[t.tz][t.tx]));assert([20,35,50,70].includes(t.clearAt));ids.add(t.tx+','+t.tz)}
  assert.strictEqual(ids.size,48);for(const a of open.tags)for(const b of open.tags)if(a!==b)assert(Math.abs(a.tx-b.tx)+Math.abs(a.tz-b.tz)>=4)});
test('dressing tiers',()=>{const d0=Wd.dressing(open,0),d50=Wd.dressing(open,50),d70=Wd.dressing(open,70),riv=open.lamps.filter(l=>l.hood==='river').length;
  assert.strictEqual(d0.tags.length,48);assert(Math.abs(d0.lampsBroken.length/riv-.7)<.03);assert.strictEqual(d0.trash.length,30);assert.strictEqual(d0.neighbourAnchors.length,0);assert.strictEqual(d0.garden,'weeds');
  assert.strictEqual(Wd.dressing(open,20).trash.length,0);assert(Math.abs(Wd.dressing(open,35).lampsBroken.length/riv-.3)<.03);
  assert.strictEqual(d50.lampsBroken.length,0);assert.strictEqual(d50.chalk.length,30);assert(d50.tags.every(id=>open.tags.find(t=>t.id===id).clearAt>50));assert.strictEqual(d50.flags.mural,false);
  assert.strictEqual(d70.tags.length,0);assert(d70.flags.mural);assert.strictEqual(d70.garden,'bloom');assert.strictEqual(d70.boarded.length,0);
  assert.strictEqual(Wd.dressing(open,0,['tag0','tag1']).tags.length,46);assert.strictEqual(Wd.tierOf(36),2)});
test('neighbour pool never exceeds 10 and respects tier',()=>{for(let x=310;x<460;x+=10){const s=Wd.neighbourSlots(open,90,x,60);assert(s.length<=10)}
  assert.strictEqual(Wd.neighbourSlots(open,0,360,60).length,0);assert(Wd.neighbourSlots(open,20,360,60).every(p=>p.order<4))});
test('build({missions}) overrides a mission map',()=>{const m=open.sites.gary;const map=Wd.MAPS.gary.map.map(r=>r.replace(/E/g,','));const d=Wd.build({bridgeOpen:true,missions:[{id:'gary',map}]});assert.strictEqual(d.sites.gary.spawns.length,0)});
if(require.main===module)done();
