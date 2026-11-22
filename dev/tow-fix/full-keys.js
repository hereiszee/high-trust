/* Hitch Happens, the whole towing part with REAL keys (no job bot after the gate): W/A/S/D/Space/E through page.keyboard (or --pad: a fake
   standard gamepad through navigator.getGamepads, sticks/triggers/A button), the sim stepped by __ht.step.
   Per car: drive to River Rd nose north, reverse down the column to the front bumper, hold Use to hitch, pull out, tow to the owner's curb
   along the roads, stop in the green box, hold Use to drop. Extras on the way:
     benny  - detour along Ash St past the parked car at (427,73), then down to Oak St
     earl   - along the 99 street: nose into the parked car at (367,101) at walking pace, back off, go round
     hollis - drive into a wall and keep the throttle on until "Reset the rig" shows, hold Use, carry on
   If the Quik-Hook guy gets out to unhook you: drive off (he gives up). Then back to Sal's. Prints a line per car and the result.
   node dev/tow-fix/full-keys.js [--pad] [--shots=dir] [--cars=kim,hollis,...] */
const {startTow,helpers}=require('./lib.js'),{FAKE_PAD}=require('../../desktop/test/fake-pad.js'),fs=require('fs'),path=require('path');
const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:process.argv.includes('--'+k)?true:d};
const PAD=!!arg('pad',false),SHOTS=arg('shots',null),ONLY=arg('cars',null);
const wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a},yawTo=(dx,dz)=>Math.atan2(-dx,-dz);
(async()=>{const {b,p,ev,r,errs}=await startTow();console.log('start',JSON.stringify(r));await helpers(p);
  if(PAD){await ev(FAKE_PAD);await ev(()=>{const T=window.__T={t:1000};T.tick=(n=1)=>{for(let i=0;i<n;i++){T.t+=16;HT.Pad._tick(T.t)}};window.__pad.set({axes:[0,0,.5,0]});T.tick(2);window.__pad.set({axes:[0,0,0,0]});T.tick(2)})}
  if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
  const shot=async n=>{if(!SHOTS)return;await ev(()=>{const H=window.__ht;H.camTick&&H.camTick(1/30);H.ow&&H.ow.update&&H.ow.update(H.camera);H.draw()});await p.screenshot({path:path.join(SHOTS,n+'.jpg'),type:'jpeg',quality:80})};
  /* input: keyboard keys, or the fake pad (left stick x = steer, RT = 7 throttle, LT = 6 brake/reverse, Y = 3 use) */
  const down=new Set();
  const input=async k=>{if(!PAD){for(const key of['w','a','s','d',' ','e']){const on=!!k[key],name=key===' '?'Space':key;if(on&&!down.has(key)){await p.keyboard.down(name);down.add(key)}else if(!on&&down.has(key)){await p.keyboard.up(name);down.delete(key)}}return}
    await ev(k=>{window.__pad.set({axes:[k.st||0,0,0,0],buttons:{7:k.w?1:0,6:k.s||k[' ']?1:0,3:k.e?1:0}});window.__T.tick(1)},k)};
  await ev(()=>{window.__TFev=[];window.HT.Tow.on((t,d)=>{if(['hit','scrape','jackknife','snap','detach','hitch','reset','yield','stuck','drop'].includes(t))window.__TFev.push((window.__ht.M?Math.round(window.__ht.M.elapsed):0)+' '+t+(d&&d.sp?':'+d.sp.toFixed(1):'')+(d&&d.why?':'+d.why:''))})});
  const S=()=>ev(()=>{const H=window.__ht,a=H.jobs.api,M=H.M,e=H.CV,c=e&&(e.car||e),Tw=window.HT.Tow,k=Tw.link,cd=Tw.S.cand;
    const pr=[...document.querySelectorAll('.ht-prompt,#prompt,.prompt')].map(x=>x.textContent).join(' | ');
    return{cv:!!e,x:e&&c.x,z:e&&c.z,yaw:e&&c.yaw,spd:e&&c.spd,len:e&&a.carSize(e).l,state:M&&M.state,ph:M&&M.ph,el:M&&M.elapsed,sweep:M&&M.sweep,stuck:Tw.S.stuck,act:(Tw.action&&Tw.action()||{}).txt||null,
      link:k?{id:k.ref.o?k.ref.o.id:'truck',x:k.ref.pos.x,z:k.ref.pos.z,yaw:k.ref.yaw,rel:k.rel||0}:null,cand:cd?{id:cd.b.ref.o&&cd.b.ref.o.id,ok:cd.chk.ok,d:cd.chk.d,why:cd.chk.why}:null,
      ft:M&&M.ft?M.ft.state:null,cars:M&&M.cars.map(x=>x.o.id+':'+x.st).join(' '),px:H.P.pos.x,pz:H.P.pos.z,prompt:pr}});
  const step=n=>ev(n=>{const H=window.__ht;H.P.hp=Math.max(H.P.hp,60);for(let i=0;i<n;i++){if(window.__T&&window.__T.tick)window.__T.tick(1);H.step(1)}},n);
  const routeTo=(from,to)=>ev(([f,t])=>{const rt=window.__ht.ow.roads().route(f,t);return rt?rt.points.map(q=>({x:q.x,z:q.z})):[t]},[from,to]);
  let T=0;const log=[],resets=[];
  const diag=()=>ev(()=>{const H=window.__ht,c=H.CV&&H.CV.car,k=window.HT.Tow.link,C=window.__TF.contacts();let tr=[];try{const O=window.HT.OpenWorld;tr=(O.trafficLive?O.trafficLive():[]).filter(t=>c&&Math.hypot(t.c.x-c.x,t.c.z-c.z)<9).map(t=>[+t.c.x.toFixed(1),+t.c.z.toFixed(1),+t.c.spd.toFixed(1)])}catch(_){}
    return{x:c&&+c.x.toFixed(2),z:c&&+c.z.toFixed(2),yaw:c&&+c.yaw.toFixed(2),rel:k?Math.round((k.rel||0)*57):null,contacts:C,traffic:tr,spd:c&&+c.spd.toFixed(2),keys:Object.keys(H.keys).filter(x=>H.keys[x]).join('')}});
  /* drive a polyline with the pure-pursuit "thumb": binary keys PWM'd over 6 frames, or the analog stick on the pad */
  const steerK=(k,st)=>{st=Math.max(-1,Math.min(1,st));if(PAD){k.st=-st;return}const q=(T%6)/6;k.a=st>0&&q<Math.abs(st);k.d=st<0&&q<Math.abs(st)};
  const lyle=async s=>{if(s.ft!=='lyleout'||!s.link)return false;/* he's at the hitch: drive off */for(let i=0;i<40;i++){const s2=await S();const k={w:s2.spd<4};steerK(k,0);await input(k);await step(2);T++}return true};
  async function follow(pts,o={}){const v=o.v||9;let wi=0,stk=0;for(let i=0;i<(o.max||4000);i++){const s=await S();if(s.state!=='go')return'ended';if(!s.cv)return'out of car';
      if(await lyle(s))continue;if(o.until&&o.until(s))return'until';
      /* the car came off (a real crash): the action helper offers "Re-hitch ... reset the rig": hold Use */
      if(o.towing&&!s.link&&s.act&&/Re-hitch/.test(s.act)){const ok=await holdUse(q=>!!q.link,40);resets.push({when:Math.round(s.el),rehitch:true,ok});continue}
      /* pure pursuit: the closest point on the path (searching ahead of the last one), then a point LA metres further along it */
      {const ci=o._ci||0;let bi=ci,bd=1e9,bt=0;for(let j=ci;j<Math.min(pts.length-1,ci+4);j++){const A=pts[j],B=pts[j+1],dx=B.x-A.x,dz=B.z-A.z,l2=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((s.x-A.x)*dx+(s.z-A.z)*dz)/l2)),dd=Math.hypot(A.x+dx*t-s.x,A.z+dz*t-s.z);if(dd<bd){bd=dd;bi=j;bt=t}}
        if(pts.length>1){let rem=Math.max(3.2,Math.min(6,Math.abs(s.spd)*.4+2.5)),j=bi,px=pts[j].x+(pts[j+1].x-pts[j].x)*bt,pz=pts[j].z+(pts[j+1].z-pts[j].z)*bt;
          while(j<pts.length-1){const B=pts[j+1],l=Math.hypot(B.x-px,B.z-pz);if(l>=rem){px+=(B.x-px)*rem/l;pz+=(B.z-pz)*rem/l;break}rem-=l;px=B.x;pz=B.z;j++}
          o._ci=bi;wi=Math.min(pts.length-1,j+1);o._la={x:px,z:pz,end:j>=pts.length-1};
          /* and 14 m on, for the speed: brake before a corner, not in it */let r2=14,j2=bi,qx=pts[j2].x+(pts[j2+1].x-pts[j2].x)*bt,qz=pts[j2].z+(pts[j2+1].z-pts[j2].z)*bt;
          while(j2<pts.length-1){const B=pts[j2+1],l=Math.hypot(B.x-qx,B.z-qz);if(l>=r2){qx+=(B.x-qx)*r2/l;qz+=(B.z-qz)*r2/l;break}r2-=l;qx=B.x;qz=B.z;j2++}o._far=Math.abs(wrap(yawTo(qx-s.x,qz-s.z)-s.yaw))}}
      if(process.env.TRACE&&i%15===0)console.log('  trace',o.tag||'',i,wi+'/'+pts.length,'at',s.x.toFixed(1),s.z.toFixed(1),'yaw',s.yaw.toFixed(2),'spd',s.spd.toFixed(1),'to',pts[wi].x.toFixed(1),pts[wi].z.toFixed(1),'rel',s.link?Math.round(s.link.rel*57):'-',s.stuck?'STUCK':'',s.act||'');const fin=pts[pts.length-1],dF=Math.hypot(fin.x-s.x,fin.z-s.z),last=dF<9||pts.length<2,w=last?fin:(o._la||pts[wi]),d=last?dF:Math.hypot(w.x-s.x,w.z-s.z);if(last&&d<(o.arrive||3)){await input({' ':Math.abs(s.spd)>.3,s:false});if(Math.abs(s.spd)<.3)return'arrived';await step(2);T++;continue}
      const dy=wrap(yawTo(w.x-s.x,w.z-s.z)-s.yaw),k={},want=last&&d<14?Math.max(2,d*.45):Math.abs(dy)>.45||(o._far||0)>.6?3.5:Math.abs(dy)>.2||(o._far||0)>.3?6:v;steerK(k,dy*2.2);k.w=s.spd<want;k.s=s.spd>want+.6;
      /* no progress: under a metre in 6 s with the throttle on (creeping against something counts) */
      const pg=o._pg||(o._pg={x:s.x,z:s.z,i});if(Math.hypot(s.x-pg.x,s.z-pg.z)>1){o._pg={x:s.x,z:s.z,i}}else if(i-pg.i>90){const dg=await diag();o._pg=null;
        if(o.reset!==false&&s.stuck){/* the player's way out: hold Use on "Reset the rig" */log.push({at:'follow',diag:dg});const ok=await holdUse(q=>!q.stuck,40);resets.push({when:Math.round(s.el),where:[+s.x.toFixed(1),+s.z.toFixed(1)],ok,diag:dg});continue}
        if((o._backs=(o._backs||0)+1)<=8){/* clipped a corner: back off a couple of metres the other way, like a player */for(let j=0;j<40;j++){const q=await S();const kk={s:true};steerK(kk,Math.sign(dy)*.8);await input(kk);await step(2);T++}continue}
        return'stuck '+JSON.stringify(dg)}
      await input(k);await step(2);T++}return'timeout'}
  async function holdUse(test,max=150){for(let i=0;i<max;i++){const s=await S();if(test(s))return true;const k={e:Math.abs(s.spd)<.3,' ':Math.abs(s.spd)>=.3};await input(k);await step(2);T++}await input({});return false}
  const HOME=arg('home',null);if(HOME)await ev(ids=>{for(const id of ids)window.__TF.home(id)},HOME.split(','));
  const SLOT=await ev(()=>Object.fromEntries(window.__ht.M.cars.map(e=>{const S=window.__ht.jobs.api.carSize(e);return[e.o.id,{x:e.pos.x,z:e.pos.z,l:S.l}]})));
  async function pickup(id){const c=SLOT[id];let s=await S();const lane=c.x<314.5?313.5:316.5;
    /* to River Rd, heading north, 26 m north of the bumper */let res=await follow(await routeTo({x:s.x,z:s.z},{x:lane,z:104}),{v:8,arrive:3,tag:'approach'});
    s=await S();if(Math.cos(s.yaw)<.7){/* facing south: around the block is the player's way; here: three-point turn by the route to the north */res+=' / '+await follow([{x:lane,z:96}],{v:5})}
    await follow([{x:lane,z:110},{x:c.x,z:112}],{v:4,arrive:2.5});
    /* reverse down the column, steering the hitch onto the bumper */let tR=0,ok=false,info='';
    for(let i=0;i<900;i++){s=await S();const bump={x:c.x,z:c.z-c.l/2},Hg={x:bump.x,z:bump.z-.6},f=[-Math.sin(s.yaw),-Math.cos(s.yaw)],Hh={x:s.x-f[0]*(s.len/2+.25),z:s.z-f[1]*(s.len/2+.25)};
      const lat=Hh.x-Hg.x,al=Hg.z-Hh.z,h=wrap(s.yaw),hd=Math.max(-.32,Math.min(.32,-.45*lat)),k={};steerK(k,-(hd-h)*3.2);const want=al>6?-3.6:al>1.6?-1.4:-.6;k.s=s.spd>want;k.w=s.spd<want-.6;
      if(s.cand&&s.cand.ok){ok=true;break}if(al<-1.5){info='overshot';break}await input(k);await step(2);T++;tR++}
    if(!ok&&!info)info=JSON.stringify(await diag())+' cand '+JSON.stringify((await S()).cand);
    if(!ok)return{id,fail:'no line-up '+info};if(id==='kim')await shot('fix-1-lining-up');
    const hooked=await holdUse(s=>!!s.link);if(!hooked)return{id,fail:'hold Use did not hitch'};await shot(id==='kim'?'fix-2-hitched':'x');
    /* pull straight out to the stub */await follow([{x:c.x,z:126}],{v:4,arrive:3,tag:'pullout'});return{id,ok:true,revS:+(tR*2/30).toFixed(1)}}
  async function deliver(id,via){const cb=await ev(id=>{const M=window.__ht.M,e=M.cars.find(x=>x.o.id===id),ow=M.owners[e.i];return ow.curb},id);let s=await S();
    let pts=[];let from={x:s.x,z:s.z};for(const v of(via||[]).concat([{x:cb.x,z:cb.z}])){pts=pts.concat(v.raw?[v]:await routeTo(from,v));from=v}
    /* the last leg: aim the truck a tow-length past the box so the towed car stops in it */
    const fy=[-Math.sin(cb.yaw),-Math.cos(cb.yaw)],L=s.len/2+.85+4.6/2;const lastDir=pts.length>1?Math.sign((pts[pts.length-1].x-pts[pts.length-2].x)*fy[0]+(pts[pts.length-1].z-pts[pts.length-2].z)*fy[1])||1:1;
    pts[pts.length-1]={x:cb.x+fy[0]*L*lastDir,z:cb.z+fy[1]*L*lastDir};
    const r1=await follow(pts,{v:12,arrive:1.6,towing:true});
    const dropped=await holdUse(s=>!s.link,60);const st=await ev(id=>window.__ht.M.cars.find(x=>x.o.id===id).st,id);
    return{route:r1,dropped,st}}
  const ORDER=(ONLY?ONLY.split(','):['kim','hollis','rosa','benny','earl']);const out=[];
  for(const id of ORDER){const t0=await S();const pu=await pickup(id);if(!pu.ok){out.push(pu);console.log(JSON.stringify(pu));break}
    let extra={};
    if(id==='hollis'){/* wedge it on purpose: into the river-bank trees at the end of Dock St with the throttle on until Reset shows */
      await follow([{x:320,z:125.5}],{v:4,arrive:2.5,reset:false,tag:'to-wedge'});let shown=false,i=0;for(;i<300;i++){const s=await S();if(s.stuck&&i>5){shown=true;break}const k={w:s.spd<3};steerK(k,1);await input(k);await step(2);T++}
      await shot('fix-5-reset-offered');const s0=await S();const done=await holdUse(s=>!s.stuck&&Math.hypot(s.x-s0.x,s.z-s0.z)>.5,60);const s1=await S();extra={resetShownAfterS:+(i*2/30).toFixed(1),prompt:s0.act,reset:done,sweepCost:+(s1.sweep-s0.sweep).toFixed(1),to:[+s1.x.toFixed(1),+s1.z.toFixed(1)]}}
    let via=null;
    if(id==='benny')via=[{x:380,z:72.5},{x:392,z:72.4,raw:1},{x:396,z:70.3,raw:1},{x:405,z:70.3,raw:1},{x:410,z:72.4,raw:1},{x:416,z:72.4,raw:1},{x:421,z:70.3,raw:1},{x:433,z:70.3,raw:1},{x:439,z:72.3,raw:1},{x:443,z:40},{x:441,z:13.5}];/* along Ash St, out round the parked car at (427,73) and back in */
    if(id==='earl'){/* along the 99 street, into the parked car at walking pace */
      const s=await S();await follow((await routeTo({x:s.x,z:s.z},{x:350,z:100.5})).concat([{x:356,z:100.5}]),{v:8,arrive:2});const s0=await S();let i=0,stopped=null,moved=0;
      for(;i<150;i++){const s1=await S();const k={w:s1.spd<2.2};steerK(k,wrap(yawTo(380-s1.x,100.5-s1.z)-s1.yaw)*2);await input(k);await step(2);T++;if(s1.x>366&&!stopped)stopped=s1.x}
      const pk=await ev(()=>{const e=(window.__ht.L.cars||[]).find(e=>Math.abs(e.pos.x-367)<5&&Math.abs(e.pos.z-101)<4);return e?{x:e.pos.x,z:e.pos.z}:null});await shot('fix-6-parked-car-nudged');
      /* back off and go round */for(let j=0;j<45;j++){const k={s:true};steerK(k,j<20?-.6:0);await input(k);await step(2);T++}
      const rr=await follow([{x:358,z:98},{x:375,z:97.8},{x:386,z:100.3}],{v:4,arrive:3});extra={nosedIn:true,parkedCarNowAt:pk,round:rr};via=[{x:443,z:99}]}
    const dl=await deliver(id,via);const evs=await ev(()=>window.__TFev.splice(0));const s=await S();
    const row=Object.assign({resets:resets.splice(0),car:id,pickup:pu,deliver:dl,secs:Math.round(s.el-t0.el),sweep:Math.round(s.sweep)},extra,{events:evs});out.push(row);console.log(JSON.stringify(row));if(id==='kim')await shot('fix-3-delivered');
    if(!dl.dropped)break}
  /* back to Sal's */let s=await S();if(s.ph==='sal'){const r2=await follow(await routeTo({x:s.x,z:s.z},{x:224,z:51}),{v:10,arrive:6,max:3000});for(let i=0;i<300;i++){const s2=await S();if(s2.state!=='go')break;await input({' ':true});await step(2)}}
  await input({});await step(60);const res=await ev(()=>{const M=window.__ht.M;return{state:M&&M.state,medal:M&&M.medal,pay:M&&M.pay&&M.pay.total,sweep:M&&Math.round(M.sweepDone||M.sweep),elapsed:M&&Math.round(M.elapsed),drops:M&&M.cars.map(c=>c.o.id+':'+Math.round((c.dropF||0)*100))}});
  console.log('RESULT',JSON.stringify(res));fs.writeFileSync(path.join(__dirname,'full-keys-'+(PAD?'pad':'kb')+'-out.json'),JSON.stringify({out,res},null,1));
  const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'ERRORS '+bad.join('|'):'no console errors');await b.close();process.exit(res.state==='won'&&!bad.length?0:1)})().catch(e=>{console.error(e);process.exit(1)});
