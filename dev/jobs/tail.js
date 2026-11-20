/* Following Distance: play it by script, log the tail (distance, band, suspicion, familiarity, sight, cover), print every radio
   line with its time so pacing and jokes can be read as a transcript, and take a screenshot of every stage.
   node dev/jobs/tail.js [--shots] [--frames=n] [--every=n] [--fail] [--touch] [--throttle=4] [--out=dir]
   Uses the job's own bot (test.step), driving with the keys on the real roads. --throttle uses CDP CPU throttling (slow machine). */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:process.argv.includes('--'+k)?true:d};
const FAILAT=arg('failat',''),SHOTS=!!arg('shots',false),FR=+arg('frames',14000),EVERY=+arg('every',150),FAIL=!!arg('fail',false),TOUCH=!!arg('touch',false),THR=+arg('throttle',0),
  OUT=path.resolve(__dirname,'../../',arg('out','docs/screenshots/jobs/tail'));
(async()=>{const {b,p,errs}=await open(TOUCH?{viewport:{width:844,height:390}}:{});const ev=(f,a)=>p.evaluate(f,a);if(SHOTS)fs.mkdirSync(OUT,{recursive:true});
  if(THR){const c=await p.context().newCDPSession(p);await c.send('Emulation.setCPUThrottlingRate',{rate:THR});console.log('CPU throttled x'+THR)}
  const shot=async(n,prep)=>{if(!SHOTS)return;if(prep)await ev(prep);await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(700);await ev(()=>{window.__rafOn=false});
    const cl=await ev(()=>{const H=window.__ht;try{H.ow&&H.ow.buildAll&&H.ow.buildAll();H.ow&&H.ow.update&&H.ow.update(H.camera)}catch(_){}H.draw();const h=document.querySelector('.ht-hud');return h?h.className+' scr='+[...document.querySelectorAll('.ht-root > div')].filter(e=>!e.hidden&&e.children.length).map(e=>e.className+':'+[...e.children].map(c=>c.className).join(',')).join(' | ').slice(0,400):'none'});if(!/^ht-hud$/.test(cl))console.log('  (hud classes: '+cl+')');await p.screenshot({path:path.join(OUT,(TOUCH?'touch-':'')+n+'.jpg'),type:'jpeg',quality:84});console.log('  shot '+n)};
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  if(SHOTS)await ev(async()=>{const H=window.__ht;try{H.render.apply('high')}catch(_){}for(let i=0;i<60&&H.assets.stream&&!H.assets.stream.idle();i++)await new Promise(r=>setTimeout(r,500))});
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('tail'),a=H.jobs.api;for(const d of j.def.unlock.done){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true}j.test.give(a);H.enterHub();H.step(3)});
  const g=await ev(()=>{const H=window.__ht,i=H.jobs.index('tail');const n=H.npcs.find(n=>n.marker&&n.marker.i===i);if(!n)return{err:'no giver'};H.P.pos.set(n.pos.x+1.6,0,n.pos.z+1);H.collide(H.P.pos,.35);H.P.yaw=Math.atan2(1.6,1);H.P.pitch=-.08;H.step(3);H.use=true;H.step(1);window.__go=H.UIacts&&H.UIacts['brief:go'];return{brief:!!window.__go}});
  console.log('giver',JSON.stringify(g));await shot('00-brief');
  await ev(()=>{const H=window.__ht;((H.UIacts&&H.UIacts['brief:go'])||window.__go)();H.step(2)});
  /* park in the north-west corner of the Fill-Er-Up lot */
  const st=arg('harness',false)?await ev(()=>{/* the way dev/jobs-check.js arrives: drive in from the nearest road */const H=window.__ht,i=H.jobs.index('tail'),d=H.L.dests[i],G=H.ow.roads(),V=H.VAN,k=H.keys;if(H.CV)H.exitVehicle();
    const r=G.nearestRoad(d.x,d.z),A_=G.nodes[r.a],B_=G.nodes[r.b],far=Math.hypot(A_.x-d.x,A_.z-d.z)>Math.hypot(B_.x-d.x,B_.z-d.z)?A_:B_;V.pos.set(far.x,0,far.z);V.yaw=Math.atan2(-(d.x-far.x),-(d.z-far.z));V.spd=0;if(V.car)V.car.spd=0;H.syncVan();
    H.P.pos.set(far.x+2.5,0,far.z);H.enterVan();H.step(2);const e=H.CV;for(let s=0;s<2400&&H.mode==='hub';s++){const dx=d.x-e.pos.x,dz=d.z-e.pos.z,d0=Math.hypot(dx,dz);let dd=Math.atan2(-dx,-dz)-e.yaw;while(dd>Math.PI)dd-=6.283;while(dd<-Math.PI)dd+=6.283;
      const want=d0<12?Math.max(1.5,d0*.4):13;k.a=dd>.05;k.d=dd<-.05;k.w=e.spd<want;k.s=e.spd>want+2;H.step(1)}for(const x of['w','a','s','d'])k[x]=false;return{mode:H.mode,id:H.M&&H.M.def.id}})
  :await ev(()=>{const H=window.__ht,i=H.jobs.index('tail'),d=H.L.dests[i],V=H.VAN;if(H.CV)H.exitVehicle();V.pos.set(d.x,0,d.z+3);V.yaw=0;V.spd=0;H.syncVan&&H.syncVan();H.P.pos.set(d.x+2.5,0,d.z+3);H.enterVan();H.step(2);
    V.pos.set(d.x,0,d.z);if(V.car){V.car.x=d.x;V.car.z=d.z;V.car.yaw=0}H.syncVan&&H.syncVan();for(let k=0;k<60&&H.mode!=='mission';k++)H.step(1);return{mode:H.mode,id:H.M&&H.M.def.id}});
  console.log('start',JSON.stringify(st));if(st.mode!=='mission'){console.log(errs);await b.close();process.exit(1)}
  /* staged screenshot cameras (a dev-only system camera hook): window.__CAM={pos:[x,y,z],look:[x,y,z]} */
  await ev(()=>{const H=window.__ht;window.HT.Jobs.on('camera',()=>{const C=window.__CAM;if(!C)return undefined;const c=H.camera;
    if(C.follow){/* behind and above the dad's car, looking at the sedan: shows the gap and whatever is in it */const e=H.CV,t=H.M&&H.M.tg&&H.M.tg.rail;if(!e||!t)return undefined;const dx=t.x-e.pos.x,dz=t.z-e.pos.z,l=Math.hypot(dx,dz)||1;
      c.position.set(e.pos.x-dx/l*C.back,C.up,e.pos.z-dz/l*C.back);c.lookAt(t.x,1,t.z);c.fov=C.fov||50;c.updateProjectionMatrix();return true}
    c.position.set(...C.pos);c.lookAt(...C.look);c.fov=C.fov||60;c.updateProjectionMatrix();return true})});
  const cam=(pos,look,fov)=>ev(([p,l,f])=>{window.__CAM=p&&p.follow?p:{pos:p,look:l,fov:f}},[pos,look,fov]),camOff=()=>ev(()=>{window.__CAM=null});
  await ev(()=>{const H=window.__ht,a=H.jobs.api;window.__T={t:0,lines:[]};const T=window.__T;const r0=a.radio;a.radio=(w,t,f)=>{T.lines.push([(H.M?H.M.elapsed:0).toFixed(1),w,t]);return r0(w,t,f)};
    const f0=a.feed;a.feed=(t,k,s)=>{T.lines.push([(H.M?H.M.elapsed:0).toFixed(1),'[feed]',t+(s?' · '+s:'')]);return f0(t,k,s)}});
  await ev(()=>window.__ht.step(150));await cam([203,5,22],[226,1.2,29],52);await shot('01-gas');await camOff();
  const shots={tail:'02-tail',swap:'04-swap',drop:'06-drop',home:'09-home'},taken={};let last='';
  let failNow=FAIL,retried=false;
  for(let f=0;f<FR;f+=EVERY){
    const r=await ev(([n,fail])=>{const H=window.__ht,j=H.jobs.registry.get('tail'),a=H.jobs.api,T=window.__T;let i=0;
      for(;i<n&&H.M&&H.M.state==='go';i++){j.test.step(a,T.t++,{fail});H.P.hp=Math.max(H.P.hp,60);H.step(1)}
      const M=H.M;if(!M)return{done:true};const tg=M.tg&&M.tg.rail,e=H.CV,S=M.T&&M.T.S;
      return{state:M.state,ph:M.ph,stage:M.stage,el:+M.elapsed.toFixed(1),ts:tg?Math.round(tg.s):0,tv:tg?+tg.v.toFixed(1):0,hold:tg&&tg.holding?tg.holding.kind:'',
        d:tg&&e?Math.round(Math.hypot(tg.x-e.pos.x,tg.z-e.pos.z)):-1,sus:S?Math.round(S.sus):0,max:S?Math.round(S.maxSus):0,fam:S?+(S.fam[S.carId]||0).toFixed(2):0,lose:S?+S.lose.toFixed(1):0,los:M.los,why:S?S.why:null,streak:S?S.streak:0,
        x:e?Math.round(e.pos.x):0,z:e?Math.round(e.pos.z):0,yaw:e?+e.yaw.toFixed(2):0,wp:M.bot&&M.bot.wp,g:M.bot&&M.bot.g!=null?Math.round(M.bot.g):null,want:M.bot&&M.bot.want!=null?+M.bot.want.toFixed(1):null,car:e?(e===H.VAN?'van':e.name+':'+e.type):'foot',spd:e?+(e.car?e.car.spd:0).toFixed(1):0,cov:(M.covers||[]).length,onc:(M.oncoming||[]).length,items:Object.keys(M.items||{}).length,ho:M.handoff||'',vf:!!M.vfOn,photo:!!M.photo}},[EVERY,failNow]);
    if(r.done)break;console.log(JSON.stringify(r));
    if(r.stage&&shots[r.stage]&&!taken[r.stage]){taken[r.stage]=1;await shot(shots[r.stage])}
    if(r.ph==='tail'&&r.hold==='light'&&!taken.light){taken.light=1;await cam({follow:true,back:10,up:6.5,fov:48});await shot('05-light');await camOff()}
    if(r.ph==='tail'&&r.ts>180&&r.cov>0&&r.d>22&&r.d<55&&!taken.cover){taken.cover=1;await cam({follow:true,back:9,up:5.5,fov:50});await shot('02b-cover');await camOff()}
    if(r.ph==='tail'&&r.hold==='pull'&&!taken.pull){taken.pull=1;await shot('03-swap-window')}
    if(r.ph==='drop'&&r.ho==='go'&&r.items>=1&&!taken.lot){taken.lot=1;await ev(()=>{window.__ht.P.aim=false});await cam([427,7,123],[398,1.2,138],38);await shot('06b-handoff');await camOff()}
    if(r.ph==='drop'&&r.ho==='go'&&r.vf&&r.items>=2&&!taken.bino){taken.bino=1;await shot('07-binoculars')}
    if(r.ph==='drop'&&r.ho==='done'&&r.vf&&!taken.plate){taken.plate=1;await shot('08-plate')}
    /* --failat=<stage>: once that stage is reached, tailgate until he spooks, then "Retry from <stage>" and carry on */
    if(FAILAT&&!retried&&r.stage===FAILAT&&r.state==='go')failNow=true;
    if(FAILAT&&!retried&&r.state==='lost'){retried=true;failNow=false;await ev(()=>window.__ht.step(45));const rt=await ev(()=>{const H=window.__ht;const lab=[...document.querySelectorAll('button')].map(e=>e.textContent.trim()).filter(t=>/Retry|Restart/.test(t));H.UIacts['result:retry']();H.step(3);return{lab,state:H.M.state,stage:H.M.stage,retried:H.M.retried,car:H.CV?(H.CV===H.VAN?'van':H.CV.name):'foot',van:[Math.round(H.VAN.pos.x),Math.round(H.VAN.pos.z)]}});console.log('RETRY',JSON.stringify(rt));continue}
    if(r.state!=='go')break}
  await ev(()=>window.__ht.step(40));await p.waitForTimeout(1500);await shot('10-result');
  if(arg('again',false)){/* a second run straight after (like a replay): the swap car is wherever the first run left it */
    const r2=await ev(()=>{const H=window.__ht,j=H.jobs.registry.get('tail'),a=H.jobs.api;H.UIacts['result:go']&&H.UIacts['result:go']();H.step(5);H.jobs.start('tail',{replay:true});H.step(3);const M=H.M;
      const sw=M.swapCar?{name:M.swapCar.name,x:Math.round(M.swapCar.pos.x),z:Math.round(M.swapCar.pos.z)}:null;let t=0;for(;t<12000&&H.M&&H.M.state==='go';t++){j.test.step(a,t,{});H.P.hp=Math.max(H.P.hp,60);H.step(1)}
      return{sw,state:H.M&&H.M.state,stage:H.M&&H.M.stage,el:H.M&&Math.round(H.M.elapsed),swaps:H.M&&H.M.swaps}});console.log('again',JSON.stringify(r2))}
  const T=await ev(()=>{const H=window.__ht,M=H.M;return{lines:window.__T.lines,pay:M&&M.pay?M.pay.lines.map(l=>l.label+':'+l.amount):null,total:M&&M.pay&&M.pay.total,medal:M&&M.medal,state:M&&M.state,el:M&&Math.round(M.elapsed)}});
  console.log('\n--- transcript ---');for(const l of T.lines)console.log(l[0].padStart(6)+'  '+l[1]+': '+l[2]);
  console.log('\nresult',JSON.stringify({state:T.state,el:T.el,medal:T.medal,total:T.total,pay:T.pay}));
  const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'console errors: '+bad.slice(0,6).join(' | '):'no console errors');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
