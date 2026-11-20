/* Suds Up: play it by script, print a timeline (phase, clock, money, each car's stage, kids, buckets, hose, trouble) and the radio,
   and take screenshots of every stage (docs/screenshots/jobs/carwash/).
   node dev/jobs/carwash.js [--shots] [--fail] [--frames=n] [--every=n] [--runs=n] [--quiet] [--touch]
   Uses the job's own scripted player (test.step) at walking pace, with the real kids, cars and trouble. --runs=n sets how many
   runs the save has already played (the scaling: more trouble, faster arrivals). */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:process.argv.includes('--'+k)?true:d};
const SHOTS=!!arg('shots',false),FAIL=!!arg('fail',false),FR=+arg('frames',13000),EVERY=+arg('every',450),QUIET=!!arg('quiet',false),RUNS=+arg('runs',0),TOUCH=!!arg('touch',false),SEED=arg('seed',null);
const OUT=path.resolve(__dirname,'../../docs/screenshots/jobs/carwash');
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
  await ev(async r=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('carwash'),a=H.jobs.api,s=a.SV();
    for(const d of j.def.unlock.done){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true}if(r){const rec=window.HT.Save.jobRec(s,'carwash');rec.plan={raised:r*120,runs:r,best:120,week:{w:-1,g:0},board:[]};rec.runs=0}j.test.give(a)},RUNS);
  await ev(async()=>{const pm=window.HT.People;await Promise.race([pm.preload(['dee','nb_teen','nb_kid','thug_cap','thug_jacket','thug_hoodie','thug_beanie','thug_track','dad_gary','earl','rosa','benny','nb_office','nb_pops','nb_mei','nb_gran','nb_sweater','nb_kenji','nb_marcus','nb_lucia']).catch(()=>{}),new Promise(r=>setTimeout(r,40000))])});
  await ev(()=>{const H=window.__ht;H.enterHub();H.step(3)});
  if(SHOTS)await ev(async()=>{const H=window.__ht;H.P.pos.set(331,0,42);H.step(2);for(let i=0;i<80&&H.assets.stream&&!H.assets.stream.idle();i++)await new Promise(r=>setTimeout(r,500))});
  /* the giver and the brief */
  const g=await ev(()=>{const H=window.__ht,i=H.jobs.index('carwash');const n=H.npcs.find(n=>n.marker&&n.marker.i===i);if(!n)return{err:'no giver'};H.P.pos.set(n.pos.x+1.2,0,n.pos.z+2.4);H.collide(H.P.pos,.35);H.P.yaw=Math.atan2(1.2,2.4);H.P.pitch=-.06;H.step(3);H.use=true;H.step(1);
    window.__go=H.UIacts&&H.UIacts['brief:go'];return{giver:n.pos.x.toFixed(1)+','+n.pos.z.toFixed(1),brief:!!window.__go}});
  console.log('giver',JSON.stringify(g));await shot('00-brief');
  await ev(()=>{const H=window.__ht;(H.UIacts['brief:go']||window.__go)();H.step(2)});
  const st=await ev(()=>{const H=window.__ht,i=H.jobs.index('carwash'),d=H.L.dests[i],V=H.VAN;if(H.CV)H.exitVehicle();V.pos.set(d.x,0,d.z-14);V.yaw=0;V.spd=0;H.syncVan&&H.syncVan();H.P.pos.set(d.x+2.5,0,d.z-14);H.enterVan();H.step(2);
    V.pos.set(d.x,0,d.z);V.yaw=0;if(V.car){V.car.x=d.x;V.car.z=d.z;V.car.yaw=0}H.syncVan&&H.syncVan();for(let k=0;k<60&&H.mode!=='mission';k++)H.step(1);return{mode:H.mode,id:H.M&&H.M.def.id}});
  if(st.mode!=='mission'){const w=await p.evaluate(async()=>{const H=window.__ht;const w=H.jobs.castWait;if(w)await w;H.step(3);return H.mode});console.log('start (waited)',w)}else console.log('start',JSON.stringify(st));
  if(SEED)await ev(s=>{const M=window.__ht.M;},SEED);
  await ev(f=>{const H=window.__ht,a=H.jobs.api,j=H.jobs.registry.get('carwash');window.__T={t:0,said:[]};const T=window.__T;
    const r0=a.radio;a.radio=(w,x,fr)=>{T.said.push(Math.round(H.M?H.M.elapsed:0)+'s '+w+': '+x);return r0(w,x,fr)};
    T.step=()=>{const M=H.M;if(!M||M.state!=='go')return 'end';j.test.step(a,T.t,f?{fail:true}:{});H.P.hp=Math.max(H.P.hp,60);T.t++;H.step(1);return null};
    T.info=()=>{const M=H.M,C=M&&M.cw;if(!C)return{state:M&&M.state};const r=v=>Math.round(v*100);
      return{t:T.t,el:Math.round(M.elapsed),stage:M.stage,ph:C.phase,tut:C.tut,clock:Math.round(C.clock),raised:C.raised,done:C.carsDone,tips:C.tips,
        cars:C.cars.filter(c=>c.st!=='gone').map(c=>c.cu.id+':'+c.st+(c.bay>=0?'@'+c.bay:'')+(c.st==='soap'?' s'+r(c.soap):c.st==='rinse'?' c'+r(c.clean)+'/f'+r(c.foamLeft||0):c.st==='dry'?' d'+r(c.dry):'')).join(' '),
        kids:C.kids.map(k=>k.name[0]+':'+k.st).join(' '),bk:C.buckets.map(v=>r(v)).join('/'),hose:(C.hose.held?'H':'-')+(C.hose.spray?'S':'')+(C.hose.kink>=0?'K':'')+(C.signFree?' FREE':'')+(C.rival&&C.rival.on?' RIVAL':''),
        qd:C.cars.filter(c=>c.st==='rinse'&&c.S).map(c=>{const G=c.S.grid,o=[];for(let q=0;q<4;q++){const ox=(q===1||q===3)?32:0,oy=q>=2?32:0;let s=0;for(let y=0;y<32;y++)for(let x=0;x<32;x++)s+=G[(oy+y)*64+ox+x];o.push(Math.round(s))}return c.cu.id+':'+o.join('/')+' sum0 '+Math.round(c.S.sum0)}).join(' ')+' side '+(C.bot&&C.bot.dbgS||'-')+' '+JSON.stringify(C.bot&&C.bot.dbg||{})+((C.bot&&(C.bot.dbg={})),'')+' hit '+(C.hose.hit?C.hose.hit.kind+(C.hose.hit.l?'['+C.hose.hit.l.x.toFixed(1)+','+C.hose.hit.l.y.toFixed(1)+','+C.hose.hit.l.z.toFixed(1)+']':''):'-'),
        tr:C.trouble.map(q=>q.k+':'+q.st+(q.done?'✓':'')).join(' '),won:C.troubleWon,stop:C.troubleStopped,me:Math.round(H.P.pos.x)+','+Math.round(H.P.pos.z),
        heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):0,calls:H.renderer&&H.renderer.info?H.renderer.info.render.calls:0}}},FAIL);
  const WANT=[['01-setup',`C.phase==='setup'&&C.tut===0&&T.t>40`,`({at:[332.5,40.6,330.6,34],pitch:-.2})`],
    ['02-buckets',`C.phase==='setup'&&C.tut===1&&C.hose.spray&&C.buckets[0]>.3`,null],
    ['03-send-kid',`C.phase==='setup'&&C.tut===2&&C.follow`,null],
    ['04-open',`C.phase==='open'&&C.clock<236`,`({at:[352,38,335,36],pitch:-.12})`],
    ['05-soap',`C.cars.some(c=>c.st==='soap'&&c.soap>.55&&c.owner)`,`(()=>{const c=C.cars.find(c=>c.st==='soap'&&c.soap>.55);return{at:[c.x+(c.bay?3.6:-3.6),c.z+4.4,c.x,c.z],pitch:-.24}})()`],
    ['06-rinse',`C.hose.spray&&C.hose.hit&&C.hose.hit.kind==='car'&&C.hose.hit.c.clean>.35&&C.hose.hit.c.clean<.75`,null],
    ['07-dry',`C.cars.some(c=>c.st==='dry'&&c.dry>.3&&c.dry<.8)`,`(()=>{const c=C.cars.find(c=>c.st==='dry');return{at:[c.x+(c.bay?-3.2:3.2),c.z+3.8,c.x,c.z],pitch:-.22}})()`],
    ['08-kink',`C.hose.kink>=0`,`(()=>{const n=C.rope.nodes[C.hose.kink];return{at:[n.x+2.6,n.z+3,n.x,n.z],pitch:-.4}})()`],
    ['09-free-sign',`C.signFree`,`({at:[344.5,42.5,341.2,38.6],pitch:-.15})`],
    ['10-mud',`C.trouble.some(t=>t.k==='mud'&&t.st==='go'&&Math.hypot(t.p.x-H.P.pos.x,t.p.z-H.P.pos.z)<9)`,null],
    ['11-rival',`C.rival&&C.rival.on&&C.rival.t>3`,`({at:[333,41.5,335.5,48],pitch:-.08})`],
    ['12-splash',`C.trouble.some(t=>t.k==='drive'&&t.st==='drive'&&t.car&&t.car.x>310)`,null],
    ['13-cashbox',`C.thief&&C.thief.st==='run'`,null],
    ['14-walk-him',`C.thief&&C.thief.st==='walk'`,null],
    ['15-tally',`C.phase==='tally'&&C.tallyT<3.6`,null]];
  const taken={};let last=-1e9;
  for(let f=0;f<FR;f+=30){const r=await ev(()=>{let s=null;for(let i=0;i<30&&!s;i++)s=window.__T.step();return s});
    const inf=await ev(()=>window.__T.info());
    if(!QUIET&&(f-last>=EVERY||r==='end')){last=f;const i=inf;console.log(i.el+'s '+i.ph+(i.ph==='setup'?'/'+i.tut:'')+' clk '+i.clock+' $'+i.raised+' ('+i.done+' cars, tips '+i.tips+') bk '+i.bk+' hose '+i.hose+' me '+i.me+'\n     cars ['+i.cars+']\n     kids ['+i.kids+'] trouble ['+i.tr+'] won '+i.won+' stop '+i.stop+' heap '+i.heap+'MB calls '+i.calls+(i.qd?'\n     dirt '+i.qd:''))}
    if(SHOTS)for(const[n,c,fr]of WANT){if(taken[n])continue;const ok=await ev(c=>{const H=window.__ht,M=H.M,C=M&&M.cw,T=window.__T;if(!C||M.state!=='go')return false;try{return !!eval(c)}catch(e){return false}},c);
      if(ok){taken[n]=1;const o=fr?await ev(f=>{const H=window.__ht,M=H.M,C=M.cw,P=H.P;return eval(f)},fr):null;await shot(n,o)}}
    if(r==='end')break}
  const fin=await ev(()=>{const H=window.__ht;H.step(40);return{state:H.M&&H.M.state,el:H.M&&Math.round(H.M.elapsed),medal:H.M&&H.M.medal,pay:H.M&&H.M.pay?H.M.pay.lines.map(l=>l.label+':'+l.amount):null,acts:Object.keys(H.UIacts||{})}});
  console.log('END',JSON.stringify(fin));await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(1800);await ev(()=>{window.__rafOn=false});await shot(FAIL?'fail':'16-result');
  if(!QUIET){const said=await ev(()=>window.__T.said);console.log('--- radio ('+said.length+')');for(const s of said.slice(0,80))console.log('  '+s)}
  const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'ERRORS '+bad.slice(0,5).join(' | '):'no console errors');
  await b.close();process.exit(fin.state==='won'||FAIL&&fin.state==='lost'?0:1)})().catch(e=>{console.error(e);process.exit(1)});
