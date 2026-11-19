/* Act 2 / world missions (SPEC2 W3 + B) in the real game: headless Chromium + SwiftShader, driven through window.__ht.step().
   node dev/riverside-ingame.js [--only=0,4,...] [--shots] [--seeds=10] [--write]
   Every job is taken from its giver, driven to with a waypoint bot, completed by a scripted player and paid; the bridge opens after
   job 2; chases win (pursuit bot) and fail (nobody chases) across seeds; escort, stakeout, garden defence and Rosa's revive; the
   CFG.inWorld=false fallback still builds the old separate level. --shots writes jpgs to docs/screenshots/riverside-jobs/. */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs'),path=require('path');
const arg=k=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:null};
const ONLY=arg('only')?arg('only').split(',').map(Number):null,SHOTS=process.argv.includes('--shots'),SEEDS=+(arg('seeds')||10);
const SHOT_DIR=path.join(__dirname,'../docs/screenshots/riverside-jobs');
const out=[],log=(...a)=>{const s=a.join(' ');out.push(s);console.log(s)};let fails=0;const ok=(c,msg)=>{if(!c)fails++;log((c?'ok   ':'FAIL ')+msg)};
const want=i=>!ONLY||ONLY.includes(i);

/* page-side helpers: a waypoint driver, a pursuit driver (HT.CarAI.pursuerInput), walking, holding E, the result card */
const LIB=()=>{const H=window.__ht,k=H.keys,T={};window.__T=T;
  T.clear=()=>{for(const x of['w','a','s','d','shift',' ','e'])k[x]=false;H.mouse=false};
  T.drive=(tgt,steps,o={})=>{/* follow the road route to tgt and stop inside r */const G=H.ow.roads();const e=H.CV;if(!e)return{err:'not driving'};
    let route=G.route({x:e.pos.x,z:e.pos.z},tgt),pts=route?route.points:[tgt],wi=1,s=0,stuck=0;
    for(;s<steps;s++){const d0=Math.hypot(tgt.x-e.pos.x,tgt.z-e.pos.z);if(d0<(o.r||3)&&Math.abs(e.spd)<2.5)break;
      while(wi<pts.length-1&&Math.hypot(pts[wi].x-e.pos.x,pts[wi].z-e.pos.z)<6)wi++;const w=d0<12?tgt:pts[Math.min(wi,pts.length-1)];
      const dx=w.x-e.pos.x,dz=w.z-e.pos.z;let d=Math.atan2(-dx,-dz)-e.yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;
      const want=d0<12?Math.max(2,d0*.5):Math.abs(d)>.5?7:(o.v||14);k.a=d>.05;k.d=d<-.05;k.w=e.spd<want;k.s=e.spd>want+2;k.shift=false;
      if(Math.abs(e.spd)<.5){stuck++;if(stuck>60){k.w=false;k.s=true;k.a=!k.a;k.d=!k.d}if(stuck>100){stuck=0;route=G.route({x:e.pos.x,z:e.pos.z},tgt);pts=route?route.points:[tgt];wi=1}}else stuck=0;
      H.step(1);if(H.mode!=='hub'&&!o.inMission)break;if(o.until&&o.until())break}
    T.clear();k.s=true;H.step(8);k.s=false;return{steps:s,d:Math.hypot(tgt.x-e.pos.x,tgt.z-e.pos.z),mode:H.mode}};
  T.pursue=(steps,o={})=>{/* chase the getaway car like a player would: route to it, then aim for it and ram */const CA=HT.CarAI,G=H.ow.roads();let memo={},s=0;
    for(;s<steps;s++){const ch=H.chase;if(!ch||ch.state!=='run'&&ch.state!=='exit'||H.M.state!=='go')break;const e=H.CV;if(!e)break;
      const van={x:e.pos.x,z:e.pos.z,yaw:e.yaw,spd:e.spd,stats:e.car.stats};const pi=CA.pursuerInput(van,ch.car,G,memo);memo=pi.memo;const I=pi.inp;
      k.w=I.thr>0;k.s=I.thr<0;k.a=I.st>.12;k.d=I.st<-.12;k.shift=!!I.boost;H.step(1)}T.clear();return s};
  T.walk=(x,z,steps=400,r=1.2)=>{const P=H.P;for(let s=0;s<steps;s++){const dx=x-P.pos.x,dz=z-P.pos.z;if(Math.hypot(dx,dz)<r){T.clear();return true}P.yaw=Math.atan2(-dx,-dz);k.w=true;H.step(1)}T.clear();return false};
  T.tp=(x,z)=>{H.P.pos.set(x,0,z);H.collide(H.P.pos,.35);H.step(1)};
  T.hold=(steps=60)=>{k.e=true;H.step(steps);k.e=false;H.step(1)};
  T.tap=()=>{H.use=true;H.step(1)};
  T.calm=()=>{for(const e of H.enemies)if(e.state==='idle'){e.alert=false}};
  T.neutralise=(cuff)=>{/* scripted firefight result: half give up (zip-tied), the rest go down */let n=0;for(const e of H.enemies){if(e.state!=='idle')continue;if(cuff&&n++%2===0){H.surrender(e)}else H.hurtEnemy(e,999,'player')}H.step(2);
    for(const e of H.enemies)if(e.state==='surrender'){T.tp(e.pos.x+.8,e.pos.z);for(let i=0;i<30&&e.state==='surrender';i++){H.P.pos.set(e.pos.x+.8,0,e.pos.z);H.step(1);H.use=true;H.step(1)}}};
  T.godmode=()=>{H.P.hp=100};
  T.result=()=>{const el=document.querySelector('.ht-result,[class*=result]');return{acts:Object.keys(H.UIacts||{}),done:H.prog.done.slice(),cash:H.cash,pay:H.M&&H.M.pay?H.M.pay.lines.map(l=>l.id+':'+l.amount):null,total:H.M&&H.M.pay&&H.M.pay.total}};
  T.giver=i=>{const n=H.npcs.find(n=>n.marker&&n.marker.i===i);return n?{x:n.pos.x,z:n.pos.z,locked:n.locked||null,tag:n.lockTag||null}:null};
  T.take=i=>{/* walk up to the giver, talk, accept the brief */const n=H.npcs.find(n=>n.marker&&n.marker.i===i);if(!n)return{err:'no giver '+i,givers:H.npcs.map(n=>n.marker&&n.marker.i)};
    if(H.CV)H.exitVehicle();H.P.pos.set(n.pos.x+1.6,0,n.pos.z);H.collide(H.P.pos,.35);H.step(1);H.use=true;H.step(1);const br=!!(H.UIacts&&H.UIacts['brief:go']);if(br)H.UIacts['brief:go']();H.step(1);return{brief:br,job:H.JOB}};
  T.toRing=(i,far=110)=>{/* put the van on the road ~far m out along the route to the job's ring and drive it in */const d=H.L.dests[i],G=H.ow.roads(),V=H.VAN;if(H.CV)H.exitVehicle();
    const st=G.nearestRoad(d.x,d.z),hm=H.WORLD.places.home;const route=G.route({x:hm.x,z:hm.z},d);let p=route.points[0];let acc=0;for(let j=route.points.length-1;j>0;j--){const a=route.points[j],b=route.points[j-1];acc+=Math.hypot(a.x-b.x,a.z-b.z);if(acc>far){p=b;break}}
    const q=route.points[Math.min(route.points.indexOf(p)+1,route.points.length-1)];V.pos.set(p.x,0,p.z);V.yaw=Math.atan2(-(q.x-p.x),-(q.z-p.z));V.spd=0;if(V.car){V.car.spd=0}H.syncVan();
    for(const a of H.allies){a.pos.set(p.x+2,0,p.z+2)}H.P.pos.set(p.x+2.5,0,p.z);H.enterVan();H.step(2);return T.drive({x:d.x,z:d.z},2400,{r:2.5})};
  T.leave=()=>{/* walk to the exit ring beside your ride and get in */const x=H.exitAt;if(x)T.tp(x.x,x.z);const seen=[];for(let i=0;i<12&&H.M&&H.M.state==='go';i++){H.step(1);seen.push((H.prompt&&H.prompt.text)+'|'+H.running+'|'+H.mode+'|'+Math.round(H.P.hp)+'|'+(H.HUD.screen||''));H.use=true;H.step(1)}return seen};
  T.done=()=>{const a=H.UIacts||{};return a};
};

(async()=>{const {b,p,errs}=await open();await p.evaluate(LIB);
  const shot=async(name,prep)=>{if(!SHOTS)return;await p.evaluate(prep||(()=>{}));await p.evaluate(()=>{window.__ht.draw();window.__ht.draw()});fs.mkdirSync(SHOT_DIR,{recursive:true});await p.screenshot({path:path.join(SHOT_DIR,name+'.jpg'),type:'jpeg',quality:82});log('     shot '+name+'.jpg')};
  /* new game from the title screen */
  await p.click('.ht-title [data-act=newgame]').catch(()=>p.evaluate(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));
  await p.waitForTimeout(300);
  const g0=await p.evaluate(()=>{const H=window.__ht;H.step(3);return{mode:H.mode,lvl:H.L.def.id,n:H.MISSIONS.length,givers:H.npcs.map(n=>n.marker.i),bridge:H.WORLD.bridgeOpen,inWorld:H.CFG.inWorld,cash:H.cash}});
  ok(g0.mode==='hub'&&g0.lvl==='world'&&g0.n===9&&g0.givers.join()==='0'&&!g0.bridge,'new game: the world hub, 9 jobs, only Gary is waiting, bridge closed ('+JSON.stringify(g0)+')');

  /* jump ahead: these jobs done, back in the hub (the Act 2 card, if it shows, is dismissed) */
  const setup=(done,trustR)=>p.evaluate(async([done,trustR])=>{const H=window.__ht;for(const i of done)H.prog.done[i]=true;if(trustR!=null)H.prog.trustR=trustR;H.enterHub();H.step(2);
    await new Promise(r=>setTimeout(r,1600));const a=H.UIacts&&H.UIacts['result:go'];if(a&&!H.running)a();H.step(1);return{givers:H.npcs.map(n=>n.marker.i)}},[done,trustR]);
  /* one job, the whole way: giver -> brief -> drive -> scripted completion -> payout -> Keep driving */
  const run=async(i,body,o={})=>{
    const pre=await p.evaluate(async([i,o])=>{const H=window.__ht,T=window.__T;if(H.mode!=='hub'){H.enterHub();H.step(2)}const c0=H.cash;const t=T.take(i);if(t.err)return t;H.step(1);const d=T.toRing(i,o.far||110);
      for(let k=0;k<120&&H.mode!=='mission';k++)await new Promise(r=>setTimeout(r,100));/* the job may wait for its cast to stream in */
      return{t,d,mode:H.mode,lvl:H.L.def.id,phase:H.M&&H.M.phase,c0,inWorld:H.M&&H.M.world}},[i,o]);
    if(pre.err||!pre.t.brief||pre.mode!=='mission'){ok(false,'job '+i+': giver -> brief -> drive '+JSON.stringify(pre));return null}
    log('     job '+i+': talked to the giver, accepted, drove '+pre.d.steps+' steps to the ring -> '+pre.lvl+' ('+pre.phase+')');
    const r=await body();
    const res=await p.evaluate(async i=>{const H=window.__ht,T=window.__T;await new Promise(r=>setTimeout(r,1400));return T.result()},i);
    return{pre,r,res}};
  const keep=()=>p.evaluate(()=>{const H=window.__ht;const a=H.UIacts&&H.UIacts['result:retry'];if(a)a();H.step(3);return{mode:H.mode,lvl:H.L.def.id,enemies:H.enemies.length,van:[H.VAN.pos.x|0,H.VAN.pos.z|0]}});
  const paid=(i,R,extra)=>{const done=R&&R.res.done[i];const gain=R?R.res.cash-R.pre.c0:0;ok(done&&gain>0&&(!extra||extra(R)),'job '+i+' '+['Return to Sender','Fourth Quarter','Block Party','The Kingpin','End of the Line','Fellowship Hall','Garden Variety','Brain Freeze','The Duke'][i]+
    ': completed and paid $'+gain+' ['+(R&&R.res.pay||[]).join(' ')+']'+(R&&R.r?' '+JSON.stringify(R.r):''))};

  /* ---- 0 Gary: loot in the world ---- */
  if(want(0)){const R=await run(0,()=>p.evaluate(()=>{const H=window.__ht,T=window.__T;const r={en:H.enemies.length,items:H.L.items.length,lvl:H.L.def.id};T.neutralise(true);
      for(const it of H.L.items){T.tp(it.x+.6,it.z);T.hold(40)}r.got=H.M.got;r.exitOpen=H.M.exitOpen;const x=H.exitAt;T.tp(x.x,x.z);H.step(3);return r}));
    paid(0,R,R=>R.r.lvl==='world'&&R.r.got===4);
    await shot('w3-gary-result');const k=await keep();ok(k.mode==='hub'&&k.lvl==='world'&&k.enemies===0,'Keep driving: back in the hub at the chop shop, nobody left over ('+JSON.stringify(k)+')')}
  /* ---- 1 Rick: stash + clock; the bridge opens after it ---- */
  if(want(1)){const R=await run(1,()=>p.evaluate(()=>{const H=window.__ht,T=window.__T;T.neutralise(true);for(const s of H.L.stashes){T.tp(s.x+1.2,s.z);T.hold(55)}const r={smashed:H.M.smashed};const x=H.exitAt;T.tp(x.x,x.z);H.step(3);return r}));
    paid(1,R);await keep();
    const br=await p.evaluate(async()=>{const H=window.__ht;H.step(2);await new Promise(r=>setTimeout(r,1700));const card=H.UIacts&&H.UIacts['result:go'];const r={bridge:H.WORLD.bridgeOpen,card:!!card,act:H.prog.act,givers:H.npcs.map(n=>n.marker.i)};return r});
    await shot('bridge-opening-beat');
    const br2=await p.evaluate(()=>{const H=window.__ht;const a=H.UIacts&&H.UIacts['result:go'];if(a)a();H.step(2);return{running:H.running,givers:H.npcs.map(n=>n.marker.i),first:H.npcs[0]&&H.npcs[0].marker.i,gps:H.gps&&H.gps.points.length}});
    ok(br.bridge&&br.card&&br.act===2&&br2.givers.includes(4)&&br2.givers.includes(2),'bridge opens after job 2: banner + Act 2 card, Earl is waiting in Riverside next to Dave ('+JSON.stringify([br,br2])+')');
    const c=await p.evaluate(()=>{const H=window.__ht,V=H.VAN;if(!H.CV)H.enterVan();V.pos.set(270,0,43);V.yaw=-Math.PI/2;H.syncVan();H.step(2);return window.__T.drive({x:330,z:43},500,{r:4})});
    ok(c.d<6,'drive across the open bridge into Riverside ('+JSON.stringify(c)+')')}
  /* ---- 4 Earl: carry bikes + converters into the van ---- */
  if(want(4)){await setup([0,1]);
    const R=await run(4,()=>p.evaluate(async()=>{const H=window.__ht,T=window.__T;const r={en:H.enemies.length,bikes:H.L.items.length,conv:H.L.bonus.length};T.neutralise(true);
      const van=H.M.car;for(const it of[...H.L.items,...H.L.bonus]){T.tp(it.x+.5,it.z);T.hold(50);if(!H.carry){r.miss=(r.miss||0)+1;continue}
        const sd=Math.cos(van.yaw),sz=-Math.sin(van.yaw);H.P.pos.set(van.pos.x+sd*1.9,0,van.pos.z+sz*1.9);H.step(1);H.use=true;H.step(2)}
      r.loaded=H.M.bikes;r.converters=H.M.conv;r.exit=H.M.exitOpen;const sn=T.leave();if(H.M.state==='go'){r.leave=sn.slice(0,2);r.dbg={x:H.exitAt,p:[H.P.pos.x,H.P.pos.z],car:[H.M.car.pos.x,H.M.car.pos.z],van:H.M.car===H.VAN,cv:!!H.CV,near:!!H.nearCar(),carry:H.carry&&H.carry.kind,noCars:H.M.noCars}}return r}));
    paid(4,R,R=>R.r.loaded===6&&R.res.pay.some(l=>l.startsWith('bikes:'))&&R.res.pay.some(l=>l.startsWith('converters:')));
    await keep()}
  /* ---- W3 checks: leash, leaving the job, the separate-level fallback ---- */
  if(want(90)){const w=await p.evaluate(()=>{const H=window.__ht;if(H.mode!=='hub')H.enterHub();H.step(2);H.startMission(3);H.step(5);const r={lvl:H.L.def.id};
      const e=H.enemies.find(e=>!e.boss&&e.state==='idle'),win=H.L.win;e.alert=true;e.pos.set((win.x1+12)*2,0,e.home.z);H.collide(e.pos,.35);const rc=()=>{const g=H.ow.gps({x:e.pos.x,z:e.pos.z},e.home);return g?Math.round(g.cost):-1};const d0=rc();H.step(300);
      r.leash={d0,d1:rc(),script:e.script&&e.script.kind,unit:'route cost'};
      const b=H.M.site.box;H.P.pos.set(b.x1+40,0,(b.z0+b.z1)/2);H.collide(H.P.pos,.35);for(let i=0;i<300&&H.M.state==='go';i++){H.P.pos.set(b.x1+40,0,(b.z0+b.z1)/2);H.step(1)}r.left=H.M.state;
      return r});
    await p.waitForTimeout(1400);
    const w2=await p.evaluate(()=>{const H=window.__ht;const txt=(document.querySelector('.ht-result')||document.body).innerText;H.enterHub();H.step(2);H.CFG.inWorld=false;H.startMission(0);H.step(3);const r={lvl:H.L.def.id,en:H.enemies.length,note:/windshield/.test(txt)};H.enterHub();H.CFG.inWorld=true;H.step(2);r.back=H.L.def.id;return r});
    ok(w.leash.d1<w.leash.d0-3,'leash: an enemy dragged 12 tiles outside the site window walks back toward his spawn ('+JSON.stringify(w.leash)+')');
    ok(w.left==='lost'&&w2.note,'leaving the job: 40 m outside the site for 8 s fails it with the windshield note');
    ok(w2.lvl==='gary'&&w2.back==='world','fallback: CFG.inWorld=false builds the old separate level ('+JSON.stringify(w2)+')')}
  ok(errs.length===0,'no console errors'+(errs.length?': '+errs.slice(0,4).join(' | '):''));
  log(fails?fails+' FAILED':'all passed');
  if(process.argv.includes('--write'))fs.writeFileSync(path.join(SHOT_DIR,'evidence.txt'),out.join('\n')+'\n');
  await b.close();process.exit(fails?1:0)})();
