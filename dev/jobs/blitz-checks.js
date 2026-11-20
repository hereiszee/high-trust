/* Honey-Do Blitz feature checks: the car route for carts, the loiterer, the last ten seconds, and the permanent fixes in free roam.
   node dev/jobs/blitz-checks.js [--shots]   (jpgs in docs/screenshots/jobs/blitz/). Exit 1 on a failed check or a console error. */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const SHOTS=process.argv.includes('--shots'),DIR=path.join(__dirname,'../../docs/screenshots/jobs/blitz');let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  const shot=async n=>{if(!SHOTS)return;fs.mkdirSync(DIR,{recursive:true});await ev(()=>window.__ht.draw());await p.screenshot({path:path.join(DIR,n+'.jpg'),type:'jpeg',quality:82})};
  await p.click('.ht-title [data-act=newgame]').catch(()=>{});await p.waitForTimeout(300);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);H.prog.trustR=22;H.jobs.start('blitz');H.step(3);try{window.HT.OpenWorld.buildAll()}catch(e){}
    const j=H.jobs.registry.get('blitz'),a=H.jobs.api;for(let t=0;t<400&&H.M.bz.phase!=='go';t++){j.test.step(a,t,{});H.step(1)}});
  /* carts by car: hitch one, load it, drive into the corral */
  const car=await ev(()=>{const H=window.__ht,a=H.jobs.api,B=H.M.bz,P=H.P;const f=B.fix.find(f=>f.kind==='cart');if(!f)return{err:'no cart'};
    P.pos.set(f.x+1,0,f.z);H.step(2);a.useTap=true;H.step(30);const hauled=B.haul===f;const c=H.M.car;P.pos.set(c.pos.x+2.4,0,c.pos.z);H.collide(P.pos,.35);H.step(2);a.useTap=true;H.step(2);
    const loaded=B.carLoad.length;const s0=B.score;H.enterVehicle(c);H.step(2);const S=B.corral.position;c.pos.set(S.x+3,0,S.z+2);H.step(40);return{hauled,loaded,delivered:f.done,pts:B.score-s0,inCar:!!H.CV}});
  ok(car.hauled&&car.loaded===1&&car.delivered&&car.pts>0,'cart hitched, loaded in the car, unloaded at the corral by car '+JSON.stringify(car));await shot('05-cart-corral');
  /* the loiterer: zip-tied fewer than 2 of his crew -> he holds the ladder */
  const lo=await ev(()=>{const H=window.__ht,B=H.M.bz;H.exitVehicle();H.step(3);B.clock=120;for(let i=0;i<300&&B.helperState!=='help';i++){H.step(1)}return{state:B.helperState,joined:!!B.helperJoined}});
  ok(lo.state==='help'&&lo.joined,'the Coupon Boy offers to hold the ladder and joins '+JSON.stringify(lo));await ev(()=>window.__ht.step(20));await shot('06-ladder');
  /* last ten seconds: hot clock, vignette, ticking */
  const ten=await ev(()=>{const H=window.__ht,B=H.M.bz;B.clock=7.2;H.step(10);const r=document.querySelector('#bz');return{hot:!!r.querySelector('.clock.hot'),vig:!!r.querySelector('.vig.on'),tick:B.tick}});
  ok(ten.hot&&ten.vig&&ten.tick<=7,'last ten seconds: red pulsing clock, vignette, ticks '+JSON.stringify(ten));await shot('07-last-ten');
  /* time up -> back to Hank -> tally -> result; then free roam keeps the painted tags and relit lamps */
  const end=await ev(()=>{const H=window.__ht,j=H.jobs.registry.get('blitz'),a=H.jobs.api,B=H.M.bz;
    /* make sure something permanent got fixed */for(const k of['tag','lamp']){const f=B.fix.find(f=>f.kind===k&&!f.done);if(f){H.P.pos.set(f.sx!=null?f.sx:f.x,0,f.sz!=null?f.sz:f.z);H.step(2);a.useTap=true;H.step(90)}}
    B.score=Math.max(B.score,160);B.clock=.05;for(let t=0;t<4000&&H.M.state==='go';t++){j.test.step(a,t,{});H.step(1)}return{state:H.M.state,tags:B.perm.tags,lamps:B.perm.lamps}});
  ok(end.state==='won'&&(end.tags.length||end.lamps.length),'whistle, Hank tallies, job won, permanent fixes '+JSON.stringify(end));
  const fr=await ev(async()=>{const H=window.__ht;H.UIacts['result:retry']&&H.UIacts['result:retry']();H.step(30);H.draw();await new Promise(r=>setTimeout(r,800));H.draw();const s=H.jobs.api.SV(),s0=s;const g=H.L.group.getObjectByName('blitzFixes');const W=H.jobs.api.WORLD,O=window.HT.OpenWorld;let want=0;for(const id of s0.world.scrubbed){const t=W.tags.find(t=>t.id===id);if(t&&O.blockTrust(t.x,t.z)<t.clearAt)want++}
    for(const k of s0.jobs.blitz.plan.lamps){const l=W.lamps.find(l=>l.tx+','+l.tz===k);if(l&&O.blockTrust(l.x,l.z)<l.brokenUntil)want++}
    return{want,mode:H.mode,scrubbed:s.world.scrubbed.length,lamps:s.jobs.blitz.plan.lamps.length,layer:g?g.children.length:0,discount:s.flags.hankDiscount}});
  ok(fr.mode==='hub'&&fr.layer===fr.want&&fr.scrubbed+fr.lamps>=1,'free roam: painted tags and relit lamps stay until the block’s own tier takes over '+JSON.stringify(fr));ok(fr.discount,'Hank’s lifetime discount saved');
  if(SHOTS){const tag=end.tags[0];await ev(t=>{const H=window.__ht,W=H.jobs.api.WORLD,g=W.tags.find(x=>x.id===t);if(!g)return;H.P.pos.set(g.x+g.face[0]*2.2,0,g.z+g.face[1]*2.2);H.collide(H.P.pos,.35);H.P.yaw=Math.atan2(g.face[0],g.face[1]);H.P.pitch=.05;H.step(40);H.P.yaw=Math.atan2(g.face[0],g.face[1])},tag);await shot('08-freeroam-painted')}
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,4).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
