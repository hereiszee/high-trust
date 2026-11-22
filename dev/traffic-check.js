/* Ambient traffic against the player's car, in the real game (headless Chromium + SwiftShader, driven through window.__ht.step()).
   node dev/traffic-check.js [--write] [--shots] [--quick]
     --write  saves docs/screenshots/traffic/evidence.txt     --shots  streamed-world jpgs into docs/screenshots/traffic/
     --quick  5 trials per approach and a 1-minute soak instead of 20 and 5 minutes     --people  only the people-in-the-lane trials (8) and their step time
   Code under test: js/openworld.js OW.traffic (look-ahead stop, junction reservations, horn/go-round/re-route ladder, trSep guard),
   index.html trafficContact (mass-based contact), js/carai.js ctx.offset. Checks:
     1. stop short: a car approaching the stopped player from behind, head-on in his lane, and turning in from a side street stops
        2.5-4 m short (side street: at least 2.5) with ZERO displacement of the player's car; trials across roads, regions and speeds,
        the player's car driven into place with real key input in half of them
     2. the ladder with timings: horn at 2 s, bark, going round when the oncoming lane is clear; when it isn't: more horns, a long one,
        hazards at 10 s, reverse + U-turn at 25 s; boxed in on all sides and out of view: despawned
     3. pushing: driving into a stopped traffic car moves IT, damages both (car-damage curve), dents it, hazards, a horn, -1 trust once;
        a slow push is smooth (no jitter); the tank pushes and is never pushed
     4. a queue of three forms with car-length gaps and clears in order once the player drives off
     5. junctions: two cars arriving at once never overlap (one waits); traffic waits while the player's car crosses
     6. stand-in mission cars (OWS.trafficOthers, the same path as o.others) are stopped for like the player
     7. free-roam soak with 20+ cars and the van on an autopilot loop: overlap after resolution, frame time with traffic off / on */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs'),path=require('path');
const ARG=process.argv.slice(2),WRITE=ARG.includes('--write'),SHOTS=ARG.includes('--shots'),QUICK=ARG.includes('--quick'),PEOPLE=ARG.includes('--people');/* --people: only 8 (people in the lane) and its step-time numbers */
const DIR=path.join(__dirname,'..','docs','screenshots','traffic');
const out=[],log=(...a)=>{const s=a.join(' ');out.push(s);console.log(s)};let fails=0;const ok=(c,msg)=>{if(!c)fails++;log((c?'ok   ':'FAIL ')+msg)};
const NT=QUICK?5:20;
(async()=>{const {b,p,errs}=await open();
await p.evaluate(()=>{const H=window.__ht;H.enterHub();H.HUD.hide('title');H.step(3);H.openBridge&&H.openBridge();H.step(2);
  const O=H.ow,G=O.roads(),OWS=H.OWS;OWS.trafficWant=0;
  const T=window.__TC={};
  T.clear=()=>{OWS.noTraffic=true;H.step(1);OWS.noTraffic=false;OWS.trafficOthers=null};
  T.edges=[];for(const [i,n] of G.nodes.entries())for(const e of n.e){const m=G.nodes[e.to],l=Math.hypot(m.x-n.x,m.z-n.z);T.edges.push({a:i,b:e.to,l,da:n.e.length,db:m.e.length,region:O.regionAt((n.x+m.x)/2,(n.z+m.z)/2)})}
  T.lanePt=(a,b,at,side)=>{const A=G.nodes[a],B=G.nodes[b],l=Math.hypot(B.x-A.x,B.z-A.z),ux=(B.x-A.x)/l,uz=(B.z-A.z)/l,s=side==null?1.5:side;return{x:A.x+ux*at-uz*s,z:A.z+uz*at+ux*s,yaw:Math.atan2(-ux,-uz),ux,uz}};
  T.cv=()=>H.CV||H.VAN;
  T.place=(x,z,yaw)=>{const e=T.cv();e.pos.set(x,0,z);e.yaw=yaw;e.spd=0;e.steer=0;if(e.car){e.car.x=x;e.car.z=z;e.car.yaw=yaw;e.car.spd=0;e.car.steer=0;e.car.vdx=-Math.sin(yaw);e.car.vdz=-Math.cos(yaw)}H.step(1)};/* (vdx/vdz: CarAI's slide direction, or a reversed teleport drives backwards) */
  T.keysOff=()=>{for(const k in H.keys)H.keys[k]=false};
  /* drive the player's car to (x,z) with real keys along yaw, then brake to a stop */
  T.driveTo=(x,z,yaw)=>{const e=T.cv(),f=[-Math.sin(yaw),-Math.cos(yaw)];T.place(x-f[0]*26,z-f[1]*26,yaw);T.keysOff();
    for(let i=0;i<400;i++){const ahead=(x-e.pos.x)*f[0]+(z-e.pos.z)*f[1];const stopD=e.spd*e.spd/(2*14)+.3;H.keys.w=ahead>stopD;H.keys.s=ahead<=stopD&&e.spd>.2;
      const lat=(x-e.pos.x)*-f[1]+(z-e.pos.z)*f[0];let d=yaw-e.yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;const st=d*2-lat*.12;H.keys.a=st>.04;H.keys.d=st<-.04;
      H.step(1);if(ahead<=stopD&&Math.abs(e.spd)<.15)break}T.keysOff();H.keys[' ']=true;for(let i=0;i<60&&(i<10||Math.abs(e.spd)>.01);i++)H.step(1);H.keys[' ']=false;H.step(4);
    const err=Math.hypot(e.pos.x-x,e.pos.z-z);if(err>3){T.place(x,z,yaw);return{x,z,err,fallback:true}}return{x:e.pos.x,z:e.pos.z,err}};/* (something on the road in the way: placed instead, reported) */
  T.box=e=>{const s=e.obj.userData.size;return{x:e.pos.x,z:e.pos.z,fx:-Math.sin(e.yaw),fz:-Math.cos(e.yaw),hl:s.l/2,hw:s.w/2}};
  T.corners=B=>{const rx=-B.fz,rz=B.fx;return[[1,1],[1,-1],[-1,-1],[-1,1]].map(([a,c])=>({x:B.x+B.fx*B.hl*a+rx*B.hw*c,z:B.z+B.fz*B.hl*a+rz*B.hw*c}))};
  const segD=(p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l2));return Math.hypot(a.x+dx*t-p.x,a.z+dz*t-p.z)};
  /* bumper-to-bumper distance between two boxes (0 when they overlap) */
  T.rectDist=(A,B)=>{if(O.obbSat(A,B))return 0;const ca=T.corners(A),cb=T.corners(B);let d=1e9;for(let i=0;i<4;i++){for(const q of cb)d=Math.min(d,segD(q,ca[i],ca[(i+1)%4]));for(const q of ca)d=Math.min(d,segD(q,cb[i],cb[(i+1)%4]))}return d};
  T.ov=(A,B)=>{const h=O.obbSat(A,B);return h?h.d:0};
  /* run n steps watching one traffic car against the player's car: returns displacement of the player's car, the final and minimum gap, max overlap */
  T.watch=(t,n,cb)=>{const e=T.cv(),x0=e.pos.x,z0=e.pos.z;let minGap=1e9,ov=0,rest=null,still=0,moving=false;for(let i=0;i<n;i++){H.step(1);const A=T.box(e),B=O.trafficBox(t);const g=T.rectDist(A,B);minGap=Math.min(minGap,g);ov=Math.max(ov,T.ov(A,B));
      if(Math.abs(t.c.spd)>1)moving=true;if(moving&&rest==null){still=Math.abs(t.c.spd)<.15?still+1:0;if(still>=10)rest={gap:g,spd:t.c.spd,blk:t.blk}}if(cb&&cb(i))break}
    return{disp:Math.hypot(e.pos.x-x0,e.pos.z-z0),gap:rest?rest.gap:T.rectDist(T.box(e),O.trafficBox(t)),rested:!!rest,minGap,ov,spd:rest?rest.spd:t.c.spd,blk:rest?rest.blk:t.blk}};
  T.ev=id=>O.trafficLog().filter(e=>e.id===id);
  T.inVan=()=>{if(!H.CV){H.P.pos.copy(H.VAN.pos);H.enterVan()}};
  T.inVan();T.clear()});
const E=await p.evaluate(()=>{const T=__TC;return{long:T.edges.filter(e=>e.l>=55).length,total:T.edges.length,regions:[...new Set(T.edges.map(e=>e.region))]}});
log('road graph: '+E.total+' directed edges, '+E.long+' at least 55 m long; regions '+E.regions.join(', '));

if(!PEOPLE){/* ---------------- 1. stop short ---------------- */
for(const kind of['behind','ahead','side']){
  const r=await p.evaluate(([kind,NT])=>{const H=window.__ht,T=__TC,O=H.ow,G=O.roads();const res=[];const speeds=[7,9,11,13];
    let pool;if(kind==='side'){pool=[];for(const [j,n] of G.nodes.entries()){if(n.e.length<3)continue;for(const em of n.e){const M=G.nodes[em.to],lm=Math.hypot(M.x-n.x,M.z-n.z);if(lm<24)continue;
          for(const es of n.e){if(es===em)continue;const S=G.nodes[es.to],ls=Math.hypot(S.x-n.x,S.z-n.z);if(ls<30)continue;const cr=(M.x-n.x)*(S.z-n.z)-(M.z-n.z)*(S.x-n.x);if(Math.abs(cr)<1)continue;pool.push({j,m:em.to,s:es.to,ls,region:O.regionAt(n.x,n.z)})}}}}
    else pool=T.edges.filter(e=>e.l>=55);
    {const seen=new Set(),uniq=[],rest=[];for(const q of pool){const key=kind==='side'?q.j:q.a+'-'+q.b;(seen.has(key)?rest:uniq).push(q);seen.add(key)}pool=uniq.concat(rest)}/* distinct roads / junctions first */
    for(let k=0;k<NT;k++){T.clear();const E=pool[k%pool.length],v=speeds[k%4],drive=kind!=='side'&&k%2===0;let t,setup;
      if(kind==='behind'){const X=Math.min(E.l-12,48),q=T.lanePt(E.a,E.b,X);setup=drive?T.driveTo(q.x,q.z,q.yaw):(T.place(q.x,q.z,q.yaw),{err:0});t=O.trafficAdd({a:E.a,b:E.b,at:Math.max(0,X-38),spd:v,max:v,type:['sedan','hatch','suv','pickup','workvan'][k%5]})}
      else if(kind==='ahead'){const X=Math.min(E.l-12,40),q=T.lanePt(E.a,E.b,X,-1.5);setup=drive?T.driveTo(q.x,q.z,q.yaw):(T.place(q.x,q.z,q.yaw),{err:0});t=O.trafficAdd({a:E.b,b:E.a,at:Math.max(0,E.l-X-38),spd:v,max:v,type:['sedan','hatch','suv','pickup','workvan'][k%5]})}
      else{const D=11+(k%4)*1.5,q=T.lanePt(E.j,E.m,D);setup=drive?T.driveTo(q.x,q.z,q.yaw):(T.place(q.x,q.z,q.yaw),{err:0});t=O.trafficAdd({a:E.s,b:E.j,at:Math.max(0,E.ls-34),spd:v,max:v,type:['sedan','hatch','suv'][k%3]});
        /* its turn at the junction: into the player's street */
        t.planAt=E.j;t.planTo=E.m}
      const w=T.watch(t,30*12);const st=T.ev(t.id).find(e=>e.ev==='stop');
      res.push({fallback:!!setup.fallback,rested:w.rested,k,edge:kind==='side'?E.s+'>'+E.j+'>'+E.m:E.a+'>'+E.b,region:E.region,v,drive,setErr:+(setup.err||0).toFixed(2),disp:w.disp,gap:+w.gap.toFixed(2),minGap:+w.minGap.toFixed(2),ov:+w.ov.toFixed(3),spd:+w.spd.toFixed(2),by:st&&st.by,blk:w.blk})}
    T.clear();return res},[kind,NT]);
  const disp=Math.max(...r.map(x=>x.disp)),ov=Math.max(...r.map(x=>x.ov)),gaps=r.map(x=>x.gap),regs=[...new Set(r.map(x=>x.region))].join('/');
  const inBand=r.filter(x=>x.rested&&x.gap>=2.4&&x.gap<=(kind==='side'?7:4.2)).length;
  log('     '+kind+': '+r.map(x=>x.gap.toFixed(2)+(x.drive&&!x.fallback?'d':'')+(x.disp>0?'[moved '+x.disp.toFixed(3)+']':'')).join(' ')+'  (gap m per trial; d = player drove into place)');
  ok(disp<1e-6,kind+': player car displacement over '+r.length+' trials = '+disp.toExponential(1)+' m (roads '+new Set(r.map(x=>x.edge)).size+', regions '+regs+', speeds 7-13 m/s)');
  ok(ov===0,kind+': never overlapping the player car (max overlap '+ov+' m)');
  ok(inBand===r.length,kind+': stopped '+(kind==='side'?'2.4-7':'2.4-4.2')+' m short in '+inBand+'/'+r.length+' (min '+Math.min(...gaps).toFixed(2)+', max '+Math.max(...gaps).toFixed(2)+')'+(inBand<r.length?' '+JSON.stringify(r.filter(x=>!(x.rested&&x.gap>=2.4&&x.gap<=(kind==='side'?7:4.2)))):''));
}

/* ---------------- 2. the ladder ---------------- */
const L1=await p.evaluate(()=>{const H=window.__ht,T=__TC,O=H.ow;T.clear();const E=T.edges.filter(e=>e.l>=70)[2];const q=T.lanePt(E.a,E.b,50);T.place(q.x,q.z,q.yaw);
  const t=O.trafficAdd({a:E.a,b:E.b,at:10,spd:10,max:10});const w=T.watch(t,30*30);const ev=T.ev(t.id),s=ev.find(e=>e.ev==='stop');return{w,ev:ev.map(e=>({...e,rel:s?+(e.t-s.t).toFixed(2):null}))}});
log('     ladder, oncoming lane clear: '+L1.ev.map(e=>e.ev+'@'+e.rel+(e.line?' "'+e.line+'"':'')).join(', '));
{const h=L1.ev.filter(e=>e.ev==='honk'),r=L1.ev.find(e=>e.ev==='round'),d=L1.ev.find(e=>e.ev==='roundDone');
  ok(h.length&&Math.abs(h[0].rel-2)<.25,'first horn ~2 s after stopping (at '+(h[0]&&h[0].rel)+' s)');
  ok(r&&r.rel>=5.9&&d,'goes round once stopped 6 s with the oncoming lane clear (round at '+(r&&r.rel)+' s, done '+(d&&d.rel)+' s), never touching the player car (overlap '+L1.w.ov+')');
  ok(L1.w.disp<1e-6,'player car not moved while it went round');}
const L2=await p.evaluate(()=>{const H=window.__ht,T=__TC,O=H.ow;T.clear();const E=T.edges.filter(e=>e.l>=70)[2];const q=T.lanePt(E.a,E.b,50);T.place(q.x,q.z,q.yaw);
  /* a neighbour's car parked in the oncoming lane just ahead: no going round */
  const nb=H.vehicles.filter(e=>e!==H.VAN&&e.obj&&e.owner==='neighbour')[0];const sv={x:nb.pos.x,z:nb.pos.z,yaw:nb.yaw};const q2=T.lanePt(E.a,E.b,56,-1.5);nb.pos.set(q2.x,0,q2.z);nb.yaw=q2.yaw;
  const t=O.trafficAdd({a:E.a,b:E.b,at:10,spd:10,max:10});const w=T.watch(t,30*34);const ev=T.ev(t.id),s=ev.find(e=>e.ev==='stop');nb.pos.set(sv.x,0,sv.z);nb.yaw=sv.yaw;
  return{w,ev:ev.map(e=>({ev:e.ev,long:e.long,line:e.line,rel:s?+(e.t-s.t).toFixed(2):null}))}});
log('     ladder, oncoming lane blocked: '+L2.ev.map(e=>e.ev+(e.long?'(long)':'')+'@'+e.rel+(e.line?' "'+e.line+'"':'')).join(', '));
{const h=L2.ev.filter(e=>e.ev==='honk'),gaps=h.slice(1).map((x,i)=>+(x.rel-h[i].rel).toFixed(2)),hz=L2.ev.find(e=>e.ev==='haz'),rv=L2.ev.find(e=>e.ev==='rev');
  ok(h.length>=3&&gaps.every(g=>g>=4&&g<=9.1)&&h.some(x=>x.long),'horns '+h.map(x=>x.rel+(x.long?'L':'')).join(' ')+' s: gaps '+gaps.join('/')+' s (4-6, later 6-9), a long one');
  ok(hz&&Math.abs(hz.rel-10)<.3,'hazards at 10 s ('+(hz&&hz.rel)+')');ok(rv&&Math.abs(rv.rel-25)<.3,'reverses and U-turns at 25 s ('+(rv&&rv.rel)+'), player car moved '+L2.w.disp.toExponential(1)+' m');
  ok(L2.ev.filter(e=>e.ev==='bark').length>=1&&L2.ev.filter(e=>e.ev==='bark').length<=4,'barks: '+L2.ev.filter(e=>e.ev==='bark').map(e=>'"'+e.line+'"@'+e.rel).join(', '));}
const L3=await p.evaluate(()=>{const H=window.__ht,T=__TC,O=H.ow;T.clear();const E=T.edges.filter(e=>e.l>=70)[4];
  /* boxed in: neighbours' cars ahead and behind in both lanes; the dad on foot 45 m away looking the other way */
  const nbs=H.vehicles.filter(e=>e!==H.VAN&&e.obj&&e.owner==='neighbour').slice(1,5),sv=nbs.map(e=>({x:e.pos.x,z:e.pos.z,yaw:e.yaw}));
  [[38,1.5],[38,-1.5],[22,1.5],[22,-1.5]].forEach(([at,s],i)=>{const q=T.lanePt(E.a,E.b,at,s);nbs[i].pos.set(q.x,0,q.z);nbs[i].yaw=q.yaw});
  const t=O.trafficAdd({a:E.a,b:E.b,at:30,spd:0,max:6});H.exitVan&&H.exitVan();const far=T.lanePt(E.a,E.b,-45,0);H.P.pos.set(far.x,0,far.z);H.P.yaw=Math.atan2(far.ux,far.uz);
  let gone=-1,seenAt=[];for(let i=0;i<30*75;i++){H.step(1);if(i%5===0)O.update(H.camera);if(!O.trafficLive().includes(t)){gone=i/30;break}if(i%30===0)seenAt.push(t.seen?1:0)}
  nbs.forEach((e,i)=>{e.pos.set(sv[i].x,0,sv[i].z);e.yaw=sv[i].yaw});const ev=T.ev(t.id);return{gone,seen:seenAt.reduce((a,b)=>a+b,0),ev:ev.map(e=>e.ev+'@'+e.t)}});
log('     boxed in: '+L3.ev.join(', '));
ok(L3.gone>0,'boxed in on all sides: two re-route attempts, then despawned out of view after '+L3.gone.toFixed(1)+' s (in view on '+L3.seen+' sampled seconds)');

/* ---------------- 3. pushing ---------------- */
const P1=await p.evaluate(()=>{const H=window.__ht,T=__TC,O=H.ow;T.clear();T.inVan();const e=T.cv();H.repairCar(e,'full');const E=T.edges.filter(e=>e.l>=70)[1];
  const q=T.lanePt(E.a,E.b,12);T.place(q.x,q.z,q.yaw);const t=O.trafficAdd({a:E.a,b:E.b,at:40,spd:0,max:.01,type:'sedan'});H.step(5);
  const t0={x:t.c.x,z:t.c.z,hp:t.c.hp},hp0=H.carHp(e),tr0=H.prog.trust+(H.prog.trustR||0);T.keysOff();H.keys.w=true;let hitV=0,hitAt=-1;const drops=[];let trp=tr0;const trw=()=>{const v=H.prog.trust+(H.prog.trustR||0);if(v!==trp)drops.push(+(v-trp).toFixed(2));trp=v};
  let lastV=0;for(let i=0;i<240;i++){H.step(1);trw();if(hitAt<0&&O.trafficLog().some(x=>x.ev==='hit'&&x.id===t.id)){hitAt=i;hitV=lastV}lastV=e.spd;if(hitAt>=0&&i>hitAt+3){H.keys.w=false;H.keys[' ']=true}if(hitAt>=0&&i>hitAt+60)break}
  T.keysOff();for(let i=0;i<30;i++){H.step(1);trw()}const tr1=H.prog.trust+(H.prog.trustR||0);
  /* ram it again: no second trust hit */
  const q2=T.lanePt(E.a,E.b,0);const f=[-Math.sin(t.c.yaw),-Math.cos(t.c.yaw)];T.place(t.c.x-f[0]*16,t.c.z-f[1]*16,t.c.yaw);H.keys.w=true;for(let i=0;i<90;i++){H.step(1);trw()}T.keysOff();H.keys[' ']=true;for(let i=0;i<40;i++){H.step(1);trw()}H.keys[' ']=false;
  const tr2=H.prog.trust+(H.prog.trustR||0);
  return{hitV,moved:Math.hypot(t.c.x-t0.x,t.c.z-t0.z),thp:[t0.hp,t.c.hp],hp:[hp0,H.carHp(e)],dents:t.v.userData.dentN|0,hazard:!!t.hazSet,hero:!!(t.v.userData.body&&t.v.userData.body.length),
    trust:[tr0,tr1,tr2],drops,ev:T.ev(t.id).map(x=>x.ev+(x.sp?'('+x.sp+' m/s, -'+x.dmg+')':'')),wreck:!!t.wreck}});
log('     push: '+JSON.stringify(P1));
ok(P1.moved>.5,'driving into a stopped traffic car at '+P1.hitV.toFixed(1)+' m/s shoves it '+P1.moved.toFixed(2)+' m');
ok(P1.thp[1]<P1.thp[0]&&P1.hp[1]<P1.hp[0],'both damaged on the car-damage curve: traffic '+P1.thp[0]+' -> '+P1.thp[1].toFixed(1)+', player '+P1.hp[0]+' -> '+P1.hp[1].toFixed(1));
ok(P1.dents>0&&P1.hero&&P1.hazard&&P1.ev.some(x=>x.startsWith('honk')),'it dents (hero model, '+P1.dents+' dents), hazards on, a long horn');
ok(P1.drops.filter(d=>d<0).length===1&&P1.drops.filter(d=>d<0)[0]===-1,'-1 trust for ramming it, once per car: trust changes over both rams '+JSON.stringify(P1.drops)+' (trust '+P1.trust.map(x=>x.toFixed(1)).join(' -> ')+')');
const P2=await p.evaluate(()=>{const H=window.__ht,T=__TC,O=H.ow;T.clear();T.inVan();const e=T.cv();const E=T.edges.filter(e=>e.l>=70)[1];
  const q=T.lanePt(E.a,E.b,20);T.place(q.x,q.z,q.yaw);const t=O.trafficAdd({a:E.a,b:E.b,at:25.3,spd:0,max:.01,type:'hatch'});H.step(3);
  /* creep into it and keep pushing at walking pace */
  const f=[-Math.sin(e.yaw),-Math.cos(e.yaw)],xs=[],vs=[];T.keysOff();for(let i=0;i<150;i++){H.keys.w=e.spd<2.2;H.step(1);if(i>40){xs.push(t.c.x*f[0]+t.c.z*f[1]);vs.push(e.spd)}}T.keysOff();H.keys.s=true;H.step(20);H.keys.s=false;
  let back=0;for(let i=1;i<xs.length;i++)back=Math.min(back,xs[i]-xs[i-1]);const ov=T.ov(T.box(e),O.trafficBox(t));return{pushed:xs[xs.length-1]-xs[0],back,vmin:Math.min(...vs),vmax:Math.max(...vs),ov}});
ok(P2.pushed>3&&P2.back>-.002&&P2.ov<.05,'slow push: the hatchback is pushed '+P2.pushed.toFixed(2)+' m smoothly (never moves back more than '+(-P2.back*1000).toFixed(1)+' mm a frame, van speed '+P2.vmin.toFixed(2)+'-'+P2.vmax.toFixed(2)+' m/s, resting overlap '+P2.ov.toFixed(3)+')');
const P3=await p.evaluate(()=>{const H=window.__ht,T=__TC,O=H.ow;T.clear();const tank=H.vehicles.find(v=>v.type==='tank');if(!tank)return{none:true};
  if(H.CV)H.exitVan();H.P.pos.copy(tank.pos);H.enterVehicle(tank);const E=T.edges.filter(e=>e.l>=70)[3];let worst=0,ovs=0;const res=[];
  for(const [k,mode] of[[0,'behind'],[1,'ahead'],[2,'behind']]){T.clear();const q=T.lanePt(E.a,E.b,45,mode==='ahead'?-1.5:1.5);T.place(q.x,q.z,mode==='ahead'?q.yaw:q.yaw);
    const t=mode==='ahead'?O.trafficAdd({a:E.b,b:E.a,at:Math.max(0,E.l-80),spd:12,max:12}):O.trafficAdd({a:E.a,b:E.b,at:5,spd:12,max:12});
    /* an AI that would not brake: aim it straight at the tank */
    t.c.ai.max=12;const w=T.watch(t,30*8,()=>{if(t.c.spd<11&&Math.hypot(t.c.x-tank.pos.x,t.c.z-tank.pos.z)<12){t.shoveT=0;t.c.spd=11}return false});worst=Math.max(worst,w.disp);ovs=Math.max(ovs,w.ov);res.push(+w.gap.toFixed(2))}
  /* and the tank drives through a traffic car */
  T.clear();const q=T.lanePt(E.a,E.b,10);T.place(q.x,q.z,q.yaw);const t=O.trafficAdd({a:E.a,b:E.b,at:24,spd:0,max:.01});const t0={x:t.c.x,z:t.c.z};T.keysOff();H.keys.w=true;
  let tv=[];for(let i=0;i<150;i++){H.step(1);tv.push(tank.spd)}T.keysOff();const moved=Math.hypot(t.c.x-t0.x,t.c.z-t0.z);H.exitVan();return{worst,ovs,gaps:res,moved,tankV:Math.max(...tv)}});
if(P3.none)ok(false,'tank not found');else{ok(P3.worst<1e-6,'the tank is never moved by traffic, even one forced to ram it at 11 m/s ('+P3.worst.toExponential(1)+' m; gaps '+P3.gaps.join(', ')+')');
  ok(P3.moved>3,'the tank drives a traffic car '+P3.moved.toFixed(1)+' m down the road (tank up to '+P3.tankV.toFixed(1)+' m/s)')}

/* a traffic car that rear-ends the stopped player (forced: it would have braked) costs him nothing and doesn't move him */
const P4=await p.evaluate(()=>{const H=window.__ht,T=__TC,O=H.ow;T.clear();T.inVan();const e=T.cv();H.repairCar(e,'full');const E=T.edges.filter(e=>e.l>=70)[2];const q=T.lanePt(E.a,E.b,50);T.place(q.x,q.z,q.yaw);
  const hp0=H.carHp(e),tr0=H.prog.trust+(H.prog.trustR||0);const t=O.trafficAdd({a:E.a,b:E.b,at:20,spd:12,max:12});
  const w=T.watch(t,30*6,()=>{if(Math.hypot(t.c.x-e.pos.x,t.c.z-e.pos.z)<14&&t.c.spd<11.5&&!t.rammed){t.c.spd=12}return false});
  return{disp:w.disp,ov:w.ov,hp:[hp0,H.carHp(e)],trust:[tr0,H.prog.trust+(H.prog.trustR||0)],ev:T.ev(t.id).map(x=>x.ev+(x.by?':'+x.by:''))}});
ok(P4.disp<1e-6&&P4.hp[1]===P4.hp[0]&&P4.trust[1]===P4.trust[0]&&P4.ov<.05,'rear-ended by a traffic car forced not to brake: player car moved '+P4.disp.toExponential(1)+' m, hp '+P4.hp.join(' -> ')+', trust unchanged ('+P4.ev.join(', ')+')');
/* a hard hit disables it: it pulls over at the kerb, hazards on, the driver gets out and phones someone (never hurt) */
const P5=await p.evaluate(async()=>{const H=window.__ht,T=__TC,O=H.ow;T.clear();T.inVan();const e=T.cv();H.repairCar(e,'full');const E=T.edges.filter(e=>e.l>=70)[1];const q=T.lanePt(E.a,E.b,12);T.place(q.x,q.z,q.yaw);
  const t=O.trafficAdd({a:E.a,b:E.b,at:36,spd:0,max:.01,type:'hatch'});t.c.hp=4;H.step(3);T.keysOff();H.keys.w=true;for(let i=0;i<200&&!t.wreck;i++)H.step(1);T.keysOff();H.keys[' ']=true;H.step(30);H.keys[' ']=false;
  /* the driver's model may still be streaming in: keep the game going (and the loader breathing) until he is out, up to 30 s */
  for(let k=0;k<300&&!(t.driver&&k>=8);k++){for(let i=0;i<30;i++)H.step(1);await new Promise(r=>setTimeout(r,100))}const f=[-Math.sin(t.c.yaw),-Math.cos(t.c.yaw)];let lat=0;{const ai=t.c.ai,pp=ai.pts,k=Math.min(ai.tr.i,pp.length-2),A=pp[k],B=pp[k+1],l=Math.hypot(B.x-A.x,B.z-A.z)||1;lat=((t.c.x-A.x)*(B.z-A.z)-(t.c.z-A.z)*(B.x-A.x))/l}
  const d=t.driver;return{wreck:!!t.wreck,spd:t.c.spd,haz:!!t.hazSet,driver:!!d,phone:!!t.phone,dDist:d?+Math.hypot(d.root.position.x-t.c.x,d.root.position.z-t.c.z).toFixed(2):null,lat:+lat.toFixed(2),ev:T.ev(t.id).map(x=>x.ev)}});
ok(P5.wreck&&Math.abs(P5.spd)<.3&&P5.haz&&P5.driver&&P5.phone&&P5.lat<-.6,'a hard hit wrecks it: pulled over ('+(-P5.lat)+' m right of the lane line), stopped, hazards on, driver standing '+P5.dDist+' m from it'+(P5.driver?' with a phone':' (no people models loaded)')+' ('+P5.ev.join(', ')+')');
/* Riverside: ramming adds a little heat (docs/riverside-heat.md), once per car */
const P6=await p.evaluate(()=>{const H=window.__ht,T=__TC,O=H.ow;T.clear();T.inVan();const e=T.cv();H.repairCar(e,'full');const E=T.edges.filter(x=>x.l>=45&&x.region==='river')[0];if(!E)return{none:true};
  const q=T.lanePt(E.a,E.b,4);T.place(q.x,q.z,q.yaw);H.step(5);const h0=H.heat.get();const t=O.trafficAdd({a:E.a,b:E.b,at:24,spd:0,max:.01});H.step(3);T.keysOff();H.keys.w=true;
  for(let i=0;i<150&&!O.trafficLog().some(x=>x.ev==='hit'&&x.id===t.id);i++)H.step(1);H.step(2);const h1=H.heat.get();T.keysOff();H.keys[' ']=true;H.step(30);H.keys[' ']=false;return{h0,h1,region:H.region}});
ok(P6.none||P6.h1-P6.h0>.2&&P6.h1-P6.h0<.3,'ramming traffic in Riverside: heat '+(P6.none?'(no Riverside road)':P6.h0.toFixed(2)+' -> '+P6.h1.toFixed(2)+' (+0.25)'));

/* ---------------- 4. queue of three ---------------- */
const Q=await p.evaluate(()=>{const H=window.__ht,T=__TC,O=H.ow;T.clear();T.inVan();const e=T.cv();const E=T.edges.filter(e=>e.l>=80)[0]||T.edges.filter(e=>e.l>=70)[0];
  const X=Math.min(E.l-8,72),q=T.lanePt(E.a,E.b,X);T.place(q.x,q.z,q.yaw);const ts=[0,1,2].map(i=>O.trafficAdd({a:E.a,b:E.b,at:Math.max(0,X-30-i*14),spd:9,max:9,type:['suv','hatch','pickup'][i]}));
  let ov=0;const cars=()=>[T.box(e),...ts.map(t=>O.trafficBox(t))];for(let i=0;i<30*5;i++){H.step(1);const B=cars();for(let a=0;a<4;a++)for(let c=a+1;c<4;c++)ov=Math.max(ov,T.ov(B[a],B[c]))}
  const B=cars(),gaps=[T.rectDist(B[0],B[1]),T.rectDist(B[1],B[2]),T.rectDist(B[2],B[3])].map(x=>+x.toFixed(2)),stopped=ts.every(t=>Math.abs(t.c.spd)<.2);
  /* the dad drives off: they follow in order */
  T.keysOff();H.keys.w=true;const f=[-Math.sin(e.yaw),-Math.cos(e.yaw)],line=e.pos.x*f[0]+e.pos.z*f[1],passed=[];const move=[-1,-1,-1];
  for(let i=0;i<30*14;i++){H.step(1);if(i>40)H.keys.w=e.spd<9;ts.forEach((t,k)=>{if(move[k]<0&&t.c.spd>.8)move[k]=i;const s=t.c.x*f[0]+t.c.z*f[1];if(s>line&&!passed.includes(k))passed.push(k)});const Bq=cars();for(let a=0;a<4;a++)for(let c=a+1;c<4;c++)ov=Math.max(ov,T.ov(Bq[a],Bq[c]))}
  T.keysOff();H.keys.s=true;H.step(30);H.keys.s=false;return{gaps,stopped,ov,passed,move,ev:ts.map(t=>T.ev(t.id).map(x=>x.ev).join('/'))}});
ok(Q.stopped&&Q.gaps.every(g=>g>=2.4&&g<=4.2)&&Q.ov===0,'a queue of three forms behind the player: gaps '+Q.gaps.join(', ')+' m, no overlap ('+Q.ov+')');
ok(Q.passed.join()==='0,1,2'&&Q.move[0]<=Q.move[1]&&Q.move[1]<=Q.move[2],'it clears in order once he drives off (start frames '+Q.move.join(', ')+'; past his spot in order '+Q.passed.join(', ')+')');

/* ---------------- 5. junctions ---------------- */
const J=await p.evaluate(()=>{const H=window.__ht,T=__TC,O=H.ow,G=O.roads();T.clear();T.inVan();const e=T.cv();const far=G.nodes[0];T.place(far.x+3,far.z+3,0);
  const res=[];let n=0;for(const [j,nd] of G.nodes.entries()){if(nd.e.length<4||n>=6)continue;const ins=nd.e.map(x=>x.to).filter(s=>{const S=G.nodes[s];return Math.hypot(S.x-nd.x,S.z-nd.z)>=30});if(ins.length<2)continue;
    T.clear();const a=ins[0],c=ins[1],La=Math.hypot(G.nodes[a].x-nd.x,G.nodes[a].z-nd.z),Lc=Math.hypot(G.nodes[c].x-nd.x,G.nodes[c].z-nd.z);
    const t1=O.trafficAdd({a,b:j,at:La-22,spd:9,max:10}),t2=O.trafficAdd({a:c,b:j,at:Lc-22,spd:9,max:10});let ov=0,minD=1e9;
    for(let i=0;i<30*12;i++){H.step(1);const A=O.trafficBox(t1),B=O.trafficBox(t2);ov=Math.max(ov,T.ov(A,B));minD=Math.min(minD,T.rectDist(A,B))}
    res.push({j,ov:+ov.toFixed(3),minD:+minD.toFixed(2),d1:+Math.hypot(t1.c.x-nd.x,t1.c.z-nd.z).toFixed(1),d2:+Math.hypot(t2.c.x-nd.x,t2.c.z-nd.z).toFixed(1)});n++}
  /* the player drives across a junction while a car arrives on the cross street */
  T.clear();let jn=null;for(const [j,nd] of G.nodes.entries()){if(nd.e.length<3)continue;const ok=nd.e.filter(x=>{const S=G.nodes[x.to];return Math.hypot(S.x-nd.x,S.z-nd.z)>=28});if(ok.length>=2&&ok.some(x=>{const S=G.nodes[x.to],P=G.nodes[ok[0].to];return Math.abs((S.x-nd.x)*(P.z-nd.z)-(S.z-nd.z)*(P.x-nd.x))>10})){jn={j,nd,ok};break}}
  if(!jn)return{res};const A=jn.ok[0].to,Bn=jn.ok.find(x=>{const S=G.nodes[x.to],P=G.nodes[A];return Math.abs((S.x-jn.nd.x)*(P.z-jn.nd.z)-(S.z-jn.nd.z)*(P.x-jn.nd.x))>10}).to;
  const LA=Math.hypot(G.nodes[A].x-jn.nd.x,G.nodes[A].z-jn.nd.z),q=T.lanePt(A,jn.j,LA-26);T.place(q.x,q.z,q.yaw);const LB=Math.hypot(G.nodes[Bn].x-jn.nd.x,G.nodes[Bn].z-jn.nd.z);
  const t=O.trafficAdd({a:Bn,b:jn.j,at:Math.max(0,LB-30),spd:10,max:10});
  /* it means to go straight across his path (or any way but his road) */
  {const nb=G.nodes[Bn],str=jn.nd.e.map(x=>x.to).filter(x=>x!==Bn&&x!==A).sort((u,v)=>{const U=G.nodes[u],V=G.nodes[v],d=n=>((n.x-jn.nd.x)*(jn.nd.x-nb.x)+(n.z-jn.nd.z)*(jn.nd.z-nb.z))/Math.hypot(n.x-jn.nd.x,n.z-jn.nd.z);return d(V)-d(U)});t.planAt=jn.j;t.planTo=str[0]}T.keysOff();H.keys.w=true;let ov=0,minD=1e9,tStop=null;const trace=[];
  for(let i=0;i<30*7;i++){H.keys.w=e.spd<8;H.step(1);const g=T.rectDist(T.box(e),O.trafficBox(t));minD=Math.min(minD,g);ov=Math.max(ov,T.ov(T.box(e),O.trafficBox(t)));if(tStop==null&&t.c.spd<.3)tStop=+Math.hypot(t.c.x-jn.nd.x,t.c.z-jn.nd.z).toFixed(1);if(i%15===0)trace.push([i,+e.pos.x.toFixed(1),+e.pos.z.toFixed(1),+e.spd.toFixed(1),+t.c.x.toFixed(1),+t.c.z.toFixed(1),+t.c.spd.toFixed(1),t.blk,t.res])}
  T.keysOff();H.keys.s=true;H.step(40);H.keys.s=false;return{res,cross:{ov,minD:+minD.toFixed(2),tStop,j:jn.j,A,Bn,log:T.ev(t.id).map(x=>x.ev+':'+(x.by||'')),trace}}});
ok(J.res.length>=3&&J.res.every(r=>r.ov<.01),'junctions: '+J.res.length+' pairs of cars arriving at once never overlap (closest '+J.res.map(r=>r.minD).join('/')+' m)');
ok(J.cross&&J.cross.ov===0&&J.cross.tStop!=null,'a car on the cross street waits '+(J.cross&&J.cross.tStop)+' m from the junction centre while the player drives across (closest '+(J.cross&&J.cross.minD)+' m)'+(J.cross&&J.cross.tStop!=null?'':' '+JSON.stringify(J.cross)));

/* ---------------- 6. mission cars ---------------- */
const MC=await p.evaluate(()=>{const H=window.__ht,T=__TC,O=H.ow;T.clear();T.inVan();const e=T.cv();const far=O.roads().nodes[0];T.place(far.x+3,far.z+3,0);
  const E=T.edges.filter(e=>e.l>=70)[5];const q=T.lanePt(E.a,E.b,48);const mc=HT.CarAI.make('workvan',{x:q.x,z:q.z,yaw:q.yaw});H.OWS.trafficOthers=[mc];
  const t=O.trafficAdd({a:E.a,b:E.b,at:8,spd:10,max:10});let ov=0,mv=0;const x0=mc.x;for(let i=0;i<30*9;i++){H.step(1);const B={x:mc.x,z:mc.z,fx:-Math.sin(mc.yaw),fz:-Math.cos(mc.yaw),hl:mc.stats.len/2,hw:mc.stats.wid/2};ov=Math.max(ov,T.ov(B,O.trafficBox(t)))}
  const B={x:mc.x,z:mc.z,fx:-Math.sin(mc.yaw),fz:-Math.cos(mc.yaw),hl:mc.stats.len/2,hw:mc.stats.wid/2},gap=T.rectDist(B,O.trafficBox(t));H.OWS.trafficOthers=null;return{gap:+gap.toFixed(2),ov,by:(T.ev(t.id).find(x=>x.ev==='stop')||{}).by}});
ok(MC.ov===0&&MC.gap>=2.4&&MC.gap<=4.2&&MC.by==='other','a stand-in mission car (o.others) is stopped for like the player: '+MC.gap+' m short, by '+MC.by);
const MS=await p.evaluate(async()=>{const H=window.__ht,T=__TC,O=H.ow;T.clear();H.OWS.trafficWant=6;for(let i=0;i<30*20;i++)H.step(1);const n0=O.trafficLive().length;
  const d=H.L.dests[0];if(!H.CV)T.inVan();const V=H.VAN;V.pos.set(d.x,0,d.z);V.spd=0;if(V.car){V.car.spd=0;V.car.x=d.x;V.car.z=d.z}H.syncVan();H.JOB=0;H.step(3);
  for(let k=0;k<120&&H.mode!=='mission';k++)await new Promise(r=>setTimeout(r,100));const pos=O.trafficLive().map(t=>[t.c.x,t.c.z]);H.step(90);
  const moved=O.trafficLive().reduce((m,t,i)=>Math.max(m,pos[i]?Math.hypot(t.c.x-pos[i][0],t.c.z-pos[i][1]):0),0);const mode=H.mode;H.enterHub();H.step(2);H.OWS.trafficWant=0;T.clear();return{n0,mode,n:pos.length,moved}});
ok(MS.mode==='mission'&&MS.moved<1e-6,'during a job ambient traffic stands still, as before ('+MS.n+' cars from free roam, moved '+MS.moved+' m; jobs run their own cars)');

}
/* ---------------- 8. people in the lane (W-03) ----------------
   A kid (nb_kid, protected), an adult neighbour and a crew member, standing in the lane, crossing it in front of the car, or walking
   along it ahead of the car; at 9 and 13 m/s; in Maple and Riverside. Zero overlaps with the body (0.3 m), a child is never gone
   round and never honked at, no hit/die call on anyone. Then a traffic car the player shoves toward a kid: it stops dead short of her. */
const PL=await p.evaluate(()=>{const H=window.__ht,T=__TC,O=H.ow,PP=HT.People,G=O.roads();const res=[];let hits=0;
  H.prog.done[0]=true;H.enterHub();H.step(3);H.openBridge&&H.openBridge();H.step(2);H.OWS.trafficWant=0;T.clear();/* Gary's job done: he is out as crew (not job 1: its Act 2 card would pause the game) */const hit0=PP.hit,die0=PP.die;
  
  const boxD=(t,x,z)=>{const b=O.trafficBox(t);const dx=x-b.x,dz=z-b.z,a=dx*b.fx+dz*b.fz,c=dx*-b.fz+dz*b.fx;return Math.hypot(Math.max(0,Math.abs(a)-b.hl),Math.max(0,Math.abs(c)-b.hw))};
  const kid=PP.make('neighbour',{variant:'nb_kid'}),adult=PP.make('neighbour',{variant:'nb_pops'});
  const who=[];const mine=d=>d===kid||d===adult||H.allies.some(a=>a.dude===d);PP.hit=function(d){if(mine(d)){hits++;if(who.length<6)who.push('hit:'+(d.rb&&d.rb.key)+':'+(new Error().stack.split('\n')[2]||'').trim().slice(0,90))}return hit0.apply(this,arguments)};PP.die=function(d){if(mine(d)){hits++;if(who.length<6)who.push('die:'+(d.rb&&d.rb.key))}return die0.apply(this,arguments)};/* only the people under test (Riverside free roam has its own scuffles) */
  const person=who=>{if(who==='crew'){const a=H.allies[0];if(!a)return null;return{set:(x,z)=>{a.pos.set(x,0,z);a.target=null;if(a.dude)a.dude.root.position.set(x,0,z)},at:()=>a.pos,drop:()=>{}}}
    const d=who==='kid'?kid:adult;if(!d)return null;H.L.group.add(d.root);return{set:(x,z)=>d.root.position.set(x,0,z),at:()=>d.root.position,drop:()=>{d.root.parent&&d.root.parent.remove(d.root)}}};/* at(): where they really are after the step (the crew's own AI moves them too) */
  const farNode=E=>{const A=G.nodes[E.a],B=G.nodes[E.b];let best=null,bd=1e9;for(const n of G.nodes){const d=Math.min(Math.hypot(n.x-A.x,n.z-A.z),Math.hypot(n.x-B.x,n.z-B.z));if(d>=45&&d<bd){bd=d;best=n}}return best};/* the player's car out of the way but near (traffic over 170 m from the player is dropped) */
  for(const region of['maple','river']){const Es=T.edges.filter(e=>e.l>=(region==='river'?30:44)&&e.region===region).sort((a,b)=>b.l-a.l);if(!Es.length){res.push({region,none:true});continue}let k=0;
    for(const who of['kid','adult','crew'])for(const motion of['still','cross','along'])for(const v of[9,13]){const E=Es[(k++)%Es.length];T.clear();T.inVan();
      const fn=farNode(E);T.place(fn.x+3,fn.z+3,0);H.exitVehicle&&H.exitVehicle();/* the player's car out of the way; he stands on the far kerb (as he would, with his crew nearby) */
      const at=Math.min(40,E.l-4),q=T.lanePt(E.a,E.b,at),nx=-q.uz,nz=q.ux;/* n: across the road */const m=person(who);if(!m){res.push({region,who,none:true});continue}
      let px=q.x,pz=q.z,vx=0,vz=0;if(motion==='cross'){px=q.x-nx*5;pz=q.z-nz*5}
      H.P.pos.set(q.x-nx*7,0,q.z-nz*7);if(H.collide)H.collide(H.P.pos,.35);m.set(px,pz);H.step(1);const lg0=O.trafficLog().length;const t=O.trafficAdd({a:E.a,b:E.b,at:1,spd:v,max:v,type:'sedan'});if(!t){res.push({region,who,motion,v,err:'no car'});m.drop();continue}
      let minD=1e9,stopped=false,go=false,passed=false,odo=0,lx=t.c.x,lz=t.c.z;
      for(let i=0;i<30*14;i++){const dd=boxD(t,px,pz);
        if(motion==='cross'&&!go&&dd<30)go=true;/* steps off the kerb when the car is 30 m away, 1.4 m/s, all the way over */
        if(motion==='cross'&&go&&((px-q.x)*nx+(pz-q.z)*nz)<5){vx=nx*1.4;vz=nz*1.4}else if(motion==='along'){vx=q.ux*1.2;vz=q.uz*1.2}else{vx=0;vz=0}
        px+=vx/30;pz+=vz/30;m.set(px,pz);H.step(1);const w=m.at(),d2=boxD(t,w.x,w.z);minD=Math.min(minD,d2);if(Math.abs(t.c.spd)<.2&&i>15)stopped=true;
        odo+=Math.hypot(t.c.x-lx,t.c.z-lz);lx=t.c.x;lz=t.c.z;if(odo>at+8)passed=true}/* drove on past where they were (along the road, turns included) */
      const evs=O.trafficLog().slice(lg0).filter(x=>x.id===t.id),ev=evs.map(x=>x.ev),atKid=evs.filter(x=>(x.ev==='honk'||x.ev==='round'||x.ev==='bark')&&x.by==='kid').map(x=>x.ev);m.drop();
      res.push({region,who,motion,v,edge:E.a+'>'+E.b,l:Math.round(E.l),minD:+minD.toFixed(2),stopped,passed,ev:[...new Set(ev)],atKid,end:[+t.c.x.toFixed(1),+t.c.z.toFixed(1),+t.c.spd.toFixed(1),t.blk,t.mode]})}}
  /* pushed toward a kid: a stopped traffic car, the kid 3 m in front of it, the player drives into it from behind */
  let push=null;{const E=T.edges.filter(e=>e.l>=70&&e.region==='maple')[1];T.clear();T.inVan();const e=T.cv();H.repairCar(e,'full');const q=T.lanePt(E.a,E.b,12);T.place(q.x,q.z,q.yaw);
    const t=O.trafficAdd({a:E.a,b:E.b,at:30,spd:0,max:.01,type:'sedan'});H.step(5);const f=[-Math.sin(t.c.yaw),-Math.cos(t.c.yaw)],hl=t.c.stats.len/2;
    const kx=t.c.x+f[0]*(hl+1.3),kz=t.c.z+f[1]*(hl+1.3);kid.root.position.set(kx,0,kz);H.L.group.add(kid.root);H.step(2);const x0=t.c.x,z0=t.c.z;
    T.keysOff();H.keys.w=true;let minD=1e9,maxV=0;for(let i=0;i<150;i++){H.step(1);maxV=Math.max(maxV,e.spd);minD=Math.min(minD,boxD(t,kx,kz))}T.keysOff();H.keys[' ']=true;H.step(30);H.keys[' ']=false;
    push={minD:+minD.toFixed(2),moved:+Math.hypot(t.c.x-x0,t.c.z-z0).toFixed(2),maxV:+maxV.toFixed(1),ev:[...new Set(T.ev(t.id).map(x=>x.ev))]};kid.root.parent&&kid.root.parent.remove(kid.root)}
  PP.hit=hit0;PP.die=die0;T.clear();return{res,hits,who,push}});
for(const r of PL.res)log('     people: '+JSON.stringify(r));
{const rs=PL.res.filter(r=>!r.none),ov=rs.filter(r=>r.minD<.3);
  ok(rs.length>=30&&!ov.length,'people in the lane: '+rs.length+' trials (kid/adult/crew x still/crossing/walking along x 9/13 m/s x Maple/Riverside): '+ov.length+' overlaps with a body (closest '+Math.min(...rs.map(r=>r.minD)).toFixed(2)+' m)'+(ov.length?' '+JSON.stringify(ov):''));
  ok(new Set(rs.map(r=>r.region)).size===2,'both regions covered ('+[...new Set(rs.map(r=>r.region))].join(', ')+')');
  const kr=rs.filter(r=>r.who==='kid');ok(kr.every(r=>!r.atKid.length),'a child in the road is waited for: never gone round, never honked at ('+kr.length+' trials; horns at the crew following the dad onto the road are allowed)');
  const kids=rs.filter(r=>r.who==='kid'),adl=rs.filter(r=>r.who!=='kid');
  ok(Math.min(...kids.filter(r=>r.motion==='still').map(r=>r.minD))>Math.min(...adl.filter(r=>r.motion==='still').map(r=>r.minD)),'a wider berth for a child (closest still kid '+Math.min(...kids.filter(r=>r.motion==='still').map(r=>r.minD))+' m, adult/crew '+Math.min(...adl.filter(r=>r.motion==='still').map(r=>r.minD))+' m)');
  ok(rs.filter(r=>r.motion==='cross').every(r=>r.passed),'once a crossing person is over, the car drives on ('+rs.filter(r=>r.motion==='cross'&&r.passed).length+'/'+rs.filter(r=>r.motion==='cross').length+')');
  ok(PL.hits===0,'no hit or die call on anyone in the trials ('+PL.hits+')'+(PL.hits?' '+JSON.stringify(PL.who):''));
  log('     pushed toward a kid: '+JSON.stringify(PL.push));
  ok(PL.push&&PL.push.minD>=.3&&PL.push.maxV>1,'a traffic car the player shoves toward a kid 1.3 m in front of it stops dead short of her (closest '+(PL.push&&PL.push.minD)+' m, moved '+(PL.push&&PL.push.moved)+' m)')}

if(!PEOPLE){/* ---------------- 7. soak ---------------- */
const SOAK=QUICK?30*60:30*300;
const SK=await p.evaluate(([N])=>{const H=window.__ht,T=__TC,O=H.ow,G=O.roads();T.clear();T.inVan();const e=T.cv();H.repairCar(e,'full');
  /* the van laps a block on a waypoint autopilot that ignores traffic (worst case for contact) */
  const loop=[];{let best=null;for(const [i,n] of G.nodes.entries())if(n.e.length>=3&&(!best||Math.hypot(n.x-120,n.z-60)<Math.hypot(best.x-120,best.z-60)))best=n;let cur=G.nodes.indexOf(best),prev=-1;for(let k=0;k<10;k++){const nd=G.nodes[cur];let nx=nd.e.map(x=>x.to).filter(x=>x!==prev);if(!nx.length)nx=[prev];const to=nx[(k*3)%nx.length];loop.push(...G.lane(prev>=0?[prev,cur,to]:[cur,to]));prev=cur;cur=to}}
  const st=loop[0];T.place(st.x,st.z,0);let wi=1;const run=(n,want)=>{H.OWS.noTraffic=want===0;H.OWS.trafficWant=want;let ov=0,ovN=0,samp=0,maxCars=0,hits=0,stuckN=0,revN=0;const ovs=[];const t0=performance.now();
    for(let s=0;s<n;s++){const w=loop[wi%loop.length];const dx=w.x-e.pos.x,dz=w.z-e.pos.z;if(Math.hypot(dx,dz)<6)wi++;const want_=Math.atan2(-dx,-dz);let d=want_-e.yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;
      if(Math.abs(e.spd)<.6)stuckN++;else stuckN=0;if(stuckN>45){revN=25;stuckN=0}
      if(revN>0){revN--;H.keys.w=false;H.keys.s=true;H.keys.a=d<0;H.keys.d=d>0}else{H.keys.w=e.spd<(Math.abs(d)>.4?5:10);H.keys.s=false;H.keys.a=d>.05;H.keys.d=d<-.05}H.step(1);
      if(s%5)continue;const L=O.trafficLive();maxCars=Math.max(maxCars,L.length);samp++;const bx=L.map(t=>O.trafficBox(t)),oth=[T.box(e),...H.vehicles.filter(v=>v!==e&&v.obj&&!v.obj.userData.flat).map(T.box)];
      for(let a=0;a<bx.length;a++){for(let c=a+1;c<bx.length;c++){const h=O.obbSat(bx[a],bx[c]);if(h&&h.d>.05){ovN++;ov=Math.max(ov,h.d);if(ovs.length<6)ovs.push(['traffic',+h.d.toFixed(2),L[a].mode,L[c].mode,s])}}for(const [qi,q] of oth.entries()){if(Math.abs(q.x-bx[a].x)>9||Math.abs(q.z-bx[a].z)>9)continue;const h=O.obbSat(bx[a],q);if(h&&h.d>.05){ovN++;ov=Math.max(ov,h.d);if(ovs.length<6){const pc=qi?H.vehicles.filter(v=>v!==e&&v.obj&&!v.obj.userData.flat)[qi-1]:null,tt=L[a];ovs.push([qi?'parked':'van',+h.d.toFixed(2),tt.mode,tt.wreck?1:0,tt.nudge?1:0,s,pc&&[pc.type,pc.owner,pc.name,+pc.pos.x.toFixed(1),+pc.pos.z.toFixed(1),O.trafficObs().some(o=>o.src===pc)],[+tt.c.x.toFixed(1),+tt.c.z.toFixed(1),+tt.c.spd.toFixed(1),!!tt.push,+(tt.shoveT||0).toFixed(1),tt.sepN|0,+Math.hypot(tt.c.x-e.pos.x,tt.c.z-e.pos.z).toFixed(1)]])}}}}}
    return{ms:+((performance.now()-t0)/n).toFixed(3),ov:+ov.toFixed(3),ovN,samp,maxCars,ovs}};
  const off=run(Math.min(1800,N/5),0);const lg0=O.trafficLog().length;const on=run(N,24);const ev={};for(const x of O.trafficLog().slice(lg0)){const k=x.ev;ev[k]=(ev[k]||0)+1}
  const hp=H.carHp(e);H.OWS.trafficWant=0;H.keys.w=H.keys.a=H.keys.d=false;H.keys.s=true;H.step(30);H.keys.s=false;T.clear();return{off,on,ev,hp,laps:+(wi/loop.length).toFixed(2)}},[SOAK]);
log('     soak events: '+JSON.stringify(SK.ev)+'; van autopilot '+SK.laps+' laps, van hp '+SK.hp.toFixed(0));
ok(SK.on.maxCars>=20&&SK.on.ovN===0,(SOAK/30/60)+'-minute free roam with up to '+SK.on.maxCars+' cars and the van ramming its way round a loop: '+SK.on.ovN+' overlaps > 5 cm after resolution in '+SK.on.samp+' samples (max '+SK.on.ov+' m)'+(SK.on.ovN?' '+JSON.stringify(SK.on.ovs):''));
log('     step time (game logic, no render): traffic off '+SK.off.ms+' ms, 24 cars '+SK.on.ms+' ms');}
/* people cost: 24 cars and 40 people standing and walking on the roads round the player, step time with traffic blind to them (as before
   W-03) and seeing them, alternated twice */
const PC=await p.evaluate(()=>{const H=window.__ht,T=__TC,O=H.ow,PP=HT.People,G=O.roads();T.clear();T.inVan();const e=T.cv();
  let c0=null;for(const n of G.nodes)if(n.e.length>=3&&(!c0||Math.hypot(n.x-120,n.z-40)<Math.hypot(c0.x-120,c0.z-40)))c0=n;T.place(c0.x+4,c0.z+4,0);
  const near=T.edges.filter(E=>{const A=G.nodes[E.a];return Math.hypot(A.x-c0.x,A.z-c0.z)<110&&E.l>=30});const ppl=[];
  for(let i=0;i<40;i++){const E=near[(i*7)%near.length],q=T.lanePt(E.a,E.b,6+(i*13)%Math.max(8,E.l-12),i%3?3.6:1.5);const d=PP.make('neighbour',{variant:i%5===0?'nb_kid':undefined});if(!d)continue;
    H.L.group.add(d.root);d.root.position.set(q.x,0,q.z);ppl.push({d,q,w:i%2?1.2:0,ph:i})}
  const run=(n,off)=>{H.OWS.trafficNoPeople=off;let tr=0;const t0=performance.now();for(let s=0;s<n;s++){for(const m of ppl)if(m.w){const k=Math.sin((s+m.ph*17)/60)*m.w/30;m.d.root.position.x+=m.q.ux*k;m.d.root.position.z+=m.q.uz*k}
      const a=performance.now();H.step(1);tr+=performance.now()-a}return{ms:+((performance.now()-t0)/n).toFixed(3),cars:O.trafficLive().length}};
  H.OWS.noTraffic=false;H.OWS.trafficWant=24;run(30*20,false);
  const r={off:[],on:[]};for(let k=0;k<2;k++){r.off.push(run(30*15,true));r.on.push(run(30*15,false))}
  for(const m of ppl)m.d.root.parent&&m.d.root.parent.remove(m.d.root);H.OWS.trafficNoPeople=false;H.OWS.trafficWant=0;T.clear();
  return{n:ppl.length,off:r.off.map(x=>x.ms),on:r.on.map(x=>x.ms),cars:r.on.map(x=>x.cars)}});
log('     step time with '+PC.n+' people and '+PC.cars.join('/')+' cars (game logic, no render): traffic blind to people '+PC.off.join(' / ')+' ms, seeing them '+PC.on.join(' / ')+' ms');
ok(PC.n>=40&&Math.min(...PC.on)-Math.min(...PC.off)<1.5,'seeing 40 people costs traffic little: +'+(Math.min(...PC.on)-Math.min(...PC.off)).toFixed(3)+' ms a step (best of two)');

/* ---------------- screenshots ---------------- */
if(SHOTS){fs.mkdirSync(DIR,{recursive:true});
  /* window.__shotCam=[x,y,z,tx,tz]: H.draw() first (HUD, subtitles), then the same frame again from the shot camera with the world streamed in */
  const shot=async name=>{await p.evaluate(()=>{const H=window.__ht,s=window.__shotCam,c=H.camera;H.draw();for(let i=0;i<3;i++){c.position.set(s[0],s[1],s[2]);c.lookAt(s[3],.8,s[4]);c.updateMatrixWorld();H.ow.update(c);if(HT.World.update)HT.World.update(H.L,c.position)}H.render.draw()});
    await p.waitForTimeout(200);await p.evaluate(()=>{const H=window.__ht,s=window.__shotCam,c=H.camera;c.position.set(s[0],s[1],s[2]);c.lookAt(s[3],.8,s[4]);c.updateMatrixWorld();H.render.draw()});
    await p.screenshot({path:path.join(DIR,name),type:'jpeg',quality:82});log('     shot '+name)};
  /* 1. stopped behind the player, honking */
  await p.evaluate(()=>{const H=window.__ht,T=__TC,O=H.ow;T.clear();T.inVan();const E=T.edges.filter(e=>e.l>=70)[2];const q=T.lanePt(E.a,E.b,50);T.place(q.x,q.z,q.yaw);
    const t=O.trafficAdd({a:E.a,b:E.b,at:12,spd:10,max:10,type:'suv',color:'#2e4a6b'});for(let i=0;i<30*7.2;i++)H.step(1);window.__t=t;const f=[-Math.sin(q.yaw),-Math.cos(q.yaw)],r=[-f[1],f[0]];
    window.__shotCam=[t.c.x-f[0]*7+r[0]*-4.5,3.2,t.c.z-f[1]*7+r[1]*-4.5,(t.c.x+q.x)/2,(t.c.z+q.z)/2]});
  await shot('stopped-honking.jpg');
  /* 2. going round */
  await p.evaluate(()=>{const H=window.__ht,t=window.__t;for(let i=0;i<30*5;i++){H.step(1);if(t.mode==='round'&&t.offNow>2.4)break}const f=[-Math.sin(t.c.yaw),-Math.cos(t.c.yaw)],r=[-f[1],f[0]];window.__shotCam=[t.c.x+f[0]*12+r[0]*5,4,t.c.z+f[1]*12+r[1]*5,t.c.x,t.c.z]});
  await shot('going-round.jpg');
  /* 3. a queue */
  await p.evaluate(()=>{const H=window.__ht,T=__TC,O=H.ow;T.clear();T.inVan();const E=T.edges.filter(e=>e.l>=80)[0]||T.edges.filter(e=>e.l>=70)[0];const X=Math.min(E.l-8,72),q=T.lanePt(E.a,E.b,X);T.place(q.x,q.z,q.yaw);
    [0,1,2].forEach(i=>O.trafficAdd({a:E.a,b:E.b,at:Math.max(0,X-30-i*14),spd:9,max:9,type:['suv','hatch','pickup'][i],color:['#d8d4c8','#8a2f2a','#3d4a3a'][i]}));for(let i=0;i<30*5;i++)H.step(1);
    const f=[-Math.sin(q.yaw),-Math.cos(q.yaw)],r=[-f[1],f[0]];window.__shotCam=[q.x+f[0]*6+r[0]*6,6,q.z+f[1]*6+r[1]*6,q.x-f[0]*14,q.z-f[1]*14]});
  await shot('queue.jpg');
  /* 4. a pushed car with dents */
  await p.evaluate(()=>{const H=window.__ht,T=__TC,O=H.ow;T.clear();T.inVan();const e=T.cv();H.repairCar(e,'full');const E=T.edges.filter(e=>e.l>=70)[1];const q=T.lanePt(E.a,E.b,10);T.place(q.x,q.z,q.yaw);
    const t=O.trafficAdd({a:E.a,b:E.b,at:40,spd:0,max:.01,type:'sedan',color:'#b9c0c7'});H.step(3);T.keysOff();H.keys.w=true;H.keys.shift=true;for(let i=0;i<200;i++){H.step(1);if(O.trafficLog().some(x=>x.ev==='hit'&&x.id===t.id&&x.dmg>0)){break}}
    T.keysOff();H.keys.s=true;H.step(25);H.keys.s=false;const f=[-Math.sin(t.c.yaw),-Math.cos(t.c.yaw)],r=[-f[1],f[0]];window.__shotCam=[t.c.x-f[0]*5.5+r[0]*4.5,2.4,t.c.z-f[1]*5.5+r[1]*4.5,t.c.x-f[0]*1.5,t.c.z-f[1]*1.5]});
  await shot('pushed-dented.jpg');
  await p.evaluate(()=>{window.__shotCam=null})}

ok(errs.length===0,'no page errors'+(errs.length?' '+errs.slice(0,3).join(' | '):''));
log(fails?fails+' FAILED':'all traffic checks passed');
if(WRITE){fs.mkdirSync(DIR,{recursive:true});fs.writeFileSync(path.join(DIR,'evidence.txt'),'node dev/traffic-check.js'+(QUICK?' --quick':'')+'\n'+out.join('\n')+'\n')}
await b.close();process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
