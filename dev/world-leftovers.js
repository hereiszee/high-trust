/* Persistent world changes (QA item 3): free roam with NO job done vs EVERY job done (a save, e.g. from
   node dev/state-leaks.js --dump dev/fixtures/all-done-save.json). Two browser sessions, one after the other.
   For each session: visit a set of spots (the leftovers build when you come near), list the scene objects that exist only in the
   everything-done world, and check each one: on a road lane, on a door / named place, on a giver, on a job's start ring or route
   start, overlapping another leftover, floating. Then frame time and draw calls at fixed camera spots in Riverside, none vs all.
   node dev/world-leftovers.js <save.json> [--json out.json] */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs');
const SAVE=process.argv[2];if(!SAVE||!fs.existsSync(SAVE)){console.log('usage: node dev/world-leftovers.js <save.json>');process.exit(2)}
const OUT=(i=>i>0?process.argv[i+1]:null)(process.argv.indexOf('--json'));
/* spots to stand at (metres): Maple home / Linden Park, Route 9, Riverside: mart, church, Dock St, Sal's, the garden, the market, the school */
const SPOTS=[[40,30],[95,95],[120,60],[200,40],[260,40],[330,40],[370,42],[340,70],[400,80],[420,30],[380,120],[300,100],[440,60]];
const CAMS=[{x:362,z:52,yaw:0.2,pitch:-.12,label:'mart / Main St'},{x:330,z:52,yaw:-0.4,pitch:-.12,label:'church'},{x:400,z:70,yaw:2.6,pitch:-.12,label:'garden / Dock St'},{x:225,z:60,yaw:0,pitch:-.12,label:"Sal's"}];
async function session(seed){const {b,p,errs}=await open(seed?{init:{fn:s=>{try{if(!sessionStorage.getItem('__seeded')){localStorage.setItem('ht-save',s);sessionStorage.setItem('__seeded','1')}}catch(e){}},arg:seed}}:{});
  await p.click('.ht-title [data-act='+(seed?'continue':'newgame')+']');await p.waitForTimeout(300);
  const r=await p.evaluate(async([SPOTS,CAMS])=>{const H=window.__ht;await H.jobs.ready;const s=H.jobs.api.SV();if(s&&s.flags){s.flags.act2Intro=true;if(H.MISSIONS.every((m,i)=>m.reg||H.prog.done[i]))s.flags.finale2=true}
    if(H.UIacts&&H.UIacts['result:retry']&&H.hudScreen==='result')H.UIacts['result:retry']();H.enterHub();H.step(5);
    if(H.CV)H.exitVehicle&&H.exitVehicle();
    for(const [x,z] of SPOTS){H.P.pos.set(x,0,z);H.collide(H.P.pos,.35);H.step(20)}
    const T=H.jobs.api.THREE,sig=o=>{const w=new T.Vector3();o.getWorldPosition(w);return o.type+'|'+(o.name||'')+'|'+Math.round(w.x)+','+Math.round(w.z)};
    const objs=[];const visit=(o,depth)=>{for(const c of o.children){if(c.isCamera||c.isLight&&depth>1)continue;if(c===H.P.dude?.root)continue;objs.push(c);if(depth<2&&c.children.length&&!(c.isMesh)&&!(c.userData&&c.userData.rb))visit(c,depth+1)}};
    visit(H.scene,0);
    const list=objs.map(o=>{const bb=new T.Box3().setFromObject(o);if(bb.isEmpty())return null;const sz=bb.getSize(new T.Vector3());if(sz.x>60||sz.z>60)return null;/* chunks, terrain */
      return{sig:sig(o),name:o.name||o.type,x0:+bb.min.x.toFixed(2),x1:+bb.max.x.toFixed(2),z0:+bb.min.z.toFixed(2),z1:+bb.max.z.toFixed(2),y0:+bb.min.y.toFixed(2),y1:+bb.max.y.toFixed(2),vis:o.visible}}).filter(Boolean);
    const G=H.ow.roads(),W=H.jobs.api.WORLD;
    const ctx={givers:H.npcs.filter(n=>n.marker).map(n=>({who:H.MISSIONS[n.marker.i].giver,job:H.MISSIONS[n.marker.i].id,x:n.pos.x,z:n.pos.z})),
      rings:(H.L.dests||[]).map((d,i)=>d?{job:H.MISSIONS[i]&&H.MISSIONS[i].id,x:d.x,z:d.z}:null).filter(Boolean),
      places:Object.entries(W.places).map(([k,v])=>({k,x:v.x,z:v.z})),cars:(H.L.cars||[]).map(c=>({name:c.name||c.type,x:c.pos.x,z:c.pos.z}))};
    /* is a box on a driving lane? sample a grid and ask the road graph */
    for(const o of list){let road=0,n=0;for(let x=o.x0;x<=o.x1+1e-6;x+=Math.max(.5,(o.x1-o.x0)/4))for(let z=o.z0;z<=o.z1+1e-6;z+=Math.max(.5,(o.z1-o.z0)/4)){n++;const r=G.nearestRoad(x,z);if(r&&r.dist<2.6)road++}o.onRoad=n?+(road/n).toFixed(2):0;o.ground=+H.jobs.api.groundAt((o.x0+o.x1)/2,(o.z0+o.z1)/2).toFixed(2)}
    /* frame time and draw calls at fixed camera spots */
    const perf=[];for(const c of CAMS){H.P.pos.set(c.x,0,c.z);H.collide(H.P.pos,.35);H.P.yaw=c.yaw;H.P.pitch=c.pitch;H.step(20);const R=H.renderer;R.info.autoReset=false;
      H.draw();R.info.reset();H.draw();const calls=R.info.render.calls,tris=R.info.render.triangles;R.info.autoReset=true;const t0=performance.now();for(let i=0;i<20;i++)H.draw();
      perf.push({label:c.label,calls,tris,ms:+((performance.now()-t0)/20).toFixed(1)})}
    return{list,ctx,perf,done:H.MISSIONS.filter((m,i)=>H.prog.done[i]).length,sceneN:H.scene.children.length}},[SPOTS,CAMS]);
  r.errs=errs.filter(e=>!/favicon/.test(e));await b.close();return r}
(async()=>{const none=await session(null);const all=await session(fs.readFileSync(SAVE,'utf8'));
  const cnt=new Map();for(const o of none.list)cnt.set(o.sig,(cnt.get(o.sig)||0)+1);
  const extra=[];for(const o of all.list){const c=cnt.get(o.sig)||0;if(c>0){cnt.set(o.sig,c-1);continue}extra.push(o)}
  const inBox=(o,x,z,m)=>x>o.x0-m&&x<o.x1+m&&z>o.z0-m&&z<o.z1+m,ov=(a,b)=>a.x0<b.x1&&b.x0<a.x1&&a.z0<b.z1&&b.z0<a.z1;
  const issues=[];
  for(const o of extra){if(!o.vis)continue;const tag=o.name+' ['+o.x0+'..'+o.x1+' , '+o.z0+'..'+o.z1+']';
    if(o.onRoad>.5)issues.push(tag+' sits on a road lane ('+Math.round(o.onRoad*100)+'% of it)');
    for(const g of all.ctx.givers)if(inBox(o,g.x,g.z,.6))issues.push(tag+' on the giver '+g.who+' ('+g.job+')');
    for(const r of all.ctx.rings)if(inBox(o,r.x,r.z,1.5))issues.push(tag+' on the start ring of '+r.job);
    for(const p of all.ctx.places)if(/^(g_|door|home|mart|church|auto|laundry|bakery|pawn)/.test(p.k)&&inBox(o,p.x,p.z,.3))issues.push(tag+' on the place '+p.k);
    for(const c of all.ctx.cars)if(inBox(o,c.x,c.z,.5)&&!/car|van|mower|truck|bike/i.test(o.name))issues.push(tag+' inside the car '+c.name);
    if(o.y0>o.ground+.35&&o.y1-o.y0<3)issues.push(tag+' floating '+(o.y0-o.ground).toFixed(2)+' m');}
  for(let i=0;i<extra.length;i++)for(let k=i+1;k<extra.length;k++){const a=extra[i],c=extra[k];if(a.vis&&c.vis&&ov(a,c)&&(a.x1-a.x0)*(a.z1-a.z0)>.5&&(c.x1-c.x0)*(c.z1-c.z0)>.5)issues.push('overlap: '+a.name+' & '+c.name+' near '+a.x0.toFixed(0)+','+a.z0.toFixed(0))}
  console.log('jobs done: none='+none.done+' all='+all.done+' · scene children '+none.sceneN+' -> '+all.sceneN+' · leftovers found: '+extra.length);
  for(const o of extra)console.log('   + '+o.name.padEnd(18)+' x '+o.x0+'..'+o.x1+'  z '+o.z0+'..'+o.z1+'  y '+o.y0+'..'+o.y1+(o.onRoad?'  road '+o.onRoad:'')+(o.vis?'':' (hidden)'));
  console.log('perf (draw calls / triangles / ms per frame, SwiftShader):');for(let i=0;i<CAMS.length;i++){const a=none.perf[i],c=all.perf[i];console.log('   '+a.label.padEnd(18)+' none '+a.calls+' / '+a.tris+' / '+a.ms+'   all '+c.calls+' / '+c.tris+' / '+c.ms)}
  for(const x of issues)console.log(' ! '+x);
  if(none.errs.length||all.errs.length)console.log('console errors: '+none.errs.concat(all.errs).slice(0,6).join(' | '));
  if(OUT)fs.writeFileSync(OUT,JSON.stringify({extra,issues,perf:{none:none.perf,all:all.perf}},null,1));
  console.log(issues.length?issues.length+' issues':'no issues');process.exit(issues.length||none.errs.length||all.errs.length?1:0)})().catch(e=>{console.error(e);process.exit(1)});
