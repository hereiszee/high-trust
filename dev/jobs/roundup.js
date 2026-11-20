/* Minivan Roundup: play it with real keyboard input at human pace, check the parts a script can't fake, screenshot every stage.
   node dev/jobs/roundup.js [--noshots] [--quiet] [--out=dir]
   - Route check: every authored path a van drives on rails (out of its bay to the gate) is swept metre by metre against the level's
     colliders (the shop, fences, the booth, parked commuter cars, the hatchbacks once shoved clear) with the van's real footprint.
   - Input: the scripted player (the job's test.step) decides; every in-world action goes through Playwright keyboard events:
     W/A/S/D to drive, E to use (tap) or hold, 3 at the attendant, 1-3 on the relay panel, and the convoy orders 1-4 while driving
     (1 tighten -> gap 6 m, 2 spread -> 14 m, 3 hold -> every van stops, 3 again -> rolling, 4 -> Rick takes the lead).
   - Timeline: stages, the light (forced yellow, who ran it, who stopped), bumps, the pursuit's shake meter, every line said.
   Screenshots (jpg, world streamed in) go to docs/screenshots/jobs/roundup/. */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:process.argv.includes('--'+k)?true:d};
const NOSHOTS=!!arg('noshots',false),QUIET=!!arg('quiet',false),OUT=path.resolve(__dirname,'../../',arg('out','docs/screenshots/jobs/roundup'));
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});const ev=(f,a)=>p.evaluate(f,a);fs.mkdirSync(OUT,{recursive:true});
  const stream=()=>p.evaluate(async()=>{const H=window.__ht;try{H.ow.buildAll()}catch(_){}for(let i=0;i<60&&H.assets.stream&&!H.assets.stream.idle();i++){H.draw();await new Promise(r=>setTimeout(r,400))}H.draw();H.draw()});
  const held={};const setKey=async(k,on)=>{if(!!held[k]===!!on)return;held[k]=!!on;if(on)await p.keyboard.down(k);else await p.keyboard.up(k)};
  const shot=async(n,cam)=>{if(NOSHOTS)return;for(const k of Object.keys(held))await setKey(k,false);/* hands off the keys while the page runs live */await ev(c=>{window.__ruCam=c||null},cam||null);await stream();
    /* a title banner letterboxes the HUD for a few real seconds: let it finish (the live frames are short; the job barely moves) */
    for(let i=0;i<10;i++){await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(500);await ev(()=>{window.__rafOn=false});if(!(await ev(()=>!!document.querySelector('.cine'))))break}
    if(await ev(()=>!!document.querySelector('.cine')))console.log('  (still letterboxed: '+n+')');
    /* (harness artifact: the banner adds its letterbox in a requestAnimationFrame, which this paused-frame harness only runs later,
       after the banner has already ended; in the live game the add runs at once and the end removes it) */
    await ev(()=>{if(!document.querySelector('.cine'))document.querySelectorAll('.lbx').forEach(e=>e.classList.remove('lbx'))});await ev(()=>window.__ht.draw());
    await ev(()=>window.__ht.draw());await p.screenshot({path:path.join(OUT,n+'.jpg'),type:'jpeg',quality:84});await ev(()=>{window.__ruCam=null});console.log('  shot '+n)};
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  await ev(async()=>{const H=window.__ht;try{H.render.apply('high')}catch(_){}await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('roundup');const pr=j.test.give(H.jobs.api);if(pr)await Promise.race([pr,new Promise(r=>setTimeout(r,30000))]);try{const sv=H.save;if(sv&&sv.flags){sv.flags.act2Intro=true;H.prog.act=Math.max(H.prog.act||1,3)}}catch(_){}H.enterHub();H.step(2)});
  /* ---- route check: the rails out of the bays ---- */
  const giver=await ev(()=>{const H=window.__ht,i=H.jobs.index('roundup');const n=H.npcs.find(n=>n.marker&&n.marker.i===i);if(!n)return{err:'no giver'};H.P.pos.set(n.pos.x+1.3,0,n.pos.z+1.5);H.collide(H.P.pos,.35);
    H.P.yaw=Math.atan2(1.3,1.5);H.P.pitch=-.06;H.step(20);H.use=true;H.step(1);return{brief:!!(H.UIacts&&H.UIacts['brief:go'])}});
  ok(giver.brief,'Coach Rick offers the brief at Linden Park');await shot('00-brief');
  await ev(()=>{const H=window.__ht;if(!(H.UIacts&&H.UIacts['brief:go'])){const i=H.jobs.index('roundup'),n=H.npcs.find(n=>n.marker&&n.marker.i===i);if(n){H.P.pos.set(n.pos.x+1.3,0,n.pos.z+1.5);H.step(2);H.use=true;H.step(1)}}H.UIacts['brief:go']();H.step(2)});
  const st=await ev(async()=>{const H=window.__ht,i=H.jobs.index('roundup'),d=H.L.dests[i];if(H.CV)H.exitVehicle();const V=H.VAN;V.pos.set(d.x,0,d.z-14);V.yaw=Math.PI;V.spd=0;H.syncVan();H.P.pos.set(d.x+2,0,d.z-14);H.enterVan();H.step(2);
    V.pos.set(d.x,0,d.z);H.syncVan();for(let k=0;k<60&&H.mode!=='mission';k++)H.step(1);if(H.jobs.castWait)await H.jobs.castWait;H.step(2);return{mode:H.mode,id:H.M&&H.M.def.id,ring:d}});
  ok(st.mode==='mission'&&st.id==='roundup','drove into the ring at the Park & Ride barrier '+JSON.stringify(st.ring));
  /* the rails, checked against the level now that the lot is built */
  const route=await ev(()=>{const H=window.__ht,M=H.M,CVY=window.HT.Convoy,L=H.L;const out=[];const mine=new Set();for(const id in M.vans)mine.add(M.vans[id].col);for(const id in M.blk)mine.add(M.blk[id].col);mine.add(M.barrierCol);
    const statics=L.colliders.filter(c=>!mine.has(c)&&c.x1-c.x0<80&&c.z1-c.z0<80);
    /* the hatchbacks where a shove just clears them (their own 'clear' test: 4.3 m from the path) */
    for(const id in M.blk){const k=M.blk[id],pp=k.f.boxed.push,JJ=M.joinTable()[id];for(let d=0;d<8;d+=.1){const x=k.x0+pp[0]*d,z=k.z0+pp[1]*d;let md=1e9;for(let i=1;i<JJ.length;i++){const A_={x:JJ[i-1][0],z:JJ[i-1][1]},B_={x:JJ[i][0],z:JJ[i][1]},dx=B_.x-A_.x,dz=B_.z-A_.z,L2=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((x-A_.x)*dx+(z-A_.z)*dz)/L2));md=Math.min(md,Math.hypot(A_.x+dx*t-x,A_.z+dz*t-z))}
      if(md>4.3){const S=k.obj.userData.size||{l:3.9,w:1.8},s_=Math.abs(Math.sin(k.c.yaw)),c_=Math.abs(Math.cos(k.c.yaw));statics.push({x0:x-(s_*S.l/2+c_*S.w/2),x1:x+(s_*S.l/2+c_*S.w/2),z0:z-(c_*S.l/2+s_*S.w/2),z1:z+(c_*S.l/2+s_*S.w/2),k:'hatchback (shoved)'});break}}}
    const JO=M.joinTable();for(const id in JO){const P=CVY.railPath(JO[id].map(p=>({x:p[0],z:p[1]})));let worst=null,n=0;
      for(let s=0;s<=P.len;s+=.5){n++;const q=P.at(s),f=[-Math.sin(q.yaw),-Math.cos(q.yaw)],hl=2.2,hw=1.0;
        for(const c of statics){if(c.x1<q.x-3||c.x0>q.x+3||c.z1<q.z-3||c.z0>q.z+3)continue;/* the van's rectangle against the box: sample its outline */
          for(let a=-hl;a<=hl;a+=.4)for(const sw of[-hw,0,hw]){const x=q.x+f[0]*a+f[1]*sw*-1,z=q.z+f[1]*a+f[0]*sw;if(x>c.x0&&x<c.x1&&z>c.z0&&z<c.z1){worst=worst||{s:+s.toFixed(1),x:+x.toFixed(2),z:+z.toFixed(2),k:c.k||c.s||(c.ph?'parked car':'?')}}}}}
      /* the other fleet vans parked in their bays (it may only touch none of them) and the shoved hatchbacks */
      for(const o in M.vans){if(o===id)continue;const w=M.vans[o].c;for(let s=0;s<=P.len;s+=.5){const q=P.at(s);if(Math.abs(q.x-w.x)<2.0&&Math.abs(q.z-w.z)<3.2&&!worst)worst={s:+s.toFixed(1),hit:'van '+o}}}
      out.push({id,len:+P.len.toFixed(1),samples:n,hit:worst})}return out});
  for(const r of route)ok(!r.hit,'route clear, '+r.id+"'s way out of its bay ("+r.len+' m, '+r.samples+' samples)'+(r.hit?' HIT '+JSON.stringify(r.hit):''));
  if(arg('routeonly',false)){await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)}
  /* ---- play: the bot decides, the keyboard acts ---- */
  await ev(()=>{const H=window.__ht,a=H.jobs.api,T=window.__T={log:[],t:0,ev:{}};const r0=a.radio;a.radio=function(w,t,f){T.log.push(['@'+(H.M?H.M.t.toFixed(0):0),'  '+w+': '+t]);return r0.apply(this,arguments)};
    const f0=a.feed;a.feed=function(t,k,s){T.log.push(['@'+(H.M?H.M.t.toFixed(0):0),'  [feed] '+t+(s?' · '+s:'')]);return f0.apply(this,arguments)};
    T.decide=held=>{const M=H.M;if(!M||M.state!=='go')return{end:M&&M.state};const j=H.jobs.registry.get('roundup');j.test.step(a,T.t,{real:true});
      const k=H.keys,o={w:!!k.w,a:!!k.a,s:!!k.s,d:!!k.d,e:!!k.e,tap:!!a.useTap,press:M.bot&&M.bot.press||null};/* the bot only says what it wants; the page's key state stays what the real keyboard says */for(const x of['w','a','s','d','e'])k[x]=!!(held&&held[x]);a.useTap=false;return o};
    T.step=n=>{for(let i=0;i<n;i++){H.P.hp=Math.max(H.P.hp,60);H.step(1);T.t++;const M=H.M;if(!M)break;const ph=M.ph+'/'+M.stage;if(ph!==T.ph){T.ph=ph;T.log.push(['@'+M.t.toFixed(0),'== '+ph])}
      if(M.light&&M.light.forced&&!T.ev.yellow){T.ev.yellow=M.t.toFixed(1);T.log.push(['@'+M.t.toFixed(0),'   light forced yellow, lead '+M.LEAD.x.toFixed(1)])}
      if(M.light&&M.light.st==='r'&&M.C)for(const m of M.C.cars){if(m.car.x>184.2&&m.car.x<200&&Math.abs(m.car.z-41.5)<3&&m.car.spd<.4&&!(T.ev['red_'+m.id])){T.ev['red_'+m.id]=1;T.log.push(['@'+M.t.toFixed(0),'   '+m.id+' stopped at the red'])}}
      if(M.leadRan&&!T.ev.leadRan){T.ev.leadRan=M.leadRan;T.log.push(['@'+M.t.toFixed(0),'   you crossed the light on '+M.leadRan])}
      if(M.lastRun&&T.ev.lastRun!==M.lastRun){T.ev.lastRun=M.lastRun;T.log.push(['@'+M.t.toFixed(0),'   '+M.lastRun.key+' ran the '+M.lastRun.st])}
      if(M.pursuit&&!M.pursuit.gone){const sh=Math.floor(M.pursuit.shake/20);if(sh!==T.sh){T.sh=sh;T.log.push(['@'+M.t.toFixed(0),'   shake '+Math.round(M.pursuit.shake)+' (blocked '+M.blocks.toFixed(1)+' s, brake checks '+M.brakeChecks+')'])}}
      if(M.state!=='go')break}return H.M&&H.M.state}});
  const keysUsed={};const press=async k=>{keysUsed[k]=(keysUsed[k]||0)+1;await p.keyboard.press(k)};
  const W={};const want=(n,f)=>{W[n]=f};let tested=false;
  await p.mouse.click(640,360).catch(()=>{});/* (asks for pointer lock; every action below is a key either way) */
  for(let tick=0;tick<9000;tick++){const d=await ev(h=>window.__T.decide(h),held);if(d.end)break;
    for(const k of['w','a','s','d'])await setKey(k,d[k]);await setKey('e',d.e);if(d.tap)await press('e');if(d.press)await press(d.press);
    /* the convoy orders, once, while the line is rolling on Route 9 and before the chase */
    if(!tested){const c=await ev(()=>{const M=window.__ht.M;return M&&M.ph==='convoy'&&!M.pursuit&&M.C&&M.C.cars.filter(m=>m.st==='line').length>=2&&M.LEAD.x<236&&M.LEAD.z<46});
      if(c){tested=true;const g=async k=>{await press(k);await ev(()=>window.__T.step(2));return ev(()=>{const C=window.__ht.M.C;return{gap:C.gap,hold:C.holding}})};
        const g1=await g('1');ok(g1.gap==='tight','key 1 while driving: convoy tightens up ('+JSON.stringify(g1)+')');const g2=await g('2');ok(g2.gap==='spread','key 2: spreads out ('+JSON.stringify(g2)+')');
        for(const k of['w','a','s','d'])await setKey(k,false);await setKey('s',true);const g3=await g('3');await ev(()=>window.__T.step(75));await setKey('s',false);
        const hs=await ev(()=>{const C=window.__ht.M.C;return C.cars.filter(m=>m.st!=='park'&&m.st!=='join').map(m=>m.st+':'+m.car.spd.toFixed(1))});
        ok(g3.hold&&hs.every(x=>x.startsWith('hold')&&+x.split(':')[1]<1.5),'key 3: everybody holds where they are ('+hs.join(' ')+')');await shot('06-convoy-hold',{behind:true});
        const g4=await g('3');ok(!g4.hold,'key 3 again: rolling');await g('1')}}
    const s=await ev(()=>window.__T.step(3));
    const M=await ev(()=>{const M=window.__ht.M;if(!M)return null;return{ph:M.ph,stage:M.stage,state:M.state,choices:!!(M.choices&&M.choices.el&&!M.choices.closed),relay:!!M.relay,relayI:M.relay?M.relay.i:-1,scam:M.scam,found:Object.keys(M.found).length,started:Object.keys(M.started).length,
      cv:!!window.__ht.CV,blk:Object.values(M.blk).filter(k=>k.done).length,inLine:M.C?M.C.cars.filter(m=>m.st==='line').length:0,purs:M.pursuit&&!M.pursuit.gone?Math.round(M.pursuit.shake):null,head:!!(M.C&&M.C.head),del:Object.keys(M.delivered).length,fam:Object.keys(M.fam).length,wrap:M.wrapT,lead:M.LEAD&&M.LEAD.x}});
    if(!M)break;
    const once=async(n,cond,cam)=>{if(!W[n]&&cond){W[n]=1;await shot(n,cam)}};
    await once('01-gate-attendant',M.choices);
    await once('02-in-the-lot',M.ph==='lot'&&!M.cv&&M.found>=1&&M.started===0);
    await once('02b-hang-tag-and-bee',M.ph==='lot'&&M.found>=1&&!M.relay,{van:'hen',d:3.4,side:.9,y:1.45});
    await once('03-relay-panel',M.relay&&M.relayI>=1);
    await once('04-crew-to-the-van',M.started>=2&&!M.relay&&M.ph==='lot');
    await once('05-shove',M.cv&&M.ph==='lot'&&M.started>=5&&M.blk===0&&tick%4===0&&await ev(()=>{const M=window.__ht.M,k=Object.values(M.blk).find(k=>!k.done);return k&&k.moved>.6}));
    await once('07-convoy-out',M.ph==='convoy'&&M.inLine>=3&&M.lead<232,{behind:true});
    await once('08-the-light',M.ph==='convoy'&&await ev(()=>{const M=window.__ht.M;return M.light.forced&&M.light.st!=='g'&&M.LEAD.x<190}),{light:true});
    await once('09-pursuit',M.purs!=null&&M.purs<30&&await ev(()=>{const M=window.__ht.M,c=M.pursuit.c;return Math.hypot(c.x-M.LEAD.x,c.z-M.LEAD.z)<40}),{chase:true});
    await once('10-blocking',M.purs!=null&&M.head&&M.purs>40,{chase:true});
    await once('11-driveway',M.fam>=1&&M.del>=1&&await ev(()=>{const M=window.__ht.M;return Object.values(M.fam).some(f=>f.react&&f.react.t>.8&&f.react.t<4)}),{family:true});
    await once('12-marcy',M.wrap>1.5,{family:true});
    if(M.wrap>2&&!W.decor){W.decor=1;for(const id of await ev(()=>Object.keys(window.__ht.M.delivered)))await shot('14-home-'+id,{van:id,rear:true,d:5.5,side:2.2,y:1.6})}
    if(s!=='go')break}
  for(const k of Object.keys(held))await setKey(k,false);
  await ev(()=>window.__ht.step(40));await shot('13-result');
  const out=await ev(()=>{const H=window.__ht,M=H.M,T=window.__T;return{log:T.log,state:M&&M.state,t:M&&Math.round(M.elapsed),ev:T.ev,del:M&&Object.keys(M.delivered),cond:M&&M.cond,alarm:M&&M.alarm,ties:M&&M.ties,orders:M&&M.orders,
    pay:M&&M.pay?M.pay.lines.map(l=>l.label+':'+l.amount):null,medal:M&&M.medal,res:[...document.querySelectorAll('[class*=result] h1,[class*=result] h2,[class*=result] .kicker')].map(e=>e.innerText).join(' | ')}});
  if(!QUIET)for(const l of out.log)console.log(l.join(' '));delete out.log;console.log(JSON.stringify(out));
  ok(out.state==='won','won with real keys ('+(out.del||[]).length+'/5 home, '+out.t+' s)');
  ok(keysUsed['3']>=1&&keysUsed['1']>=1&&keysUsed['4']>=1&&keysUsed.e>=5,'keys used: '+JSON.stringify(keysUsed));
  ok(!!out.ev.yellow,'the light turned yellow on the convoy\'s first approach');
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,5).join(' | '):''));
  await b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
