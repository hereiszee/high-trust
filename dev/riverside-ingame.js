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
  T.pursue=(steps,o={})=>{/* chase like a player: pure pursuit along the getaway car's own trail, close in and ram; back out when wedged */
    let s=0;const cr=[];let ci=0,lp=null,recover=0;T.trace=[];T.recentres=0;
    const hd=(a,b)=>Math.atan2(b.x-a.x,b.z-a.z);
    for(;s<steps;s++){const ch=H.chase;if(!ch||ch.state!=='run'&&ch.state!=='exit'||H.M.state!=='go')break;const e=H.CV;if(!e)break;const c=ch.car;
      const lc=cr[cr.length-1];if(!lc||Math.hypot(c.x-lc.x,c.z-lc.z)>2)cr.push({x:c.x,z:c.z});
      const dCar=Math.hypot(c.x-e.pos.x,c.z-e.pos.z);
      let bj=ci,bd=1e9;for(let k=ci;k<Math.min(cr.length,ci+25);k++){const d=Math.hypot(cr[k].x-e.pos.x,cr[k].z-e.pos.z);if(d<bd){bd=d;bj=k}}ci=bj;
      const look=Math.max(5,Math.abs(e.spd)*.45)+(recover>0?0:2);let acc=0,t=ci;while(t<cr.length-1&&acc<look){acc+=Math.hypot(cr[t+1].x-cr[t].x,cr[t+1].z-cr[t].z);t++}
      let tx_=cr[t].x,tz_=cr[t].z;if(dCar<14&&bd<3&&c.hp<30){const f=HT.CarAI.fwd(c.yaw),lead=Math.max(0,c.spd)*.25;tx_=c.x+f[0]*lead;tz_=c.z+f[1]*lead}
      let turn=0;{let a2=0;for(let k=ci;k<cr.length-2&&a2<Math.max(18,Math.abs(e.spd)*1.2);k++){a2+=Math.hypot(cr[k+1].x-cr[k].x,cr[k+1].z-cr[k].z);let q=hd(cr[k+1],cr[k+2])-hd(cr[k],cr[k+1]);while(q>Math.PI)q-=6.283;while(q<-Math.PI)q+=6.283;turn+=Math.abs(q)}}
      let d=Math.atan2(-(tx_-e.pos.x),-(tz_-e.pos.z))-e.yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;
      let want=turn>1.1?7:turn>.6?10:turn>.3?16:40;if(bd>3)want=Math.min(want,9);if(Math.abs(d)>.5)want=Math.min(want,7);if(dCar<30){const fin=c.hp<30;want=fin?Math.max(want,c.spd+5):dCar<9?Math.max(0,c.spd-5):Math.max(Math.min(want,c.spd+(dCar-13)*.6),0)}/* hang back ~12 m so the crew can shoot; close in to finish */
      if(s%30===0){const mv=lp?Math.hypot(e.pos.x-lp.x,e.pos.z-lp.z):9;lp={x:e.pos.x,z:e.pos.z};
        if(mv<1.5&&s>30){/* wedged on a kerb or a lamp post: the test driver re-centres on a point of the getaway's own trail (counted in T.recentres) */
          T.rcN=T.rcAt===ci?(T.rcN||0)+2:0;T.rcAt=ci;const a=cr[Math.min(cr.length-1,Math.max(0,ci-1)+T.rcN)],b=cr[Math.min(cr.length-1,ci+2+T.rcN)];ci=Math.min(cr.length-1,Math.max(0,ci-1)+T.rcN);e.pos.set(a.x,0,a.z);e.yaw=Math.atan2(-(b.x-a.x),-(b.z-a.z));e.spd=0;if(e.car){e.car.x=a.x;e.car.z=a.z;e.car.yaw=e.yaw;e.car.spd=0}H.syncVan&&H.syncVan();T.recentres=(T.recentres||0)+1}}
      {k.w=e.spd<want;k.s=e.spd>want+2.5;k.a=d>.03;k.d=d<-.03;k.shift=want>25&&Math.abs(d)<.12}
      H.step(1);if(s%60===0)T.trace.push([Math.round(dCar),+e.spd.toFixed(0),Math.round(c.hp),Math.round(e.car.hp),Math.round(e.pos.x),Math.round(e.pos.z)])}
    T.clear();return s};
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
  T.look=(x,y,z)=>{/* point the view (binoculars) at a world point */const c=H.camera.position,dx=x-c.x,dy=y-c.y,dz=z-c.z;H.P.yaw=Math.atan2(-dx,-dz);H.P.pitch=Math.atan2(dy,Math.hypot(dx,dz))};
  T.follow=(steps,stopIf)=>{/* escort: stay ~10 m behind Benny's truck */let s=0;for(;s<steps;s++){if(stopIf&&stopIf())break;const tr=H.truck;const e=H.CV;if(!tr||!e)break;const c=tr.car;
      const f={x:-Math.sin(c.yaw),z:-Math.cos(c.yaw)};let gx=c.x-f.x*9,gz=c.z-f.z*9;const dd=Math.hypot(gx-e.pos.x,gz-e.pos.z);
      /* well back (after an ambush): drive the roads to the truck instead of cutting across a block */
      if(dd>16){/* along the truck's own lane (the road it just took): project onto the polyline, aim 7 m further on */const ln=H.M.lane;let bi=0,bt=0,bd=1e9;
        for(let j=0;j<ln.length-1;j++){const A=ln[j],B=ln[j+1],ax=B.x-A.x,az=B.z-A.z,l2=ax*ax+az*az||1,t=Math.max(0,Math.min(1,((e.pos.x-A.x)*ax+(e.pos.z-A.z)*az)/l2)),q=Math.hypot(A.x+ax*t-e.pos.x,A.z+az*t-e.pos.z);if(q<bd){bd=q;bi=j;bt=t}}
        if(bi<=(c.ai.tr?c.ai.tr.i:ln.length)){let j=bi,px=ln[j].x+(ln[j+1].x-ln[j].x)*bt,pz=ln[j].z+(ln[j+1].z-ln[j].z)*bt,rem=7;
          while(j<ln.length-1){const B=ln[j+1],sg=Math.hypot(B.x-px,B.z-pz);if(sg>=rem){px+=(B.x-px)*rem/sg;pz+=(B.z-pz)*rem/sg;break}rem-=sg;px=B.x;pz=B.z;j++}gx=px;gz=pz}}
      const dx=gx-e.pos.x,dz=gz-e.pos.z;let d=Math.atan2(-dx,-dz)-e.yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;
      const want=Math.min(12,dd*.8);k.a=dd>2&&d>.06;k.d=dd>2&&d<-.06;
      /* facing well away (after an ambush) a car can't turn on the spot: crawl forward on full lock instead of waiting; wedged: back out */
      k.w=dd>2&&e.spd<(Math.abs(d)<1.4?want:3);k.s=e.spd>want+1.5||(Math.abs(d)>=1.4&&e.spd>4);
      if(dd>4&&Math.abs(e.spd)<.5)T.fst=(T.fst||0)+1;else T.fst=0;if(T.fst>45){for(let j=0;j<25;j++){k.w=false;k.s=true;k.a=d<0;k.d=d>0;H.step(1);s++}T.fst=0;k.s=false}
      H.step(1)}T.clear();return s};
  T.toCar=()=>{/* walk back to the ride and get in: driver's side, else the other side or the back if it's parked against something */const c=H.M.car;
    for(const [sx,sz] of[[1,0],[-1,0],[0,1],[0,-1]]){if(H.CV)break;const fx=-Math.sin(c.yaw),fz=-Math.cos(c.yaw),rx=Math.cos(c.yaw),rz=-Math.sin(c.yaw);
      H.P.pos.set(c.pos.x+rx*sx*2+fx*sz*3.2,0,c.pos.z+rz*sx*2+fz*sz*3.2);H.collide(H.P.pos,.35);for(let i=0;i<8&&!H.CV;i++){H.step(1);H.use=true;H.step(1)}}return !!H.CV};
  T.cuff=e=>{for(let i=0;i<60&&e.state==='surrender';i++){H.P.pos.set(e.pos.x+.9,0,e.pos.z);H.step(1);H.use=true;H.step(1)}return e.state};
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
  /* ---- 5 Pastor Dee: stakeout (binoculars), Dee walks her kids out, then the raid ---- */
  if(want(5)){await setup([0,1,4],20);
    const R=await run(5,()=>p.evaluate(async()=>{const H=window.__ht,T=window.__T;const r={phase:H.M.phase,inCar:!!H.CV,sus:[]};H.P.aim=true;
      for(let n=0;n<900&&H.M.phase==='stake';n++){const s=H.suspects.find(s=>!s.id&&!s.gone);if(s)T.look(s.pos.x,1.3,s.pos.z);H.step(1);if(n%60===0)r.sus.push(Math.round(H.M.sus))}
      H.P.aim=false;r.ids=H.M.ids;r.clean=H.M.clean;r.after=H.M.phase;await new Promise(r=>setTimeout(r,10));
      for(let n=0;n<200&&H.M.phase!=='raid';n++)H.step(1);r.raid=H.M.phase;r.en=H.enemies.length;r.courier=!!H.L.boss&&H.L.boss.tag&&H.L.boss.tag.textContent;
      T.neutralise(true);const b=H.L.boss;if(b&&b.state==='surrender')T.cuff(b);for(const s of H.L.stashes){T.tp(s.x+1.2,s.z);T.hold(55)}r.smashed=H.M.smashed;r.boss=H.M.bossDone;T.leave();return r}));
    paid(5,R,R=>R.r.ids===4&&R.r.raid==='raid'&&R.res.pay.some(l=>l.startsWith('ids:'))&&R.res.pay.some(l=>l.startsWith('stakeout:')));
    await keep();
    /* go loud: honk three times on the stakeout */
    const L2=await p.evaluate(()=>{const H=window.__ht,k=H.keys;H.startMissionWorld(5);H.step(3);for(let i=0;i<3;i++){k.h=true;H.step(1);k.h=false;H.step(2)}H.step(3);
      const r={sus:Math.round(H.M.sus),phase:H.M.phase,loud:H.M.loud,alerted:H.enemies.filter(e=>e.alert).length,en:H.enemies.length};H.enterHub();H.step(1);return r});
    ok(L2.phase==='raid'&&L2.loud&&L2.alerted===L2.en&&L2.en>0,'stakeout: three honks -> suspicion 100, the lookouts scatter, every enemy is alerted ('+JSON.stringify(L2)+')')}
  /* ---- 6 Rosa: garden defence via the wave director; Rosa revives a downed dad; she joins the crew ---- */
  if(want(6)){await setup([0,1,4,5],30);
    const R=await run(6,()=>p.evaluate(()=>{const H=window.__ht,T=window.__T;const r={beds0:H.M.bedsN};let rev=null;
      for(let n=0;n<4000&&H.M.state==='go';n++){H.P.hp=100;
        if(n===200){const ro=H.allies.find(a=>a.id==='rosa'),a=H.allies.find(a=>a.id==='dave');a.pos.set(ro.pos.x+5,0,ro.pos.z);H.collide(a.pos,.35);H.hurtAlly(a,999);rev={a,t:0}}
        if(rev&&rev.a.down)rev.t++;else if(rev&&!rev.done){rev.done=true;r.reviveS=+(rev.t/30).toFixed(2)}
        if(n%20===0)for(const e of H.enemies)if(e.state==='idle'&&H.M.waveAge>3)(n%40?H.hurtEnemy(e,999,'player'):H.surrender(e));
        for(const e of H.enemies)if(e.state==='surrender')T.cuff(e);H.step(1)}
      r.state=H.M.state;r.wave=H.M.wave;r.beds=H.M.payX.beds;r.rosa=H.save&&H.save.crew.rosa;return r}));
    paid(6,R,R=>R.r.reviveS>0&&R.r.reviveS<=3.5&&R.r.rosa);
    ok(R&&R.r.reviveS>0&&R.r.reviveS<=3.5,'Rosa revives a downed crew member in '+(R&&R.r.reviveS)+' s (9 s without her)');
    await shot('garden-defence-after');await keep();
    const rc=await p.evaluate(()=>{const H=window.__ht;return H.allies.map(a=>a.id+':'+(a.tag&&a.tag.textContent))});ok(rc.some(x=>/Honorary Dad/.test(x)),'Rosa follows the crew in the hub as the honorary dad ('+rc.join(', ')+')')}
  /* ---- 7 Benny: escort with three ambushes, the twist, the truck chase ---- */
  if(want(7)){await setup([0,1,4,5,6],40);
    const R=await run(7,()=>p.evaluate(()=>{const H=window.__ht,T=window.__T;const r={phase:H.M.phase,amb:[]};
      for(let guard=0;guard<12&&H.M.state==='go'&&(H.M.phase==='escort'||H.M.phase==='ambush');guard++){
        T.follow(2400,()=>H.M.phase!=='escort');if(H.M.phase==='ambush'){const t0=H.M.amb;H.step(20);if(H.CV)H.exitVehicle();H.step(10);T.neutralise(true);H.step(5);r.amb.push({i:t0,truck:Math.round(H.truck.car.hp)});T.toCar();H.step(30)}}
      r.court=H.M.phase;for(let n=0;n<200&&H.M.phase==='court';n++)H.step(1);r.chase=H.M.phase;r.truckHp=H.M.payX.truckHp;
      if(!H.CV)T.toCar();const ps=T.pursue(3600);r.pursueS=ps;const ch=H.chase;r.stop=ch&&ch.state;r.rams=ch&&ch.rams;r.Mst=H.M.state;r.van=H.CV&&Math.round(H.CV.car.hp);r.vanDmg=H.M.vanDmg;r.why=H.M.state!=='go'&&(document.querySelector('.ht-result')||{}).innerText;r.gap=ch&&Math.round(Math.hypot(ch.car.x-H.P.pos.x,ch.car.z-H.P.pos.z));
      if(H.CV)H.exitVehicle();H.step(2);const d=H.M.driver;if(d){for(let n=0;n<300&&d.state==='idle';n++){H.P.pos.set(d.pos.x+3,0,d.pos.z);H.collide(H.P.pos,.35);H.step(1)}if(d.state==='idle')H.hurtEnemy(d,999,'player');T.cuff(d)}
      r.driver=d&&d.state;r.exit=H.M.exitOpen;T.toCar();H.step(3);return r}));
    paid(7,R,R=>R.r.amb.length===3&&R.r.stop==='stopped');}
  /* ---- 2 Big Dave: hold Linden Park through the waves (in the world) ---- */
  if(want(2)){await setup([0,1],null);
    const R=await run(2,()=>p.evaluate(()=>{const H=window.__ht,T=window.__T;const r={lvl:H.L.def.id,dir:!!H.M.dir};
      for(let n=0;n<4000&&H.M.state==='go';n++){H.P.hp=100;if(n%20===0)for(const e of H.enemies)if(e.state==='idle'&&H.M.waveAge>3)(n%40?H.hurtEnemy(e,999,'player'):H.surrender(e));for(const e of H.enemies)if(e.state==='surrender')T.cuff(e);H.step(1)}
      r.state=H.M.state;r.wave=H.M.wave;return r}));
    paid(2,R,R=>R.r.lvl==='world'&&R.r.state==='won');await keep()}
  /* ---- 3 Doug: the Kingpin's compound (in the world) ---- */
  if(want(3)){await setup([0,1,2],null);
    const R=await run(3,()=>p.evaluate(()=>{const H=window.__ht,T=window.__T;const b=H.L.boss;const r={lvl:H.L.def.id,boss:!!b};for(const e of H.enemies)if(e!==b&&e.state==='idle')H.hurtEnemy(e,999,'player');
      H.hurtEnemy(b,b.hp-b.maxhp*.15,'player');H.step(2);if(b.state!=='surrender')H.surrender(b);T.cuff(b);r.bossDone=H.M.bossDone;T.leave();return r}));
    paid(3,R,R=>R.r.bossDone==='cuffed'&&R.res.pay.some(l=>l.startsWith('bail:')));await keep()}
  /* ---- 8 The Duke: yard, he runs, the getaway chase, cuff him; the finale ---- */
  if(want(8)){await setup([0,1,2,3,4,5,6,7],55);
    const R=await run(8,()=>p.evaluate(()=>{const H=window.__ht,T=window.__T;const r={};const b=H.L.boss;r.duke=b.tag&&b.tag.textContent;r.hp=b.maxhp;
      for(const e of H.enemies)if(e!==b&&e.state==='idle')H.hurtEnemy(e,999,'player');H.hurtEnemy(b,b.maxhp*.56,'player');H.step(2);r.flee=b.script&&b.script.kind;
      for(let n=0;n<600&&H.M.phase!=='chase';n++)H.step(1);r.phase=H.M.phase;T.toCar();const ps=T.pursue(4200);const ch=H.chase;r.pursueS=ps;r.stop=ch&&ch.state;r.rams=ch&&ch.rams;r.pits=ch&&ch.pits;r.vanHp=H.CV&&Math.round(H.CV.car.hp);
      if(H.CV)H.exitVehicle();H.step(2);for(let n=0;n<600&&b.state!=='surrender'&&b.state!=='dead';n++){H.P.pos.set(b.pos.x+4,0,b.pos.z);H.collide(H.P.pos,.35);H.step(1)}T.cuff(b);r.bossDone=H.M.bossDone;
      T.toCar();H.step(3);return r}));
    paid(8,R,R=>R.r.stop==='stopped'&&R.r.bossDone==='cuffed'&&R.res.pay.some(l=>l==='bail:600'));
    const fin=await p.evaluate(async()=>{const H=window.__ht;const a=H.UIacts['result:retry'];if(a)a();H.step(2);await new Promise(r=>setTimeout(r,300));const rs=[...document.querySelectorAll('.ht-result')],t=(rs[rs.length-1]||document.body).innerText;return{finale:/One month later/i.test(t),both:/Riverside/i.test(t),acts:Object.keys(H.UIacts||{}),done:H.prog.done.join(''),mode:H.mode,scr:H.HUD.screen,t:t.slice(0,80)}});
    await shot('finale-card');
    ok(fin.finale&&fin.both,'finale after The Duke: the Act 2 card (both neighbourhoods) with New Saturday / Keep driving ('+JSON.stringify(fin)+')');
    await p.evaluate(()=>{const H=window.__ht;const a=H.UIacts['result:retry'];if(a)a();H.step(2)})}
  /* ---- chases across seeds: win (pursuit bot, ram + crew fire) and fail (nobody chases) ---- */
  if(want(91)){const rows=[];for(let seed=1;seed<=SEEDS;seed++){const w=await p.evaluate(seed=>{const H=window.__ht,T=window.__T;H.prog.done.fill(true);H.prog.done[8]=false;H.startMissionWorld(8,{checkpoint:'chase'});H.step(2);
        const ch=H.chase;ch.seed=seed;HT.CarAI.flee(ch.car,H.ow.roads(),{max:27,seed,rnd:H.wmRng(seed),threat:{x:H.CV.pos.x,z:H.CV.pos.z}});
        const s=T.pursue(4500);const r={seed,tr:null,dmg:H.M.vanDmg,rc:T.recentres,st:ch.state,t:Math.round(s/30),rams:ch.rams,pits:ch.pits,van:Math.round(H.CV?H.CV.car.hp:-1),M:H.M.state};
        if(ch.state==='stopped'){if(H.CV)H.exitVehicle();const b=H.L.boss;for(let n=0;n<600&&b.state!=='surrender'&&b.state!=='dead';n++){H.P.pos.set(b.pos.x+4,0,b.pos.z);H.collide(H.P.pos,.35);H.step(1)}T.cuff(b);T.toCar();H.step(3);r.M=H.M.state}
        H.enterHub();H.step(1);return r},seed);
      const f=await p.evaluate(seed=>{const H=window.__ht;H.startMissionWorld(8,{checkpoint:'chase'});H.step(2);const ch=H.chase;HT.CarAI.flee(ch.car,H.ow.roads(),{max:27,seed,rnd:H.wmRng(seed),threat:{x:H.CV.pos.x,z:H.CV.pos.z}});
        H.exitVehicle();let n=0;for(;n<2400&&H.M.state==='go';n++)H.step(1);const r={seed,M:H.M.state,t:Math.round(n/30),cp:H.M.checkpoint};H.enterHub();H.step(1);return r},seed);rows.push([w,f])}
    const wins=rows.filter(([w])=>w.M==='won').length,fl=rows.filter(([,f])=>f.M==='lost'&&f.cp==='chase').length;
    ok(wins===SEEDS,'chase win path: the pursuit bot stops the Duke and he is cuffed on '+wins+'/'+SEEDS+' seeds '+JSON.stringify(rows.map(([w])=>[w.seed,w.st,w.t+'s','rams '+w.rams,'pits '+w.pits,'van '+w.van,'re-centred '+w.rc,w.dmg&&Object.values(w.dmg).map(Math.round).join('/')])));
    ok(fl===SEEDS,'chase fail path: nobody follows -> he escapes, the job fails with a chase checkpoint on '+fl+'/'+SEEDS+' seeds ('+rows.map(([,f])=>f.t+'s').join(' ')+')')}
  /* ---- W3 checks: leash, leaving the job, the separate-level fallback ---- */
  if(want(90)){const w=await p.evaluate(()=>{const H=window.__ht;if(H.mode!=='hub')H.enterHub();H.step(2);H.startMission(3);H.step(5);const r={lvl:H.L.def.id};
      const e=H.enemies.find(e=>!e.boss&&e.state==='idle'),win=H.L.win;e.alert=true;e.pos.set((win.x1+12)*2,0,e.home.z);H.collide(e.pos,.35);const rc=()=>{const g=H.ow.gps({x:e.pos.x,z:e.pos.z},e.home);return g?Math.round(g.cost):-1};const d0=rc();H.step(300);
      r.leash={d0,d1:rc(),script:e.script&&e.script.kind,unit:'route cost'};
      const b=H.M.site.box;H.P.pos.set(b.x1+40,0,(b.z0+b.z1)/2);H.collide(H.P.pos,.35);for(let i=0;i<300&&H.M.state==='go';i++){H.P.pos.set(b.x1+40,0,(b.z0+b.z1)/2);H.step(1)}r.left=H.M.state;
      return r});
    await p.waitForTimeout(1400);
    const w2=await p.evaluate(()=>{const H=window.__ht;const rs=[...document.querySelectorAll('.ht-result')],txt=(rs[rs.length-1]||document.body).innerText;H.enterHub();H.step(2);H.CFG.inWorld=false;H.startMission(0);H.step(3);const r={lvl:H.L.def.id,en:H.enemies.length,note:/windshield/.test(txt)};H.enterHub();H.CFG.inWorld=true;H.step(2);r.back=H.L.def.id;return r});
    ok(w.leash.d1<w.leash.d0-3,'leash: an enemy dragged 12 tiles outside the site window walks back toward his spawn ('+JSON.stringify(w.leash)+')');
    ok(w.left==='lost'&&w2.note,'leaving the job: 40 m outside the site for 8 s fails it with the windshield note');
    ok(w2.lvl==='gary'&&w2.back==='world','fallback: CFG.inWorld=false builds the old separate level ('+JSON.stringify(w2)+')');
    const gt=await p.evaluate(()=>{const H=window.__ht,T=window.__T;H.prog.done.fill(false);H.prog.done[0]=H.prog.done[1]=H.prog.done[4]=true;H.prog.trustR=10;H.enterHub();H.step(2);const g=T.giver(5);
      const n=H.npcs.find(n=>n.marker.i===5);H.P.pos.set(n.pos.x+1.6,0,n.pos.z);H.collide(H.P.pos,.35);H.step(1);H.use=true;H.step(1);const brief=!!(H.UIacts&&H.UIacts['brief:go']);
      H.prog.trustR=16;H.enterHub();H.step(2);const g2=T.giver(5);return{g,brief,g2,lock:H.jobLock(5)}});
    ok(gt.g&&gt.g.locked&&/trust 15/.test(gt.g.tag)&&!gt.brief&&gt.g2&&!gt.g2.locked,'gates: at Riverside trust 10 Pastor Dee says "needs Riverside trust 15%" and offers no brief; at 16 she does ('+JSON.stringify(gt)+')')}
  ok(errs.length===0,'no console errors'+(errs.length?': '+errs.slice(0,4).join(' | '):''));
  log(fails?fails+' FAILED':'all passed');
  if(process.argv.includes('--write'))fs.writeFileSync(path.join(SHOT_DIR,'evidence.txt'),out.join('\n')+'\n');
  await b.close();process.exit(fails?1:0)})();
