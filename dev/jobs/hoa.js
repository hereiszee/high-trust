/* Exhibit HOA: play it by script, print a timeline (phase, suspicion, the board, who is looking, every line said) and take a
   screenshot of every stage (docs/screenshots/jobs/hoa/).
   node dev/jobs/hoa.js [--fail] [--touch] [--out=dir] [--quiet] [--noshots]
   default : the jobs-check bot (Phil's porch, the Buick, the meeting), human-ish pacing
   --fail  : strolls up their driveway filming the lookout until they spook (the fail card)
   --touch : a landscape phone viewport (844x390, touch layout)
   --part=1|2 : only the stakeout shots / only the meeting and result shots (headless SwiftShader runs out of memory on all of them in one page) */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:process.argv.includes('--'+k)?true:d};
const PART=+arg('part',0),FAIL=!!arg('fail',false),TOUCH=!!arg('touch',false),QUIET=!!arg('quiet',false),NOSHOTS=!!arg('noshots',false),OUT=path.resolve(__dirname,'../../',arg('out','docs/screenshots/jobs/hoa'));
(async()=>{const {b,p,errs}=await open(TOUCH?{viewport:{width:844,height:390}}:{viewport:{width:+arg('w',1280),height:+arg('h',720)}});const ev=(f,a)=>p.evaluate(f,a);fs.mkdirSync(OUT,{recursive:true});
  if(arg('debug',false)){const cdp=await p.context().newCDPSession(p);await cdp.send('Debugger.enable');cdp.on('Debugger.paused',e=>{console.log('PAUSED');for(const f of e.callFrames.slice(0,14))console.log('  at',f.functionName||'(anon)',f.url.split('/').pop()+':'+(f.location.lineNumber+1)+':'+f.location.columnNumber);process.exit(3)});
    setTimeout(()=>cdp.send('Debugger.pause').catch(e=>console.log('pause failed',e.message)),+arg('debug',90)*1000)}
  const shot=async n=>{if(NOSHOTS)return;await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(500);await ev(()=>{window.__rafOn=false});
    await ev(()=>{window.__ht.draw()});await p.screenshot({path:path.join(OUT,(TOUCH?'touch-':'')+n+'.jpg'),type:'jpeg',quality:84});console.log('  shot '+n)};
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('hoa');j.test.give(H.jobs.api);H.step(2)});
  const g=await ev(()=>{const H=window.__ht,i=H.jobs.index('hoa');const n=H.npcs.find(n=>n.marker&&n.marker.i===i);if(!n)return{err:'no giver'};H.P.pos.set(n.pos.x+1.2,0,n.pos.z+1.4);H.collide(H.P.pos,.35);
    H.P.yaw=Math.atan2(1.2,1.4);H.P.pitch=-.08;H.step(30);H.use=true;H.step(1);return{brief:!!(H.UIacts&&H.UIacts['brief:go'])}});
  console.log('giver',JSON.stringify(g));if(PART!==2)await shot('00-giver-brief');
  await ev(()=>{const H=window.__ht;H.UIacts['brief:go']();H.step(2)});await p.waitForTimeout(2500);
  await ev(()=>{const H=window.__ht,i=H.jobs.index('hoa'),d=H.L.dests[i];if(H.CV)H.exitVehicle();const V=H.VAN;V.pos.set(d.x-9,0,d.z);V.yaw=-Math.PI/2;V.spd=0;H.syncVan&&H.syncVan();H.P.pos.set(d.x-9,0,d.z+2.5);H.enterVan();H.step(2);
    V.pos.set(d.x,0,d.z);H.syncVan&&H.syncVan();for(let k=0;k<60&&H.mode!=='mission';k++)H.step(1)});
  const st=await ev(()=>{const H=window.__ht;return{mode:H.mode,id:H.M&&H.M.def.id}});console.log('start',JSON.stringify(st));if(st.mode!=='mission'){console.log(errs);await b.close();process.exit(1)}
  await ev(fail=>{const H=window.__ht,j=H.jobs.registry.get('hoa'),a=H.jobs.api;window.__T={log:[],t:0,lastSub:null,lastPh:null,lastStep:null,susHi:0};const T=window.__T;
    T.step=()=>{const M=H.M;if(!M||M.state!=='go')return 'end';j.test.step(a,T.t,fail?{fail:true}:{});T.t++;H.step(1);const M2=H.M;if(!M2)return 'end';
      const sub=H.HUD&&window.__ht.jobs.JRS?null:null;const u=document.querySelector('.ht-sub,.ht-subs');
      const s=M2.st!=null?Math.round(M2.st):0;const B=M2.bot||{};
      if(B.want!==T.lastWant){T.lastWant=B.want;T.log.push(['@'+s,'  want '+B.want+' lk '+(M2.A?M2.A.lookout.x.toFixed(1)+','+M2.A.lookout.z.toFixed(1)+' f'+M2.A.lookout.face:'')+' sus '+M2.sus.toFixed(2)])}if(M2.ph!==T.lastPh||B.step!==T.lastStep){T.lastPh=M2.ph;T.lastStep=B.step;T.log.push(['@'+s,'phase '+M2.ph+' / bot '+(B.step||'-')+' at '+H.P.pos.x.toFixed(1)+','+H.P.pos.z.toFixed(1)])}
      if(M2.sus>T.susHi+.1||(M2.sus<T.susHi-.2)){T.susHi=M2.sus;const o=M2.A&&M2.A[M2.seen];T.log.push(['@'+s,'sus '+M2.sus.toFixed(2)+' seen by '+M2.seen+' ('+(M2.lastLine&&M2.lastLine.why)+') you '+H.P.pos.x.toFixed(1)+','+H.P.pos.z.toFixed(1)+(H.P.crouch?' crouch':'')+(o?' them '+o.x.toFixed(1)+','+o.z.toFixed(1)+' f'+(o.seeing||0).toFixed(2):'')])}
      return null};
    T.run=(max,until)=>{for(let i=0;i<max;i++){const r=T.step();if(r)return r;let u=null;try{u=until(H.M)}catch(e){}if(u)return u}return 'timeout'};
    /* every radio line, as the game shows it */
    const R=H.jobs.api.radio;},FAIL);
  /* subtitle log: patch radio through the api object (job files call api.radio) */
  if(!arg('nolog',false))await ev(()=>{const H=window.__ht,a=H.jobs.api,T=window.__T;const r0=a.radio;a.radio=function(w,t,f){T.log.push(['@'+(H.M&&H.M.st!=null?Math.round(H.M.st):0),'  '+w+': '+t]);return r0.apply(this,arguments)};
    const Ph=window.HT.Photo;const s0=Ph.shoot;Ph.shoot=function(){const r=s0.apply(this,arguments);if(r)T.log.push(['@'+(H.M&&H.M.st!=null?Math.round(H.M.st):0),'  [shot] z'+r.zoom+(r.flash?' flash':'')+' '+(r.hits.map(h=>h.id+'='+h.stars+'('+h.why.join('/')+')').join(' ')||'nothing')]);return r};const n0=Ph.notify;Ph.notify=function(f,t,o){T.log.push(['@'+(H.M&&H.M.st!=null?Math.round(H.M.st):0),'  [text] '+f+': '+t]);return n0.apply(this,arguments)};
    const f0=a.feed;a.feed=function(t,k,s){T.log.push(['@'+(H.M&&H.M.st!=null?Math.round(H.M.st):0),'  [feed] '+t+(s?' · '+s:'')]);return f0.apply(this,arguments)}});
  const WANT=FAIL?[['f1-driveway',`M.bot&&M.bot.fs&&M.sus>.2`],['f2-noticed',`M.sus>.5`],['f3-spooked',`M.ph==='gone'&&M.leaveT>1.2`]]:
   [['01-barb-brief',`M.ph==='intro'&&M.sayT>1&&M.say.length<=3`],['02-checklist',`M.ph==='stake'&&M.st>1.5`],['03-walk-sidewalk',`M.bot&&M.bot.step==='toPorch'&&M.bot.ri>=2`],
    ['04-phil',`M.porch&&M.bot&&M.bot.w>40`],['05-viewfinder-bike',`window.HT.Photo.isRaised()&&window.HT.Photo.focus.locked&&M.bot.step==='bike'&&!M.board.bike`],
    ['06-shot-bike',`M.board.bike&&M.bot.step==='bike'`],['08-walk-to-car',`M.bot.step==='toCar'&&M.bot.ri>=1`],['09-in-the-buick',`M.seat&&!window.HT.Photo.isRaised()`],['10-viewfinder-plate',`M.seat&&window.HT.Photo.isRaised()&&window.HT.Photo.focus.locked&&!M.board.plate`],
    ['11-money',`M.seat&&window.HT.Photo.isRaised()&&M.ex.some(e=>e.st==='hand')&&window.HT.Photo.focus.locked`],['12-face-close',`M.seat&&window.HT.Photo.isRaised()&&M.bot&&window.HT.Photo.zoom===2&&window.HT.Photo.focus.locked&&(!M.board.face||M.board.face.stars<3)`],
    ['13-suspicious',`M.sus>.38`],['14-meeting-walk',`M.ph==='meet'&&M.mt&&M.mt.st==='walk'&&M.mt.t>2`],['15-meeting-board',`M.ph==='meet'&&M.mt&&M.mt.st==='talk'&&M.mt.t>3&&M.card`],
    ['16-twist',`M.flags.summer&&M.mt.st==='talk'`],['17-next-morning',`M.mt&&M.mt.st==='free'&&M.mt.t>1`]];
  const WANT2=PART===1?WANT.filter(w=>w[0]<'14'):PART===2?WANT.filter(w=>w[0]>='14'):WANT;
  await ev(w=>{window.__T.want=w.map(([n,src])=>({n,f:eval('(M)=>'+src)}))},WANT2);
  for(let guard=0;guard<40;guard++){const r=await ev(()=>{const T=window.__T;return T.run(5000,M=>{if(!M)return null;for(const w of T.want){if(w.done)continue;let ok=false;try{ok=w.f(M)}catch(e){}if(ok){w.done=true;return w.n}}return null})});
    if(r==='end'){console.log('run:',r);break}if(r==='timeout'){console.log('  ...',await ev(()=>{const M=window.__ht.M;const H=window.__ht;return M&&(M.state+' '+M.ph+' '+(M.bot&&M.bot.step)+' st'+Math.round(M.st||0)+' t'+window.__T.t+' seat'+M.seat+' e'+H.keys.e+' pos'+H.P.pos.x.toFixed(1)+','+H.P.pos.z.toFixed(1)+' raised'+window.HT.Photo.isRaised()+' say'+M.say.length+' gal'+window.HT.Photo.gallery.length+' shots'+M.shots)}));continue}await shot(r);if(PART===1&&await ev(()=>window.__T.want.every(w=>w.done)))break}
  if(PART!==1){await ev(()=>window.__ht.step(40));await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(2200);await shot(FAIL?'f4-fail-card':'18-result')}
  const out=await ev(()=>{const H=window.__ht,M=H.M,T=window.__T;return{log:T.log,state:M&&M.state,board:M&&M.board?Object.fromEntries(Object.entries(M.board).map(([k,v])=>[k,v.stars])):null,susMax:M&&M.susMax,t:M&&Math.round(M.elapsed),
    pay:M&&M.pay?M.pay.lines.map(l=>l.label+':'+l.amount):null,medal:M&&M.medal,missed:T.want.filter(w=>!w.done).map(w=>w.n),shots:M&&M.shots,flashes:M&&M.flashes}});
  if(!QUIET)for(const l of out.log)console.log(l.join(' '));
  delete out.log;console.log(JSON.stringify(out));const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'console errors: '+bad.slice(0,6).join(' | '):'no console errors');
  await b.close();process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
