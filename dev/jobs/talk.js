/* Small Talk: play it by script and take a screenshot of every stage (docs/screenshots/jobs/talk/).
   node dev/jobs/talk.js [--policy=good|mixed|bad] [--touch] [--out=dir] [--seed=n] [--log]
   good  : reads Tre and picks the register that lands (the jobs-check bot)
   mixed : gets the first rounds wrong on purpose (a reset, a Bad Cop line, a silence), then reads him properly
   bad   : the Bad Cop until Dave runs out of buns (the fail card)
   Prints the whole transcript (who said what, meters after each pick) so pacing and jokes can be reviewed as text too. */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:process.argv.includes('--'+k)?true:d};
const POLICY=arg('policy','mixed'),TOUCH=!!arg('touch',false),OUT=path.resolve(__dirname,'../../',arg('out','docs/screenshots/jobs/talk'));
(async()=>{const {b,p,errs}=await open(TOUCH?{viewport:{width:844,height:390}}:{});const ev=(f,a)=>p.evaluate(f,a);fs.mkdirSync(OUT,{recursive:true});
  const shot=async n=>{await ev(()=>{const H=window.__ht;H.draw()});await p.screenshot({path:path.join(OUT,(TOUCH?'touch-':'')+n+'.jpg'),type:'jpeg',quality:84});console.log('  shot '+n)};
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  if(TOUCH)await ev(()=>{const H=window.__ht;if(H.HUD&&H.HUD.touch)try{H.HUD.touch.enabled=true}catch(e){}document.querySelector('.ht-root')&&document.querySelector('.ht-root').classList.add('touch')});
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('talk');j.test.give(H.jobs.api);H.step(2)});
  /* the giver and the brief */
  const g=await ev(()=>{const H=window.__ht,i=H.jobs.index('talk');const n=H.npcs.find(n=>n.marker&&n.marker.i===i);if(!n)return{err:'no giver'};H.P.pos.set(n.pos.x+1.6,0,n.pos.z);H.collide(H.P.pos,.35);H.P.yaw=Math.atan2(1.6,0);H.step(3);H.use=true;H.step(1);return{brief:!!(H.UIacts&&H.UIacts['brief:go'])}});
  console.log('giver',JSON.stringify(g));await shot('00-brief');
  await ev(()=>{const H=window.__ht;H.UIacts['brief:go']();H.step(2)});
  /* straight to the ring: park on Linden and start */
  await ev(()=>{const H=window.__ht,i=H.jobs.index('talk'),d=H.L.dests[i];H.startMission?0:0;if(H.CV)H.exitVehicle();const V=H.VAN;V.pos.set(d.x+8,0,d.z);V.yaw=Math.PI/2;V.spd=0;H.syncVan&&H.syncVan();H.P.pos.set(d.x+8,0,d.z+2.5);H.enterVan();H.step(2);
    V.pos.set(d.x,0,d.z);H.syncVan&&H.syncVan();for(let k=0;k<60&&H.mode!=='mission';k++)H.step(1)});
  const st=await ev(()=>{const H=window.__ht;return{mode:H.mode,id:H.M&&H.M.def.id}});console.log('start',JSON.stringify(st));if(st.mode!=='mission'){console.log(errs);await b.close();process.exit(1)}
  /* the bot, with a policy; shots on the first time each thing happens */
  await ev(pol=>{const H=window.__ht,j=H.jobs.registry.get('talk'),a=H.jobs.api;window.__T={log:[],seen:{},want:null,t:0,lastSay:null};const T=window.__T;
    T.step=()=>{const M=H.M;if(!M||M.state!=='go')return 'end';const V=M.V,C=M.cv;
      /* mixed: wrong on purpose for the first lines, one Bad Cop, one silence */
      const wrongN=pol==='bad'?999:pol==='good'?0:7;
      if(V&&V.choice&&C&&C.st.lines<wrongN&&M.resets<1&&!T.custom){{T.custom=true;const list=V.choice.list,mood=C.st.mood,row=window.HT.Social.TABLE[mood];
          if(C.st.lines===2&&!T.sil){T.sil=true;V.choice.t=0.01;T.custom=false;}else{let k=list.findIndex(c=>c.reg==='tough');if(k<0||C.st.lines%2){let lo=1e9;list.forEach((c,i)=>{if(c.kind!=='line')return;const r=row[c.line.reg==='special'?'over':c.line.reg]||[0,0],v=r[0]-r[1];if(v<lo){lo=v;k=i}})}
          T.wait=(T.wait||0)+1;if(T.wait>45){T.wait=0;V.choose(Math.max(0,k))}T.custom=false}}}
      else if(!T.custom)j.test.step(a,T.t,pol==='bad'?{fail:true}:{});
      T.t++;H.step(1);
      const M2=H.M;if(!M2)return 'end';const V2=M2.V;
      if(V2&&V2.typing&&V2.typing.t!==T.lastSay&&V2.typing.i>0){T.lastSay=V2.typing.t;T.log.push([(M2.spk||'?'),V2.typing.t,M2.cv?M2.cv.st.mood+' r'+M2.cv.st.rapport+' a'+M2.cv.st.awkward:''])}
      return null};
    T.run=(max,until)=>{for(let i=0;i<max;i++){const r=T.step();if(r)return r;const u=until();if(u)return u}return 'timeout'}},POLICY);
  const until=async(name,fn,max=6000)=>{const r=await ev(([src,max])=>{const f=eval('(M,H)=>'+src);const H=window.__ht;return window.__T.run(max,()=>{const M=H.M;return M&&f(M,H)?'hit':null})},[fn,max]);
    if(r==='hit')await shot(name);else console.log('  (no '+name+': '+r+')');return r};
  await until('01-walkup',`M.ph==='walk'&&H.jobs.api.simT>0&&(M.bot&&M.bot.walk>30)`);
  await until('02-intro-gary',`M.V&&M.V.typing&&M.spk==='gary'&&M.V.typing.i>40`);
  await until('03-intro-dave',`M.V&&M.V.typing&&M.spk==='dave'&&M.V.typing.done===false&&M.V.typing.i>30`);
  await until('04-first-choice',`M.V&&M.V.choice&&M.V.choice.t<M.V.choice.T-.8`);
  await until('05-dad-speaks',`M.V&&M.V.typing&&M.spk==='you'&&M.V.typing.i>30&&M.cv.st.lines>=1`);
  await until('06-tre-replies',`M.V&&M.V.typing&&M.spk==='tre'&&M.V.typing.i>20&&M.cv.st.lines>=1`);
  if(POLICY!=='good')await until('07-bad-cop',`M.shot==='dadTough'&&M.V.typing&&M.V.typing.i>20`,4000);
  if(POLICY==='mixed'){await until('08-reset',`M.V&&M.V.typing&&M.resets>=1&&M.spk==='dave'&&M.V.typing.i>20`,8000);
    await until('09-tell-bored',`M.V&&M.V.choice&&M.cv.st.mood==='bored'&&M.V.choice.t<M.V.choice.T-1`,8000);
    await until('10-tell-defensive',`M.V&&M.V.choice&&M.cv.st.mood==='defensive'&&M.V.choice.t<M.V.choice.T-1`,8000)}
  if(POLICY!=='bad'){await until('11-burger',`M.daveWalk&&M.daveWalk.t>1`,9000);
    await until('12-cheese',`M.V&&M.V.typing&&M.plate&&M.plate.visible&&M.spk==='dave'&&M.V.typing.i>20`,3000);
    await until('13-spill',`M.beats.spill&&M.V&&M.V.typing&&M.spk==='tre'&&M.V.typing.i>40`,9000);
    await until('14-notes',`M.V&&M.V.el&&!M.V.el.querySelector('.soc-notes').hidden`,9000);
    await until('15-free',`M.ph==='free'`,4000)}
  const end=await ev(()=>window.__T.run(12000,()=>null));await ev(()=>window.__ht.step(40));
  const res=await ev(()=>{const H=window.__ht,M=H.M;return{state:M&&M.state,medal:M&&M.medal,pay:M&&M.pay&&M.pay.lines.map(l=>l.label+':'+l.amount),total:M&&M.pay&&M.pay.total,elapsed:M&&Math.round(M.elapsed),
    lines:M&&M.cv&&M.cv.st.lines,rapport:M&&M.cv&&M.cv.st.rapport,resets:M&&M.resets,notes:M&&M.notes,picks:M&&M.bot&&M.bot.picks,stp:M&&M.cv&&M.cv.st.picks}});
  await shot(POLICY==='bad'?'16-fail-card':'16-result');
  if(arg('log',true)){const log=await ev(()=>window.__T.log);for(const l of log)console.log((l[0]+'      ').slice(0,6)+' '+l[1]+(l[2]?'   ['+l[2]+']':''))}
  console.log(JSON.stringify(res,null,1));
  const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'ERRORS: '+bad.join(' | '):'no console errors');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
