/* Hands Off: play it by script, print a timeline (stage, notebook, panic, the ruse, who said what) and take a screenshot of each stage.
   node dev/jobs/arrest.js [--fail] [--shots] [--out=dir] [--max=frames] [--accuse]
   Shots go to docs/screenshots/jobs/arrest/ (jpg, world streamed in first). */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:process.argv.includes('--'+k)?true:d};
const FAIL=!!arg('fail',false),SHOTS=!!arg('shots',false),ONLY=arg('only','')?String(arg('only','')).split(','):null,OUT=path.resolve(__dirname,'../../',arg('out','docs/screenshots/jobs/arrest')),MAX=+arg('max',14000);
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});const ev=(f,a)=>p.evaluate(f,a);if(SHOTS)fs.mkdirSync(OUT,{recursive:true});
  /* the open world builds in slices on draw: draw until nothing new has been built for a few draws */
  const stream=()=>ev(async()=>{const H=window.__ht;let last=-1,same=0;for(let k=0;k<120&&same<6;k++){H.draw();await new Promise(r=>setTimeout(r,60));const s=H.ow&&H.ow.stats&&H.ow.stats();const b=s?s.built:0;if(b===last)same++;else{same=0;last=b}}});
  const shot=async n=>{if(!SHOTS||ONLY&&!ONLY.some(o=>n.startsWith(o)))return;await stream();/* the HUD clock only runs on rendered frames: the start banner's letterbox would otherwise stay up in a stepped test */await ev(()=>{const H=window.__ht;if(H.M&&H.M.ho&&H.M.ho.clock>4)try{H.HUD.banner(null)}catch(_){}});await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(600);await ev(()=>{window.__rafOn=false});
    await ev(()=>{const b=document.querySelector('.ht-bn');if(b&&window.__ht.M&&window.__ht.M.ho&&window.__ht.M.ho.clock>5)b.classList.remove('lbx');window.__ht.draw()});await p.screenshot({path:path.join(OUT,n+'.jpg'),type:'jpeg',quality:84});console.log('  shot '+n)};
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  await p.evaluate(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('arrest');j.test.give(H.jobs.api);const i=H.jobs.index('arrest');
    const pm=window.HT.People;await Promise.race([pm.preload(['rosa','dad_gary','nb_pops','nb_office','nb_sweater','nb_kenji','nb_marcus','nb_mei','nb_lucia','nb_gran','nb_teen','nb_kid','thug_hoodie','thug_track','thug_beanie','thug_red']).catch(()=>{}),new Promise(r=>setTimeout(r,40000))]);
    if(H.mode==='hub'){H.enterHub();H.step(2)}});
  /* the giver, the brief, and the drive into the ring (the way a player starts it) */
  const st=await p.evaluate(async()=>{const H=window.__ht,i=H.jobs.index('arrest');const n=H.npcs.find(n=>n.marker&&n.marker.i===i);if(!n)return{err:'no giver'};H.P.pos.set(n.pos.x+1.6,0,n.pos.z);H.collide(H.P.pos,.35);H.step(1);H.use=true;H.step(1);
    if(H.UIacts&&H.UIacts['brief:go'])H.UIacts['brief:go']();H.step(1);const d=H.L.dests[i],G=H.ow.roads(),V=H.VAN;if(H.CV)H.exitVehicle();const r=G.nearestRoad(d.x,d.z),A_=G.nodes[r.a],B_=G.nodes[r.b];
    const far=Math.hypot(A_.x-d.x,A_.z-d.z)>Math.hypot(B_.x-d.x,B_.z-d.z)?A_:B_;V.pos.set(far.x,0,far.z);V.yaw=Math.atan2(-(d.x-far.x),-(d.z-far.z));V.spd=0;if(V.car)V.car.spd=0;H.syncVan();H.P.pos.set(far.x+2.5,0,far.z);H.enterVan();H.step(2);
    const e=H.CV,k=H.keys;for(let s=0;s<900&&H.mode==='hub';s++){const dx=d.x-e.pos.x,dz=d.z-e.pos.z,d0=Math.hypot(dx,dz);let a=Math.atan2(-dx,-dz)-e.yaw;while(a>Math.PI)a-=6.283;while(a<-Math.PI)a+=6.283;
      const want=d0<12?Math.max(1.5,d0*.4):7;k.a=a>.05;k.d=a<-.05;k.w=e.spd<want;k.s=e.spd>want+2;H.step(1)}for(const x of['w','a','s','d'])k[x]=false;
    const w=H.jobs.castWait;if(w)await w;H.step(2);return{mode:H.mode,id:H.M&&H.M.def.id}});console.log('start',JSON.stringify(st));
  if(st.mode!=='mission'){console.log(errs);await b.close();process.exit(1)}
  /* stream the world in around the market before anything is judged */
  await p.evaluate(async()=>{for(let i=0;i<12;i++){window.__ht.step(5);await new Promise(r=>setTimeout(r,120))}});
  await ev(fail=>{const H=window.__ht,j=H.jobs.registry.get('arrest'),a=H.jobs.api;const T=window.__T={log:[],t:0,last:{}};
    const r0=a.radio;a.radio=function(w,t,f){T.log.push(['@'+(H.M&&H.M.ho?H.M.ho.clock.toFixed(1):0),'  '+w+': '+t]);return r0.apply(this,arguments)};
    const f0=a.feed;a.feed=function(t,k,s){T.log.push(['@'+(H.M&&H.M.ho?H.M.ho.clock.toFixed(1):0),'  [feed] '+t+(s?' · '+s:'')]);return f0.apply(this,arguments)};
    T.step=()=>{const M=H.M;if(!M||M.state!=='go')return 'end';j.test.step(a,T.t,fail?{fail:true}:{});T.t++;H.step(1);const O=H.M&&H.M.ho;if(!O)return 'end';
      const key=O.stage+'|'+(O.ided?1:0)+'|'+(O.cols&&O.cols[O.skim].ruse?O.cols[O.skim].ruse.kind+':'+O.cols[O.skim].ruse.st:'-')+'|'+(O.drawn?'D':'')+'|'+(O.down?'down':'')+'|'+(O.duf?O.duf.st:'');
      if(key!==T.last.key){T.last.key=key;T.log.push(['@'+O.clock.toFixed(1),'state '+key+' panic '+O.panic.toFixed(0)+' wit '+O.wit+' P '+H.P.pos.x.toFixed(1)+','+H.P.pos.z.toFixed(1)])}
      const sk=O.cols&&O.cols[O.skim];if(sk){const s=Math.floor((sk.seen||0)*2);if(s!==T.last.seen){T.last.seen=s;T.log.push(['@'+O.clock.toFixed(1),'  seen '+(sk.seen||0).toFixed(2)+' tells '+JSON.stringify(sk.tells,(k,v)=>typeof v==='number'?+v.toFixed(2):v)])}}
      return null};
    T.run=(max,until)=>{for(let i=0;i<max;i++){const r=T.step();if(r)return r;let u=null;try{u=until(H.M)}catch(e){}if(u)return u}return 'timeout'}},FAIL);
  const W=FAIL?[['f1-drawn',`M.ho.drawn&&M.ho.panic>30`]]:[['01-arrive',`M.ho.spawned&&M.ho.clock>2`],['02-rosa',`M.ho.talked&&M.ho.clock>6`],['03-watch',`M.ho.watch.c&&M.ho.watchedAny>2`],['04-notebook',`M.ho.clues.length>=2&&M.ho.watch.c`],
    ['05-ided',`M.ho.ided&&M.ho.clock>(M.ho.idAt||(M.ho.idAt=M.ho.clock+2))`],['06-ruse',`M.ho.cols[M.ho.skim].ruse&&M.ho.cols[M.ho.skim].ruse.st==='go'&&M.ho.cols[M.ho.skim].ruse.k>=2`],['07-drawn',`M.ho.drawn&&M.ho.ret==='ok'`],
    ['08-down',`M.ho.down&&M.ho.clock>(M.ho.dAt||(M.ho.dAt=M.ho.clock+1.2))`],['09-chase',`M.ho.duf.st==='run'&&M.ho.duf.t>2`],['10-twist',`M.ho.tied&&M.ho.clock>(M.ho.tAt||(M.ho.tAt=M.ho.clock+.8))`],['11-win',`M.exitOpen`]];
  for(const[n,cond]of W){if(ONLY&&!W.slice(W.findIndex(w=>w[0]===n)).some(w=>ONLY.some(o=>w[0].startsWith(o))))break;const r=await ev(([c,max])=>window.__T.run(max,new Function('M','return !!('+c+')')),[cond,MAX]);console.log(n,r);await shot(n);if(r!==true&&r!=='timeout'&&r!==1)break;if(r==='timeout')break}
  const r=await ev(max=>window.__T.run(max,M=>M.state!=='go'),MAX);console.log('end',r);await ev(()=>window.__ht.step(40));await shot(FAIL?'f9-fail':'12-result');
  const log=await ev(()=>window.__T.log);for(const l of log.slice(0,400))console.log(l.join(' '));
  const fin=await ev(()=>{const H=window.__ht,M=H.M,O=M&&M.ho;return{state:M&&M.state,stage:M&&M.stage,panicPeak:O&&O.panicPeak,oneShot:O&&O.oneShot,wrong:O&&O.wrong,pay:M&&M.pay&&M.pay.lines&&M.pay.lines.map(l=>l.label+':'+l.amount)}});console.log(JSON.stringify(fin));
  const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'ERRORS '+bad.slice(0,6).join(' | '):'no console errors');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
