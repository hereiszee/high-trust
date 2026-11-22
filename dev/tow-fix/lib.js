/* shared setup for the Hitch Happens fix checks (dev/tow-fix/*.js): opens the game, unlocks and starts the tow job,
   runs the job's own bot only through the lot (Sal fits the hitch, the drive, talking past the attendants) and hands over
   at the open gate. Everything after that is driven by the caller with REAL keyboard events (page.keyboard) or a fake pad,
   with window.__ht.step() advancing the simulation. */
const {open}=require('../ai-ingame-lib.js');
async function startTow(o={}){const {b,p,errs}=await open(o);const ev=(f,a)=>p.evaluate(f,a);
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  await p.evaluate(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('tow'),a=H.jobs.api,s=a.SV();
    for(const d of j.def.unlock.done){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true;if(s&&window.HT.Save.jobRec)window.HT.Save.jobRec(s,d).done=true}
    H.prog.trustR=Math.max(H.prog.trustR||0,25);j.test.give(a);try{const sv=H.save;if(sv&&sv.flags){sv.flags.act2Intro=true;sv.flags.act3Intro=true}}catch(_){}});
  await p.evaluate(async()=>{const H=window.__ht,pm=window.HT&&HT.People;if(!pm||!pm.ok||!pm.preload)return;await Promise.race([pm.preload(H.jobs.castKeys('tow')).catch(()=>{}),new Promise(r=>setTimeout(r,25000))])});
  await ev(()=>{const H=window.__ht;H.enterHub();H.step(2);H.jobs.start('tow');H.step(2)});
  await p.evaluate(async()=>{const H=window.__ht;const w=H.jobs.castWait;if(w)await w;H.step(2)});
  /* the job's bot up to the open gate (that part is not what this fix is about) */
  const r=await ev(()=>{const H=window.__ht,a=H.jobs.api,j=H.jobs.registry.get('tow');let t=0;for(;t<9000;t++){const M=H.M;if(!M||M.state!=='go')break;if(M.ph==='tow'&&M.gate&&M.gate.open>.95&&H.CV)break;j.test.step(a,t,{fast:true});H.P.hp=Math.max(H.P.hp,60);H.step(1)}
    for(const x of['w','a','s','d','e',' '])H.keys[x]=false;const S=window.HT.Tow.S;S.eT=0;if(S.holdO)S.holdO.prog=0;H.step(2);return{t,mode:H.mode,ph:H.M&&H.M.ph,cv:!!H.CV,state:H.M&&H.M.state}});
  return{b,p,errs,ev,r}}
module.exports={startTow};
/* ---- real-key driving: page.keyboard down/up, the sim advanced by __ht.step ---- */
function driver(p){const down=new Set();
  const set=async want=>{for(const k of['w','a','s','d',' ','e']){const on=!!want[k],name=k===' '?'Space':k;if(on&&!down.has(k)){await p.keyboard.down(name);down.add(k)}else if(!on&&down.has(k)){await p.keyboard.up(name);down.delete(k)}}};
  const st=()=>p.evaluate(()=>{const H=window.__ht,a=H.jobs.api,e=H.CV,c=e&&(e.car||e),Tw=window.HT.Tow,k=Tw.link,cd=Tw.S.cand;const R=v=>Math.round(v*1000)/1000;
    return{t:H.M&&H.M.elapsed,cv:!!e,x:e&&R(c.x),z:e&&R(c.z),yaw:e&&R(c.yaw),spd:e&&R(c.spd),steer:e&&R(c.steer||0),len:e&&a.carSize(e).l,
      link:k?{ref:k.ref.o?k.ref.o.id:'x',x:R(k.ref.pos.x),z:R(k.ref.pos.z),yaw:R(k.ref.yaw),rel:R(k.rel||0),t:R(k.t)}:null,
      cand:cd?{id:cd.b.ref.o&&cd.b.ref.o.id,ok:cd.chk.ok,d:R(cd.chk.d),rel:R(cd.chk.rel),why:cd.chk.why,ahead:R(cd.chk.ahead)}:null,
      keys:Object.keys(H.keys).filter(x=>H.keys[x]),ph:H.M&&H.M.ph,state:H.M&&H.M.state,mode:H.mode}});
  const step=n=>p.evaluate(n=>{const H=window.__ht;H.P.hp=Math.max(H.P.hp,60);H.step(n)},n);
  return{set,st,step,down}}
module.exports.driver=driver;
/* page-side helpers: contacts (which static colliders the truck's / towed car's collision probes are touching), teleport, clear cars */
async function helpers(p){await p.evaluate(()=>{const H=window.__ht,a=H.jobs.api;const T=window.__TF={};
  const kind=c=>{const L=H.L,M=H.M;if(M&&M.cars&&M.cars.some(e=>e.col===c))return'impound:'+M.cars.find(e=>e.col===c).o.id;if((L.cars||[]).some(e=>e.col===c))return'parked';if(M&&M.gate&&c===M.gate.col)return'gate';if(M&&c===M.deskCol)return'desk';return c.k||'job-fence'};
  const dist=(px,pz,c)=>{if(c.ob){const b=c.ob,dx=px-b.x,dz=pz-b.z,u=dx*b.fx+dz*b.fz,v=-dx*b.fz+dz*b.fx,qu=u-Math.max(-b.hl,Math.min(b.hl,u)),qv=v-Math.max(-b.hw,Math.min(b.hw,v));return Math.hypot(qu,qv)}
    const qx=px-Math.max(c.x0,Math.min(c.x1,px)),qz=pz-Math.max(c.z0,Math.min(c.z1,pz));return Math.hypot(qx,qz)};
  T.dist=dist;T.kind=kind;
  T.touch=(x,z,yaw,len,r,skip,eps)=>{const out=[],f=[-Math.sin(yaw),-Math.cos(yaw)];for(const s of[1,-1]){const px=x+f[0]*len/3*s,pz=z+f[1]*len/3*s;for(const c of H.L.colliders){if(c.x0<-1e3||c===skip)continue;if(c.x1<px-r-1||c.x0>px+r+1||c.z1<pz-r-1||c.z0>pz+r+1)continue;const d=dist(px,pz,c);if(d<r+(eps||.03))out.push(kind(c)+'@'+Math.round((c.x0+c.x1)/2*10)/10+','+Math.round((c.z0+c.z1)/2*10)/10)}}return[...new Set(out)]};
  T.contacts=()=>{const e=H.CV;if(!e)return{};const c=e.car,S=c.stats,Tw=window.HT.Tow,k=Tw.link,r={truck:T.touch(c.x,c.z,c.yaw,S.len,S.wid/2+.05,null)};
    if(k){const t=k.ref;r.towed=T.touch(t.pos.x,t.pos.z,t.yaw,k.len,k.wid/2+.05,t.col)}return r};
  T.place=(x,z,yaw)=>{const e=H.CV,c=e.car;c.x=x;c.z=z;c.yaw=yaw;c.spd=0;c.steer=0;e.pos.set(x,0,z);e.yaw=yaw;e.spd=0;a.syncCar(e);const k=window.HT.Tow.link;if(k){const Tw=window.HT.Tow,C=Tw.centreFrom(Tw.hitchPoint({x,z,yaw,len:a.carSize(e).l}),yaw,k.len);k.ref.pos.x=C.x;k.ref.pos.z=C.z;k.ref.yaw=yaw;k.psi=yaw;k.w=0;k.H0=null;k.Cp=null;k.vt=0;a.syncCar(k.ref)}};
  /* a car already delivered (for testing the second row on its own): to its owner's curb */
  T.home=id=>{const M=H.M,e=M.cars.find(x=>x.o.id===id),ow=M.owners[e.i];e.st='done';e.pos.set(ow.curb.x,0,ow.curb.z);e.yaw=ow.curb.yaw;a.syncCar(e);if(e.boot&&e.boot.parent)e.boot.parent.remove(e.boot)};
  T.hitch=id=>{const M=H.M,e=M.cars.find(x=>x.o.id===id);window.HT.Tow.attach(H.CV,e,{instant:true});return!!window.HT.Tow.link};
  T.noTraffic=()=>{try{const O=window.HT.OpenWorld;const l=O.trafficLive?O.trafficLive():[];for(const t of l){t.c.x=t.c.z=-5000}}catch(_){}}})}
module.exports.helpers=helpers;
