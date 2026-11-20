/* Hitch Happens: play it by script, log where the time goes, and take a screenshot of every stage (docs/screenshots/jobs/tow/).
   node dev/jobs/tow.js [--shots] [--frames=n] [--every=n] [--touch] [--out=dir]
   Uses the job's own bot (test.step) with the real tow physics on the real roads; prints a timeline (phase, stage, car, truck,
   hitch angle, damage) and the transcript of radio lines, so pacing and jokes can be reviewed as text too. */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:process.argv.includes('--'+k)?true:d};
const SHOTS=!!arg('shots',false),FR=+arg('frames',16000),EVERY=+arg('every',300),TOUCH=!!arg('touch',false),OUT=path.resolve(__dirname,'../../',arg('out','docs/screenshots/jobs/tow'));
(async()=>{const {b,p,errs}=await open(TOUCH?{viewport:{width:844,height:390}}:{});const ev=(f,a)=>p.evaluate(f,a);if(SHOTS)fs.mkdirSync(OUT,{recursive:true});
  const shot=async n=>{if(!SHOTS)return;await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(700);await ev(()=>{window.__rafOn=false});
    await ev(()=>window.__ht.draw());await p.screenshot({path:path.join(OUT,(TOUCH?'touch-':'')+n+'.jpg'),type:'jpeg',quality:84});console.log('  shot '+n)};
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('tow'),a=H.jobs.api,s=a.SV();
    for(const d of j.def.unlock.done){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true}H.prog.trustR=Math.max(H.prog.trustR||0,25);j.test.give(a);H.enterHub();H.step(3)});
  /* the giver and the brief */
  const g=await ev(()=>{const H=window.__ht,i=H.jobs.index('tow');const n=H.npcs.find(n=>n.marker&&n.marker.i===i);if(!n)return{err:'no giver'};H.P.pos.set(n.pos.x+1.6,0,n.pos.z+1);H.collide(H.P.pos,.35);H.P.yaw=Math.atan2(1.6,1);H.P.pitch=-.08;H.step(3);H.use=true;H.step(1);return{brief:!!(H.UIacts&&H.UIacts['brief:go'])}});
  console.log('giver',JSON.stringify(g));await shot('00-brief');
  await ev(()=>{const H=window.__ht;H.UIacts['brief:go']();H.step(2)});
  /* park in the ring at Dad's Auto */
  const st=await ev(()=>{const H=window.__ht,i=H.jobs.index('tow'),d=H.L.dests[i],V=H.VAN;if(H.CV)H.exitVehicle();V.pos.set(d.x+9,0,d.z);V.yaw=-Math.PI/2;V.spd=0;H.syncVan&&H.syncVan();H.P.pos.set(d.x+9,0,d.z+2.5);H.enterVan();H.step(2);
    V.pos.set(d.x,0,d.z);if(V.car){V.car.x=d.x;V.car.z=d.z}H.syncVan&&H.syncVan();for(let k=0;k<60&&H.mode!=='mission';k++)H.step(1);return{mode:H.mode,id:H.M&&H.M.def.id}});
  console.log('start',JSON.stringify(st));if(st.mode!=='mission'){console.log(errs);await b.close();process.exit(1)}
  await ev(()=>{const H=window.__ht,a=H.jobs.api,j=H.jobs.registry.get('tow');window.__T={t:0,log:[],said:null};const T=window.__T;
    const rad=document.getElementById('radio')||document.querySelector('.ht-radio,.radio');
    T.dmg=[];window.HT.Tow.on((ty,d)=>{if(['hit','scrape','bump','jackknife','snap'].includes(ty))T.dmg.push(T.t+':'+ty+':'+(d.car&&d.car.o?d.car.o.id:'?')+':'+(d.sp?d.sp.toFixed(1):'')+':'+(d.hp?(+d.hp).toFixed(1):''))});T.step=()=>{const M=H.M;if(!M||M.state!=='go')return 'end';j.test.step(a,T.t,{});H.P.hp=Math.max(H.P.hp,60);T.t++;H.step(1);return null};
    T.info=()=>{const M=H.M,Tw=window.HT.Tow,k=Tw&&Tw.link,e=H.CV;return{t:T.t,el:M&&Math.round(M.elapsed),ph:M&&M.ph,stage:M&&M.stage,state:M&&M.state,sweep:M&&Math.round(M.sweep),
      van:e?[Math.round(e.pos.x),Math.round(e.pos.z),+(e.car||e).spd.toFixed(1)]:'foot '+Math.round(H.P.pos.x)+','+Math.round(H.P.pos.z),
      tow:k?(k.ref.o?k.ref.o.id:'truck')+' '+Math.round(Math.abs(k.rel||0)*57)+'deg':null,
      lot:M&&M.att?(M.fight?'FIGHT ':'')+(M.talk?'talk'+M.talk.r+(M.talk.busy?'b':''):'')+' '+M.att.map(e=>e.state+e.hp).join(','):null,cars:M&&M.cars?M.cars.map(c=>c.o.id[0]+':'+c.st+':'+Math.round(H.carHp(c))).join(' '):'',ft:M&&M.ft?M.ft.state:null,mcar:M&&M.car?[Math.round(M.car.pos.x),Math.round(M.car.pos.z),M.car===H.VAN]:null,prompt:(document.querySelector(".ht-prompt,#prompt")||{}).textContent,en:H.enemies.map(e=>e.state).join(",")}}});
  const WANT=[['01-sal-fits-hitch',`M.ph==='fit'&&M.fitT>3`],['02-drive',`M.ph==='drive'&&H.CV&&Math.abs(H.CV.spd)>8`],['03-the-lot',`M.ph==='lot'&&!H.CV&&!M.talk`],
    ['04-talk',`M.talk&&M.talk.r===1&&!M.talk.busy`],['05-gate-open',`M.ph==='tow'&&M.gate.open>.8&&!window.HT.Tow.link`],['06-lining-up',`window.HT.Tow.S.cand&&window.HT.Tow.S.cand.chk.d<3`],
    ['07-hitched',`window.HT.Tow.link&&window.HT.Tow.link.t>1.2&&window.HT.Tow.link.t<2`],['08-towing',`window.HT.Tow.link&&H.CV&&Math.abs(H.CV.spd)>10&&Math.abs(window.HT.Tow.link.rel||0)>.15`],
    ['09-drop-zone',`window.HT.Tow.link&&M.owners&&M.owners.some(o=>o.zone.visible&&Math.hypot(o.curb.x-H.P.pos.x,o.curb.z-H.P.pos.z)<14)`],
    ['10-owner-reacts',`M.owners&&M.owners.some(o=>o.st==='react'&&o.reactT>1.5)`],['11-quikhook-truck',`M.ft&&M.ft.state==='tail'&&M.ft.t>5&&H.CV`],
    ['12-unhooking',`M.ft&&M.ft.state==='lyleout'&&M.ft.uh>.25`],['13-lyle-surrenders',`M.ft&&M.ft.lyle&&M.ft.lyle.state==='surrender'`],['14-towing-the-truck',`window.HT.Tow.link&&M.ft&&window.HT.Tow.link.ref===M.ft.e&&window.HT.Tow.link.t>2`],
    ['15-back-at-sals',`M.salDone`]];
  await ev(w=>{window.__T.want=w.map(([n,src])=>({n,f:eval('(M,H)=>'+src)}))},WANT);
  let t=0;while(t<FR){const r=await ev(n=>{const T=window.__T,H=window.__ht;for(let i=0;i<n;i++){const r=T.step();if(r)return{end:true};const M=H.M;for(const w of T.want){if(w.done)continue;let ok=false;try{ok=w.f(M,H)}catch(e){}if(ok){w.done=true;return{shot:w.n}}}}return{}},Math.min(EVERY,FR-t));
    const inf=await ev(()=>window.__T.info());t=inf.t;console.log(JSON.stringify(inf));if(r.shot)await shot(r.shot);if(r.end)break}
  await ev(()=>window.__ht.step(40));const res=await ev(()=>{const H=window.__ht,M=H.M;return{state:M&&M.state,medal:M&&M.medal,pay:M&&M.pay&&M.pay.lines.map(l=>l.label+':'+l.amount),total:M&&M.pay&&M.pay.total,elapsed:M&&Math.round(M.elapsed),sweep:M&&Math.round(M.sweepDone||M.sweep)}});
  await shot('16-result');console.log(JSON.stringify(res,null,1));console.log('damage: '+(await ev(()=>window.__T.dmg.join(' | '))));
  const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'ERRORS: '+bad.join(' | '):'no console errors');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
