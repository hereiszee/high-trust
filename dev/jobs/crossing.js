/* Crossing Guard (js/jobs/crossing.js): a play-through driver with a readable log and stage screenshots.
   node dev/jobs/crossing.js [--shots|--only=<shot>] [--fail] [--human] [--max=14000] [--quiet] [--stage=<stage>]
     --only=<name>  play to that moment, wait for the world to stream in, take that one picture, exit (one picture per session)
     --shots        every stage picture into docs/screenshots/jobs/crossing/ (in one session; --only is kinder to memory)
     --fail         the bot walks off and leaves the kids (separation fail) then retries from the checkpoint
   Starts the job directly (the giver -> brief -> drive path is dev/jobs-check.js's job) with the cast preloaded.
   Prints every radio line and feed item with its game time, and a state line every 10 s. */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const has=k=>process.argv.includes('--'+k),arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:d};
const OUT=path.join(__dirname,'../../docs/screenshots/jobs/crossing');const ONLY=arg('only',''),SHOTS=has('shots')||!!ONLY,MAX=+arg('max',14000);
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});const ev=(f,a)=>p.evaluate(f,a);
  const stream=async()=>ev(async()=>{for(let k=0;k<60&&!window.__ht.assets.stream.idle();k++){window.__ht.draw();await new Promise(r=>setTimeout(r,400))}});
  const shot=async(n,prep)=>{if(!SHOTS)return;fs.mkdirSync(OUT,{recursive:true});if(prep)await ev(prep);await stream();
    await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(700);await ev(()=>{window.__rafOn=false});
    await ev(()=>{const H=window.__ht;H.draw();H.draw()});await p.waitForTimeout(150);await p.screenshot({path:path.join(OUT,n+'.jpg'),type:'jpeg',quality:84});console.log('     shot '+n)};
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;const j=H.jobs.registry.get('crossing');j.test.give(H.jobs.api);H.prog.done[H.jobs.index('dee')]=true;
    const pp=window.HT.People;await Promise.race([pp.preload(['dee','son','daughter','nb_kid','nb_gran','nb_pops','nb_office','nb_sweater','nb_teen','nb_kenji','nb_marcus','nb_mei','nb_lucia','thug_cap','thug_hoodie','thug_track','thug_f_hood','thug_beanie','thug_red','thug_jacket']),new Promise(r=>setTimeout(r,30000))]);
    H.jobs.start('crossing');H.step(2);
    const A=H.jobs.api,L=window.__cgLog=[];const r0=A.radio;A.radio=(w,t,f)=>{L.push([+(H.M&&H.M.elapsed||0).toFixed(1),'radio',w,t]);return r0(w,t,f)};
    const f0=A.feed;A.feed=(t,k,s)=>{L.push([+(H.M&&H.M.elapsed||0).toFixed(1),'feed',t,s||'']);return f0(t,k,s)};
    const e0=A.endMission;A.endMission=(ok,why,ti)=>{L.push([+(H.M&&H.M.elapsed||0).toFixed(1),'END',String(ok),why||'']);return e0(ok,why,ti)}});
  await ev(()=>window.__ht.step(20));
  if(!ONLY||ONLY==='01-church'){await shot('01-church',()=>{const H=window.__ht;H.step(30)});if(ONLY){await b.close();process.exit(0)}}
  const opts={fail:has('fail'),human:has('human')};let t=0,last='',lastLog=0,shots={};const T0=Date.now();
  while(t<MAX){const r=await ev(([n,o,t0])=>{const H=window.__ht,j=H.jobs.registry.get('crossing'),a=H.jobs.api;let t=t0;
      for(let k=0;k<n&&H.M&&H.M.state==='go';k++,t++){j.test.step(a,t,o);H.P.hp=Math.max(H.P.hp,60);H.step(1)}
      const M=H.M,C=M&&M.cg;const kid=k=>k.id.slice(0,3)+':'+k.state[0]+(k.fz>0?'*':'')+(k.kerb?'k':'');
      return{t,state:M&&M.state,stage:C&&C.stage,el:M&&+M.elapsed.toFixed(1),p:[+H.P.pos.x.toFixed(1),+H.P.pos.z.toFixed(1)],aim:H.P.aim,step:C&&C.bot&&C.bot.i,ph:C&&C.bot&&C.bot.ph,
        kids:C&&C.kids?C.kids.map(kid).join(' ')+' homes:'+C.homes.map(h=>h.id+(h.grown?'G':'')+(h.gone?'x':'')).join(','):'',cars:C&&C.traffic?C.traffic.cars.length:0,dbg:C&&C.kids?JSON.stringify({head:+(C.trail.pts.length?C.trail.pts[C.trail.pts.length-1].s:0).toFixed(1),s:C.kids.map(k=>+k.s.toFixed(1)),w:H.keys.w,mov:+C.dadMov.toFixed(2),atK:C.atKerb?C.atKerb.map(k=>k.id):null,cars:C.traffic.cars.filter(c=>Math.hypot(c.x-H.P.pos.x,c.z-H.P.pos.z)<45).map(c=>c.lane.id+'@'+c.x.toFixed(0)+','+c.z.toFixed(0)+' v'+c.v.toFixed(1)+' '+c.why+(c.forSign?'S':'')+(c.phone?'P':''))}):'',heat:C&&C.flare?+C.flare.heat.toFixed(2):null,home:M&&M.cs&&M.cs.home.length,exit:M&&M.exitOpen,
        crews:C&&C.crews?C.crews.A.state+'/'+C.crews.B.state:'',calls:H.renderer.info.render.calls,cross:!!(C&&C.cross)}},[ONLY?10:60,opts,t]);
    t=r.t;const L=await ev(k=>window.__cgLog.slice(k),lastLog);lastLog+=L.length;if(!has('quiet'))for(const l of L)console.log(String(l[0]).padStart(6)+'  '+l[1].padEnd(5)+' '+l[2]+': '+l[3]);
    if(r.stage!==last){console.log('--- stage '+r.stage+' @'+r.el+'s');last=r.stage}
    if(t%300<(ONLY?10:60)||r.state!=='go')console.log('   t='+r.el+' p='+r.p+' aim='+r.aim+' step='+r.step+r.ph+' home='+r.home+' cars='+r.cars+' heat='+r.heat+' crews='+r.crews+' calls='+r.calls+'\n      '+r.kids+'\n      '+r.dbg);
    const want=[[r.stage==='main'&&r.el>14,'02-line-up'],[r.stage==='main'&&r.cross,'03-main-crossing'],[r.stage==='river'&&r.p[1]>58,'04-river-rd'],[r.stage==='river'&&r.cross,'05-ash-crossing'],
      [r.stage==='corner'&&r.home>=1&&r.p[0]<335,'06-first-home'],[r.stage==='corner'&&r.p[0]>341&&r.p[1]>76&&r.p[1]<80,'07-flare-up'],[r.stage==='mill'&&r.cross,'08-mill-crossing'],[r.stage==='mill'&&r.home>=8,'09-porch-lights'],[r.exit,'10-done']];
    for(const[c,n]of want)if(c&&!shots[n]&&(!ONLY||ONLY===n)){shots[n]=1;await shot(n);if(ONLY){await b.close();process.exit(0)}}
    if(r.exit&&r.state==='go'){const f=await ev(()=>{const H=window.__ht;if(H.M&&!H.M.car){H.M.exitT=(H.M.exitT||0)+1;if(H.M.exitT>8){H.jobs.finish(true);return true}}return false});if(f)console.log('   (no car in a direct start: finished)')}
    if(r.state!=='go'){if(opts.fail&&r.state==='lost'){opts.fail=false;await ev(()=>{const H=window.__ht;H.step(45);H.UIacts['result:retry']();H.step(3)});console.log('=== RETRY from checkpoint');last='';continue}break}}
  await ev(()=>window.__ht.step(40));
  const res=await ev(()=>{const H=window.__ht,M=H.M;return{exitOpen:M&&M.exitOpen,car:M&&M.car&&[M.car.pos.x,M.car.pos.z,M.car===H.VAN],P:[H.P.pos.x,H.P.pos.z],state:M&&M.state,pay:M&&M.pay?{total:M.pay.total,lines:M.pay.lines.map(l=>l.label+':'+l.amount)}:null,medal:M&&M.medal,trustR:Math.round(H.prog.trustR)}});
  console.log('result '+JSON.stringify(res));console.log('nearmiss '+JSON.stringify(await ev(()=>window.__cgNM||null)));if(!ONLY||ONLY==='11-result'){await shot('11-result')}
  console.log('wall '+((Date.now()-T0)/1000).toFixed(0)+'s');const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'CONSOLE ERRORS:\n'+bad.slice(0,8).join('\n'):'no console errors');
  await b.close()})().catch(e=>{console.error(e);process.exit(1)});
