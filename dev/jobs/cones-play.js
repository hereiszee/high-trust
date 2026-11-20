/* Cone Zone: play it by script at the job's own pace, log the build, the convoy and every radio line with its time (so pacing and jokes
   read as a transcript), and take a screenshot of every stage.
   node dev/jobs/cones-play.js [--shots] [--fail] [--chase] [--fight] [--touch] [--throttle=4] [--out=dir] [--every=n]
   --chase: build nothing (the convoy goes through, the bot blocks Route 9 with the van). --fight: the wall without flares (stopped, not airtight). */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:process.argv.includes('--'+k)?true:d};
const SHOTS=!!arg('shots',false),FR=+arg('frames',16000),EVERY=+arg('every',60),FAIL=!!arg('fail',false),CHASE=!!arg('chase',false),FIGHT=!!arg('fight',false),TOUCH=!!arg('touch',false),THR=+arg('throttle',0),
  OUT=path.resolve(__dirname,'../../',arg('out','docs/screenshots/jobs/cones'));
(async()=>{const {b,p,errs}=await open(TOUCH?{viewport:{width:844,height:390},dpr:1}:{});const ev=(f,a)=>p.evaluate(f,a);if(SHOTS)fs.mkdirSync(OUT,{recursive:true});
  if(THR){const c=await p.context().newCDPSession(p);await c.send('Emulation.setCPUThrottlingRate',{rate:THR});console.log('CPU throttled x'+THR)}
  const shot=async(n,prep)=>{if(!SHOTS)return;if(prep)await ev(prep);
    await ev(async()=>{const H=window.__ht;for(let i=0;i<40&&H.assets&&H.assets.stream&&!H.assets.stream.idle();i++)await new Promise(r=>setTimeout(r,300))});
    await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(700);await ev(()=>{window.__rafOn=false});
    await ev(()=>{const H=window.__ht;try{H.ow&&H.ow.buildAll&&H.ow.buildAll();H.ow&&H.ow.update&&H.ow.update(H.camera)}catch(_){}H.draw()});
    await p.screenshot({path:path.join(OUT,(CHASE?'chase-':FIGHT?'fight-':FAIL?'fail-':TOUCH?'touch-':'')+n+'.jpg'),type:'jpeg',quality:84,timeout:120000,animations:'disabled'}).catch(e=>console.log('shot failed',e.message));console.log('   shot',n)};
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  if(SHOTS)await ev(async()=>{const H=window.__ht;try{H.render.apply('high')}catch(_){}});
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('cones'),a=H.jobs.api;for(const d of j.def.unlock.done){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true}j.test.give(a);
    const pm=window.HT.People;if(pm&&pm.preload)await Promise.race([pm.preload(H.jobs.castKeys('cones')).catch(()=>{}),new Promise(r=>setTimeout(r,20000))]);H.enterHub();H.step(3)});
  if(TOUCH)await ev(()=>{/* pretend to be a phone: the job reads pointer:coarse */const mm=window.matchMedia;window.matchMedia=q=>/coarse/.test(q)?{matches:true,addEventListener(){},removeEventListener(){}}:mm(q);document.documentElement.classList.add('touch')});
  const g=await ev(()=>{const H=window.__ht,i=H.jobs.index('cones');const n=H.npcs.find(n=>n.marker&&n.marker.i===i);if(!n)return{err:'no giver'};H.P.pos.set(n.pos.x+1.4,0,n.pos.z+1.2);H.collide(H.P.pos,.35);H.P.yaw=Math.atan2(1.4,1.2);H.P.pitch=-.06;H.step(3);H.use=true;H.step(1);window.__go=H.UIacts&&H.UIacts['brief:go'];return{brief:!!window.__go}});
  console.log('giver',JSON.stringify(g));await shot('00-brief');
  await ev(()=>{const H=window.__ht;window.__go();H.step(2)});
  const st=await ev(()=>{const H=window.__ht,i=H.jobs.index('cones'),d=H.L.dests[i],V=H.VAN;if(H.CV)H.exitVehicle();V.pos.set(d.x,0,d.z+6);V.yaw=0;V.spd=0;H.syncVan&&H.syncVan();H.P.pos.set(d.x+2.5,0,d.z+6);H.enterVan();H.step(2);
    V.pos.set(d.x,0,d.z);if(V.car){V.car.x=d.x;V.car.z=d.z;V.car.yaw=0}H.syncVan&&H.syncVan();for(let k=0;k<90&&H.mode!=='mission';k++)H.step(1);return{mode:H.mode,id:H.M&&H.M.def.id,crew:H.M&&H.M.crew&&H.M.crew.map(c=>c.id)}});
  console.log('start',JSON.stringify(st));if(st.mode!=='mission'){console.log(errs);await b.close();process.exit(1)}
  await ev(()=>{const H=window.__ht;window.HT.Jobs.on('camera',()=>{const C=window.__CAM;if(!C)return undefined;const c=H.camera;c.position.set(...C.pos);c.lookAt(...C.look);c.fov=C.fov||60;c.updateProjectionMatrix();return true})});
  const cam=(pos,look,fov)=>ev(([p,l,f])=>{window.__CAM={pos:p,look:l,fov:f}},[pos,look,fov]),camOff=()=>ev(()=>{window.__CAM=null;const c=window.__ht.camera;c.fov=72;c.updateProjectionMatrix()});
  await ev(()=>{const H=window.__ht,a=H.jobs.api;window.__T={t:0,lines:[]};const T=window.__T;const r0=a.radio;a.radio=(w,t,f)=>{T.lines.push([(H.M?H.M.elapsed:0).toFixed(1),w,t]);return r0(w,t,f)};
    const f0=a.feed;a.feed=(t,k,s)=>{T.lines.push([(H.M?H.M.elapsed:0).toFixed(1),'[feed]',t+(s?' · '+s:'')]);return f0(t,k,s)}});
  /* the bot variants: --chase builds nothing (retried path), --fight drops the flares from the plan */
  if(arg('human',false))await ev(()=>{window.__HUMAN=true});
  if(CHASE)await ev(()=>{window.__ht.M.retried=true});
  if(FIGHT)await ev(()=>{const j=window.__ht.jobs.registry.get('cones');const s0=j.test.step;j.test.step=(a,t,o)=>{const M=a.M;if(M&&M.bot&&M.bot.plan&&!M.bot.noFl){M.bot.noFl=1;M.bot.plan=M.bot.plan.filter(s=>s.k!=='flare')}return s0(a,t,o)}});
  await ev(()=>{const H=window.__ht;H.step(30);const P=H.P;P.pos.set(199,0,80);P.yaw=Math.PI*.95;P.pitch=-.12;H.step(2)});await shot('01-start-pile');
  const taken={};let last='';
  for(let f=0;f<FR;f+=EVERY){
    const r=await ev(([n,fail])=>{const H=window.__ht,j=H.jobs.registry.get('cones'),a=H.jobs.api,T=window.__T;let i=0;
      for(;i<n&&H.M&&H.M.state==='go';i++){j.test.step(a,T.t++,{fail,human:window.__HUMAN});H.P.hp=Math.max(H.P.hp,60);H.step(1)}
      const M=H.M;if(!M)return{done:true};const tr=M.truck&&M.truck.c,S=M.plan;
      return{state:M.state,ph:M.ph,stage:M.stage,el:+M.elapsed.toFixed(1),clock:+(M.clock||0).toFixed(1),bot:M.bot&&M.bot.i,props:M.stock&&Object.values(M.stock).join('/'),plan:S&&S.verdict,why:S&&S.top&&S.top.why,
        truck:tr?[Math.round(tr.x),Math.round(tr.z),+tr.spd.toFixed(1),Math.round(tr.hp)]:null,lead:M.conv&&M.conv[0]?[Math.round(M.conv[0].c.x),Math.round(M.conv[0].c.z),+M.conv[0].c.spd.toFixed(1)]:null,
        esc:(M.esc||[]).map(e=>e.state[0]).join(''),cuffs:M.cuffs,shots:M.shots,air:M.airtight,peace:M.peace,goat:M.goatSt,opened:M.opened,left:M.left,knocked:M.knocked,crew:H.allies.length,van:[Math.round(H.VAN.pos.x),Math.round(H.VAN.pos.z),H.CV===H.VAN],blk:!!(M.truck&&M.truck.blockedBy),bt:M.blockT,cap:M.truck&&M.dbgCap!=null?+M.dbgCap.toFixed(1):null,st:M.truck&&M.truck.st,gh:M.truck&&M.truck.ghostT}},[EVERY,FAIL]);
    if(r.done)break;const key=r.ph+r.stage+r.esc+r.goat;if(key!==last||f%(EVERY*10)===0){console.log(JSON.stringify(r));last=key}
    /* staged pictures */
    if(r.ph==='build'&&r.bot>=3&&!taken.b1){taken.b1=1;await cam([212,6.5,96],[201,0,110],55);await shot('02-build-cars');await camOff()}
    if(r.ph==='build'&&r.bot>=7&&!taken.b2){taken.b2=1;await shot('03-build-carry',()=>{const H=window.__ht,P=H.P;P.pitch=-.18;H.step(1)})}
    if(r.ph==='build'&&r.bot>=8&&!taken.plan){taken.plan=1;await ev(()=>{const H=window.__ht;H.jobs.registry.get('cones');window.HT.Jobs.api.M.planOn=false});await shot('04-plan',()=>{const H=window.__ht,M=H.M;window.__czPlan&&0;M.planOn=false;
        const J=window.HT.Jobs;/* toggle through the real key */window.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab'}));H.step(2)});await ev(()=>{window.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab'}));window.__ht.step(1)})}
    if(r.ph==='build'&&r.bot>=13&&!taken.b3){taken.b3=1;await cam([194.5,5.2,127],[203,.6,105],50);await shot('05-roadblock');await camOff()}
    if(r.ph==='convoy'&&r.lead&&r.lead[1]<140&&!taken.c1){taken.c1=1;await cam([198.5,5.5,100],[205,1.2,132],52);await shot('06-convoy');await camOff()}
    if(r.ph==='standoff'&&!taken.s1){taken.s1=1;if(FIGHT)await ev(()=>window.__ht.step(90));await cam([199,4,100],[204,1.3,118],52);await shot(FIGHT?'07-fight':'07-standoff');await camOff()}
    if(r.ph==='chase'&&r.truck&&r.truck[0]<185&&!taken.ch){taken.ch=1;const x=r.truck[0];await cam([x-26,8,43],[x+4,1,42.5],50);await shot('07-chase');await camOff()}
    if(r.ph==='driver'&&!taken.d1){taken.d1=1;await shot('08-driver')}
    if(r.ph==='open'&&r.opened>.85&&!taken.w1||r.ph==='wrap'&&!taken.w1){taken.w1=1;await ev(()=>{const H=window.__ht,M=H.M,c=M.truck.c,f=[-Math.sin(c.yaw),-Math.cos(c.yaw)];window.__CAM={pos:[c.x-f[0]*10.5+2.4,2.6,c.z-f[1]*10.5],look:[c.x-f[0]*3,1.6,c.z-f[1]*3],fov:50}});await shot('09-truck-open');await camOff()}
    if(r.goat==='follow'&&!taken.g1){taken.g1=1;await ev(()=>{const H=window.__ht;H.step(30)});await cam([329,2.4,62],[333.5,.8,67],50);await shot('10-pepper');await camOff()}
    if(r.state!=='go')break}
  await ev(()=>window.__ht.step(40));await p.waitForTimeout(1500);await shot(FAIL?'11-fail':'11-result');
  const T=await ev(()=>{const H=window.__ht,M=H.M;return{lines:window.__T.lines,pay:M&&M.pay?M.pay.lines.map(l=>l.label+':'+l.amount):null,total:M&&M.pay&&M.pay.total,medal:M&&M.medal,state:M&&M.state,el:M&&Math.round(M.elapsed),stats:[...document.querySelectorAll('.ht-result .stat, [class*=result] [class*=stat]')].map(e=>e.textContent.trim()).slice(0,12)}});
  console.log('\n--- transcript ---');for(const l of T.lines)console.log(l[0].padStart(6)+'  '+l[1]+': '+l[2]);
  console.log('\nresult',JSON.stringify({state:T.state,el:T.el,medal:T.medal,total:T.total,pay:T.pay,stats:T.stats}));
  const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'console errors: '+bad.slice(0,6).join(' | '):'no console errors');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
