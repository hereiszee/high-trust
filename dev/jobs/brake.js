/* Brake Check: play it by script at the game's own pace, check every scripted lane for static colliders (his lane, his nine / the
   oncoming lane, the crew's way off the lot), log the box (slots held, phase, speeds, flags), print every radio line with its time,
   and take a screenshot of every stage. Uses the job's own bot (test.step: it drives with the keys).
   node dev/jobs/brake.js [--play=sandwich|fence] [--shots] [--frames=n] [--every=n] [--fail] [--failat=chase] [--runs=n] [--out=dir] */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:process.argv.includes('--'+k)?true:d};
const PLAY=arg('play',''),SHOTS=!!arg('shots',false),FR=+arg('frames',12000),EVERY=+arg('every',90),FAIL=!!arg('fail',false),QUIET=!!arg('quiet',false),
  OUT=path.resolve(__dirname,'../../',arg('out','docs/screenshots/jobs/brake'));
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);if(SHOTS)fs.mkdirSync(OUT,{recursive:true});
  const shot=async(n,prep)=>{if(!SHOTS)return;if(prep)await ev(prep);await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(700);await ev(()=>{window.__rafOn=false});
    await ev(()=>{const H=window.__ht;try{H.ow&&H.ow.buildAll&&H.ow.buildAll();H.ow&&H.ow.update&&H.ow.update(H.camera)}catch(_){}H.draw()});await p.screenshot({path:path.join(OUT,n+'.jpg'),type:'jpeg',quality:84});console.log('  shot '+n)};
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  if(SHOTS)await ev(async()=>{const H=window.__ht;try{H.render.apply('high')}catch(_){}for(let i=0;i<60&&H.assets.stream&&!H.assets.stream.idle();i++)await new Promise(r=>setTimeout(r,500))});
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('brake'),a=H.jobs.api;for(const d of j.def.unlock.done){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true}j.test.give(a);H.enterHub();H.step(3)});
  await p.evaluate(async()=>{const H=window.__ht,pm=window.HT&&HT.People;if(pm&&pm.preload)await Promise.race([pm.preload(H.jobs.castKeys('brake')).catch(()=>{}),new Promise(r=>setTimeout(r,20000))])});
  await ev(()=>{const H=window.__ht;if(H.mode==='hub'){H.enterHub();H.step(2)}});
  const g=await ev(()=>{const H=window.__ht,i=H.jobs.index('brake');const n=H.npcs.find(n=>n.marker&&n.marker.i===i);if(!n)return{err:'no giver'};H.P.pos.set(n.pos.x+1.6,0,n.pos.z+1);H.collide(H.P.pos,.35);H.P.yaw=Math.atan2(1.6,1);H.P.pitch=-.08;H.step(3);H.use=true;H.step(1);window.__go=H.UIacts&&H.UIacts['brief:go'];return{brief:!!window.__go}});
  console.log('giver',JSON.stringify(g));await shot('00-brief');
  await ev(()=>{const H=window.__ht;((H.UIacts&&H.UIacts['brief:go'])||window.__go)();H.step(2)});
  const st=await ev(()=>{const H=window.__ht,i=H.jobs.index('brake'),d=H.L.dests[i],V=H.VAN;if(H.CV)H.exitVehicle();V.pos.set(d.x-8,0,d.z);V.yaw=-Math.PI/2;V.spd=0;H.syncVan&&H.syncVan();H.P.pos.set(d.x-8,0,d.z+2.5);H.enterVan();H.step(2);
    V.pos.set(d.x,0,d.z);if(V.car){V.car.x=d.x;V.car.z=d.z}H.syncVan&&H.syncVan();for(let k=0;k<60&&H.mode!=='mission';k++)H.step(1);return{mode:H.mode,id:H.M&&H.M.def.id}});
  if(st.mode!=='mission'){await p.evaluate(async()=>{const w=window.__ht.jobs.castWait;if(w)await w;window.__ht.step(2)})}
  console.log('start',JSON.stringify(await ev(()=>({mode:window.__ht.mode,id:window.__ht.M&&window.__ht.M.def.id}))));
  /* every lane the scripted cars use: no static collider within a car's half-width (his lane and his nine; the crew's way off the lot) */
  const clear=await ev(()=>{const H=window.__ht,M=H.M,L=H.L,T=window.HT.Tail;if(!M||!M.P)return{err:'no route'};const job=new Set(M.all.map(c=>c.e.col));const bad=[];
    const test=(q,tag)=>{const r=.95;for(const c of L.colliders){if(job.has(c)||c.k==='traffic'||c.x1-c.x0>60||c.z1-c.z0>60)continue;if(q.x+r>c.x0&&q.x-r<c.x1&&q.z+r>c.z0&&q.z-r<c.z1){bad.push([tag,Math.round(q.x),Math.round(q.z),c.k||'?']);return}}};
    for(const lat of[0,-3.05])for(let s=lat?20:0;s<M.P.len;s+=1){const a=M.P.at(s),rv=[Math.cos(a.yaw),-Math.sin(a.yaw)];test({x:a.x+rv[0]*lat,z:a.z+rv[1]*lat},'lat'+lat+'@'+Math.round(s))}
    for(const id of['rick','dave']){const c=M.crew[id];const P=T.poly([[c.x,c.z],[c.x+6,c.z],[238,35.7],[241.2,36.4],[243.4,38.2]].map(([x,z])=>({x,z})));for(let s=0;s<P.len;s+=.5)test(P.at(s),id+'@'+s.toFixed(1))}
    return{len:Math.round(M.P.len),blocked:bad.length,first:bad.slice(0,10)}});
  console.log('route clear',JSON.stringify(clear));
  await ev(()=>{const H=window.__ht,a=H.jobs.api;window.__T={t:0,lines:[]};const T=window.__T;const r0=a.radio;a.radio=(w,t,f)=>{T.lines.push([(H.M?H.M.elapsed:0).toFixed(1),w,t]);return r0(w,t,f)};
    const f0=a.feed;a.feed=(t,k,s)=>{T.lines.push([(H.M?H.M.elapsed:0).toFixed(1),'[feed]',t+(s?' · '+s:'')]);return f0(t,k,s)}});
  await ev(()=>window.__ht.step(30));await shot('01-huddle');
  const taken={};let failNow=FAIL;
  for(let f=0;f<FR;f+=EVERY){
    const r=await ev(([n,fail,play])=>{const H=window.__ht,j=H.jobs.registry.get('brake'),a=H.jobs.api,T=window.__T;let i=0;
      for(;i<n&&H.M&&H.M.state==='go';i++){j.test.step(a,T.t++,{fail,play:play||undefined});H.P.hp=Math.max(H.P.hp,60);H.step(1)}
      const M=H.M;if(!M)return{done:true};const tg=M.tg,e=H.CV,pr=M.pr;
      return{state:M.state,ph:M.ph,stage:M.stage,el:+M.elapsed.toFixed(1),play:M.play,box:M.boxPh,bt:M.box?+M.box.t.toFixed(1):0,held:(M.held.you?'Y':'-')+(M.held.rick?'R':'-')+(M.held.dave?'D':'-'),
        ts:tg?Math.round(tg.s):0,tv:tg?+tg.v.toFixed(1):0,tlat:tg?+tg.lat.toFixed(1):0,ai:M.ai&&M.ai.mode||'',ps:pr?Math.round(pr.s-tg.s):null,plat:pr?+pr.lat.toFixed(1):null,pv:e?+(e.car?e.car.spd:0).toFixed(1):0,
        rk:M.crew&&M.crew.rick?[Math.round(M.crew.rick.s-tg.s),+M.crew.rick.lat.toFixed(1),M.crew.rick.st]:null,dv:M.crew&&M.crew.dave?[Math.round(M.crew.dave.s-tg.s),+M.crew.dave.lat.toFixed(1)]:null,
        civ:(M.civs||[]).length,flags:M.flags,ch:M.civHits,kiss:M.civKiss,run:M.run&&M.run.st,cash:M.cash&&M.cash.st,hp:e&&H.carFrac?Math.round(H.carFrac(e)*100):null,bot:M.botDbg}},[EVERY,failNow,PLAY]);
    if(r.done)break;if(!QUIET)console.log(JSON.stringify(r));
    if(r.ph==='chase'&&!taken.snap&&r.ts>10){taken.snap=1;await shot('02-snap')}
    if(r.ph==='chase'&&r.held.length&&/Y/.test(r.held)&&!taken.slot){taken.slot=1;await shot('03-slot')}
    if(r.ph==='chase'&&r.ai&&!taken['ai'+r.ai]&&['tell','check','feint','lean','pass'].includes(r.ai)){taken['ai'+r.ai]=1;await shot('04-'+r.ai)}
    if(r.box==='squeeze'&&!taken.sq){taken.sq=1;await shot('05-box-up')}
    if(r.box==='stop'&&!taken.stop){taken.stop=1;await shot('06-brake')}
    if(r.ph==='collar'&&!taken.collar){taken.collar=1;await shot('07-stopped')}
    if(r.run==='run'&&!taken.run){taken.run=1;await shot('08-runner')}
    if(r.cash==='carry'&&!taken.cash){taken.cash=1;await shot('09-cash')}
    if(r.state!=='go')break}
  await ev(()=>window.__ht.step(40));await p.waitForTimeout(1200);await shot('10-result',()=>{for(const e of document.querySelectorAll('.ht-scr'))e.classList.add('on')});
  const T=await ev(()=>{const H=window.__ht,M=H.M;return{flagLog:M&&M.flagLog,loseWhy:M&&M.loseWhy,lines:window.__T.lines,pay:M&&M.pay?M.pay.lines.map(l=>l.label+':'+l.amount):null,total:M&&M.pay&&M.pay.total,medal:M&&M.medal,state:M&&M.state,el:M&&Math.round(M.elapsed),stopT:M&&M.stopT&&Math.round(M.stopT)}});
  if(!QUIET){console.log('\n--- transcript ---');for(const l of T.lines)console.log(l[0].padStart(6)+'  '+l[1]+': '+l[2])}
  console.log('flags',JSON.stringify(T.flagLog||[]));console.log('\nresult',JSON.stringify({loseWhy:T.loseWhy||null,state:T.state,el:T.el,stopT:T.stopT,medal:T.medal,total:T.total,pay:T.pay}));
  const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'console errors: '+bad.slice(0,6).join(' | '):'no console errors');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
