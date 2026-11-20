/* Handle With Care: play the whole job by script at the game's own pace (1/30 s frames) and log what happens: the stage, the
   brisket's integrity and temperature, speed and g, every hit (potholes, bumps, the joint, kerbs, crashes), the hatchback's moves,
   Gary, the party. Screenshots of every stage go to docs/screenshots/jobs/cargo/.
   node dev/jobs/cargo.js [--shots] [--fail] [--shoo] [--gary=brights|block|none] [--slow=N (CPU throttle)] [--frames=N] [--dbg]
   Uses the job's own scripted player (test.step). */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const has=k=>process.argv.includes('--'+k),arg=k=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:null};
const SHOTS=has('shots'),DIR=path.join(__dirname,'../../docs/screenshots/jobs/cargo');
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});const ev=(f,a)=>p.evaluate(f,a);let n=0;
  const shot=async(name)=>{if(!SHOTS)return;fs.mkdirSync(DIR,{recursive:true});
    /* the open world streams in on drawn frames: give it a few before the picture */for(let i=0;i<8;i++){await ev(()=>window.__ht.draw());await p.waitForTimeout(220)}
    await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(700);
    await ev(()=>{window.__rafOn=false});await ev(()=>window.__ht.draw());await p.screenshot({path:path.join(DIR,String(++n).padStart(2,'0')+'-'+name+'.jpg'),type:'jpeg',quality:84});console.log('     shot '+name)};
  await p.click('.ht-title [data-act=newgame]').catch(()=>{});await p.waitForTimeout(300);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('cargo'),a=H.jobs.api;j.test.give(a);
    for(const d of[].concat(j.def.unlock.done||[])){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true;HT.Save.jobRec(a.SV(),d).done=true}H.enterHub();H.step(2)});
  /* let the cast load (the harness does the same through test.give while it drives to the ring) */
  await p.waitForFunction(()=>{const PP=window.HT.People;return !PP||!PP.has||['earl','rosa','benny','dee'].every(k=>PP.has(k))},null,{timeout:60000}).catch(()=>console.log('     (cast still loading)'));
  await ev(()=>{const H=window.__ht,d=H.jobs.api.WORLD.places.g_dave;H.P.pos.set(d.x+2,0,d.z+5);H.jobs.start('cargo');H.step(3);if(window.__dbg)H.M.dbg=[]});
  /* --slow=N: CPU throttling (CDP) once the job is running: every timing in the job runs on the frame's dt, so the result must not change */
  if(arg('slow')){const cdp=await p.context().newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:+arg('slow')});console.log('CPU throttle x'+arg('slow'))}
  const st=()=>ev(()=>{const H=window.__ht,M=H.M;if(!M||!M.S)return{mode:H.mode,state:M&&M.state};const S=M.S,e=M.truck,hz=M.hz,gy=M.gy;
    return{t:+M.elapsed.toFixed(1),state:M.state,ph:S.ph,stage:M.stage,integ:+S.integ.toFixed(1),temp:+S.temp.toFixed(1),sauce:S.sauce,hard:S.hard,
      x:e?+e.pos.x.toFixed(1):null,z:e?+e.pos.z.toFixed(1):null,v:e?+(e.spd||0).toFixed(1):null,g:+M.g.mag.toFixed(2),peak:+M.g.peak.toFixed(2),
      hits:JSON.stringify(S.hits),by:Object.entries(S.by).map(([k,v])=>k+':'+v.toFixed(1)).join(' '),
      carry:M.carry?+M.carry.tau.toFixed(2):null,P:[+H.P.pos.x.toFixed(1),+H.P.pos.z.toFixed(1)],
      obst:JSON.stringify(M.obst&&M.obst.map(o=>Math.round(o.s0))),hz:hz?(hz.gone?'gone':hz.st+'@'+(hz.s-M.sP).toFixed(1)+'/'+hz.lat.toFixed(1)+' f'+hz.frust):null,gy:gy?(gy.gone?'gone':gy.st+'@'+(gy.s-M.sP).toFixed(1)):null,
      sc:M.sc?M.sc.step:null,checks:S.checks+'/'+S.checksOk,garyUsed:S.garyUsed,tier:S.tier,plate:S.plate,
      sub:(H.HUD&&H.HUD.state&&H.HUD.state.sub)||null,mem:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):0}});
  const o={fail:has('fail'),shoo:has('shoo'),gary:arg('gary')||undefined};
  /* --memory=N: start the job, play into the drive, give up, back to the street; N times. Everything the job builds must go away. */
  if(arg('memory')){const N=+arg('memory');for(let i=0;i<N;i++){const m=await ev(async([i,o])=>{const H=window.__ht,j=H.jobs.registry.get('cargo'),a=H.jobs.api;
      if(i>0){const d=a.WORLD.places.g_dave;H.P.pos.set(d.x+2,0,d.z+5);H.jobs.start('cargo');H.step(3)}
      for(let t=0;t<900&&H.M&&H.M.state==='go';t++){j.test.step(a,t,o);H.step(1)}H.jobs.finish(false);H.step(5);if(H.UIacts&&H.UIacts['result:go'])H.UIacts['result:go']();H.step(40);H.draw();
      const R=H.render&&H.render.renderer||H.renderer,mem=R&&R.info?R.info.memory:{};let objs=0;H.scene.traverse(()=>objs++);
      return{run:i+1,mode:H.mode,geometries:mem.geometries,textures:mem.textures,sceneObjects:objs,people:window.HT.People&&HT.People.live?HT.People.live.length:null,heapMB:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):null,
        overlays:document.querySelectorAll('.cg-root').length,style:!!document.getElementById('cargo-css')}},[i,o]);console.log(JSON.stringify(m))}
    const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'console errors: '+bad.slice(0,6).join(' | '):'no console errors');await b.close();return}if(has('dbg'))await ev(()=>{window.__dbg=1;window.__ht.M.dbg=[]});
  const step=(frames)=>ev(([f,o])=>{const H=window.__ht,j=H.jobs.registry.get('cargo'),a=H.jobs.api;let t=window.__t||0;for(let i=0;i<f&&H.M&&H.M.state==='go';i++){j.test.step(a,t++,o);H.P.hp=Math.max(H.P.hp,60);H.step(1)}window.__t=t;return t},[frames,o]);
  const want={load:'load-table',carry:'carry',board:'loaded',drive:'drive-maple',bump:'speed-bump',route9:'route9-potholes',bridge:'bridge',hz:'hustlers',check:'brake-check',gary:'gary-blocks',party:'barricade',scene_walk:'dave-carries',scene_reveal:'reveal',scene_choice:'hustlers-choice',scene_after:'after'};
  const done={};let last='',lastHits='';const max=+(arg('frames')||14000);
  for(let f=0;f<max;f+=10){await step(10);const s=await st();if(s.state!=='go')break;
    const key=s.ph+'|'+s.stage+'|'+(s.hz||'').split('@')[0]+'|'+s.gy+'|'+s.sc+'|'+s.checks+'|'+s.garyUsed;
    if(key!==last||s.hits!==lastHits||f%300===0){last=key;lastHits=s.hits;console.log(JSON.stringify(s))}
    if(has('dbg')){const d=await ev(()=>{const M=window.__ht.M;if(!M||!M.dbg)return[];const x=M.dbg.slice();M.dbg.length=0;return x});for(const l of d)console.log('   '+l+' @'+s.x+','+s.z+' v'+s.v)}
    const k=s.ph==='load'?(s.carry!=null?'carry':'load'):s.ph==='scene'?'scene_'+s.sc:s.ph;
    let tag=k;if(s.ph==='drive'&&s.x>53&&s.x<60&&!done.bump)tag='bump';if(s.ph==='drive'&&s.x>215&&!done.route9)tag='route9';if(s.hz&&s.hz.startsWith('along')&&!done.hz)tag='hz';if(s.hz&&s.hz.startsWith('check')&&!done.check)tag='check';if(s.gy&&s.gy.startsWith('block')&&s.gy.includes('@-')&&!done.gary&&s.hz&&s.hz.startsWith('blocked'))tag='gary';
    if(want[tag]&&!done[tag]){done[tag]=1;if(tag==='carry')await step(40);if(tag==='scene_reveal')await step(110);if(tag==='scene_walk')await step(60);await shot(want[tag])}}
  await ev(()=>window.__ht.step(45));const res=await ev(()=>{const H=window.__ht;return{state:H.M&&H.M.state,pay:H.M&&H.M.pay?H.M.pay.lines.map(l=>l.label+':'+l.amount):null,total:H.M&&H.M.pay&&H.M.pay.total,medal:H.M&&H.M.medal}});
  console.log('result',JSON.stringify(res),'frames',await ev(()=>window.__t));await shot('result-card');
  const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'console errors: '+bad.slice(0,6).join(' | '):'no console errors');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
