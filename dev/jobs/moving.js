/* Heavy Lifting: play it by script, print a timeline (bar, calm, phase, wave, hostiles, crew orders, you) and the radio transcript,
   and take a screenshot of every stage (docs/screenshots/jobs/moving/).
   node dev/jobs/moving.js [--shots] [--fail] [--frames=n] [--every=n] [--touch] [--out=dir] [--quiet]
   Uses the job's own bot (test.step), walking pace, real waves and the real crew AI. */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:process.argv.includes('--'+k)?true:d};
const DBG=!!arg('dbg',false),SHOTS=!!arg('shots',false),FAIL=!!arg('fail',false),FR=+arg('frames',13000),EVERY=+arg('every',300),TOUCH=!!arg('touch',false),QUIET=!!arg('quiet',false),OUT=path.resolve(__dirname,'../../',arg('out','docs/screenshots/jobs/moving'));
(async()=>{const {b,p,errs}=await open(TOUCH?{viewport:{width:844,height:390}}:{});const ev=(f,a)=>p.evaluate(f,a);if(SHOTS)fs.mkdirSync(OUT,{recursive:true});
  const frame=o=>ev(o=>{const H=window.__ht,P=H.P;window.__sv={x:P.pos.x,z:P.pos.z,yaw:P.yaw,pitch:P.pitch,rx:P.dude.root.position.x,rz:P.dude.root.position.z,ry:P.dude.root.rotation.y,vis:P.dude.root.visible};
      if(o.at){P.pos.set(o.at[0],0,o.at[1]);P.dude.root.visible=o.body!==false}const lx=o.look?o.look[0]:o.at[2],lz=o.look?o.look[1]:o.at[3];if(lx!=null){P.yaw=Math.atan2(-(lx-P.pos.x),-(lz-P.pos.z))}if(o.pitch!=null)P.pitch=o.pitch;if(o.fp!=null)P.fp=o.fp},o);
  const unframe=()=>ev(()=>{const H=window.__ht,P=H.P,s=window.__sv;if(!s)return;P.pos.x=s.x;P.pos.z=s.z;P.yaw=s.yaw;P.pitch=s.pitch;P.dude.root.position.x=s.rx;P.dude.root.position.z=s.rz;P.dude.root.rotation.y=s.ry;P.dude.root.visible=s.vis;P.fp=false;window.__sv=null});
  const shot=async(n,prep)=>{if(!SHOTS||(typeof SKIP!=='undefined'&&SKIP.has(n)&&!arg('all',false)))return;if(prep&&typeof prep==='object'){await frame(prep);prep=null}if(prep)await ev(prep);await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(700);await ev(()=>{window.__rafOn=false});
    await ev(()=>{const H=window.__ht;H.ow&&H.ow.buildAll&&H.ow.buildAll();H.ow&&H.ow.update&&H.ow.update(H.camera);H.draw()});await p.screenshot({path:path.join(OUT,(TOUCH?'touch-':'')+n+'.jpg'),type:'jpeg',quality:84});await unframe();console.log('  shot '+n)};const SKIP=new Set(['00-brief','result']);
  await ev(d=>{window.__DBG=d},DBG);
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  if(SHOTS)await ev(async()=>{const H=window.__ht;try{H.render.apply('high')}catch(_){}});
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('moving'),a=H.jobs.api,s=a.SV();
    for(const d of j.def.unlock.done){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true}H.prog.trustR=Math.max(H.prog.trustR||0,40);j.test.give(a)});
  await ev(async()=>{const pm=window.HT.People;await Promise.race([pm.preload(['nb_office','nb_marcus','nb_lucia','nb_kid','nb_gran','nb_pops','nb_sweater','nb_kenji','rosa','dad_gary','dad_rick','dad_dave']).catch(()=>{}),new Promise(r=>setTimeout(r,30000))])});
  await ev(()=>{const H=window.__ht;H.enterHub();H.step(3)});
  if(SHOTS)await ev(async()=>{const H=window.__ht;H.P.pos.set(370,0,99);H.step(2);for(let i=0;i<80&&H.assets.stream&&!H.assets.stream.idle();i++)await new Promise(r=>setTimeout(r,500))});
  /* the giver and the brief */
  const g=await ev(()=>{const H=window.__ht,i=H.jobs.index('moving');const n=H.npcs.find(n=>n.marker&&n.marker.i===i);if(!n)return{err:'no giver'};H.P.pos.set(n.pos.x+1.2,0,n.pos.z+2.2);H.collide(H.P.pos,.35);H.P.yaw=Math.atan2(1.2,2.2);H.P.pitch=-.06;H.step(3);H.use=true;H.step(1);window.__go=H.UIacts&&H.UIacts['brief:go'];return{brief:!!window.__go,at:[Math.round(n.pos.x),Math.round(n.pos.z)]}});
  console.log('giver',JSON.stringify(g));await shot('00-brief');
  await ev(()=>{const H=window.__ht;(H.UIacts['brief:go']||window.__go)();H.step(2)});
  /* park in the ring on 3rd St, behind the truck */
  const st=await ev(()=>{const H=window.__ht,i=H.jobs.index('moving'),d=H.L.dests[i],V=H.VAN;if(H.CV)H.exitVehicle();V.pos.set(d.x,0,d.z-14);V.yaw=0;V.spd=0;H.syncVan&&H.syncVan();H.P.pos.set(d.x+2.5,0,d.z-14);H.enterVan();H.step(2);
    V.pos.set(d.x,0,d.z);V.yaw=0;if(V.car){V.car.x=d.x;V.car.z=d.z;V.car.yaw=0}H.syncVan&&H.syncVan();for(let k=0;k<60&&H.mode!=='mission';k++)H.step(1);return{mode:H.mode,id:H.M&&H.M.def.id}});
  console.log('start',JSON.stringify(st));if(st.mode!=='mission'){console.log(errs);await b.close();process.exit(1)}
  await ev(f=>{const H=window.__ht,a=H.jobs.api,j=H.jobs.registry.get('moving');window.__T={t:0,said:[]};const T=window.__T;
    const r0=a.radio;a.radio=(w,x,fr)=>{T.said.push(Math.round(H.M?H.M.elapsed:0)+'s '+w+': '+x);return r0(w,x,fr)};
    T.step=()=>{const M=H.M;if(!M||M.state!=='go')return 'end';j.test.step(a,T.t,f?{fail:true}:{});H.P.hp=Math.max(H.P.hp,60);T.t++;H.step(1);return null};
    T.info=()=>{const M=H.M,V=M&&M.mv;if(!V)return{state:M&&M.state};const hs=V.hostiles.filter(h=>!h.gone);
      return{t:T.t,el:Math.round(M.elapsed),stage:M.stage,ph:V.ph,pct:Math.round(V.pct*10)/10,calm:Math.round(V.calm),frozen:V.frozen,wave:V.waveI,you:V.you,carry:V.carry&&V.carry.kind,
        hos:hs.map(h=>(h.andre?'N':h.kind)+':'+(h.tm?h.tm.st:'lane')+':'+h.e.state[0]+':'+Math.round(Math.hypot(h.e.pos.x-376,h.e.pos.z-90))+(window.__DBG&&!h.tm&&h.e.ai?'['+h.e.ai.mode+'/'+h.e.ai.sub+'/'+(h.e.lane?h.e.lane.length:'-')+'@'+Math.round(h.e.pos.x)+','+Math.round(h.e.pos.z)+']':'')).join(' '),
        crew:Object.keys(V.crew).map(id=>{const al=V.crew[id].a,ro=al.role,ai=al.ai,n=H.L.nav;return id[0]+':'+V.orders[id]+(V.crew[id].box?'+':'')+(al.down?'D':'')+':'+Math.round(al.pos.x)+','+Math.round(al.pos.z)+(window.__DBG&&ro?'[->'+ro.x.toFixed(1)+','+ro.z.toFixed(1)+' st:'+(ai&&ai.intent&&ai.intent.state)+' path:'+(ai&&ai.path?ai.path.length:'-')+' wk:'+(n?n.walkable(Math.floor(ro.x/2),Math.floor(ro.z/2)):'?')+' cell:'+(n?n.walkable(Math.floor(al.pos.x/2),Math.floor(al.pos.z/2)):'?')+']':'')}).join(' '),
        me:Math.round(H.P.pos.x)+','+Math.round(H.P.pos.z),cv:V.couch?{held:V.couch.held,x:+V.couch.x.toFixed(1),z:+V.couch.z.toFixed(1),yaw:+V.couch.yaw.toFixed(2),p:V.couch.partner&&(V.couch.partner.kind==='crew'?V.couch.partner.c.a.id:'mrA')}:null,pn:V.piano?{roll:+V.piano.roll.toFixed(2),on:V.piano.on,k:V.piano.k,s:+V.piano.s.toFixed(2),w:V.piano.wait,x:+V.piano.x.toFixed(1),z:+V.piano.z.toFixed(1)}:null,prompt:H.prompt,cuffs:M.cuffs,kills:M.kills,rk:window.__DBG&&V.crew.rick?JSON.stringify({p:[+V.crew.rick.a.pos.x.toFixed(2),+V.crew.rick.a.pos.z.toFixed(2)],ride:V.crew.rick.a.ride,med:!!V.crew.rick.a.medic,path:V.crew.rick.a.ai&&V.crew.rick.a.ai.path&&V.crew.rick.a.ai.path.map(q=>[+q.x.toFixed(1),+q.z.toFixed(1)]),pi:V.crew.rick.a.ai&&V.crew.rick.a.ai.pi2,sp:V.crew.rick.a.ai&&V.crew.rick.a.ai.intent.speed,dir:V.crew.rick.a.ai&&V.crew.rick.a.ai.intent.dir}):null,talked:V.talked,scuffs:V.scuffs,china:V.china,andre:V.andre,lost:V.lost}}},FAIL);
  if(arg('views',false)){/* geometry check: a few fixed views of the set (the job keeps running underneath) */
    await ev(()=>{const H=window.__ht;for(let i=0;i<200;i++)H.step(1)});
    const VIEWS=[['v-corner',384,101,.75,-.18],['v-stoop',376.5,101.5,.45,-.12],['v-truck-rear',372,96,-.75,-.12],['v-3rd-north',379,60,Math.PI,-.06],['v-side',383,88,1.4,-.1]];
    for(const[n,x,z,y,pi]of VIEWS)await shot(n,new Function('const H=window.__ht;H.P.pos.set('+x+',0,'+z+');H.P.yaw='+y+';H.P.pitch='+pi+';H.step(1)'));
    await b.close();process.exit(0)}
  const WANT=[['01-arrive',`V.t>14`,`({at:[386,98.5,375,88],pitch:-.08})`],
    ['02-carry',`V.carry&&V.you>=2&&Math.hypot(H.P.pos.x-375.6,H.P.pos.z-94)<2.2`,`({at:[P.pos.x+3.2,P.pos.z+3.4,P.pos.x,P.pos.z],pitch:-.16})`],
    ['03-trouble',`V.hostiles.some(h=>h.tm&&h.tm.st==='mischief'&&h.e.state==='idle')&&V.frozen`,`({at:[382.5,96,377,89],pitch:-.1})`],
    ['04-corner-fight',`V.hostiles.some(h=>!h.tm&&h.e.state==='idle'&&h.e.ai&&h.e.ai.mode==='combat'&&Object.values(V.crew).some(c=>Math.hypot(c.a.pos.x-h.e.pos.x,c.a.pos.z-h.e.pos.z)<22))`,`(()=>{const h=V.hostiles.find(h=>!h.tm&&h.e.state==='idle'&&h.e.ai&&h.e.ai.mode==='combat'&&Object.values(V.crew).some(c=>Math.hypot(c.a.pos.x-h.e.pos.x,c.a.pos.z-h.e.pos.z)<22)),e=h.e.pos,c=Object.values(V.crew).map(c=>c.a).sort((p,q)=>Math.hypot(p.pos.x-e.x,p.pos.z-e.z)-Math.hypot(q.pos.x-e.x,q.pos.z-e.z))[0].pos,dx=e.x-c.x,dz=e.z-c.z,l=Math.hypot(dx,dz)||1;return{at:[c.x-dx/l*2.4+dz/l*1.3,c.z-dz/l*2.4-dx/l*1.3,e.x,e.z],pitch:-.05}})()`],
    ['05-zip-tie',`V.hostiles.some(h=>h.e.state==='surrender'&&Math.hypot(h.e.pos.x-H.P.pos.x,h.e.pos.z-H.P.pos.z)<2.6)`,`(()=>{const e=V.hostiles.find(h=>h.e.state==='surrender').e.pos;return{at:[e.x+2.8,e.z+3.2,e.x,e.z],pitch:-.2}})()`],
    ['06-couch',`V.couch&&V.couch.held&&V.couch.t>4&&V.couch.z>93`,`(()=>{const C=V.couch;return{at:[C.x+3.6,C.z+3.4,C.x,C.z],pitch:-.22}})()`],
    ['07-piano',`V.piano&&V.piano.on&&V.piano.k>=1&&!V.piano.wait`,`(()=>{const Q=V.piano;return{at:[Q.x+3.4,Q.z+2.6,Q.x,Q.z],pitch:-.2}})()`],
    ['08-piano-step',`V.piano&&V.piano.wait&&V.piano.wait.ready&&V.piano.k>=3`,`(()=>{const Q=V.piano;return{at:[Q.x+3.6,Q.z+3.4,Q.x,Q.z-.4],pitch:-.16}})()`],
    ['09-lights',`V.last&&V.last.st==='lights'&&V.last.t>3`,`({at:[380.5,104,371.5,93.5],pitch:.02})`]];
  const taken={};let last=0;
  for(let f=0;f<FR;f+=30){const r=await ev(()=>{let s=null;for(let i=0;i<30&&!s;i++)s=window.__T.step();return s});
    const inf=await ev(()=>window.__T.info());
    if(!QUIET&&(f-last>=EVERY||r==='end')){last=f;const i=inf;console.log(i.el+'s '+i.stage+'/'+i.ph+' bar '+i.pct+' calm '+i.calm+(i.frozen?' FROZEN':'')+' w'+i.wave+' you '+i.you+(i.carry?'['+i.carry+']':'')+' me '+i.me+' cuffs '+i.cuffs+' kills '+i.kills+' talked '+i.talked+'\n     crew '+i.crew+'\n     hos '+i.hos+(i.cv?'\n     couch '+JSON.stringify(i.cv):'')+(i.pn?'\n     piano '+JSON.stringify(i.pn):'')+(i.rk?'\n     rick '+i.rk:'')+(i.prompt?'\n     prompt '+JSON.stringify(i.prompt):''))}
    if(SHOTS)for(const[n,c,fr]of WANT){if(taken[n])continue;const ok=await ev(c=>{const H=window.__ht,M=H.M,V=M&&M.mv;if(!V||M.state!=='go')return false;try{return !!eval(c)}catch(e){return false}},c);if(ok){taken[n]=1;const o=fr?await ev(f=>{const H=window.__ht,M=H.M,V=M.mv,P=H.P;return eval(f)},fr):null;await shot(n,o)}}
    if(r==='end')break}
  {const i=await ev(()=>window.__T.info());const st=await ev(()=>window.__ht.M&&window.__ht.M.state);if(st==='go')console.log('LAST',JSON.stringify(i))}
  const fin=await ev(()=>{const H=window.__ht;H.step(40);return{state:H.M&&H.M.state,el:H.M&&Math.round(H.M.elapsed),medal:H.M&&H.M.medal,pay:H.M&&H.M.pay?H.M.pay.lines.map(l=>l.label+':'+l.amount):null,acts:Object.keys(H.UIacts||{})}});
  console.log('END',JSON.stringify(fin));await shot(FAIL?'fail':'result');
  console.log('--- transcript ---');const said=await ev(()=>window.__T.said);console.log(said.join('\n'));
  const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'ERRORS: '+bad.slice(0,8).join(' | '):'no console errors');
  await b.close();process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
