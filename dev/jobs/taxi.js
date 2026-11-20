/* Dad Taxi playtest (SPEC3 2.4): plays the job by script in the real game, logs the pacing (each stop: clock, target, lateness, stars,
   ride score) and takes screenshots of every stage into docs/screenshots/jobs/taxi/.
   node dev/jobs/taxi.js [--shots] [--fail] [--zip] [--skip-item] [--max=13] [--item=shin|card|retainer|trombone] [--car=suv] [--log]
   Uses the job's own scripted player (js/jobs/taxi.js test.step); only window.__ht.step() advances the game. */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const arg=k=>{const a=process.argv.find(x=>x.startsWith('--'+k));return a?(a.includes('=')?a.split('=')[1]:true):null};
const SHOTS=!!arg('shots'),DIR=path.join(__dirname,'../../docs/screenshots/jobs/taxi');
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});const ev=(f,x)=>p.evaluate(f,x);
  const shot=async n=>{if(!SHOTS)return;fs.mkdirSync(DIR,{recursive:true});await ev(()=>window.__ht.draw());await p.screenshot({path:path.join(DIR,n+'.jpg'),type:'jpeg',quality:84});console.log('  shot '+n)};
  await p.click('.ht-title [data-act=newgame]').catch(()=>{});await p.waitForTimeout(300);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);await window.HT.People.preload(['son','daughter','thug_hoodie','thug_brown','thug_beanie']).catch(()=>{})});
  const o={fail:!!arg('fail'),zip:!!arg('zip'),skipItem:!!arg('skip-item'),max:+arg('max')||13};
  const st=await ev(([o,item,carT])=>{const H=window.__ht,a=H.jobs.api;
    if(carT){const c=a.L.cars.find(c=>c.type===carT);if(c){c.pos.set(a.VAN.pos.x+6,0,a.VAN.pos.z);a.syncCar(c);window.__car=c}}
    if(window.__viaRing){const i=H.jobs.index('taxi'),d=H.L.dests[i];H.JOB=i}
    if(!window.__viaRing){H.jobs.start('taxi');H.step(2)}const M=a.M;if(!M)return{err:'no M'};if(item&&M.live){const I={shin:1,card:2,retainer:3,trombone:4}[item];M.item.k=I;const ids=['','shin','card','retainer','trombone'];
      H.jobs.registry.get('taxi').test.item(M,ids[I])}
    window.__T={o,log:[],shots:{}};return{id:M&&M.def.id,stops:M.live.S.stops.map(s=>s.name+'@'+s.target+(s.hard?'+'+s.hard:'')),clock:M.live.S.clockStr(0),item:M.item.id,car:M.car&&M.car.type}},[o,arg('item'),arg('car')]);
  console.log('start',JSON.stringify(st));
  /* fix the item text when forced */
  if(arg('item'))await ev(()=>{const M=window.__ht.jobs.api.M;const all={shin:1,card:2,retainer:3,trombone:4};});
  await shot('01-start');
  const seen=new Set();let last='';
  for(let chunk=0;chunk<400;chunk++){
    const r=await ev(()=>{const H=window.__ht,a=H.jobs.api,M=a.M,j=H.jobs.registry.get('taxi'),T=window.__T;const ev=[];
      for(let i=0;i<30&&M&&M.state==='go';i++){j.test.step(a,T.f=(T.f||0)+1,T.o);H.P.hp=100;H.step(1);
        const L=M.live;if(!L)break;const S=L.S;for(const s of S.stops)if(s.done&&!T['s'+s.k]){T['s'+s.k]=1;ev.push({stop:s.name,k:s.k,clock:S.clockStr(s.at),t:Math.round(s.at),target:s.target,late:Math.round(s.late),stars:s.stars,leg:Math.round(s.comfort),ride:Math.round(L.C.v)})}
        const tag=M.st.phase+(L.enc?':'+L.enc.state:'')+(L.busy?':busy-'+L.busy.s.id:'')+(M.item&&M.item.noticed&&!M.item.done?':item':'');if(tag!==T.tag){T.tag=tag;ev.push({phase:tag,t:Math.round(M.elapsed),clock:S.clockStr(M.elapsed)})}}
      const L=M&&M.live,c=a.CV;return{state:M&&M.state,t:M&&Math.round(M.elapsed),ev,pos:c?[Math.round(c.pos.x),Math.round(c.pos.z),Math.round(c.spd*10)/10]:null,ride:L&&Math.round(L.C.v),avg:L&&Math.round(L.C.avg()),n:L&&L.C.n,
        dbg:(()=>{const j=H.jobs.registry.get('taxi');return null})(),pp:window.__ppd&&JSON.stringify(window.__ppd),blk:L&&L.enc?{d:Math.round(L.enc.cr.d),tot:Math.round(L.enc.cr.total),b:Math.round(L.enc.block*10)/10,want:L.enc.cr.want,spd:Math.round(L.enc.cr.spd)}:null}});
    for(const e of r.ev){console.log('  ',JSON.stringify(e));
      const k=e.phase||('stop'+e.k);if(SHOTS&&!seen.has(k)){seen.add(k);const name={'run:busy-school1':'02-school-pickup','run:busy-park':'03-park','run:busy-hank':'04-hank','run:busy-ortho':'05-ortho','bikes:call':'06-the-call','bikes:drive':'07-pickup-coming','bikes:bail':'08-blocked','bikes:choice':'09-choice','back':'10-back-to-school','back:busy-school2':'11-bikes-back','back:busy-home':'12-home'}[e.phase];if(name)await shot(name)}}
    if(arg('log')&&chunk%4===0)console.log('   t='+r.t,'pos',r.pos,r.pp,'ride',r.ride,'avg',r.avg,r.blk?JSON.stringify(r.blk):'');
    if(r.blk&&SHOTS&&!seen.has('blk')&&r.blk.b>1.2){seen.add('blk');await shot('07b-blocking')}
    if(arg('stopAt')&&r.t>=+arg('stopAt')){fs.mkdirSync(DIR,{recursive:true});await ev(()=>window.__ht.draw());await p.screenshot({path:'/tmp/claude-0/s/stuck.jpg',type:'jpeg'});const dbg=await ev(()=>{const a=window.__ht.jobs.api,e=a.CV,D=a.M.live;return{pos:[e.pos.x,e.pos.z,e.yaw,e.spd],keys:Object.keys(a.keys).filter(k=>a.keys[k]),item:a.M.item,riders:D.K.list.map(r=>[r.id,r.state,r.seat,Math.round(r.x),Math.round(r.z),!!r.walk])}});console.log(JSON.stringify(dbg));break}
    if(r.state!=='go'){console.log('END',r.state,'t',r.t,'avg',r.avg,JSON.stringify(r.n));break}}
  await ev(()=>window.__ht.step(40));
  const res=await ev(()=>{const H=window.__ht,M=H.jobs.api.M;return{state:M.state,medal:M.medal,pay:M.pay?{total:M.pay.total,lines:M.pay.lines.map(l=>l.label+': '+l.amount)}:null,acts:Object.keys(H.UIacts||{}),end:M.def.endLine}});
  console.log(JSON.stringify(res,null,1));await shot(res.state==='won'?'13-result':'13-fail');
  const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'ERRORS '+bad.slice(0,6).join(' | '):'no console errors');
  await b.close();process.exit(bad.length?1:0)})().catch(e=>{console.error(e);process.exit(1)});
