/* Watch Your Step: play it by script, print a timeline (stops checked, events, trouble, notebook) and the radio, and take
   screenshots of every stage (docs/screenshots/jobs/patrol/). --runs=n: patrols already walked (1 = evening, 2 = Riverside day once
   Riverside is open, 3 = Riverside evening).
   node dev/jobs/patrol.js [--shots] [--fail] [--frames=n] [--every=n] [--runs=n] [--quiet] [--touch]
   Uses the job's own scripted player (test.step) at walking pace, with the real kids, cars and trouble. --runs=n sets how many
   runs the save has already played (the scaling: more trouble, faster arrivals). */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:process.argv.includes('--'+k)?true:d};
const SHOTS=!!arg('shots',false),FAIL=!!arg('fail',false),FR=+arg('frames',13000),EVERY=+arg('every',450),QUIET=!!arg('quiet',false),RUNS=+arg('runs',0),TOUCH=!!arg('touch',false),SEED=arg('seed',null);
const OUT=path.resolve(__dirname,'../../docs/screenshots/jobs/patrol');
(async()=>{const {b,p,errs}=await open(TOUCH?{viewport:{width:844,height:390}}:{});const ev=(f,a)=>p.evaluate(f,a);if(SHOTS)fs.mkdirSync(OUT,{recursive:true});
  const frame=o=>ev(o=>{const H=window.__ht,P=H.P;window.__sv={x:P.pos.x,z:P.pos.z,yaw:P.yaw,pitch:P.pitch,rx:P.dude.root.position.x,rz:P.dude.root.position.z,ry:P.dude.root.rotation.y,vis:P.dude.root.visible};
      if(o.at){P.pos.set(o.at[0],0,o.at[1])}const lx=o.look?o.look[0]:o.at[2],lz=o.look?o.look[1]:o.at[3];if(lx!=null){P.yaw=Math.atan2(-(lx-P.pos.x),-(lz-P.pos.z))}if(o.pitch!=null)P.pitch=o.pitch},o);
  const unframe=()=>ev(()=>{const H=window.__ht,P=H.P,s=window.__sv;if(!s)return;P.pos.x=s.x;P.pos.z=s.z;P.yaw=s.yaw;P.pitch=s.pitch;window.__sv=null});
  const shot=async(n,prep)=>{if(!SHOTS)return;if(prep&&typeof prep==='object'){await frame(prep);prep=null}if(prep)await ev(prep);
    await ev(()=>{const H=window.__ht;H.step(1)});
    await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(700);await ev(()=>{window.__rafOn=false});
    await ev(()=>{const H=window.__ht;H.ow&&H.ow.buildAll&&H.ow.buildAll();H.ow&&H.ow.update&&H.ow.update(H.camera);H.draw()});await p.screenshot({path:path.join(OUT,(TOUCH?'touch-':'')+n+'.jpg'),type:'jpeg',quality:84});await unframe();console.log('  shot '+n)};
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  if(SHOTS)await ev(async()=>{const H=window.__ht;try{H.render.apply('high')}catch(_){}});
  await ev(async r=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('patrol'),a=H.jobs.api,s=a.SV();
    for(const d of j.def.unlock.done){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true}if(r){const rec=window.HT.Save.jobRec(s,'patrol');rec.plan={runs:r,rel:{},week:{w:-1,g:0},best:3};rec.runs=0;if(r>=2){for(const d of['crossing','dee']){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true;window.HT.Save.jobRec(s,d).done=true}}}j.test.give(a)},RUNS);
  await ev(async()=>{const pm=window.HT.People;await Promise.race([pm.preload(['nb_teen','nb_kid','thug_cap','thug_hoodie','nb_office','nb_pops','nb_mei','nb_gran','nb_sweater','nb_kenji','nb_marcus','nb_lucia']).catch(()=>{}),new Promise(r=>setTimeout(r,40000))])});
  await ev(()=>{const H=window.__ht;H.enterHub();H.step(3)});
  if(SHOTS)await ev(async()=>{const H=window.__ht;H.P.pos.set(60,0,22);H.step(2);for(let i=0;i<80&&H.assets.stream&&!H.assets.stream.idle();i++)await new Promise(r=>setTimeout(r,500))});
  /* the giver and the brief */
  const g=await ev(()=>{const H=window.__ht,i=H.jobs.index('patrol');const n=H.npcs.find(n=>n.marker&&n.marker.i===i);if(!n)return{err:'no giver'};H.P.pos.set(n.pos.x+1.2,0,n.pos.z+2.4);H.collide(H.P.pos,.35);H.P.yaw=Math.atan2(1.2,2.4);H.P.pitch=-.06;H.step(3);H.use=true;H.step(1);
    window.__go=H.UIacts&&H.UIacts['brief:go'];return{giver:n.pos.x.toFixed(1)+','+n.pos.z.toFixed(1),brief:!!window.__go}});
  console.log('giver',JSON.stringify(g));await shot('00-brief');
  await ev(()=>{const H=window.__ht;(H.UIacts['brief:go']||window.__go)();H.step(2)});
  const st=await ev(()=>{const H=window.__ht,i=H.jobs.index('patrol'),d=H.L.dests[i],V=H.VAN;if(H.CV)H.exitVehicle();V.pos.set(d.x,0,d.z-14);V.yaw=0;V.spd=0;H.syncVan&&H.syncVan();H.P.pos.set(d.x+2.5,0,d.z-14);H.enterVan();H.step(2);
    V.pos.set(d.x,0,d.z);V.yaw=0;if(V.car){V.car.x=d.x;V.car.z=d.z;V.car.yaw=0}H.syncVan&&H.syncVan();for(let k=0;k<60&&H.mode!=='mission';k++)H.step(1);return{mode:H.mode,id:H.M&&H.M.def.id}});
  if(st.mode!=='mission'){const w=await p.evaluate(async()=>{const H=window.__ht;const w=H.jobs.castWait;if(w)await w;H.step(3);return H.mode});console.log('start (waited)',w)}else console.log('start',JSON.stringify(st));
  if(SEED)await ev(s=>{const M=window.__ht.M;},SEED);
  await ev(f=>{const H=window.__ht,a=H.jobs.api,j=H.jobs.registry.get('patrol');window.__T={t:0,said:[]};const T=window.__T;
    const r0=a.radio;a.radio=(w,x,fr)=>{T.said.push(Math.round(H.M?H.M.elapsed:0)+'s '+w+': '+x);return r0(w,x,fr)};
    T.step=()=>{const M=H.M;if(!M||M.state!=='go')return 'end';j.test.step(a,T.t,f?{fail:true}:{});H.P.hp=Math.max(H.P.hp,60);T.t++;H.step(1);return null};
    T.info=()=>{const M=H.M,C=M&&M.pt;if(!C)return{state:M&&M.state};
      return{t:T.t,el:Math.round(M.elapsed),ph:C.phase,clock:Math.round(C.clock),var:(C.variant.river?'river':'maple')+(C.variant.night?'/night':''),chk:C.checked+'/'+C.stops.length,handled:C.handled,wrong:C.wrong,chats:C.chats+'/'+C.goodChats,
        stops:C.stops.map(s=>(s.i+1)+(s.st==='checked'?'✓':'')+(s.ev?':'+s.ev.k+'['+s.ev.st+']':'')).join(' '),tr:C.trouble?C.trouble.k+':'+C.trouble.st+(C.trouble.p?'@'+Math.round(C.trouble.p.x)+','+Math.round(C.trouble.p.z):''):'-',follow:C.follow?C.follow.kind:'-',talk:!!C.talk,
        me:Math.round(H.P.pos.x)+','+Math.round(H.P.pos.z)+(H.CV?' CAR':'')+(H.keys.w?' W':'')+' yaw'+H.P.yaw.toFixed(2)+(H.M.pt.bot?' st'+H.M.pt.bot.st:''),log:C.log.length?C.log[C.log.length-1].text:'',heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):0}}},FAIL);
  const WANT=[['01-start',`C.phase==='walk'&&T.t>30`,null],
    ['02-look',`C.stops.some(s=>s.st==='todo'&&s.look>.5)`,null],
    ['03-knock',`C.talk&&C.talk.s`,null],
    ['04-package',`C.stops.some(s=>s.ev&&s.ev.k==='package'&&s.ev.st==='found')`,`(()=>{const s=C.stops.find(s=>s.ev&&s.ev.k==='package');return{at:[s.sx+s.fz*2,s.sz-s.fx*2,s.x,s.z],pitch:-.2}})()`],
    ['05-sprinkler',`C.stops.some(s=>s.ev&&s.ev.k==='sprinkler'&&s.ev.st==='found')`,`(()=>{const s=C.stops.find(s=>s.ev&&s.ev.k==='sprinkler');return{at:[s.sx+s.fx*3+s.fz*4,s.sz+s.fz*3-s.fx*4,s.x+s.fx*3,s.z+s.fz*3],pitch:-.18}})()`],
    ['06-dog',`C.follow&&C.follow.kind==='dog'`,null],
    ['07-chalk',`C.stops.some(s=>s.ev&&s.ev.k==='chalk'&&s.ev.st==='found')`,`(()=>{const s=C.stops.find(s=>s.ev&&s.ev.k==='chalk');return{at:[s.sx+s.fx*4+s.fz*3,s.sz+s.fz*4-s.fx*3,s.sx,s.sz],pitch:-.35}})()`],
    ['08-van',`C.stops.some(s=>s.ev&&s.ev.k==='van'&&s.ev.st==='found')`,null],
    ['09-bins',`C.stops.some(s=>s.ev&&s.ev.k==='bins'&&s.ev.st==='found')`,null],
    ['10-light',`C.stops.some(s=>s.ev&&s.ev.k==='light'&&s.ev.st==='found')`,null],
    ['11-late',`C.follow&&C.follow.kind==='late'`,null],
    ['12-trouble',`C.trouble&&(C.trouble.st==='run'||C.trouble.st==='try')`,null],
    ['13-word',`C.talk&&!C.talk.s&&C.trouble&&C.trouble.st!=='wait'`,null],
    ['14-done',`M.exitOpen`,null]];
  const taken={};let last=-1e9;
  for(let f=0;f<FR;f+=30){const r=await ev(()=>{let s=null;for(let i=0;i<30&&!s;i++)s=window.__T.step();return s});
    const inf=await ev(()=>window.__T.info());
    if(!QUIET&&(f-last>=EVERY||r==='end')){last=f;const i=inf;console.log(i.el+'s '+i.ph+' '+i.var+' clk '+i.clock+' chk '+i.chk+' handled '+i.handled+' wrong '+i.wrong+' chats '+i.chats+' tr '+i.tr+' follow '+i.follow+(i.talk?' TALK':'')+' me '+i.me+'\n     ['+i.stops+']\n     '+i.log)}
    if(SHOTS)for(const[n,c,fr]of WANT){if(taken[n])continue;const ok=await ev(c=>{const H=window.__ht,M=H.M,C=M&&M.pt,T=window.__T;if(!C||M.state!=='go')return false;try{return !!eval(c)}catch(e){return false}},c);
      if(ok){taken[n]=1;const o=fr?await ev(f=>{const H=window.__ht,M=H.M,C=M.pt,P=H.P;return eval(f)},fr):null;await shot(n,o)}}
    if(r==='end')break}
  const fin=await ev(()=>{const H=window.__ht;H.step(40);return{state:H.M&&H.M.state,el:H.M&&Math.round(H.M.elapsed),medal:H.M&&H.M.medal,pay:H.M&&H.M.pay?H.M.pay.lines.map(l=>l.label+':'+l.amount):null,acts:Object.keys(H.UIacts||{})}});
  console.log('END',JSON.stringify(fin));await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(1800);await ev(()=>{window.__rafOn=false});await shot(FAIL?'fail':'16-result');
  if(!QUIET){const said=await ev(()=>window.__T.said);console.log('--- radio ('+said.length+')');for(const s of said.slice(0,80))console.log('  '+s)}
  const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'ERRORS '+bad.slice(0,5).join(' | '):'no console errors');
  await b.close();process.exit(fin.state==='won'||FAIL&&fin.state==='lost'?0:1)})().catch(e=>{console.error(e);process.exit(1)});
