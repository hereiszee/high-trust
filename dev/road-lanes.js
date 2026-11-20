/* Road lanes clear (QA, persistent world changes): every edge of the road graph in free roam, checked for anything a driver would hit
   or drive through on the carriageway: static colliders, givers and other people standing still, parked cars, and meshes that jobs add
   to the world (anything not in a fresh game). Two passes:
     unlocked: a fresh game with every job's unlock met (givers out), nothing done
     done:     a save where every job is done (node dev/state-leaks.js --dump <file>), so every job's leftovers are in the world
   The corridor is the carriageway: |lateral offset from the centreline| < LANE_HALF m, minus the junction boxes (cross traffic stops there).
   node dev/road-lanes.js [<all-done-save.json>] [--json out.json]
   Exit code 1 if anything is found. */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs');
const SAVE=process.argv.slice(2).find(a=>!a.startsWith('--')&&fs.existsSync(a));
const OUT=(i=>i>0?process.argv[i+1]:null)(process.argv.indexOf('--json'));
const LANE_HALF=2.7;/* centreline to kerb is 3 m; a car is 1.9-2.1 m wide on a 1.5 m lane offset */
async function pass(label,seed,unlockAll,base){const {b,p,errs}=await open(seed?{init:{fn:s=>{try{if(!sessionStorage.getItem('__seeded')){localStorage.setItem('ht-save',s);sessionStorage.setItem('__seeded','1')}}catch(e){}},arg:seed}}:{});
  await p.click('.ht-title [data-act='+(seed?'continue':'newgame')+']');await p.waitForTimeout(300);
  const r=await p.evaluate(async([unlockAll,base,LANE_HALF])=>{const H=window.__ht;await H.jobs.ready;const s=H.jobs.api.SV();
    if(unlockAll){/* every job's unlock met, nothing done: deps marked done in the save view only for gating, then the built-ins put back */
      H.prog.trust=100;H.prog.trustR=100;H.prog.cuffed=Math.max(H.prog.cuffed,10);for(let i=0;i<9&&i<H.MISSIONS.length;i++)H.prog.done[i]=true;if(s){s.flags.act2Intro=true;s.flags.finale2=true}}
    if(s&&s.flags){s.flags.act2Intro=true;s.flags.finale2=true}
    H.enterHub();H.step(5);if(H.hudScreen==='result'&&H.UIacts&&H.UIacts['result:retry'])H.UIacts['result:retry']();if(H.CV)H.exitVehicle&&H.exitVehicle();
    /* walk the map so near-player dressing (porch families, the bakery, bike racks) builds */
    const G=H.ow.roads();for(const n of G.nodes){H.P.pos.set(n.x,0,n.z);H.step(2)}H.step(30);
    const T=H.jobs.api.THREE,hits=[];
    const lat=(e,x,z)=>{const A=G.nodes[e.a],B=G.nodes[e.b],dx=B.x-A.x,dz=B.z-A.z,L=Math.hypot(dx,dz),t=((x-A.x)*dx+(z-A.z)*dz)/(L*L);return{t,off:Math.abs((x-A.x)*dz-(z-A.z)*dx)/L,L}};
    const inJunction=(x,z)=>G.nodes.some(n=>Math.abs(n.x-x)<3.2&&Math.abs(n.z-z)<3.2);
    /* sample a box: does any of its footprint lie on some carriageway (outside junction boxes)? */
    const onRoad=(x0,z0,x1,z1)=>{for(const e of G.edges){const A=G.nodes[e.a],B=G.nodes[e.b];if(Math.max(x0,Math.min(A.x,B.x)-LANE_HALF)>Math.min(x1,Math.max(A.x,B.x)+LANE_HALF)||Math.max(z0,Math.min(A.z,B.z)-LANE_HALF)>Math.min(z1,Math.max(A.z,B.z)+LANE_HALF))continue;
        const st=Math.max(.3,Math.min(x1-x0,z1-z0)/3);for(let x=x0;x<=x1+1e-6;x+=Math.max(.3,(x1-x0)/3))for(let z=z0;z<=z1+1e-6;z+=Math.max(.3,(z1-z0)/3)){const q=lat(e,x,z);if(q.t>0&&q.t<1&&q.off<LANE_HALF&&!inJunction(x,z))return{edge:e.a+'-'+e.b,x:+x.toFixed(1),z:+z.toFixed(1),off:+q.off.toFixed(2)}}}return null};
    for(const c of H.L.colliders||[]){if(c.off||c.x1-c.x0>40||c.z1-c.z0>40)continue;const h=onRoad(c.x0,c.z0,c.x1,c.z1);if(h)hits.push({kind:'collider',what:[c.x0,c.z0,c.x1,c.z1].map(v=>+v.toFixed(1)).join(','),...h})}
    for(const n of H.npcs){const h=onRoad(n.pos.x-.3,n.pos.z-.3,n.pos.x+.3,n.pos.z+.3);if(h)hits.push({kind:n.marker?'giver':'npc',what:n.id+(n.marker?' ('+H.MISSIONS[n.marker.i].id+')':''),...h})}
    for(const c of H.L.cars||[]){if(c===H.VAN||c.traffic||c.ai)continue;const S=1;const h=onRoad(c.pos.x-S,c.pos.z-S,c.pos.x+S,c.pos.z+S);if(h)hits.push({kind:'parked car',what:(c.name||'')+' '+(c.type||'')+' '+(c.owner||''),...h})}
    /* meshes a fresh game doesn't have (job dressing): signature type|name|rounded position */
    const sig=o=>{const w=new T.Vector3();o.getWorldPosition(w);return o.type+'|'+(o.name||'')+'|'+Math.round(w.x)+','+Math.round(w.z)};
    const mine=[];const visit=(o,d)=>{for(const c of o.children){if(c.isCamera||c===H.P.dude?.root)continue;mine.push(c);if(d<2&&!c.isMesh&&c.children.length)visit(c,d+1)}};visit(H.scene,0);
    const sigs=mine.map(sig);let extra=[];if(base){const cnt=new Map();for(const x of base)cnt.set(x,(cnt.get(x)||0)+1);mine.forEach((o,i)=>{const k=sigs[i],c=cnt.get(k)||0;if(c>0){cnt.set(k,c-1);return}if(o.visible)extra.push(o)})}
    const shown=o=>{for(let n=o;n&&n!==H.scene;n=n.parent)if(!n.visible)return false;return true};/* a hidden parent hides it (job rings wait hidden) */
    const people=new Set(H.npcs.map(n=>n.dude&&n.dude.root).filter(Boolean));const ofPerson=o=>{for(let n=o;n&&n!==H.scene;n=n.parent)if(people.has(n))return true;return false};
    for(const o of extra){if(!shown(o)||ofPerson(o))continue;const bb=new T.Box3().setFromObject(o);if(bb.isEmpty()||bb.max.y<.15)continue;/* decals and markings */if(bb.max.x-bb.min.x>30||bb.max.z-bb.min.z>30)continue;const h=onRoad(bb.min.x,bb.min.z,bb.max.x,bb.max.z);if(h)hits.push({kind:'job dressing',what:o.name||o.type,...h})}
    return{hits,sigs,edges:G.edges.length,done:H.MISSIONS.filter((m,i)=>H.prog.done[i]).length,givers:H.npcs.filter(n=>n.marker).length}},[unlockAll,base,LANE_HALF]);
  r.errs=errs.filter(e=>!/favicon/.test(e));await b.close();console.log('-- '+label+': '+r.edges+' road edges, '+r.done+' jobs done, '+r.givers+' givers, '+r.hits.length+' things on a carriageway');
  for(const h of r.hits)console.log('   ! '+h.kind.padEnd(13)+h.what+'  on edge '+h.edge+' at '+h.x+','+h.z+' ('+h.off+' m off the centreline)');return r}
(async()=>{const fresh=await pass('fresh game',null,false,null);
  const un=await pass('every job unlocked',null,true,fresh.sigs);
  const dn=SAVE?await pass('every job done ('+SAVE+')',fs.readFileSync(SAVE,'utf8'),false,fresh.sigs):null;
  const all=[...fresh.hits.map(h=>({...h,pass:'fresh'})),...un.hits.map(h=>({...h,pass:'unlocked'})),...(dn?dn.hits.map(h=>({...h,pass:'done'})):[])];
  const errs=fresh.errs.concat(un.errs,dn?dn.errs:[]);if(errs.length)console.log('console errors: '+errs.slice(0,5).join(' | '));
  if(OUT)fs.writeFileSync(OUT,JSON.stringify(all,null,1));console.log(all.length?all.length+' findings':'all lanes clear');process.exit(all.length||errs.length?1:0)})().catch(e=>{console.error(e);process.exit(1)});
