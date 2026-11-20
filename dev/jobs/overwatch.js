/* Higher Ground (js/jobs/overwatch.js): a play-through driver with a readable log and stage screenshots.
   node dev/jobs/overwatch.js [--shots|--only=<shot>] [--fail] [--human] [--max=12000] [--quiet]
     --only=05-court-scope  play to that moment, take that one picture with the streamed world, exit (one picture per session;
                            the full --shots run can exhaust memory in headless Chromium)
     --shots  jpgs of every stage, the scope and the result card into docs/screenshots/jobs/overwatch/
     --fail   the bot sits on its hands (checks the pinned / witness fail)
     --human  slower, human-ish bot: it re-acquires targets with a reaction delay and scans before shooting
   Starts the job directly (the giver -> brief -> drive path is dev/jobs-check.js's job), with the world streamed in and the
   Riverside cast preloaded, so the screenshots show the real models. Prints every radio line with its game time. */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const has=k=>process.argv.includes('--'+k),arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:d};
const OUT=path.join(__dirname,'../../docs/screenshots/jobs/overwatch');const SHOTS=has('shots')||!!arg('only',''),MAX=+arg('max',12000),ONLY=arg('only','');
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});const ev=(f,a)=>p.evaluate(f,a);
  const shot=async(n,prep)=>{if(!SHOTS)return;if(arg('aim','')){await ev(id=>{const H=window.__ht,O=H.M.ow,P=H.P,t=O.threats.find(t=>t.id===id);if(!t||!t.e)return;P.aim=true;P.crouch=true;for(let k=0;k<20;k++){const ex=P.pos.x-Math.sin(P.yaw)*.7,ez=P.pos.z-Math.cos(P.yaw)*.7,ey=P.visY+1.23,dx=t.e.pos.x-ex,dz=t.e.pos.z-ez,dy=(t.y||0)+1.0-ey;P.yaw=Math.atan2(-dx,-dz)-O.rifle.sw.y;P.pitch=Math.atan2(dy,Math.hypot(dx,dz))-O.rifle.sw.p-O.rifle.kick;H.step(1)}},arg('aim',''))}if(!/result/.test(n))await ev(()=>{for(const e of document.querySelectorAll('.ht-bn'))e.style.visibility='hidden'});if(arg('zoom','')!==''){await ev(k=>{const H=window.__ht,O=H.M&&H.M.ow;if(O){O.rifle.zoomK=k;O.rifle.scopeT=1;H.step(4)}},+arg('zoom','0'));n=arg('name',n)}if(arg('hide',''))await ev(h=>{const H=window.__ht,O=H.M&&H.M.ow;if(!O)return;if(h.includes('e'))for(const e of H.enemies)e.dude.root.visible=false;if(h.includes('m'))for(const m of O.meshes)m.visible=false;if(h.includes('w'))for(const o of H.L.group.children)if(o.userData&&!o.userData.ow)o.visible=o.visible;if(h.includes('p'))for(const p of O.proj)p.mesh.visible=false;if(h.includes('u')){H.P.aim=false;H.step(12)}if(h.includes('f'))window.HT.FX&&window.HT.FX.clear&&window.HT.FX.clear()},arg('hide',''));fs.mkdirSync(OUT,{recursive:true});if(prep)await ev(prep);
    await ev(()=>{const H=window.__ht;H.draw();H.draw()});await p.waitForTimeout(150);await p.screenshot({path:path.join(OUT,n+'.jpg'),type:'jpeg',quality:84});console.log('     shot '+n)};
  if(ONLY)await ev(f=>{window.__owOnly=f},has('nobuild')?2:1);
  if(arg('stage',''))await ev(st=>{window.__owStage=st},arg('stage',''));
  if(arg('dbg',''))await ev(f=>{window.__owDbg=f},JSON.parse(arg('dbg','{}')));
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.openBridge();if(window.__owOnly===1)H.ow.buildAll();const pp=window.HT.People;
    await Promise.race([pp.preload(['rosa','nb_pops','nb_kid','nb_gran','nb_marcus','nb_kenji','nb_mei','thug_hoodie','dad_doug','dad_gary']),new Promise(r=>setTimeout(r,20000))]);
    const j=H.jobs.registry.get('overwatch');j.test.give(H.jobs.api);const i=H.jobs.index('overwatch');H.prog.done[H.jobs.index('rosa')]=true;
    const ST=window.__owStage;if(ST){const S={church:71.5,car:121,court:40.1}[ST]||0;
      H.jobs.start('overwatch',{checkpoint:{stage:ST,player:{x:417,z:49.1,yaw:Math.PI/2,hp:100,weapons:{},cur:'pistol',ammo:{},pool:{},inCar:false,car:null},crew:[],cars:[],
        job:{st:ST,roof:{x:417,z:49.1},esc:{s:S,state:'walk',stopK:-1,stopsDone:[4,6].filter(k=>S>(k===4?39:70)),revived:0,hp:[100,100,100],fired:[]},ammo:{type:'bean',bean:[5,10],live:[5,5]},stats:{beaned:3,cuffed:3,lethal:0,spooked:0,civ:0,shots:4,hits:3,kevin:1,flats:0},sight:1,wit:100},t:60}})}
    else H.jobs.start('overwatch');H.step(2);
    /* the log: radio lines, stage changes, feed */
    const A=H.jobs.api,L=window.__owLog=[];const r0=A.radio;A.radio=(w,t,f)=>{L.push([+(H.M&&H.M.elapsed||0).toFixed(1),'radio',w,t]);return r0(w,t,f)};
    const f0=A.feed;A.feed=(t,k,s)=>{L.push([+(H.M&&H.M.elapsed||0).toFixed(1),'feed',t,s||'']);return f0(t,k,s)}});
  await ev(()=>window.__ht.step(30));
  if(ONLY==='01-ladder')await ev(async()=>{for(let k=0;k<40&&!window.__ht.assets.stream.idle();k++){window.__ht.draw();await new Promise(r=>setTimeout(r,400))}});
  if(!ONLY||ONLY==='01-ladder'){await shot('01-ladder',()=>{const H=window.__ht;H.P.pitch=.12});if(ONLY){await b.close();process.exit(0)}}
  const opts={fail:has('fail')||has('retry'),human:has('human')};
  let t=0,lastStage='',shots={},lastLog=0;const T0=Date.now();
  while(t<MAX){const r=await ev(([n,o,t0])=>{const H=window.__ht,j=H.jobs.registry.get('overwatch'),a=H.jobs.api;let t=t0;
      for(let k=0;k<n&&H.M&&H.M.state==='go';k++,t++){j.test.step(a,t,o);H.P.hp=Math.max(H.P.hp,60);H.step(1)}
      const M=H.M,O=M&&M.ow,E=O&&O.esc;return{t,state:M&&M.state,stage:O&&O.stage,el:M&&+M.elapsed.toFixed(1),s:E?+E.s.toFixed(1):null,es:E&&E.state,pin:E?+E.pinT.toFixed(1):0,hp:O&&O.witHp,
        roof:O&&O.roof.on,threats:O?O.threats.map(x=>x.id+':'+x.st+(x.e?'/'+x.e.state:'')+(x.marked?'*':'')).join(' '):'',car:O&&O.car?{x:+O.car.c.x.toFixed(0),flats:O.car.flats.join(''),done:O.car.done}:null,
        last:O&&O.lastHit,stats:O&&O.stats,scoped:O&&O.rifle.scopeT>.9,exit:M&&M.exitOpen}},[ONLY?10:60,opts,t]);
    t=r.t;const L=await ev(k=>window.__owLog.slice(k),lastLog);lastLog+=L.length;if(!has('quiet'))for(const l of L)console.log(String(l[0]).padStart(6)+'  '+l[1].padEnd(5)+' '+l[2]+': '+l[3]);
    if(r.stage!==lastStage){console.log('--- stage '+r.stage+' @'+r.el+'s  escort s='+r.s+' '+r.es);lastStage=r.stage}
    if(t%600<60||r.state!=='go')console.log('   t='+r.el+' s='+r.s+' '+r.es+' pin='+r.pin+' hp='+r.hp+' | '+r.threats+(r.car?' | car '+JSON.stringify(r.car):'')+' last '+JSON.stringify(r.last));
    /* screenshots at moments that tell the story */
    const want=[[r.stage==='garden'&&/roof:lurk/.test(r.threats)&&r.s>3,'03b-rowhouse-roof'],[r.stage==='ladder'&&r.roof&&r.scoped&&r.el>4.2,'02-sight-in-scope'],[r.stage==='garden'&&r.s>12&&r.scoped,'03-garden-scope'],[r.stage==='garden'&&r.s>20&&!r.scoped,'04-garden-roof'],
      [r.stage==='court'&&r.s>48&&r.scoped,'05-court-scope'],[r.stage==='court'&&/hoop:aim/.test(r.threats),'06-court-threat'],[r.stage==='church'&&r.s>95&&r.scoped,'07-church-scope'],[r.stage==='car'&&r.car&&r.car.x<395&&r.scoped,'08-car-scope'],[r.exit,'09-done']];
    for(const[c,n]of want)if(c&&!shots[n]&&(!ONLY||ONLY===n)){shots[n]=1;
      /* one picture per session: the headless renderer grows if the game keeps stepping after a full draw of streamed Riverside */
      if(ONLY){console.log('scene',await ev(()=>{const H=window.__ht;let n=0,m=0,sk=0;H.scene.traverse(o=>{n++;if(o.isMesh)m++;if(o.isSkinnedMesh)sk++});return JSON.stringify({py:[H.P.pitch,H.P.yaw,H.camera.fov,H.camera.position.x,H.P.pos.y,H.P.visY],n,m,sk,kids:H.scene.children.length,live:HT.People.live.length,enemies:H.enemies.length,geo:H.renderer.info.memory})}));await ev(async()=>{for(let k=0;k<40&&!window.__ht.assets.stream.idle();k++){window.__ht.draw();await new Promise(r=>setTimeout(r,400))}});await shot(n);await b.close();process.exit(0)}await shot(n)}
    if(r.state!=='go'){console.log('END '+r.state+' @'+r.el+'s stats '+JSON.stringify(r.stats));
      if(has('retry')&&opts.fail&&r.state==='lost'){opts.fail=false;await ev(()=>{const H=window.__ht;H.step(45);H.UIacts['result:retry']();H.step(3)});console.log('=== RETRY from checkpoint');lastStage='';continue}break}}
  await ev(()=>window.__ht.step(40));
  const res=await ev(()=>{const H=window.__ht,M=H.M;return{pay:M&&M.pay?{total:M.pay.total,lines:M.pay.lines.map(l=>l.label+':'+l.amount)}:null,medal:M&&M.medal,trustR:Math.round(H.prog.trustR)}});
  console.log('result '+JSON.stringify(res));if(!ONLY||ONLY==='10-result'){if(ONLY)await ev(async()=>{for(let k=0;k<40&&!window.__ht.assets.stream.idle();k++){window.__ht.draw();await new Promise(r=>setTimeout(r,400))}});await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(1500);await ev(()=>{window.__rafOn=false});await shot('10-result')}
  console.log('wall '+((Date.now()-T0)/1000).toFixed(0)+'s');const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'CONSOLE ERRORS:\n'+bad.slice(0,8).join('\n'):'no console errors');
  await b.close()})().catch(e=>{console.error(e);process.exit(1)});
