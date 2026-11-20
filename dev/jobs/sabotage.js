/* Sign of the Times: play it by script at human pace and take a screenshot of every stage (docs/screenshots/jobs/sabotage/).
   node dev/jobs/sabotage.js [--shots] [--nvg] [--frames=n] [--out=dir] [--touch] [--slow]
   Unlike the jobs-check bot (which teleports between safe moments), this one walks with the movement keys (crouched, at the real
   speeds), takes the hole in the west fence, hides under the tarp between tyres, waits out the patrols, fetches the banner from
   the van and carries it round to Mill St. It prints a timeline (what it's doing, who's suspicious, stage, clock) and the radio
   transcript, so pacing and jokes can be reviewed as text. If it's spotted it takes the retry and carries on from the checkpoint.
   --nvg  gives the dad Hank's goggles and turns them on (patrol paths, noisy ground, the hole lit up).
   --human the key-driven player described above (best effort: it isn't a very good burglar); without it the job's own test
           bot plays (it teleports between safe moments) and the screenshots are framed on what's happening. */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:process.argv.includes('--'+k)?true:d};
const TRACE=!!arg('trace',false),HUMAN=!!arg('human',false),SHOTS=!!arg('shots',false),NVG=!!arg('nvg',false),FR=+arg('frames',60000),TOUCH=!!arg('touch',false),SLOW=!!arg('slow',false);
const OUT=path.resolve(__dirname,'../../',arg('out','docs/screenshots/jobs/sabotage'));
(async()=>{const {b,p,errs}=await open(TOUCH?{viewport:{width:844,height:390},dpr:2}:{});const ev=(f,a)=>p.evaluate(f,a);if(SHOTS)fs.mkdirSync(OUT,{recursive:true});
  if(SLOW){const c=await p.context().newCDPSession(p);await c.send('Emulation.setCPUThrottlingRate',{rate:4});console.log('CPU throttled x4')}
  const frame=n=>ev(n=>{const H=window.__ht,M=H.M,P=H.P;if(!M||!M.S)return;const look=(x,z,pitch)=>{P.yaw=Math.atan2(-(x-P.pos.x),-(z-P.pos.z));P.pitch=pitch==null?-.18:pitch};
      const mx=M.S.maxObs(),g=mx&&M.g[mx.id];
      if(/curious|searching|spotted/.test(n)&&g){look(g.pos.x,g.pos.z,-.12);return}
      if(/air-out|rims/.test(n)){const v=M.valves.find(v=>v.prog>0)||M.valves.filter(v=>v.done).pop();if(v){P.pos.set(v.x+(v.z<116.5?1.6:-1.6)*0,0,v.z+(v.z<116.5?1.2:-1.2));H.collide(P.pos,.35);look(v.wx,v.wz,-.32)}return}
      if(/tiny|good-boy/.test(n)){look(M.tiny.pos.x,M.tiny.pos.z,-.25);return}
      if(/banner|ledger/.test(n)){look(427,104.5,-.05);return}
      if(/tarp/.test(n)){look(424,116.5,-.12);return}
      if(/yard|approach/.test(n)){look(427,116,-.12);return}
      if(/getting-out/.test(n)&&M.car){look(M.car.pos.x,M.car.pos.z,-.1)}},n);
  /* a camera placed for the stage (the job's camera hook: true = we placed it) */
  await ev(()=>{if(window.__camHook)return;window.__camHook=1;window.HT.Jobs.on('camera',()=>{const c=window.__cam;if(!c)return;const C=window.__ht.camera;C.position.set(c[0],c[1],c[2]);C.lookAt(c[3],c[4],c[5]);return true})});
  const place=n=>ev(n=>{const H=window.__ht,M=H.M,Y_=[{x:421.3,z:114.05},{x:432.7,z:114.05},{x:421.3,z:118.95},{x:432.7,z:118.95}];window.__cam=null;if(!M||!M.S)return;const set=(a,b)=>{window.__cam=[a[0],a[1],a[2],b[0],b[1],b[2]]};
    if(/approach|in-the-yard/.test(n))set([427,9.5,129],[427,0,115]);
    else if(/tarp/.test(n))set([421.8,1.9,119.4],[418.6,.4,116.8]);
    else if(/air-out/.test(n)){const v=M.valves.find(v=>v.prog>0)||M.valves[0],sd=v.wz<116.5?1:-1;set([v.wx+1.9,1.15,v.wz+sd*2.5],[v.wx,.35,v.wz])}
    else if(/rims/.test(n)){const i=M.valves.findIndex(v=>v.done),t=Y_[i>>1],sd=t.z<116.5?1:-1;set([t.x+3.6,1.5,t.z+sd*4.6],[t.x,.45,t.z])}
    else if(/tiny|good-boy/.test(n)){const T=M.tiny;set([430,1.5,113.2],[T.pos.x,.45,T.pos.z])}
    else if(/banner-going|banner-up/.test(n))set([424,2.3,95.5],[426,3.4,104])
    else if(/ledger/.test(n))set([422.8,2.1,110.8],[419.6,.8,107.3])},n);
  const shot=async(n,prep)=>{if(!SHOTS)return;await frame(n);await place(n);if(prep)await ev(prep);
    /* cards fade in on animation frames (the brief, the result): let those run live; in-game shots are drawn from the paused sim so the HUD shows */
    if(/brief|result/.test(n)){await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(700);await ev(()=>{window.__rafOn=false})}else await ev(()=>window.__ht.step(2));
    await ev(()=>{const H=window.__ht;H.ow&&H.ow.buildAll&&H.ow.buildAll();H.ow&&H.ow.update&&H.ow.update(H.camera);H.draw()});await p.screenshot({path:path.join(OUT,(TOUCH?'touch-':'')+(NVG?'nvg-':'')+n+'.jpg'),type:'jpeg',quality:84});await ev(()=>{window.__cam=null});console.log('  shot '+n)};
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  if(SHOTS)await ev(async()=>{const H=window.__ht;try{H.render.apply('high')}catch(_){}for(let i=0;i<60&&H.assets.stream&&!H.assets.stream.idle();i++)await new Promise(r=>setTimeout(r,500))});
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('sabotage'),a=H.jobs.api;
    for(const d of j.def.unlock.done){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true}j.test.give(a);await window.HT.People.preload(['nb_pops','thug_track','thug_jacket']).catch(()=>{});H.enterHub();H.step(3)});
  if(NVG)await ev(()=>window.__ht.giveNvg(1));
  /* Sal at Dad's Auto and the brief */
  const g=await ev(()=>{const H=window.__ht,i=H.jobs.index('sabotage');const n=H.npcs.find(n=>n.marker&&n.marker.i===i);if(!n)return{err:'no giver'};H.P.pos.set(n.pos.x+1.6,0,n.pos.z+1);H.collide(H.P.pos,.35);H.P.yaw=Math.atan2(1.6,1);H.P.pitch=-.08;H.step(3);H.use=true;H.step(1);window.__go=H.UIacts&&H.UIacts['brief:go'];return{brief:!!window.__go}});
  console.log('giver',JSON.stringify(g));await shot('00-brief');
  await ev(()=>{const H=window.__ht;(H.UIacts['brief:go']||window.__go)();H.step(2)});
  const st=await ev(()=>{const H=window.__ht,i=H.jobs.index('sabotage'),d=H.L.dests[i],V=H.VAN;if(H.CV)H.exitVehicle();V.pos.set(d.x-9,0,d.z);V.yaw=-Math.PI/2;V.spd=0;H.syncVan&&H.syncVan();H.P.pos.set(d.x-9,0,d.z+2.5);H.enterVan();H.step(2);
    V.pos.set(d.x,0,d.z);if(V.car){V.car.x=d.x;V.car.z=d.z}H.syncVan&&H.syncVan();for(let k=0;k<90&&H.mode!=='mission';k++)H.step(1);return{mode:H.mode,id:H.M&&H.M.def.id}});
  console.log('start',JSON.stringify(st));if(st.mode!=='mission'){console.log(errs);await b.close();process.exit(1)}
  await ev(nv=>{const H=window.__ht;H.step(30);if(nv)H.nvg(true)},NVG);
  await shot('01-two-blocks-away',()=>{const H=window.__ht,P=H.P;P.yaw=Math.atan2(-(427-P.pos.x),-(114-P.pos.z))+.15;P.pitch=-.06});
  /* the human-paced player */
  await ev(([t,h])=>{window.__TRACE=t;window.__HUMAN=h},[TRACE,HUMAN]);
  await ev(()=>{const H=window.__ht,a=H.jobs.api,k=H.keys,T=window.__T={t:0,log:[],said:[],ev:{},plan:null,wait:0};
    T.trace=window.__TRACE;const hyp=Math.hypot,P=H.P,Y={hole:{x:417,z:115.6},tarp:{x:418.55,z:116.85},potty:{x:435.85,z:117.35},mount:{x:427.4,z:102.95}};
    const rad=()=>{const s=H.ui&&H.ui.sub;return s?(s.who||'')+': '+(s.text||s.t||JSON.stringify(s)):null};
    T.sub=()=>{const s=H.ui&&H.ui.sub;if(!s)return'';if(typeof s==='string')return s;return(s.speaker?s.speaker+': ':'')+(s.text||'')};
    const safe=(M,x,z,stance,dur)=>{const S=M.S;T.why='sus';if(S.max()>.42)return false;const pr=S.probe({x,z,stance,lit:S.lightAt(x,z,1,.4)});T.why='probe '+(pr.who&&pr.who.id);if(pr.v>0)return false;T.why='near';
      for(const id of['walt','kyle','boss']){const g=M.g[id];if(g.tied)continue;const d=hyp(g.pos.x-x,g.pos.z-z);if(S.blocked(g.pos.x,g.pos.z,1.65,x,z,1.2,2.6))continue;if(d<5.5)return false;const dy=Math.atan2(x-g.pos.x,z-g.pos.z)-g.ob.yaw,ang=Math.abs(Math.atan2(Math.sin(dy),Math.cos(dy)));
        T.why='facing '+id;if(d<dur*1.4+6&&ang<2.1)return false;T.why='lamp '+id;if(g.ob.lamp&&d<28&&ang<.8&&!S.blocked(g.pos.x,g.pos.z,1.65,x,z,stance==='crouch'?.9:1.45))return false}T.why='tiny';
      const Ti=M.tiny;if(Ti&&!Ti.ob.off){const rr=(stance==='crouch'?4.8:12.5)*(S.blocked(x,z,1.2,Ti.pos.x,Ti.pos.z,1.2,2.6)?.6:1);if(hyp(Ti.pos.x-x,Ti.pos.z-z)<rr)return false}return true};
    T.safe=safe;
    /* walk along points with the keys (crouched or not); true on arrival */
    T.walk=(pts,crouch,M)=>{if(!pts.length)return true;const q=pts[0],dx=q.x-P.pos.x,dz=q.z-P.pos.z,d=hyp(dx,dz);if(d<.45){pts.shift();return!pts.length}
      P.yaw=Math.atan2(-dx,-dz);P.pitch=-.12;k.w=true;P.crouch=!!crouch&&!(P.carry);k.shift=false;
      /* stuck against a prop: sidestep */
      T.stk=(T.lastD!=null&&Math.abs(T.lastD-d)<.004)?(T.stk||0)+1:0;T.lastD=d;if(T.stk>40){k.d=true;if(T.stk>70)T.stk=0}else k.d=false;return false};
    T.stop=()=>{k.w=k.a=k.d=k.s=false;k.e=false};
    T.nav=(x0,z0,x1,z1)=>{const M=H.M;if(M&&M.finePath){const fp=M.finePath(x0,z0,x1,z1);if(fp&&fp.length)return fp.map(p=>({x:p.x,z:p.z}))}const n=H.L.nav;if(n&&n.path&&x0>401&&x1>401&&z0>87&&z1>87){const r=n.path(x0,z0,x1,z1);if(r&&r.pts&&r.pts.length)return r.pts.slice(1).map(p=>({x:p.x,z:p.z})).concat([{x:x1,z:z1}])}return[{x:x1,z:z1}]}});
  /* the plan: a list of steps; each is run by the page loop below */
  await ev(()=>{window.__run=function(maxF){const H=window.__ht,a=H.jobs.api,k=H.keys,T=window.__T,P=H.P,hyp=Math.hypot;
    const M0=()=>H.M;const V=()=>M0().car;const out={frames:0,end:null};
    const yard=(x,z)=>x>417.2&&x<436.8&&z>112&&z<120.9;
    const say=()=>{const s=T.sub();if(s&&s!==T.lastSub){T.lastSub=s;T.said.push(Math.round(M0().t)+'s '+s)}};
    /* steps */
    const mkPlan=M=>{const L=[];const vk=M.valves.map((v,i)=>i).filter(i=>!M.valves[i].done);
      const inYard=yard(P.pos.x,P.pos.z);
      if(!M.allDone){if(inYard&&vk.length)L.push(...vk.map(i=>({kind:'valve',i})));if(M.sign!==2){if(M.sign===0){if(inYard)L.push({kind:'outHole'});L.push({kind:'roll'})}L.push({kind:'mount'})}
        if(!inYard&&vk.length)L.push({kind:'toHole'},{kind:'inHole'},...vk.map(i=>({kind:'valve',i})));
        if(!M.toyIn)L.push({kind:'treat'},{kind:'toy'});if(!M.ledger)L.push({kind:'ledger'})}
      L.push({kind:'exit'});return L};
    T.shots=T.shots||{};const shoot=n=>{if(T.shots[n])return;T.shots[n]=1;T.wantShot=n};
    const watch=M=>{const S=M.S;if(!S)return;const mx=S.maxObs();if(mx&&mx.state==='curious')shoot('07-curious');if(mx&&mx.state==='searching')shoot('08-searching');
      if(M.spot)shoot('09-spotted');if(M.hide==='tarp')shoot('04-under-the-tarp');if(M.valves.some(v=>!v.done&&v.prog>.55))shoot('05-letting-the-air-out');
      if(M.valves[0].done&&M.valves[1].done&&M.valves[0].flat>.98||M.valves.filter(v=>v.done&&v.flat>.98).length>=2&&M.valves.findIndex(v=>v.done)>=0)shoot('06-truck-on-its-rims');
      if(M.tiny.st==='eat')shoot('10-treat-for-tiny');if(M.tiny.st==='happy')shoot('11-good-boy');if(P.carry&&P.carry.kind==='banner'&&P.pos.z<106)shoot('12-carrying-the-banner');
      if(M.mountO&&M.mountO.prog>.5&&M.sign===1)shoot('13-banner-going-up');if(M.sign===2&&hyp(P.pos.x-427,P.pos.z-103)<5)shoot('14-banner-up');if(M.ledger)shoot('15-the-ledger');
      if(M.allDone&&!yard(P.pos.x,P.pos.z)&&P.pos.x<414)shoot('16-getting-out');if(T.cur&&T.cur.kind==='toHole'&&P.pos.x>409&&P.pos.x<412.8)shoot('02-approach');
      if(T.cur&&T.cur.kind==='valve'&&yard(P.pos.x,P.pos.z)&&!M.hide)shoot('03-in-the-yard')};
    let F=0;for(;F<maxF;F++){const M=M0();if(M&&M.state==='go'&&M.S){watch(M);if(T.wantShot){const n=T.wantShot;T.wantShot=null;return{shot:n,frames:F}}}
      if(!M||M.state!=='go'){if(M&&M.state==='lost'&&H.UIacts&&H.UIacts['result:retry']){T.log.push('LOST ('+(M.spotted?'spotted':'?')+') -> retry');T.ev.lost=(T.ev.lost||0)+1;out.lost=(out.lost||0)+1;
          if(out.lost>6){out.end='gave up';break}H.step(45);H.UIacts['result:retry']();H.step(3);T.plan=null;T.cur=null;T.pts=null;T.wait=0;T.hiding=false;T.holed=false;continue}
        if(M&&M.state==='won'){out.end='won';break}H.step(1);continue}
      say();T.t++;
      if(!window.__HUMAN){if(H.CV&&!M.exitOpen){H.exitVehicle&&H.exitVehicle()}const j=H.jobs.registry.get('sabotage');j.test.step(a,T.t,{});H.step(1);continue}if(T.trace&&T.t%120===0)T.log.push('  . '+Math.round(M.t)+'s P '+P.pos.x.toFixed(1)+','+P.pos.z.toFixed(1)+(P.crouch?' c':'')+(P.carry?' carry':'')+' step '+(T.cur?T.cur.kind+(T.cur.i!=null?T.cur.i:''):'-')+' wait '+T.wait+' | '+['walt','kyle','boss'].map(id=>{const g=M.g[id];return id+' k'+g.k+' '+g.pos.x.toFixed(0)+','+g.pos.z.toFixed(0)+' '+g.ob.state[0]+g.ob.sus.toFixed(2)}).join(' ')+' tiny '+M.tiny.st);
      if(!T.plan){T.plan=mkPlan(M);T.cur=null;T.log.push(Math.round(M.t)+'s plan '+T.plan.map(s=>s.kind+(s.i!=null?s.i:'')).join(','))}
      if(H.CV){if(!M.exitOpen)H.exitVehicle&&H.exitVehicle();H.step(1);continue}
      let s=T.cur||(T.cur=T.plan.shift());if(!s){T.plan=null;H.step(1);continue}
      const done=()=>{T.stop();T.cur=null;T.pts=null;s.t0=null};
      s.t0=s.t0==null?M.t:s.t0;
      /* hidden: wait until the coast is clear */
      if(M.hide){T.stop();if(T.wait>0){T.wait--;H.step(1);continue}
        /* pick whichever remaining valve is safe right now */
        if(s.kind==='valve'){const alt=M.valves.map((v,i)=>i).filter(i=>!M.valves[i].done&&T.safe(M,M.valves[i].x,M.valves[i].z,'crouch',3));if(alt.length&&alt[0]!==s.i){T.plan.unshift(s);s=T.cur={kind:'valve',i:alt[0]};T.plan=T.plan.filter(q=>!(q.kind==='valve'&&q.i===alt[0]))}}
        const x=s.kind==='valve'?M.valves[s.i].x:s.kind==='ledger'?419.6:s.kind==='toy'||s.kind==='treat'?430:418,z=s.kind==='valve'?M.valves[s.i].z:s.kind==='ledger'?108.1:s.kind==='toy'||s.kind==='treat'?111:115.6;
        if(T.safe(M,x,z,'crouch',3)&&['walt','kyle','boss'].every(id=>M.g[id].tied||hyp(M.g[id].pos.x-P.pos.x,M.g[id].pos.z-P.pos.z)>6)){a.useTap=true;T.log.push(Math.round(M.t)+'s out of hiding for '+s.kind+(s.i!=null?s.i:''))}else{T.wait=12;if(T.trace&&T.t%300<13)T.log.push('  hidden, '+s.kind+(s.i!=null?s.i:'')+' unsafe: '+T.why)}H.step(1);continue}
      const hideNow=why=>{T.log.push(Math.round(M.t)+'s hide ('+why+')');T.stop();const ap={x:418.7,z:115.7};T.pts=hyp(P.pos.x-ap.x,P.pos.z-ap.z)<4?[{x:Math.max(419.2,P.pos.x),z:115.7},ap]:T.nav(P.pos.x,P.pos.z,ap.x,ap.z);T.hiding=true};
      if(T.hiding){if(T.walk(T.pts,true,M)||hyp(P.pos.x-418.55,P.pos.z-116.85)<1.15){T.stop();k.e=true;for(let i=0;i<24&&!M.hide;i++)H.step(1);k.e=false;T.hiding=false;T.wait=30;continue}H.step(1);continue}
      const wait=n=>{T.stop();T.wait=n};
      if(T.wait>0){T.wait--;T.stop();H.step(1);continue}
      if(s.kind==='valve'){const v=M.valves[s.i];if(v.done){done();H.step(1);continue}
        const d=hyp(P.pos.x-v.x,P.pos.z-v.z);
        if(d<.8){if(!T.safe(M,v.x,v.z,'crouch',1.2)){hideNow('valve '+s.i+' got hot');s.n=(s.n||0)+1;if(s.n>4){T.plan.push(s);T.cur=null}H.step(1);continue}T.stop();k.e=true;P.crouch=true;T.ev.hold=true;H.step(1);continue}
        if(!T.pts){if(!T.safe(M,v.x,v.z,'crouch',4)){const alt=M.valves.map((q,i)=>i).find(i=>!M.valves[i].done&&T.safe(M,M.valves[i].x,M.valves[i].z,'crouch',4));
            if(alt!=null){T.plan.unshift(s);T.plan=T.plan.filter(q=>!(q.kind==='valve'&&q.i===alt));s=T.cur={kind:'valve',i:alt};H.step(1);continue}
            if(yard(P.pos.x,P.pos.z)&&!M.hide)hideNow('waiting for valve '+s.i);else wait(20);H.step(1);continue}T.pts=T.nav(P.pos.x,P.pos.z,v.x,v.z)}
        if(!T.safe(M,P.pos.x,P.pos.z,'crouch',1)){hideNow('caught in the open');T.pts=T.nav(P.pos.x,P.pos.z,418.75,115.75);H.step(1);continue}
        T.walk(T.pts,true,M);H.step(1);continue}
      if(s.kind==='toHole'){const tgt={x:415.9,z:115.6};if(!T.pts)T.pts=(P.pos.z<110?[{x:412.3,z:103.4},{x:412.3,z:115.6}]:[{x:398,z:126.2},{x:412.3,z:124.6},{x:412.3,z:115.6}]).concat([tgt]);
        if(T.pts.length<=2&&!T.safe(M,tgt.x,tgt.z,'crouch',4)){wait(15);H.step(1);continue}if(T.walk(T.pts,T.pts.length<=2,M))done();H.step(1);continue}
      if(s.kind==='inHole'||s.kind==='outHole'){const inside=s.kind==='inHole',from=inside?{x:416.15,z:115.6}:{x:417.85,z:115.6};
        if(!T.pts)T.pts=inside?[from]:T.nav(P.pos.x,P.pos.z,from.x,from.z);if(!T.walk(T.pts,true,M)){H.step(1);continue}
        if(!T.safe(M,inside?417.9:416.1,115.6,'crouch',2)){wait(15);H.step(1);continue}k.e=true;for(let i=0;i<40&&hyp(P.pos.x-from.x,P.pos.z-from.z)<.9;i++)H.step(1);k.e=false;done();continue}
      if(s.kind==='roll'){if(M.sign!==0){done();H.step(1);continue}const r=M.rollAt;if(!T.pts)T.pts=(P.pos.x>405?[{x:412.3,z:115.6},{x:412.3,z:124.6},{x:398,z:126.2}]:[]).concat([{x:r.x,z:r.z}]);
        if(T.walk(T.pts,false,M)){T.stop();k.e=true}H.step(1);continue}
      if(s.kind==='mount'){if(M.sign===2){done();H.step(1);continue}if(M.sign===0){T.plan.unshift(s);T.cur={kind:'roll'};H.step(1);continue}const m={x:423.6,z:102.95};
        if(!T.pts)T.pts=[{x:398,z:126.2},{x:410.6,z:124.6},{x:410.6,z:102.6},{x:419.5,z:102.6}];
        /* set off from the van only when Kyle is on the south side heading east (he turns onto Mill St last) and the manager is at his desk */
        if(!s.go){const ky=M.g.kyle,c=V();if(hyp(P.pos.x-c.pos.x,P.pos.z-c.pos.z)>3){T.walk([{x:c.pos.x+2.2,z:c.pos.z+.6}],false,M);H.step(1);continue}
          const kyOk=ky.tied||ky.k>=8||ky.k<=1,bossOk=M.g.boss.tied||!(M.g.boss.k>=7&&M.g.boss.k<=10);
          if(!(kyOk&&bossOk)){wait(10);H.step(1);continue}s.go=true;T.log.push(Math.round(M.t)+'s carrying the banner round to Mill St')}
        if(T.pts.length){T.walk(T.pts,false,M);H.step(1);continue}
        const d=hyp(P.pos.x-m.x,P.pos.z-m.z);if(d>.7){T.walk([m],false,M);H.step(1);continue}
        if(!T.safe(M,m.x,m.z,'stand',2)){T.stop();T.pts=[{x:412.2,z:106}];T.log.push(Math.round(M.t)+'s mount: backing off ('+T.why+')');wait(30);H.step(1);continue}T.stop();k.e=true;T.ev.mount=true;H.step(1);continue}
      if(s.kind==='treat'){const spot={x:425.6,z:116.6};if(M.toyIn||M.tiny.st!=='bed'){done();H.step(1);continue}
        if(!yard(P.pos.x,P.pos.z)){T.plan.unshift(s);T.cur={kind:'toHole'};T.plan.unshift({kind:'inHole'});H.step(1);continue}
        if(!T.pts){if(!T.safe(M,spot.x,spot.z,'crouch',3)){if(!M.hide)hideNow('waiting to feed Tiny');H.step(1);continue}T.pts=T.nav(P.pos.x,P.pos.z,spot.x,spot.z)}
        if(T.walk(T.pts,true,M)){T.stop();/* aim at a spot Tiny can reach, off his bed */const tx=430.1,tz=111.6,C=H.camera;P.yaw=Math.atan2(-(tx-P.pos.x),-(tz-P.pos.z));P.pitch=-.32;H.step(2);
          const r=H.jobs.registry.get('sabotage');H.jobs.api.M&&window.HT.Jobs.items.get('sab_treat').use(M);T.ev.treat=true;done();wait(40)}H.step(1);continue}
      if(s.kind==='toy'){if(M.toyIn){done();H.step(1);continue}const Ti=M.tiny;if(Ti.st==='bed'){if(M.treats>0){T.plan.unshift(s);T.cur={kind:'treat'}}else done();H.step(1);continue}
        const bx=431.6,bz=109.6;if(!T.pts)T.pts=T.nav(P.pos.x,P.pos.z,bx,bz);if(!T.safe(M,P.pos.x,P.pos.z,'crouch',1)){hideNow('toy run');H.step(1);continue}
        if(T.walk(T.pts,true,M)){T.stop();k.e=true;P.crouch=true}H.step(1);continue}
      if(s.kind==='ledger'){if(M.ledger){done();H.step(1);continue}const lx=419.6,lz=108.1;if(!T.pts){if(!T.safe(M,lx,lz,'crouch',4)||M.g.boss.act==='desk'||hyp(M.g.boss.pos.x-lx,M.g.boss.pos.z-lz)<9){if(!M.hide&&yard(P.pos.x,P.pos.z))hideNow('manager at his desk');else wait(20);H.step(1);continue}T.pts=T.nav(P.pos.x,P.pos.z,lx,lz)}
        if(!T.safe(M,P.pos.x,P.pos.z,'crouch',1)){hideNow('ledger run');H.step(1);continue}if(T.walk(T.pts,true,M)){T.stop();k.e=true;P.crouch=true}H.step(1);continue}
      if(s.kind==='exit'){if(!M.exitOpen){T.plan=null;T.cur=null;H.step(1);continue}const c=V();
        if(!T.pts){T.pts=yard(P.pos.x,P.pos.z)?T.nav(P.pos.x,P.pos.z,417.85,115.6).concat([{x:416.15,z:115.6}]):[];T.pts.push({x:412.3,z:115.6},{x:412.3,z:124.6},{x:c.pos.x+2.2,z:c.pos.z+.6})}
        if(T.pts.length&&Math.abs(P.pos.x-417.85)<.5&&Math.abs(P.pos.z-115.6)<.5&&!T.holed){T.holed=true;T.stop();k.e=true;for(let i=0;i<40&&P.pos.x>417;i++)H.step(1);k.e=false;T.pts.shift();continue}
        if(T.walk(T.pts,yard(P.pos.x,P.pos.z),M)){T.stop();a.useTap=true}H.step(1);continue}
      H.step(1)}
    out.frames=F;return out}});
  let res=null,used=0;for(;;){res=await ev(n=>window.__run(n),Math.max(1,FR-used));used+=res.frames||0;if(res.shot){await shot(res.shot);continue}break}
  await ev(()=>window.__ht.step(40));await shot('17-result');
  const r2=await ev(()=>{const H=window.__ht,T=window.__T,M=H.M;return{log:T.log,said:T.said,ev:T.ev,state:M&&M.state,t:M&&Math.round(M.t),clock:M&&Math.round(M.clock),pay:M&&M.pay&&M.pay.lines.map(l=>l.label+': '+l.amount),medal:M&&M.medal,ghost:M&&M.ghost}});
  console.log(JSON.stringify(res));console.log('--- timeline');for(const l of r2.log)console.log('  '+l);console.log('--- radio');for(const l of r2.said)console.log('  '+l);
  console.log('--- result',JSON.stringify({state:r2.state,t:r2.t,clock:r2.clock,medal:r2.medal,ghost:r2.ghost,pay:r2.pay}));
  const bad=errs.filter(e=>!/favicon/.test(e));console.log('console errors:',bad.length?bad.slice(0,5):'none');
  await b.close();process.exit(r2.state==='won'&&!bad.length?0:1)})().catch(e=>{console.error(e);process.exit(1)});
