/* Porch Light: play it by script, print a timeline (parcels, pirates, the sedan, the chair) and the radio, and take screenshots of
   every stage (docs/screenshots/jobs/porch/). --runs=n: deliveries already guarded (1+ = the car pirate may come; odd runs = a
   Riverside block once Riverside is open, which --runs>=1 turns on).
   node dev/jobs/porch.js [--shots] [--fail] [--frames=n] [--every=n] [--runs=n] [--quiet] [--touch]
   Uses the job's own scripted player (test.step) at walking pace, with the real kids, cars and trouble. --runs=n sets how many
   runs the save has already played (the scaling: more trouble, faster arrivals). */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:process.argv.includes('--'+k)?true:d};
const SHOTS=!!arg('shots',false),FAIL=!!arg('fail',false),FR=+arg('frames',13000),EVERY=+arg('every',450),QUIET=!!arg('quiet',false),RUNS=+arg('runs',0),TOUCH=!!arg('touch',false),SEED=arg('seed',null);
const OUT=path.resolve(__dirname,'../../docs/screenshots/jobs/porch');
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
  await ev(async r=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('porch'),a=H.jobs.api,s=a.SV();
    for(const d of j.def.unlock.done){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true}if(r){const rec=window.HT.Save.jobRec(s,'porch');rec.plan={runs:r};rec.runs=0;if(r>=1){for(const d of['crossing','dee']){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true;window.HT.Save.jobRec(s,d).done=true}}}j.test.give(a)},RUNS);
  await ev(async()=>{const pm=window.HT.People;await Promise.race([pm.preload(['nb_teen','nb_kid','thug_cap','thug_hoodie','nb_office','nb_pops','nb_mei','nb_gran','nb_sweater','nb_kenji','nb_marcus','nb_lucia']).catch(()=>{}),new Promise(r=>setTimeout(r,40000))])});
  await ev(()=>{const H=window.__ht;H.enterHub();H.step(3)});
  if(SHOTS)await ev(async()=>{const H=window.__ht;H.P.pos.set(70,0,20);H.step(2);for(let i=0;i<80&&H.assets.stream&&!H.assets.stream.idle();i++)await new Promise(r=>setTimeout(r,500))});
  /* the giver: the Dadazon page on the laptop, then out the front door and into the ring */
  await ev(()=>window.__ht.enterHome());await p.waitForFunction(()=>window.__ht.mode==='home',null,{timeout:60000}).catch(()=>{});
  const g=await ev(()=>{const H=window.__ht;H.step(3);const r=H.jobs.homeUse('laptop');H.step(1);return{used:r,brief:!!(H.UIacts&&H.UIacts['brief:go'])}});console.log('giver',JSON.stringify(g));
  await shot('00-brief',()=>{const H=window.__ht;if(H.mode==='home'){H.P.pos.set(1.9,0,6.3);H.P.yaw=0;H.P.pitch=-.12}});
  await ev(()=>{const H=window.__ht;H.UIacts['brief:go']();H.step(2);H.exitHome('front');H.step(3)});
  const st=await ev(()=>{const H=window.__ht,i=H.jobs.index('porch'),d=H.L.dests[i],V=H.VAN;if(!d)return{err:'no dest'};if(H.CV)H.exitVehicle();V.pos.set(d.x-12,0,d.z);V.yaw=-Math.PI/2;V.spd=0;H.syncVan&&H.syncVan();H.P.pos.set(d.x-12,0,d.z+2.5);H.enterVan();H.step(2);
    V.pos.set(d.x,0,d.z);if(V.car){V.car.x=d.x;V.car.z=d.z}H.syncVan&&H.syncVan();for(let k=0;k<60&&H.mode!=='mission';k++)H.step(1);return{mode:H.mode,id:H.M&&H.M.def.id}});
  if(st.mode!=='mission'){const w=await p.evaluate(async()=>{const H=window.__ht;const w=H.jobs.castWait;if(w)await w;H.step(3);return H.mode});console.log('start (waited)',w)}else console.log('start',JSON.stringify(st));
  if(SEED)await ev(s=>{const M=window.__ht.M;},SEED);
  await ev(f=>{const H=window.__ht,a=H.jobs.api,j=H.jobs.registry.get('porch');window.__T={t:0,said:[]};const T=window.__T;
    const r0=a.radio;a.radio=(w,x,fr)=>{T.said.push(Math.round(H.M?H.M.elapsed:0)+'s '+w+': '+x);return r0(w,x,fr)};
    T.step=()=>{const M=H.M;if(!M||M.state!=='go')return 'end';j.test.step(a,T.t,f?{fail:true}:{});H.P.hp=Math.max(H.P.hp,60);T.t++;H.step(1);return null};
    T.info=()=>{const M=H.M,C=M&&M.pc;if(!C)return{state:M&&M.state};
      return{t:T.t,el:Math.round(M.elapsed),stage:M.stage,hood:C.hood,sit:C.sit,par:M.porches.map(p=>p.state[0]).join(''),pir:M.pir.map(p=>p.st).join(','),car:(M.car2?M.car2.st+(M.car2.parcel!=null?'+P':''):'none')+'/'+M.carPir+'/'+M.carDone+'/'+Math.round(M.carT||0),
        lost:M.lost,talked:M.talked,det:M.deterred,caught:M.caught,blocked:M.blocked,me:Math.round(H.P.pos.x)+','+Math.round(H.P.pos.z)}}},FAIL);
  const WANT=[['01-start',`M.truck&&!M.truck.done&&T.t>40`,null],
    ['02-chair',`M.chair.held`,null],
    ['03-sit',`C.sit&&T.t>60`,`({at:[M.chair.x+2.4,M.chair.z-C.S.face*2.6,M.chair.x,M.chair.z],pitch:-.25})`],
    ['04-truck',`M.truck&&M.truck.wait>0&&M.porches.some(p=>p.state==='porch')`,null],
    ['05-pirate',`M.pir.some(p=>p.st==='walk'&&p.e.dude.root.visible)`,`(()=>{const p=M.pir.find(p=>p.st==='walk').e.pos;return{at:[p.x+3,p.z+C.S.face*3,p.x,p.z],pitch:-.15}})()`],
    ['06-word',`C.talk`,null],
    ['07-putback',`M.pir.some(p=>p.st==='putback')`,null],
    ['08-run',`M.pir.some(p=>p.st==='run')`,null],
    ['09-zip',`M.pir.some(p=>p.e.state==='surrender')`,null],
    ['10-carry',`H.P.carry&&H.P.carry.kind==='box'`,null],
    ['11-sedan',`M.car2&&M.car2.st==='wait'`,`(()=>{const c=M.car2;return{at:[c.x+5,c.z+C.S.face*4,c.x,c.z],pitch:-.15}})()`],
    ['12-block',`M.car2&&M.car2.st==='blocked'`,null],
    ['13-done',`M.exitOpen`,null]];
  const taken={};let last=-1e9;
  for(let f=0;f<FR;f+=30){const r=await ev(()=>{let s=null;for(let i=0;i<30&&!s;i++)s=window.__T.step();return s});
    const inf=await ev(()=>window.__T.info());
    if(!QUIET&&(f-last>=EVERY||r==='end')){last=f;const i=inf;console.log(i.el+'s '+i.stage+' '+i.hood+(i.sit?' SIT':'')+' parcels '+i.par+' pirates ['+i.pir+'] car '+i.car+' lost '+i.lost+' word '+i.talked+' scared '+i.det+' caught '+i.caught+' blocked '+i.blocked+' me '+i.me)}
    if(SHOTS)for(const[n,c,fr]of WANT){if(taken[n])continue;const ok=await ev(c=>{const H=window.__ht,M=H.M,C=M&&M.pc,T=window.__T;if(!C||M.state!=='go')return false;try{return !!eval(c)}catch(e){return false}},c);
      if(ok){taken[n]=1;const o=fr?await ev(f=>{const H=window.__ht,M=H.M,C=M.pc,P=H.P;return eval(f)},fr):null;await shot(n,o)}}
    if(r==='end')break}
  const fin=await ev(()=>{const H=window.__ht;H.step(40);return{state:H.M&&H.M.state,el:H.M&&Math.round(H.M.elapsed),medal:H.M&&H.M.medal,pay:H.M&&H.M.pay?H.M.pay.lines.map(l=>l.label+':'+l.amount):null,acts:Object.keys(H.UIacts||{})}});
  console.log('END',JSON.stringify(fin));await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(1800);await ev(()=>{window.__rafOn=false});await shot(FAIL?'fail':'16-result');
  if(!QUIET){const said=await ev(()=>window.__T.said);console.log('--- radio ('+said.length+')');for(const s of said.slice(0,80))console.log('  '+s)}
  const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'ERRORS '+bad.slice(0,5).join(' | '):'no console errors');
  await b.close();process.exit(fin.state==='won'||FAIL&&fin.state==='lost'?0:1)})().catch(e=>{console.error(e);process.exit(1)});
