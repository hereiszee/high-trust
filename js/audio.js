/* High Trust: audio engine.
   Everything is synthesized: short sounds are rendered once into AudioBuffers with small JS DSP
   routines (cheap to replay), continuous sounds (engine, music, ambience beds) run live in WebAudio.
   Public API lives on window.HT.Audio. See dev/audio.html for a button for every sound. */
(function(){
'use strict';
const HT=window.HT=window.HT||{};
if(HT.Audio&&HT.Audio._ver)return;

/* ---------------------------------------------------------------- utilities */
const clamp=(v,a,b)=>v<a?a:v>b?b:v, TAU=Math.PI*2;
const mtof=m=>440*Math.pow(2,(m-69)/12);
const rr=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.random()*a.length|0];
function RNG(seed){let s=(seed>>>0)||0x9e3779b9;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}}
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function pw(pts){return t=>{if(t<=pts[0][0])return pts[0][1];for(let i=1;i<pts.length;i++)if(t<=pts[i][0]){const a=pts[i-1],b=pts[i];return a[1]+(b[1]-a[1])*(t-a[0])/((b[0]-a[0])||1)}return pts[pts.length-1][1]}}

let ctx=null,SR=48000,live=false,timer=null;
const N={};                       // graph nodes
const S={indoor:false,vol:{master:.9,sfx:1,music:.5,ambience:.75},L:{x:0,y:1.6,z:0,yaw:0}};
let CACHE=new Map();
const cached=(k,fn)=>{let b=CACHE.get(k);if(!b){b=fn();CACHE.set(k,b)}return b};
/* pick a random variant index, preferring ones already rendered so a shot never waits on synthesis */
const ready=(prefix,n)=>{const v=Math.random()*n|0;if(CACHE.has(prefix+v))return v;for(let i=0;i<n;i++)if(CACHE.has(prefix+i))return i;return v};
/* render low-passed material at a reduced rate (half the CPU; playback resamples) */
const lowSR=fn=>{const s=SR;SR=Math.min(s,24000);try{return fn()}finally{SR=s}};

/* ---------------------------------------------------------------- offline DSP (Float32Array) */
const D={
  n:s=>Math.max(1,Math.round(s*SR)),
  arr:s=>new Float32Array(D.n(s)),
  white(s,r){const a=D.arr(s);for(let i=0;i<a.length;i++)a[i]=r()*2-1;return a},
  pink(s,r){const a=D.arr(s);let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;for(let i=0;i<a.length;i++){const w=r()*2-1;b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;a[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11;b6=w*.115926}return a},
  brown(s,r){const a=D.arr(s);let l=0;for(let i=0;i<a.length;i++){l=(l+.02*(r()*2-1))/1.02;a[i]=l*3.5}return a},
  /* state-variable filter (TPT), cutoff may be a function of time; bp is unity gain at centre */
  filt(x,mode,f,Q=.707){const k=1/Q,fn=typeof f==='function',m=mode==='lp'?0:mode==='bp'?1:2;let ic1=0,ic2=0,a1=0,a2=0,a3=0;
    const set=fc=>{fc=clamp(fc,8,SR*.45);const g=Math.tan(Math.PI*fc/SR);a1=1/(1+g*(g+k));a2=g*a1;a3=g*a2};if(!fn)set(f);
    for(let i=0;i<x.length;i++){if(fn&&(i&15)===0)set(f(i/SR));const v0=x[i],v3=v0-ic2,v1=a1*ic1+a2*v3,v2=ic2+a2*ic1+a3*v3;ic1=2*v1-ic1;ic2=2*v2-ic2;x[i]=m===0?v2:m===1?v1*k:v0-k*v1-v2}return x},
  env(x,att,tau,hold=0){for(let i=0;i<x.length;i++){const t=i/SR;x[i]*=t<att?t/att:t<att+hold?1:Math.exp(-(t-att-hold)/tau)}return x},
  env2(x,att,t1,t2,mix){for(let i=0;i<x.length;i++){const t=i/SR;x[i]*=t<att?t/att:(1-mix)*Math.exp(-(t-att)/t1)+mix*Math.exp(-(t-att)/t2)}return x},
  osc(s,f,wave='sine',ph=0){const a=D.arr(s),fn=typeof f==='function';let p=ph;for(let i=0;i<a.length;i++){p+=(fn?f(i/SR):f)/SR;p-=Math.floor(p);
    a[i]=wave==='sine'?Math.sin(TAU*p):wave==='tri'?(p<.5?4*p-1:3-4*p):wave==='square'?(p<.5?1:-1):2*p-1}return a},
  glide:(f0,f1,tau)=>t=>f1+(f0-f1)*Math.exp(-t/tau),
  modes(s,parts,r){const a=D.arr(s);for(const [f,amp,tau] of parts){if(f>=SR*.45)continue;const ph=r?r()*TAU:0,w=TAU*f/SR,k=Math.exp(-1/(tau*SR));let e=amp;for(let i=0;i<a.length&&e>1e-5;i++){a[i]+=Math.sin(w*i+ph)*e;e*=k}}return a},
  add(dst,src,at=0,g=1){const o=Math.round(at*SR),n=Math.min(src.length,dst.length-o);for(let i=Math.max(0,-o);i<n;i++)dst[i+o]+=src[i]*g;return dst},
  peak(x){let m=0;for(let i=0;i<x.length;i++){const v=x[i]<0?-x[i]:x[i];if(v>m)m=v}return m},
  norm(x,p=1){const m=D.peak(x);if(m>0){const k=p/m;for(let i=0;i<x.length;i++)x[i]*=k}return x},
  sat(x,d){const k=Math.tanh(d);for(let i=0;i<x.length;i++)x[i]=Math.tanh(x[i]*d)/k;return x},
  fade(x,s=.005){const n=Math.min(x.length,D.n(s));for(let i=0;i<n;i++)x[x.length-1-i]*=i/n;return x},
  mul(x,fn){for(let i=0;i<x.length;i++)x[i]*=fn(i/SR);return x},
  trim(x,th=2e-4){const p=D.peak(x)*th;let e=x.length-1;while(e>0&&Math.abs(x[e])<p)e--;return D.fade(x.slice(0,Math.min(x.length,e+64)),.004)},
  buf(chs){const b=ctx.createBuffer(chs.length,chs[0].length,SR);chs.forEach((c,i)=>b.getChannelData(i).set(c));return b},
  normAll(chs,p){let m=0;for(const c of chs)m=Math.max(m,D.peak(c));if(m>0)for(const c of chs)for(let i=0;i<c.length;i++)c[i]*=p/m;return chs},
  loop(gen,sec){const xf=.5,a=gen(sec+xf),n=D.n(sec),m=D.n(xf),o=a.slice(0,n);for(let i=0;i<m;i++){const w=i/m;o[i]=a[i]*Math.sqrt(w)+a[n+i]*Math.sqrt(1-w)}return o},
};
/* small sound-design primitives, written into an existing array */
function clk(x,at,hz,a,tau,r,ring){const n=D.white(tau*8+.004,r);D.filt(n,'bp',hz,1.4);D.env(n,.0002,tau);D.add(x,D.norm(n),at,a);
  if(ring)D.add(x,D.modes(.12,[[hz*.61,.5,.022],[hz*1.37,.35,.014],[hz*2.11,.2,.008]],r),at,a*ring)}
function slide(x,at,dur,f0,f1,a,r){const n=D.white(dur+.01,r);D.filt(n,'bp',t=>f0+(f1-f0)*Math.min(1,t/dur),2.5);const fr=60+r()*80;
  D.mul(n,t=>t<dur?Math.sin(Math.PI*t/dur)*(.6+.4*Math.sin(TAU*fr*t)):0);D.add(x,D.norm(n),at,a)}
function thock(x,at,hz,a,tau,r){const n=D.white(tau*8,r);D.filt(n,'bp',hz,3);D.env(n,.0005,tau);D.add(x,D.norm(n),at,a);D.add(x,D.env(D.osc(tau*6,hz*.5),.0005,tau),at,a*.5)}
function tink(x,at,a,r,sc=1){D.add(x,D.modes(.12,[[3900*sc*(1+(r()-.5)*.08),1,.022],[5900*sc,.6,.016],[8100*sc,.35,.01],[2650*sc,.25,.03]],r),at,a)}
function rustle(x,at,dur,a,r){const n=D.pink(dur,r);D.filt(n,'bp',1800,.6);let g=0;D.mul(n,t=>{if(r()<.004)g=.3+r()*.7;g*=.9995;return g*Math.sin(Math.PI*t/dur)});D.add(x,D.norm(n),at,a)}
function grains(x,at,dur,count,f0,f1,a,r,tau=.0015){for(let k=0;k<count;k++){const g=D.white(tau*8,r);D.filt(g,'bp',f0+r()*(f1-f0),1.5);D.env(g,.0002,tau);D.add(x,D.norm(g),at+Math.pow(r(),1.6)*dur,a*(.3+r()*.7)*(1-k/count*.5))}}
const satCurve=(()=>{const m={};return d=>{if(m[d])return m[d];const c=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/511.5-1;c[i]=Math.tanh(x*d)/Math.tanh(d)}return m[d]=c}})();

/* ---------------------------------------------------------------- graph */
const G=(v=1)=>{const g=ctx.createGain();g.gain.value=v;return g};
const BQ=(type,f,Q=.707)=>{const b=ctx.createBiquadFilter();b.type=type;b.frequency.value=f;b.Q.value=Q;return b};
const OSC=(type,f)=>{const o=ctx.createOscillator();o.type=type;o.frequency.value=f;return o};
const PAN=v=>{if(!ctx.createStereoPanner)return G(1);const p=ctx.createStereoPanner();p.pan.value=clamp(v,-1,1);return p};
function makeIR(kind){const r=RNG(hash('ir'+kind));const len={room:.75,out:2.6,plate:1.7}[kind];
  const chs=[0,1].map(()=>{const x=D.white(len,r);
    if(kind==='room'){D.filt(x,'lp',t=>7000*Math.exp(-t/.25)+500,.6);D.env(x,.001,.13);for(let k=0;k<10;k++){const at=.003+r()*.045;D.add(x,new Float32Array([1,-.6,.3]),at,(r()-.5)*2.4*(1-at*12))}}
    else if(kind==='out'){D.filt(x,'lp',t=>4200*Math.exp(-t/.9)+250,.6);D.env(x,.03,.5);for(let i=0;i<D.n(.012);i++)x[i]=0;
      for(let k=0;k<7;k++){const at=.05+r()*.5,b=D.white(.04,r);D.filt(b,'lp',2500-at*2000,.7);D.env(b,.002,.012);D.add(x,b,at,.8*(1-at))}}
    else{D.filt(x,'lp',t=>9000*Math.exp(-t/.6)+800,.5);D.env(x,.004,.33)}
    return D.fade(x,.05)});
  let e=0;for(const c of chs){let s=0;for(let i=0;i<c.length;i++)s+=c[i]*c[i];e=Math.max(e,s)}const k=1/Math.sqrt(e||1);for(const c of chs)for(let i=0;i<c.length;i++)c[i]*=k;
  return D.buf(chs)}
function build(){
  N.master=G(S.vol.master);N.comp=ctx.createDynamicsCompressor();
  const c=N.comp;c.threshold.value=-16;c.knee.value=8;c.ratio.value=3.5;c.attack.value=.004;c.release.value=.22;
  N.lim=ctx.createDynamicsCompressor();const l=N.lim;l.threshold.value=-3;l.knee.value=0;l.ratio.value=20;l.attack.value=.001;l.release.value=.09;
  N.clip=ctx.createWaveShaper();const cc=new Float32Array(2048);for(let i=0;i<2048;i++){const x=i/1023.5-1,a=Math.abs(x);cc[i]=Math.sign(x)*(a<.75?a:.75+.23*Math.tanh((a-.75)/.23))}N.clip.curve=cc;
  if(S.bypass){N.master.connect(N.clip)}else{N.master.connect(N.comp);N.comp.connect(N.lim);N.lim.connect(N.clip)}N.clip.connect(ctx.destination);
  N.sfx=G(S.vol.sfx);N.sfx.connect(N.master);N.ui=G(.9);N.ui.connect(N.sfx);
  N.duck=G(1);N.duck.connect(N.master);
  N.music=G(S.vol.music);N.music.connect(N.duck);N.musIn=G(.22);N.musIn.connect(N.music);N.sting=G(.35);N.sting.connect(N.ui);
  N.amb=G(S.vol.ambience);N.amb.connect(N.duck);
  const conv=(kind,dst,ret)=>{const cv=ctx.createConvolver();cv.normalize=false;cv.buffer=cached('ir:'+kind,()=>makeIR(kind));const i=G(1),o=G(ret);i.connect(cv);cv.connect(o);o.connect(dst);return i};
  N.roomIn=conv('room',N.sfx,1);N.outIn=conv('out',N.sfx,1);N.ambVerb=conv('out',N.amb,1);
  const ms=G(.25);N.musIn.connect(ms);ms.connect(conv('plate',N.music,1));
  N.out=N.clip;
}

/* ---------------------------------------------------------------- spatial + voices */
function spatial(pos,o={}){
  if(!pos)return{player:true,d:0,pan:0,delay:0,lp:20000};
  const L=S.L,dx=pos.x-L.x,dz=pos.z-L.z,dy=(pos.y==null?L.y:pos.y)-L.y,d=Math.hypot(dx,dy,dz),hd=Math.hypot(dx,dz)||1;
  const side=(dx*Math.cos(L.yaw)-dz*Math.sin(L.yaw))/hd, front=(-dx*Math.sin(L.yaw)-dz*Math.cos(L.yaw))/hd;
  let lp=clamp(19000*Math.exp(-d/34),550,19000);if(front<-.2)lp*=.75;if(o.muffled)lp=Math.min(lp,900);
  return{player:false,d,pan:side*clamp(d/2.5,0,1)*.85,delay:Math.min(.4,d/343),lp}}
const VO=[];let MAXV=40;
function chain(o){
  const now=ctx.currentTime;for(let i=VO.length-1;i>=0;i--)if(VO[i].end<now)VO.splice(i,1);
  const pr=o.prio||1;
  if(VO.length>=MAXV){let w=-1;for(let i=0;i<VO.length;i++){const v=VO[i];if(v.prio<=pr&&(w<0||v.prio<VO[w].prio||(v.prio===VO[w].prio&&v.start<VO[w].start)))w=i}
    if(w<0)return null;kill(VO[w]);VO.splice(w,1)}
  const g=G(o.gain==null?1:o.gain),nodes=[g];let last=g;
  if(o.hp){const f=BQ('highpass',o.hp,.7);last.connect(f);last=f;nodes.push(f)}
  if(o.lp&&o.lp<16000){const f=BQ('lowpass',o.lp,.6);last.connect(f);last=f;nodes.push(f)}
  if(o.pan){const p=PAN(o.pan);last.connect(p);last=p;nodes.push(p)}
  last.connect(o.bus||N.sfx);
  for(const [k,dst] of [['room',N.roomIn],['out',N.outIn],['amb',N.ambVerb]])if(o[k]>.001){const s=G(o[k]);last.connect(s);s.connect(dst);nodes.push(s)}
  const v={g,nodes,srcs:[],start:o.t,end:o.t+.05,prio:pr,n:0};VO.push(v);return v}
function kill(v){const t=ctx.currentTime;try{v.g.gain.cancelScheduledValues(t);v.g.gain.setTargetAtTime(0,t,.012);for(const s of v.srcs)s.stop(t+.06)}catch(e){}}
function src(v,buf,t,gain=1,rate=1){const s=ctx.createBufferSource();s.buffer=buf;s.playbackRate.value=rate;let n=s;
  if(gain!==1){n=G(gain);s.connect(n)}n.connect(v.g);const st=Math.max(t,ctx.currentTime);s.start(st);v.srcs.push(s);v.n++;
  const e=st+buf.duration/rate;if(e>v.end)v.end=e;
  s.onended=()=>{try{s.disconnect();if(n!==s)n.disconnect()}catch(e){}if(--v.n<=0)for(const x of v.nodes)try{x.disconnect()}catch(e){}};return s}
/* play a buffer, optionally positioned. o:{pos,gain,rate,lp,hp,prio,bus,room,out,delay,muffled,ref} */
function play(buf,o={}){
  if(!ctx||!buf)return null;const sp=spatial(o.pos,o);const ref=o.ref||4;
  const att=sp.player?1:Math.min(1,ref/Math.max(ref,sp.d));if(!sp.player&&att<.012)return null;
  const t=ctx.currentTime+.004+(o.delay||0)+sp.delay;
  const indoor=o.indoor!=null?o.indoor:S.indoor;
  const v=chain({t,pan:sp.pan+(o.pan||0),lp:Math.min(sp.lp,o.lp||20000),hp:o.hp,prio:o.prio||(sp.player?3:1),bus:o.bus,
    room:o.room!=null?o.room:(indoor?.18:0),out:o.out!=null?o.out:(indoor?0:.06*Math.min(1,sp.d/10+.3)),amb:o.amb});
  if(!v)return null;src(v,buf,t,(o.gain==null?1:o.gain)*att,o.rate||1);return v}

/* ---------------------------------------------------------------- guns */
/* crack [bpHz,Q,tau,amp]  body [lpHz,tau,amp,slowMix]  thump [wave,f0,f1,glide,tau,amp]
   ring [[hz,amp,tau]]  sub [amp,tau]  tail [outdoorLen,amp,lpHz]  tin indoor tail amp  nw supersonic N-wave
   cyc follow-up mechanics [[action,delay]]  len close-layer length */
const GUNS={
  pistol:{crack:[2700,1.1,.0035,.85],body:[2200,.028,.9,.15],thump:['sine',170,55,.02,.04,.4],ring:[[2150,.05,.018],[3600,.03,.012]],drive:1.6,sub:[.35,.05],tail:[1.4,.3,1500],tin:.42,len:.42},
  revolver:{crack:[2500,.9,.005,1],body:[1700,.06,1,.25],thump:['sine',115,36,.03,.09,1],ring:[[1350,.13,.05],[2870,.09,.04],[4310,.05,.03]],drive:2.2,sub:[1,.09],tail:[2.2,.5,1100],tin:.58,len:.6,cyc:[['hammer',.38]]},
  nailer:{crack:[6500,3,.0015,.5],body:[4200,.01,.35,0],thump:['square',230,170,.01,.018,.25],ring:[[1180,.35,.04],[2630,.25,.03],[5100,.15,.02]],drive:1.1,sub:[.12,.03],tail:[.35,.06,2500],tin:.12,len:.26,
    extra:(x,r)=>{clk(x,.012,2200,.5,.004,r,.4);const h=D.white(.16,r);D.filt(h,'hp',5500,.7);D.env(h,.004,.035);D.add(x,D.norm(h),.028,.35)}},
  shotgun:{crack:[1900,.7,.007,1],body:[950,.09,1.2,.35],thump:['sine',95,34,.03,.11,1.1],drive:2.6,sub:[1.2,.12],tail:[2.4,.65,850],tin:.72,len:.8,cyc:[['pump',.32]]},
  double:{crack:[1500,.6,.009,1],body:[750,.13,1.25,.4],thump:['sine',72,27,.04,.15,1.25],drive:3,sub:[1.4,.15],tail:[2.8,.8,700],tin:.85,len:1},
  beanbag:{crack:[1300,1,.005,.45],body:[650,.06,1,.2],thump:['sine',125,58,.02,.06,1],ring:[[190,.5,.05],[410,.2,.03]],drive:1.3,sub:[.7,.07],tail:[1.1,.28,700],tin:.4,len:.5,cyc:[['pump',.34]]},
  rifle:{nw:1.5,nwl:.0008,crack:[4800,1.3,.003,1.25],body:[3000,.022,.6,.12],thump:['sine',150,42,.015,.035,.42],ring:[[2650,.05,.01],[5200,.04,.006]],drive:1.7,sub:[.4,.05],tail:[1.9,.45,1700],tin:.45,len:.4},
  smg:{crack:[4300,1.6,.002,.75],body:[3600,.016,.6,.08],thump:['tri',185,65,.012,.025,.35],ring:[[3100,.08,.008],[1650,.06,.01]],drive:1.5,sub:[.25,.035],tail:[1,.25,1900],tin:.3,len:.3,
    extra:(x,r)=>clk(x,.011,2900,.35,.003,r,.5)},
  hunter:{nw:1.4,nwl:.001,crack:[5200,2,.0025,1],body:[2100,.045,.9,.3],thump:['sine',105,30,.03,.08,.95],drive:2.3,sub:[1.1,.1],tail:[3.2,.85,950],tin:.72,len:.7,cyc:[['bolt',.45]]},
  flare:{crack:[1100,1,.004,.35],body:[520,.06,.9,.2],thump:['sine',210,75,.03,.06,.8],drive:1.2,sub:[.5,.06],tail:[1.2,.25,800],tin:.35,len:1.1,
    extra:(x,r)=>{const f=D.white(1,r);D.filt(f,'bp',t=>2400+1600*t,2);D.mul(f,t=>Math.min(1,t/.05)*Math.exp(-t/.35)*(.7+.3*Math.sin(TAU*31*t)));D.add(x,D.norm(f),.02,.35);
      const w=D.osc(.9,t=>1700+900*t);D.env(w,.03,.3);D.add(x,w,.02,.1)}},
};
const GUN_ALIAS={hunting:'hunter',sawedoff:'double',sawed:'double',carbine:'rifle',nail:'nailer',nailgun:'nailer',flaregun:'flare',enemy:'pistol',talkingto:'beanbag'};
const gid=t=>GUNS[t]?t:GUNS[GUN_ALIAS[t]]?GUN_ALIAS[t]:'pistol';
function gunClose(id,v){return cached('gc:'+id+':'+v,()=>{
  const g=GUNS[id],r=RNG(hash(id)+v*7919),x=D.arr(g.len||.6),jit=1+(r()-.5)*.08;
  if(g.nw){const n=D.n(g.nwl||.0005),w=new Float32Array(n+2);for(let i=0;i<n;i++)w[i]=1-2*i/n;D.add(x,w,0,g.nw)}
  {const [hz,q,tau,amp]=g.crack,c=D.white(tau*10+.004,r);D.filt(c,'bp',hz*jit,q);D.filt(c,'hp',hz*.35,.7);D.env(c,.0002,tau);D.add(x,D.norm(c),0,amp)}
  {const [lp,tau,amp,slow]=g.body,b=D.white(Math.min(g.len||.6,tau*9+.06),r);D.filt(b,'lp',t=>lp*jit*(.3+.7*Math.exp(-t/(tau*1.6))),.8);D.env2(b,.0006,tau,tau*4,slow);D.add(x,D.norm(b),0,amp)}
  {const [w,f0,f1,gl,tau,amp]=g.thump,o=D.osc(tau*7+.02,D.glide(f0*jit,f1,gl),w);D.env(o,.0008,tau);if(w!=='sine')D.filt(o,'lp',f0*3,.7);D.add(x,D.norm(o),0,amp)}
  if(g.ring)D.add(x,D.modes(.25,g.ring.map(([f,a,t])=>[f*(1+(r()-.5)*.03),a,t]),r),.0005,1);
  if(g.extra)g.extra(x,r);
  {const k=D.n(.0045+r()*.002);for(let i=x.length-1;i>=k;i--)x[i]+=x[i-k]*.28}  // ground bounce
  D.sat(x,g.drive);D.fade(x,Math.min(.12,(g.len||.6)*.25));return D.buf([D.norm(x,.95)])})}
function gunSub(id){return cached('gs:'+id,()=>{const [,tau]=GUNS[id].sub,o=D.osc(tau*7+.03,D.glide(95,44,.025));D.env(o,.003,tau);D.sat(o,1.5);return D.buf([D.norm(o,.95)])})}
function gunTailOut(id,v){return cached('gto:'+id+':'+v,()=>lowSR(()=>{
  const [len,,lp]=GUNS[id].tail,r=RNG(hash(id)*3+v*104729);
  const chs=[0,1].map(()=>{const x=D.arr(len+.25);let t=.05+r()*.06;
    while(t<len*.85){const a=Math.exp(-t/(len*.33))*(.45+.55*r()),w=.006+t*.03,b=D.white(w*6+.02,r);
      D.filt(b,'lp',lp*Math.exp(-t/len*1.3),.7);D.filt(b,'hp',90,.7);D.env(b,w*.4,w);D.add(x,D.norm(b),t,a);t+=.07+r()*.22*(1+t)}
    const d=D.brown(len+.25,r),rate=1.5+r()*2,ph=r()*6;D.filt(d,'lp',t=>lp*.5*Math.exp(-t/len)+60,.7);
    D.mul(d,t=>(t<.08?t/.08:Math.exp(-(t-.08)/(len*.3)))*(.65+.35*Math.sin(TAU*rate*t+ph)));D.add(x,D.norm(d),0,.5);return D.fade(x,.12)});
  return D.buf(D.normAll(chs,.9))}))}
function gunTailIn(id,v){return cached('gti:'+id+':'+v,()=>lowSR(()=>{
  const g=GUNS[id],r=RNG(hash(id)*5+v*15485863),L=.32+g.tin*.5;
  const chs=[0,1].map(()=>{const x=D.arr(L);let a=.8;
    for(const at of [.009,.017,.026,.038,.052,.071]){const b=D.white(.03,r);D.filt(b,'bp',1800,.8);D.env(b,.0003,.006);D.add(x,D.norm(b),at*(.85+r()*.3),a);a*=.72}
    const dn=D.white(L,r);D.filt(dn,'bp',t=>2200*Math.exp(-t/.25)+300,.6);D.env(dn,.004,.07+.11*g.tin);D.norm(dn);
    const bx=dn.slice();D.filt(bx,'bp',210,4);D.add(x,dn,.008,.6);D.add(x,D.norm(bx),.008,.25);return D.fade(x,.05)});
  return D.buf(D.normAll(chs,.9))}))}
const pfft=()=>cached('pfft',()=>{const r=RNG(77),x=D.white(.09,r);D.filt(x,'bp',1400,.9);D.env(x,.002,.016);const c=D.arr(.09);clk(c,0,3000,.4,.002,r,.3);D.add(x,D.norm(c),0,.5);return D.buf([D.norm(x,.9)])});

function gun(type,o={}){
  if(!ctx)return;const id=gid(type),g=GUNS[id],sp=spatial(o.pos,o),player=sp.player;
  const indoor=o.indoor!=null?!!o.indoor:S.indoor,sup=!!o.suppressed,vol=o.vol==null?1:o.vol;
  if(!player&&sp.d>(o.range||220))return;
  const att=player?1:Math.min(1,5/Math.max(5,sp.d)),tatt=player?1:Math.pow(Math.min(1,14/Math.max(14,sp.d)),.6);
  const t=ctx.currentTime+.004+sp.delay;
  let lp=sp.lp;if(sup)lp=Math.min(lp,2600);
  const v=chain({t,pan:sp.pan,lp,prio:player?6:2,room:indoor?.3*Math.max(att,.25):0,out:indoor?0:(player?.06:.1*tatt)});if(!v)return;
  v.g.gain.value=vol;
  const rate=(o.rate||1)*(1+(Math.random()-.5)*.05)*(sup?.93:1);
  src(v,gunClose(id,o.variant!=null?o.variant%3:ready('gc:'+id+':',3)),t,(sup?.28:1)*att*.62,rate);
  if(sup)src(v,pfft(),t,.6*Math.max(att,.15),rate);
  if(player)src(v,gunSub(id),t,g.sub[0]*(sup?.4:1)*.36);
  const tail=indoor?gunTailIn(id,ready('gti:'+id+':',2)):gunTailOut(id,ready('gto:'+id+':',2));
  src(v,tail,t+(indoor?0:.012),(indoor?g.tin:g.tail[1])*tatt*(sup?.3:1)*(player?.42:.6),1+(Math.random()-.5)*.04);
  if(o.cycle!==false&&g.cyc&&(player||sp.d<30))for(const [a,dl] of g.cyc)mech(id,a,{pos:o.pos,delay:dl,vol:.5*att});
  if(player&&!sup)duck(.35+.25*g.sub[0]);
}

/* ---------------------------------------------------------------- mechanics */
const MPS={pistol:1.1,revolver:.9,nailer:1.25,shotgun:.8,double:.75,beanbag:.88,rifle:1,smg:1.15,hunter:.85,flare:1};
const MSTYLE={pistol:'mag',rifle:'mag',smg:'mag',nailer:'tool',revolver:'cyl',shotgun:'tube',beanbag:'tube',double:'break',hunter:'bolt',flare:'break'};
function mechBuf(id,act){return cached('m:'+id+':'+act,()=>{
  const r=RNG(hash(id+act)),p=MPS[id]||1,st=MSTYLE[id]||'mag',x=D.arr(1);
  const C=(at,hz,a,tau,ring)=>clk(x,at,hz*p,a,tau,r,ring),Sl=(at,d,f0,f1,a)=>slide(x,at,d,f0*p,f1*p,a,r),T=(at,hz,a,tau)=>thock(x,at,hz*p,a,tau,r);
  switch(act){
    case 'dry':C(0,2600,1,.003,.5);if(st==='cyl')C(.004,1700,.5,.004,.3);break;
    case 'equip':rustle(x,0,.22,.5,r);C(.07,1700,.7,.006,.5);C(.16,2600,.5,.004,.4);if(st==='tool'){const b=D.osc(.06,2100);D.env(b,.002,.02);D.add(x,b,.2,.25)}break;
    case 'hammer':C(0,3000,.7,.003,.5);C(.045,2100,.8,.004,.5);break;
    case 'pump':Sl(0,.08,1300,700,.7);C(.085,1700,1,.006,.6);T(.09,500,.5,.015);Sl(.13,.07,700,1400,.6);C(.2,2300,1,.005,.8);break;
    case 'bolt':
      if(st==='bolt'){C(0,2600,.7,.004,.5);Sl(.03,.09,2400,1400,.6);C(.125,1500,.9,.006,.6);Sl(.2,.08,1400,2400,.5);C(.29,2800,1,.004,.7);C(.33,2000,.6,.005,.5)}
      else{Sl(0,.05,1500,2500,.5);C(.055,2800,1,.004,.8);T(.06,700,.4,.01)}break;
    case 'reload_out':
      if(st==='mag'){C(0,2800,.8,.004,.4);Sl(.02,.12,1700,900,.5)}
      else if(st==='tool'){T(0,600,.8,.01);C(.01,1500,.6,.006,0);Sl(.05,.12,900,600,.4)}
      else if(st==='cyl'){C(0,2200,.9,.005,.6);for(let k=0;k<6;k++)C(.05+k*.022,4200,.25,.002,.2);Sl(.22,.07,1800,1200,.4);for(let k=0;k<5;k++)tink(x,.32+k*.03+r()*.02,.3,r)}
      else if(st==='tube')C(0,2400,.5,.004,.4);
      else if(st==='break'){C(0,1500,1,.009,.9);T(.02,400,.6,.02);T(.14,900,.5,.012);T(.165,850,.5,.012)}
      else{C(0,2400,.8,.004,.6);Sl(.03,.09,2200,1300,.5);C(.13,1800,.8,.005,.5)}break;
    case 'reload_in':
      if(st==='mag'){Sl(0,.08,900,1500,.4);C(.09,2200,1,.005,.7);T(.095,800,.7,.012)}
      else if(st==='tool'){Sl(0,.08,600,900,.4);T(.09,500,1,.012);C(.1,1800,.6,.005,0);const b=D.osc(.05,2400);D.env(b,.002,.015);D.add(x,b,.2,.2)}
      else if(st==='cyl'){Sl(0,.07,1200,2000,.4);C(.075,2600,.7,.004,.5);C(.24,2000,1,.006,.9);for(let k=0;k<4;k++)C(.27+k*.02,4200,.2,.002,.2)}
      else if(st==='tube'){T(0,900,.9,.012);Sl(.012,.05,1500,2300,.35);C(.065,2400,.7,.004,.4)}
      else if(st==='break'){T(0,900,.8,.012);T(.12,880,.8,.012);C(.32,1500,1,.008,.9);T(.33,350,.6,.02)}
      else{C(0,3000,.6,.004,.4);for(let k=0;k<5;k++)C(.03+k*.03,3600,.4,.003,.3);Sl(.03,.15,1600,2400,.4);C(.22,2600,.8,.004,.5)}break;
    case 'shell':default:
      if(st==='mag'||st==='tool'){C(0,3400,.5,.003,.3);Sl(.01,.04,2000,2600,.25)}
      else{T(0,900,.9,.012);Sl(.012,.05,1500,2300,.35);C(.065,2400,.7,.004,.4)}
  }
  return D.buf([D.norm(D.trim(x),.85)])})}
function mech(type,action,o={}){if(!ctx)return;const id=gid(type);
  play(mechBuf(id,action||'dry'),{pos:o.pos,delay:o.delay,gain:.45*(o.vol==null?1:o.vol),rate:1+(Math.random()-.5)*.04,prio:o.pos?1:3,ref:2,room:o.pos?undefined:(S.indoor?.08:0),out:0})}
const SHELL_SURF={concrete:[1,1],asphalt:[.95,.9],tile:[1.1,1.2],wood:[.8,.45],metal:[1,2],grass:[.6,.15],dirt:[.6,.2],carpet:[.6,.15]};
function casingBuf(surf,plastic,v){return cached('cs:'+surf+plastic+v,()=>{
  const [br,ring]=SHELL_SURF[surf]||SHELL_SURF.concrete,r=RNG(hash(surf)+v*13+(plastic?99:0)),x=D.arr(1.1),soft=ring<.3;
  let t=.28+r()*.1,dt=.12+r()*.05,a=1;const n=soft?1:4+(r()*2|0);
  for(let k=0;k<n;k++){
    if(plastic||soft){const s=D.white(.06,r);D.filt(s,'bp',(plastic?700:400)*br*(1+r()*.2),2);D.env(s,.0005,soft?.01:.008);D.add(x,D.norm(s),t,a*(soft?.5:1));if(plastic&&!soft)D.add(x,D.modes(.08,[[1500*br,.3,.012*ring]],r),t,a)}
    else D.add(x,D.modes(.15,[[3900*br*(1+(r()-.5)*.1),1,.03*ring],[5900*br,.6,.022*ring],[8100*br,.35,.015*ring],[2650*br,.3,.04*ring]],r),t,a);
    t+=dt;dt*=.55+r()*.1;a*=.5+r()*.15}
  return D.buf([D.norm(D.trim(x),.8)])})}
function shellCasing(surface='concrete',o={}){if(!ctx)return;const id=o.type?gid(o.type):'pistol',plastic=['shotgun','double','beanbag'].includes(id);
  play(casingBuf(SHELL_SURF[surface]?surface:'concrete',plastic,Math.random()*3|0),{pos:o.pos,gain:.22*(o.vol||1),rate:1+(Math.random()-.5)*.1,pan:o.pos?0:.35,prio:1,ref:2})}

/* ---------------------------------------------------------------- impacts, whizz, footsteps */
const IMP_ALIAS={asphalt:'concrete',brick:'concrete',stone:'concrete',tile:'concrete',body:'cloth',flesh:'cloth',fabric:'cloth',sofa:'cloth',grass:'dirt',sand:'dirt',car:'metal',window:'glass'};
function impactBuf(s,v){return cached('im:'+s+v,()=>{const r=RNG(hash(s)+v*31),x=D.arr(s==='glass'?1:s==='metal'?1.7:.5);
  switch(s){
    case 'concrete':{const c=D.white(.03,r);D.filt(c,'bp',2600,.9);D.env(c,.0002,.005);D.add(x,D.norm(c),0,1);const th=D.white(.1,r);D.filt(th,'lp',420,.8);D.env(th,.001,.02);D.add(x,D.norm(th),0,.7);grains(x,.012,.3,14,2500,6500,.35,r);break}
    case 'wood':{D.add(x,D.modes(.2,[[220+r()*60,1,.04],[530+r()*60,.55,.028],[1150,.3,.014]],r),0,.9);clk(x,0,3200,.6,.003,r,0);grains(x,.006,.08,6,1500,3200,.3,r,.003);break}
    case 'metal':{const k=.9+r()*.25;D.add(x,D.modes(.8,[[1250*k,.9,.25],[2780*k,.6,.18],[4130*k,.4,.12],[6020*k,.25,.08],[830*k,.3,.3]],r),0,1);clk(x,0,4500,1,.002,r,0);break}
    case 'glass':{clk(x,0,5000,1,.004,r,0);const w=D.white(.5,r);D.filt(w,'hp',4000,.7);D.env(w,.001,.07);D.add(x,D.norm(w),0,.4);
      for(let k=0;k<45;k++){const at=.005+Math.pow(r(),1.8)*.7,f=3000+r()*7000;D.add(x,D.modes(.08,[[f,1,.01+r()*.03],[f*1.53,.5,.012]],r),at,(.15+r()*.5)*(1-at))}break}
    case 'dirt':{const th=D.white(.1,r);D.filt(th,'lp',300,.8);D.env(th,.001,.025);D.add(x,D.norm(th),0,1);const sp=D.pink(.3,r);D.filt(sp,'bp',1500,.7);D.env(sp,.004,.07);D.add(x,D.norm(sp),.005,.35);grains(x,.01,.2,8,1500,4000,.2,r);break}
    case 'beanbag':{const th=D.white(.2,r);D.filt(th,'lp',300,.9);D.env(th,.002,.05);D.add(x,D.norm(th),0,1);D.add(x,D.env(D.osc(.2,D.glide(130,60,.03)),.002,.05),0,.7);break}
    case 'cloth':default:{const th=D.white(.1,r);D.filt(th,'lp',700,.8);D.env(th,.001,.022);D.add(x,D.norm(th),0,1);D.add(x,D.env(D.osc(.15,D.glide(140,90,.02)),.002,.03),0,.5);rustle(x,.01,.12,.15,r)}
  }
  return D.buf([D.norm(D.trim(x),.9)])})}
const ricBuf=v=>cached('ric'+v,()=>{const r=RNG(500+v),f0=2600+r()*1600,x=D.osc(.45,t=>f0*(1-.35*t)+60*Math.sin(TAU*23*t));D.env(x,.004,.12);const n=D.white(.45,r);D.filt(n,'bp',t=>f0*(1-.35*t),6);D.env(n,.004,.1);D.add(x,D.norm(n),0,.5);return D.buf([D.norm(x,.6)])});
function impact(surface='concrete',pos,o={}){if(!ctx)return;let s=IMP_ALIAS[surface]||surface;if(!['concrete','wood','metal','glass','dirt','cloth','beanbag'].includes(s))s='concrete';
  play(impactBuf(s,Math.random()*4|0),{pos,gain:.5*(o.vol||1),rate:1+(Math.random()-.5)*.12,ref:3,prio:1});
  if((s==='metal'||s==='concrete')&&Math.random()<(o.ricochet==null?.15:o.ricochet))play(ricBuf(Math.random()*3|0),{pos,gain:.25,ref:4,delay:.01})}
const whizzBuf=v=>cached('wz'+v,()=>{const r=RNG(900+v),x=D.white(.4,r),c=.13;D.filt(x,'bp',t=>3200*(1+.35*Math.tanh((c-t)/.03)),3);D.mul(x,t=>Math.exp(-Math.pow((t-c)/.045,2)));
  const s=D.arr(.4);clk(s,c,4500,.7,.002,r,0);D.add(x,D.norm(s),0,.25);return D.buf([D.norm(x,.9)])});
function whizz(pos,o={}){if(!ctx)return;const sp=spatial(pos);
  play(whizzBuf(Math.random()*3|0),{gain:.35*(o.vol||1),pan:pos?sp.pan*1.2:rr(-.6,.6),rate:rr(.9,1.12),prio:4,room:0,out:.05})}

const STEP_ALIAS={sidewalk:'concrete',road:'asphalt',floor:'wood',dirt:'grass',lawn:'grass',mud:'grass',stone:'concrete'};
function stepBuf(s,v){return cached('fs:'+s+v,()=>{const r=RNG(hash(s)+v*131),x=D.arr(.35);
  const heel=(lp,a,tau=.014)=>{const h=D.white(.06,r);D.filt(h,'lp',lp,.9);D.env(h,.002,tau);D.add(x,D.norm(h),0,a)};
  switch(s){
    case 'asphalt':case 'concrete':{const b=s==='concrete'?1.25:1;heel(260*b,.8);const sc=D.white(.12,r);D.filt(sc,'bp',2600*b,.7);D.mul(sc,t=>Math.exp(-t/.03)*(.4+.6*r()));D.add(x,D.norm(sc),.004,.3);grains(x,.006,.05,5,2500,5500,.2,r);
      const to=D.white(.04,r);D.filt(to,'bp',1400*b,1.2);D.env(to,.001,.008);D.add(x,D.norm(to),.055+r()*.03,.35);break}
    case 'grass':heel(150,.45,.02);grains(x,0,.1,28,2400,6500,.35,r);{const sw=D.pink(.15,r);D.filt(sw,'bp',1600,.8);D.env(sw,.01,.04);D.add(x,D.norm(sw),0,.25)}break;
    case 'gravel':heel(220,.5);grains(x,0,.14,40,1500,4500,.4,r,.002);break;
    case 'wood':D.add(x,D.modes(.2,[[150+r()*30,1,.035],[340+r()*40,.6,.025],[720,.25,.012]],r),0,.8);clk(x,0,2500,.3,.003,r,0);
      if(r()<.25){const c=D.osc(.15,t=>380+140*t/.15+15*Math.sin(TAU*35*t),'tri');D.env(c,.02,.05);D.filt(c,'bp',900,1);D.add(x,D.norm(c),.04,.12)}break;
    case 'tile':heel(300,.5,.01);clk(x,0,3500,.8,.003,r,0);D.add(x,D.modes(.1,[[1250,.3,.02],[2900,.2,.01]],r),0,.5);break;
    case 'metal':heel(250,.5);D.add(x,D.modes(.3,[[420,.8,.08],[1130,.5,.05],[2210,.3,.03]],r),0,.6);break;
    case 'carpet':default:heel(200,.6,.018);{const sw=D.pink(.1,r);D.filt(sw,'bp',900,.8);D.env(sw,.008,.03);D.add(x,D.norm(sw),0,.2)}
  }
  return D.buf([D.norm(D.trim(x),.9)])})}
function footstep(surface='asphalt',o={}){if(!ctx)return;let s=STEP_ALIAS[surface]||surface;if(!['asphalt','concrete','grass','gravel','wood','tile','metal','carpet'].includes(s))s='concrete';
  const run=!!o.run,cr=!!o.crouch;
  play(stepBuf(s,Math.random()*5|0),{pos:o.pos,gain:(cr?.16:run?.5:.32)*(o.vol||1)*(o.pos?1.6:1),rate:(run?1.06:1)*(1+(Math.random()-.5)*.1),lp:cr?1800:undefined,
    pan:o.pos?0:(o.side||0)*.12,prio:o.pos?1:2,ref:3,room:S.indoor?.1:0,out:0})}

/* ---------------------------------------------------------------- UI and feedback */
function uiBuf(k){return cached('ui:'+k,()=>{const r=RNG(hash(k));let x;
  switch(k){
    case 'hitmarker':x=D.arr(.08);D.add(x,D.env(D.osc(.05,2900),.0005,.009),0,.7);clk(x,0,6000,.4,.002,r,0);D.add(x,D.env(D.osc(.05,D.glide(260,160,.01)),.001,.012),0,.5);break;
    case 'kill':x=D.arr(.2);for(const [at,f] of [[0,2400],[.055,3200]])D.add(x,D.env(D.osc(.08,f),.0005,.014),at,.6);D.add(x,D.env(D.osc(.1,D.glide(200,90,.03)),.002,.03),0,.6);break;
    case 'headshot':x=D.modes(2,[[1760,1,.4],[3524,.45,.22],[5270,.25,.14],[2640,.22,.28],[7040,.08,.06]],r);D.env(x,.001,9);clk(x,0,6000,.5,.002,r,0);D.add(x,D.env(D.osc(.05,2900),.0005,.009),0,.5);break;
    case 'ziptie':x=D.arr(.6);{let t=0,dt=.034;for(let k=0;k<14;k++){clk(x,t,1900+k*110,.55,.0025,r,.3);t+=dt;dt*=.93}
      const z=D.white(.14,r);D.filt(z,'bp',tt=>1500+2600*tt/.14,3);D.mul(z,tt=>Math.sin(Math.PI*tt/.14));D.add(x,D.norm(z),t,.6)}break;
    case 'pickup':x=D.arr(1.3);rustle(x,0,.15,.35,r);for(const [at,f] of [[.04,1047],[.12,1568]])D.add(x,D.env(D.modes(.45,[[f,1,.25],[f*2,.25,.1],[f*3,.1,.05]],r),.002,1),at,.5);break;
    case 'cash':x=D.arr(2.6);clk(x,0,1800,.7,.006,r,.5);slide(x,.03,.12,500,300,.5,r);thock(x,.16,250,.8,.03,r);
      D.add(x,D.modes(1.2,[[2093,1,.6],[4186,.4,.35],[5920,.3,.2],[3136,.35,.45]],r),.17,.7);for(let k=0;k<14;k++)tink(x,.22+r()*.35,.25*(1-k/16),r,1.2);break;
    case 'hover':x=D.env(D.osc(.04,1700),.001,.008);D.norm(x,.35);break;
    case 'click':x=D.env(D.osc(.08,D.glide(1100,620,.015)),.0008,.02);clk(x,0,4000,.3,.002,r,0);break;
    case 'back':x=D.env(D.osc(.1,D.glide(700,420,.03)),.0008,.03);break;
    case 'denied':x=D.arr(.3);for(const at of [0,.12]){const b=D.osc(.09,190,'square');D.filt(b,'lp',1200,.7);D.env(b,.003,.05);D.add(x,b,at,.4)}break;
    case 'objective':x=D.arr(1.6);for(const [at,f] of [[0,784],[.1,988],[.2,1175]])D.add(x,D.env(D.modes(.6,[[f,1,.3],[f*2.01,.3,.12]],r),.002,1),at,.45);break;
    default:x=D.env(D.osc(.05,1200),.001,.01);
  }
  return D.buf([D.norm(D.trim(D.fade(x,Math.min(.15,x.length/SR*.3))),.9)])})}
const UI_GAIN={hitmarker:.4,kill:.45,headshot:.4,ziptie:.45,pickup:.45,cash:.5,hover:.15,click:.3,back:.3,denied:.35,objective:.4};
const UI_ALIAS={hit:'hitmarker',tick:'hitmarker',ding:'headshot',cuff:'ziptie',zip:'ziptie',package:'pickup',loot:'pickup',payout:'cash',register:'cash'};
function ui(kind,o={}){if(!ctx)return;let k=UI_ALIAS[kind]||kind;
  if(k==='start'||k==='win'||k==='fail')return stinger(k);
  play(uiBuf(k),{bus:N.ui,gain:(UI_GAIN[k]||.3)*(o.vol||1),rate:o.rate||(k==='hitmarker'?1+(Math.random()-.5)*.06:1),prio:5,room:0,out:0})}

/* ---------------------------------------------------------------- voices (formant synthesis) */
const VOW={a:[730,1090,2440],o:[570,840,2410],u:[300,870,2240],e:[530,1840,2480],i:[270,2290,3010],ae:[660,1720,2410],uh:[520,1190,2390],m:[250,1000,2200]};
function vocal(sp,r){
  const L=sp.dur+.04,n=D.n(L),f0=pw(sp.f0),voi=pw(sp.voi||[[0,0],[.03,1],[sp.dur-.06,.8],[sp.dur,0]]),noi=pw(sp.noi||[[0,0]]);
  const src=new Float32Array(n);let p=0,prev=0,jit=0,odd=1;const rough=sp.rough||0;
  for(let i=0;i<n;i++){const t=i/SR;if((i&63)===0)jit=(r()-.5)*.025*(1+rough*3);p+=f0(t)*(1+jit)/SR;if(p>=1){p-=1;odd=-odd}
    const gl=p<.6?.5*(1-Math.cos(Math.PI*p/.6)):Math.cos(Math.PI*(p-.6)/.8);const d=(gl-prev)*30;prev=gl;
    src[i]=d*voi(t)*(1+rough*.45*odd)+(r()*2-1)*(noi(t)+.04*voi(t))}
  const out=new Float32Array(n),fs=sp.fs||1,Q=[7,10,14],gn=[1,.55,.28];
  for(let k=0;k<3;k++){const vf=pw(sp.vow.map(([t,v])=>[t,VOW[v][k]*fs])),c=src.slice();D.filt(c,'bp',vf,Q[k]);D.add(out,c,0,gn[k])}
  if(sp.nasal)D.add(out,D.filt(src.slice(),'lp',300,1),0,.6);
  return D.fade(D.norm(out,.9),.02)}
const VK={
  hey:{dur:.34,f0:[[0,1.1],[.12,1.3],[.34,.95]],vow:[[0,'e'],[.1,'e'],[.3,'i']],noi:[[0,.5],[.06,.3],[.08,0]],voi:[[0,0],[.05,0],[.08,1],[.26,.8],[.34,0]]},
  oof:{dur:.24,f0:[[0,1.15],[.24,.8]],vow:[[0,'u'],[.2,'uh']],noi:[[0,.6],[.03,.1],[.05,0]],voi:[[0,0],[.03,1],[.18,.7],[.24,0]]},
  huh:{dur:.3,f0:[[0,.9],[.3,1.35]],vow:[[0,'uh'],[.3,'uh']],noi:[[0,.6],[.05,0]],voi:[[0,0],[.05,1],[.25,.8],[.3,0]]},
  whoa:{dur:.5,f0:[[0,1],[.2,1.3],[.5,.9]],vow:[[0,'u'],[.12,'o'],[.3,'a']],voi:[[0,0],[.04,1],[.4,.8],[.5,0]]},
  hmm:{dur:.45,f0:[[0,1.05],[.45,.92]],vow:[[0,'m']],nasal:1,voi:[[0,0],[.05,.7],[.4,.6],[.45,0]]},
  haha:{dur:.45,f0:[[0,1.25],[.45,1.05]],vow:[[0,'a']],voi:[[0,0],[.03,1],[.08,.1],[.15,0],[.18,1],[.23,.1],[.3,0],[.33,1],[.4,.1],[.45,0]],noi:[[0,.6],[.03,.1],[.14,.5],[.18,.1],[.29,.5],[.33,.1],[.45,0]]},
  yeah:{dur:.42,f0:[[0,1.2],[.42,.85]],vow:[[0,'i'],[.08,'e'],[.2,'ae'],[.42,'uh']]},
  woo:{dur:.5,f0:[[0,1],[.35,1.7],[.5,1.6]],vow:[[0,'u'],[.5,'o']],voi:[[0,0],[.06,1],[.45,.8],[.5,0]]},
  oi:{dur:.3,f0:[[0,1.35],[.3,1]],vow:[[0,'o'],[.1,'o'],[.25,'i']],voi:[[0,0],[.02,1],[.25,.8],[.3,0]]},
  agh:{dur:.32,f0:[[0,1.3],[.32,.85]],vow:[[0,'a']],noi:[[0,.3],[.32,.3]],voi:[[0,0],[.02,1],[.25,.6],[.32,0]]},
  aw:{dur:.55,f0:[[0,1.2],[.55,.75]],vow:[[0,'a'],[.25,'o'],[.55,'u']]},
  ok:{dur:.42,f0:[[0,1.1],[.15,1.05],[.22,1.25],[.42,1]],vow:[[0,'o'],[.14,'o'],[.2,'e'],[.42,'i']],voi:[[0,0],[.03,1],[.13,1],[.15,0],[.2,0],[.22,1],[.36,.8],[.42,0]],noi:[[0,0],[.15,0],[.16,.35],[.19,0]]},
  yay:{dur:.45,f0:[[0,1],[.3,1.3],[.45,1.2]],vow:[[0,'i'],[.06,'ae'],[.3,'e'],[.45,'i']]},
  bark:{dur:.17,f0:[[0,1],[.04,1.15],[.16,.7]],vow:[[0,'u'],[.04,'a'],[.16,'o']],noi:[[0,.35],[.16,.25]],voi:[[0,0],[.008,1],[.1,.6],[.16,0]]},
  whine:{dur:.6,f0:[[0,1],[.3,1.4],[.6,1.1]],vow:[[0,'i'],[.6,'u']],voi:[[0,0],[.1,.8],[.5,.6],[.6,0]]},
};
const WHO={dad:{F:112,fs:1,rough:.05},thug:{F:96,fs:.95,rough:.35},kid:{F:285,fs:1.22,rough:0},dog:{F:430,fs:1.35,rough:.6},pup:{F:700,fs:1.4,rough:.1}};
const VKIND={dad:['dad',['hey','yeah','hmm','ok','whoa']],dad_alert:['dad',['hey']],dad_hurt:['dad',['oof']],dad_cheer:['dad',['woo','yeah']],dad_laugh:['dad',['haha']],dad_think:['dad',['hmm']],dad_ok:['dad',['ok']],dad_aw:['dad',['aw']],
  thug:['thug',['huh','oi','agh']],thug_alert:['thug',['oi','huh']],thug_hurt:['thug',['agh','oof']],thug_surrender:['thug',['whoa']],thug_laugh:['thug',['haha']],
  kid:['kid',['yay','haha','woo']],kid_laugh:['kid',['haha']],kid_yay:['kid',['yay']],dog:['dog',['bark']],dog_whine:['pup',['whine']]};
function voiceBuf(who,word,v){return cached('v:'+who+word+v,()=>{const w=WHO[who],k=VK[word],r=RNG(hash(who+word)+v*977),F=w.F*(.9+r()*.2);
  return D.buf([vocal(Object.assign({},k,{f0:k.f0.map(([t,f])=>[t,f*F]),fs:w.fs*(.96+r()*.08),rough:w.rough}),r)])})}
function radioBuf(k){return cached('rad'+k,()=>{const r=RNG(hash(k)),x=D.arr(.2);const n=D.white(k==='in'?.09:.14,r);D.filt(n,'bp',2000,.5);
  D.mul(n,t=>k==='in'?(t<.08?1:0):Math.exp(-t/.05));D.add(x,D.norm(n),0,.5);clk(x,0,2500,.6,.002,r,0);
  if(k==='in'){const b=D.osc(.045,1250,'square');D.filt(b,'lp',3000,.7);D.add(x,D.env(b,.002,.03),.08,.25)}return D.buf([D.norm(x,.8)])})}
function voice(kind,pos,o={}){if(!ctx)return 0;
  if(kind==='radio_in'||kind==='radio_out'){play(radioBuf(kind.slice(6)),{gain:.3,prio:4,bus:N.ui,room:0,out:0});return .15}
  const def=VKIND[kind]||VKIND.dad,who=def[0],word=o.word&&VK[o.word]?o.word:pick(def[1]),buf=voiceBuf(who,word,Math.random()*3|0);
  const radio=!!o.radio,rate=(o.pitch||1)*(1+(Math.random()-.5)*.06)*(kind==='thug_surrender'?1.2:1);
  const base={pos:radio?null:pos,gain:(o.vol||1)*(radio?.5:.5)*(who==='kid'?.6:1),rate,prio:radio?4:2,ref:3,hp:radio?450:undefined,lp:radio?2800:undefined,bus:radio?N.ui:undefined,room:radio?0:undefined};
  let d=0;if(radio){voice('radio_in');d=.1}
  play(buf,Object.assign({},base,{delay:d}));let end=d+buf.duration/rate;
  if(kind==='thug_surrender'||(who==='dog'&&Math.random()<.5)){play(buf,Object.assign({},base,{delay:end+.05,rate:rate*1.04}));end+=buf.duration/rate+.05}
  if(radio)play(radioBuf('out'),{gain:.3,delay:end+.02,prio:4,bus:N.ui,room:0,out:0});
  return end+(radio?.15:0)}

/* ---------------------------------------------------------------- vehicle */
const noiseLoop=k=>cached('nl:'+k,()=>{const r=RNG(hash(k));return D.buf([D.loop(s=>k==='brown'?D.norm(D.brown(s,r),.8):k==='pink'?D.norm(D.pink(s,r),.8):D.white(s,r),4)])});
const loopSrc=(buf,rate=1)=>{const s=ctx.createBufferSource();s.buffer=buf;s.loop=true;s.playbackRate.value=rate;s.loopStart=Math.random()*buf.duration*.5;return s};
const starterBuf=()=>cached('starter',()=>{const r=RNG(5),x=D.arr(.75);let t=0;while(t<.62){const f=11+5*t;thock(x,t,240,.6+.4*Math.sin(t*20),.02,r);t+=1/f}
  const w=D.osc(.7,t=>300+200*t,'saw');D.filt(w,'lp',900,.7);D.mul(w,t=>.15*Math.min(1,t/.05)*(t<.62?1:Math.exp(-(t-.62)/.03)));D.add(x,w);return D.buf([D.norm(x,.7)])});
function crashBuf(lv,v){return cached('cr'+lv+v,()=>{const r=RNG(lv*10+v),x=D.arr(.6+lv*.5);
  const cr=D.white(.5+lv*.3,r);D.filt(cr,'lp',1500+lv*900,.7);D.mul(cr,t=>Math.exp(-t/(.06+lv*.06))*(.5+.5*(r()<.3?1:r())));D.add(x,D.norm(cr),0,1);
  D.add(x,D.env(D.osc(.4,D.glide(90,40,.05)),.002,.08+lv*.04),0,.8+lv*.2);
  const parts=[];for(let k=0;k<7;k++)parts.push([250+r()*2800,.3+r()*.5,.06+r()*.25*(lv+1)/3]);D.add(x,D.modes(.8,parts,r),.005,.6);
  grains(x,.02,.25+lv*.15,6+lv*8,1500,5000,.4,r,.003);
  if(lv>=2)for(let k=0;k<30;k++){const at=.02+Math.pow(r(),1.5)*.6,f=3500+r()*6000;D.add(x,D.modes(.06,[[f,1,.015+r()*.02]],r),at,(.15+r()*.4)*(1-at))}
  D.sat(x,1.5);return D.buf([D.norm(D.trim(x),.95)])})}
function doorBuf(k){return cached('door'+k,()=>{const r=RNG(hash(k)),x=D.arr(1.2);
  if(k==='open'){clk(x,0,1800,.8,.005,r,.4);clk(x,.02,900,.5,.008,r,.2);const c=D.osc(.3,t=>260+90*t+12*Math.sin(TAU*28*t),'tri');D.filt(c,'bp',800,1);D.env(c,.05,.12);D.add(x,D.norm(c),.04,.15)}
  else if(k==='slide'){const n=D.brown(.75,r);D.filt(n,'bp',t=>500+250*t,1.5);D.mul(n,t=>Math.sin(Math.PI*t/.75)*(.7+.3*Math.sin(TAU*14*t)));D.add(x,D.norm(n),0,.6);grains(x,.05,.6,10,1200,2500,.2,r,.003);
    thock(x,.74,120,1,.06,r);clk(x,.76,1500,.8,.006,r,.5);const th=D.white(.2,r);D.filt(th,'lp',250,.8);D.env(th,.002,.05);D.add(x,D.norm(th),.74,.9)}
  else{const th=D.white(.3,r);D.filt(th,'lp',k==='trunk'?220:300,.9);D.env(th,.002,.06);D.add(x,D.norm(th),0,1);D.add(x,D.env(D.osc(.3,D.glide(95,55,.03)),.002,.07),0,.8);clk(x,.008,1500,.6,.006,r,.5);grains(x,.02,.15,5,1500,3500,.15,r,.004)}
  return D.buf([D.norm(D.trim(x),.9)])})}
const HORN={tap:[[0,.12]],short:[[0,.28]],long:[[0,.9]],double:[[0,.12],[.2,.14]],triple:[[0,.1],[.16,.1],[.32,.3]],shave:[[0,.16],[.24,.08],[.36,.08],[.48,.16],[.72,.16],[1.2,.16],[1.44,.22]]};
function hornNote(t,dur,dst){const a=OSC('sawtooth',418),b=OSC('sawtooth',527),bp=BQ('bandpass',1250,.9),lp=BQ('lowpass',3200,.7),sh=ctx.createWaveShaper(),g=G(0);sh.curve=satCurve(3);
  a.connect(bp);b.connect(bp);bp.connect(sh);sh.connect(lp);lp.connect(g);g.connect(dst||N.sfx);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.16,t+.012);g.gain.setValueAtTime(.16,t+dur);g.gain.linearRampToValueAtTime(0,t+dur+.03);
  a.start(t);b.start(t);a.stop(t+dur+.05);b.stop(t+dur+.05);b.onended=()=>{for(const n of [a,b,bp,lp,sh,g])n.disconnect()};return{a,b,g}}
/* worn-car one-shots: misfire pop, loose-panel rattle, warning chime, hazard relay tick, flat-tyre thump */
function wearBuf(k,v){return cached('wear:'+k+v,()=>{const r=RNG(hash(k)+v*17);let x;
  if(k==='misfire'){x=D.arr(.5);thock(x,0,140+r()*60,1,.05,r);const n=D.white(.25,r);D.filt(n,'lp',1800,.8);D.env(n,.001,.035);D.add(x,D.norm(n),.002,.8);grains(x,.01,.12,6,900,3200,.35,r,.003);D.sat(x,2)}
  else if(k==='rattle'){x=D.arr(.6);let t=0;for(let i=0;i<5+v*2;i++){clk(x,t,1200+r()*2600,.5+r()*.4,.004+r()*.006,r,.3);t+=.03+r()*.06}D.add(x,D.modes(.4,[[620+r()*200,.4,.05],[1480+r()*300,.3,.03]],r),.01,.4)}
  else if(k==='chime'){x=D.arr(1.1);for(const[at,f]of[[0,1318.5],[.22,987.8]])D.add(x,D.env(D.modes(.9,[[f,1,.35],[f*2.01,.2,.15],[f*3,.06,.08]],r),.003,.6),at,.5)}
  else if(k==='tick'){x=D.arr(.08);clk(x,0,2600,.8,.003,r,0);thock(x,.004,900,.5,.006,r)}
  else if(k==='thump'){x=D.arr(.25);D.add(x,D.env(D.osc(.25,D.glide(95,45,.04)),.002,.05),0,1);const n=D.white(.1,r);D.filt(n,'lp',400,.7);D.env(n,.001,.02);D.add(x,D.norm(n),0,.5)}
  else x=D.arr(.01);
  return D.buf([D.norm(D.trim(x),.9)])})}
function vehicle(opt={}){
  const nop={set(){},horn(){},hornDown(){},hornUp(){},door(){},crash(){},misfire(){},rattle(){},stall(){},chime(){},tick(){},thump(){},stop(){},alive:false};
  if(!ctx)return nop;
  const t0=ctx.currentTime,all=[],out=G(0),cab=BQ('lowpass',opt.inside===false?18000:5500,.5);out.connect(cab);cab.connect(N.sfx);
  const st=(n)=>{n.start(t0);all.push(n);return n};
  const eLP=BQ('lowpass',400,.9),sh=ctx.createWaveShaper(),eG=G(.04);sh.curve=satCurve(2.2);eLP.connect(sh);sh.connect(eG);eG.connect(out);
  const rfO=st(OSC('sine',5)),rfG=G(0);rfO.connect(rfG);rfG.connect(eG.gain);   /* damage: a lumpy, uneven idle (AM on the engine bus) */
  const o1=st(OSC('sawtooth',40)),o2=st(OSC('square',20)),o3=st(OSC('sine',60)),g1=G(.45),g2=G(.3),g3=G(.35);
  o1.connect(g1);g1.connect(eLP);o2.connect(g2);g2.connect(eLP);o3.connect(g3);g3.connect(eLP);
  const nz=st(loopSrc(noiseLoop('pink'))),nBP=BQ('bandpass',200,1.2),am=G(.5),amO=st(OSC('sawtooth',40)),amD=G(.5),nG=G(.6);
  nz.connect(nBP);nBP.connect(am);amO.connect(amD);amD.connect(am.gain);am.connect(nG);nG.connect(eLP);
  const wO=st(OSC('sine',200)),wG=G(0);wO.connect(wG);wG.connect(out);
  const rz=st(loopSrc(noiseLoop('brown'))),rLP=BQ('lowpass',200,.7),rG=G(0);rz.connect(rLP);rLP.connect(rG);rG.connect(out);
  const wz=st(loopSrc(noiseLoop('pink'),.8)),wHP=BQ('highpass',700,.5),wiG=G(0);wz.connect(wHP);wHP.connect(wiG);wiG.connect(out);
  const sz=st(loopSrc(noiseLoop('white'))),sBP=BQ('bandpass',1000,5),sG=G(0);sz.connect(sBP);sBP.connect(sG);sG.connect(N.sfx);
  const qO=st(OSC('triangle',1050)),qL=st(OSC('sine',7)),qD=G(35),qG=G(0);qL.connect(qD);qD.connect(qO.frequency);qO.connect(qG);qG.connect(N.sfx);
  if(opt.start!==false){play(starterBuf(),{gain:.5,prio:4,room:0,out:0});out.gain.setValueAtTime(0,t0);out.gain.setValueAtTime(0,t0+.5);out.gain.linearRampToValueAtTime(1,t0+.85)}
  else{out.gain.setValueAtTime(0,t0);out.gain.linearRampToValueAtTime(1,t0+.3)}
  let held=null,alive=true,stalled=false;
  const P=(param,v,tc=.06)=>param.setTargetAtTime(v,ctx.currentTime,tc);
  const c={alive:true,
    set(p={}){if(!alive)return;const r=clamp(p.rpm||0,0,1),th=clamp(p.throttle==null?r:Math.abs(p.throttle),0,1),sp=Math.abs(p.speed||0),sk=clamp(p.skid||0,0,1),f=30+r*165;
      P(o1.frequency,f);P(o2.frequency,f/2);P(o3.frequency,f*1.5);P(amO.frequency,f);P(nBP.frequency,f*2.4);
      P(eLP.frequency,220+r*900+th*1700);P(eG.gain,stalled?0:.028+.016*r+.024*th,stalled?.25:.06);P(nG.gain,stalled?0:.35+.6*th);
      P(wO.frequency,120+sp*28);P(wG.gain,Math.min(.02,sp*.001));
      P(rG.gain,Math.min(.12,sp*.006));P(rLP.frequency,140+sp*22);P(wiG.gain,Math.min(.05,Math.pow(sp/30,2)*.05));
      const sg=sk*Math.min(1,sp/4);P(sG.gain,sg*.1,.03);P(sBP.frequency,900+sg*500,.03);P(qG.gain,sg*.025,.03);P(qO.frequency,1000+sg*250+Math.random()*40,.05);
      const dm=clamp(p.damage||0,0,1);P(rfG.gain,.03*dm);P(rfO.frequency,2.5+r*7+dm*2*Math.random());P(o2.detune,dm*45);P(o3.detune,-dm*30);
      if(p.inside!=null)P(cab.frequency,p.inside?5500:18000,.1)},
    horn(kind='short'){const t=ctx.currentTime+.005;for(const [at,d] of HORN[kind]||HORN.short)hornNote(t+at,d)},
    hornDown(){if(held)return;const t=ctx.currentTime;held=hornNote(t,30)},
    hornUp(){if(!held)return;const t=ctx.currentTime;held.g.gain.cancelScheduledValues(t);held.g.gain.setTargetAtTime(0,t,.015);held.a.stop(t+.1);held.b.stop(t+.1);held=null},
    door(kind='close'){play(doorBuf(kind),{gain:.5,prio:4,pan:kind==='slide'?.5:-.4,room:0,out:.05})},
    stall(b=true){stalled=!!b;if(!b)play(starterBuf(),{gain:.45,prio:4,room:0,out:0})},
    misfire(i=.6){play(wearBuf('misfire',Math.random()*3|0),{gain:.25+.45*clamp(i,0,1),prio:4,room:0,out:.1,rate:.9+Math.random()*.2})},
    rattle(i=.5){play(wearBuf('rattle',Math.random()*3|0),{gain:.12+.3*clamp(i,0,1),prio:2,room:0,out:0,rate:.9+Math.random()*.25})},
    chime(){play(wearBuf('chime',0),{bus:N.ui,gain:.35,prio:5,room:0,out:0})},
    tick(on){play(wearBuf('tick',0),{bus:N.ui,gain:.18,rate:on?1:.8,prio:2,room:0,out:0})},
    thump(i=.5){play(wearBuf('thump',0),{gain:.2+.3*clamp(i,0,1),prio:2,room:0,out:0})},
    crash(i=.5){i=clamp(i,0,1);play(crashBuf(i<.34?0:i<.7?1:2,Math.random()*2|0),{gain:.35+.55*i,prio:5,room:0,out:.08});duck(.4*i)},
    stop(){if(!alive)return;alive=false;c.alive=false;c.hornUp();const t=ctx.currentTime;out.gain.cancelScheduledValues(t);out.gain.setTargetAtTime(0,t,.12);sG.gain.setTargetAtTime(0,t,.05);qG.gain.setTargetAtTime(0,t,.05);
      for(const n of all)try{n.stop(t+.7)}catch(e){}all[0].onended=()=>{try{out.disconnect();cab.disconnect();sG.disconnect();qG.disconnect()}catch(e){}}}};
  c.set({rpm:0,throttle:0,speed:0});return c}

/* ---------------------------------------------------------------- music instruments (live) */
let MOUT=null;const mout=()=>MOUT||N.musIn;
function drumBuf(k){return cached('dr:'+k,()=>{const r=RNG(hash('dr'+k));let x;
  const metal=(s,f)=>{const a=D.arr(s);for(const hz of [205.3,304.4,369.6,522.7,540,800])D.add(a,D.osc(s,hz*f,'square',r()),0,.15);return a};
  switch(k){
    case 'kick':x=D.osc(.5,D.glide(155,47,.032));D.env(x,.0015,.17);D.sat(x,1.6);clk(x,0,3500,.25,.002,r,0);break;
    case 'snare':{x=D.arr(.4);D.add(x,D.env(D.osc(.3,D.glide(240,185,.02)),.001,.05),0,.6);D.add(x,D.env(D.osc(.3,330),.001,.03),0,.3);
      const n=D.white(.4,r);D.filt(n,'bp',3500,.6);D.filt(n,'hp',900,.7);D.env(n,.001,.09);D.add(x,D.norm(n),0,.9);break}
    case 'hat':case 'ohat':{x=metal(k==='hat'?.12:.5,1);const n=D.white(x.length/SR,r);D.add(x,n,0,.25);D.filt(x,'bp',10000,.8);D.filt(x,'hp',6000,.7);D.env(x,.0005,k==='hat'?.022:.16);break}
    case 'shaker':x=D.white(.1,r);D.filt(x,'bp',6500,1);D.mul(x,t=>t<.012?t/.012:Math.exp(-(t-.012)/.025));break;
    case 'tom':x=D.osc(.6,D.glide(130,82,.06));D.env(x,.002,.2);{const n=D.white(.1,r);D.filt(n,'lp',900,.7);D.env(n,.001,.02);D.add(x,D.norm(n),0,.3)}break;
    case 'crash':{x=metal(2,1.7);const n=D.white(2,r);D.add(x,n,0,.6);D.filt(x,'hp',4000,.6);D.env(x,.002,.55);break}
    case 'rim':x=D.modes(.1,[[1700,1,.012],[820,.4,.02]],r);clk(x,0,4500,.6,.002,r,0);break;
    case 'clap':{x=D.arr(.3);for(const at of [0,.011,.023]){const n=D.white(.2,r);D.filt(n,'bp',1200,1.2);D.env(n,.0005,at<.02?.006:.06);D.add(x,D.norm(n),at,1)}break}
  }
  return D.buf([D.norm(D.trim(x),.9)])})}
const DRUM_G={kick:.42,snare:.6,hat:.85,ohat:.55,shaker:.5,tom:.45,crash:.32,rim:.35,clap:.4};
function drum(k,t,v=1,pan=0){const s=ctx.createBufferSource();s.buffer=drumBuf(k);const g=G(v*DRUM_G[k]);s.connect(g);let n=g;if(pan){const p=PAN(pan);g.connect(p);n=p}n.connect(mout());s.start(t);s.onended=()=>{s.disconnect();g.disconnect();if(n!==g)n.disconnect()}}
function voiceEnd(nodes,o){o.onended=()=>{for(const n of nodes)try{n.disconnect()}catch(e){}}}
function bassNote(t,m,dur,v,tone){const f=mtof(m),g=G(0),lp=BQ('lowpass',1000,tone==='synth'?3:.8),o1=OSC(tone==='synth'?'sawtooth':'triangle',f),o2=OSC('sine',f),og=G(tone==='synth'?.45:.8);
  o1.connect(og);og.connect(lp);o2.connect(lp);lp.connect(g);g.connect(mout());
  lp.frequency.setValueAtTime(tone==='synth'?2400:1200,t);lp.frequency.setTargetAtTime(tone==='synth'?280:430,t,.06);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v*.2,t+.006);g.gain.setTargetAtTime(v*.15,t+.01,.12);g.gain.setTargetAtTime(0,t+dur,.035);
  o1.start(t);o2.start(t);o1.stop(t+dur+.25);o2.stop(t+dur+.25);voiceEnd([o1,o2,og,lp,g],o2)}
function epNote(t,m,dur,v){const f=mtof(m),car=OSC('sine',f),mod=OSC('sine',f),mg=G(0),tine=OSC('sine',f*4),tg=G(0),g=G(0);
  mod.connect(mg);mg.connect(car.frequency);car.connect(g);tine.connect(tg);tg.connect(g);g.connect(mout());
  mg.gain.setValueAtTime(f*(1+v*1.4),t);mg.gain.setTargetAtTime(f*.25,t,.3);tg.gain.setValueAtTime(.12*v,t);tg.gain.setTargetAtTime(0,t,.03);
  const a=v*.45*Math.min(1,1.6-m/110);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+.004);g.gain.setTargetAtTime(0,t+.005,m<60?1.1:.75);g.gain.setTargetAtTime(0,t+dur,.08);
  for(const o of [car,mod,tine]){o.start(t);o.stop(t+dur+.5)}voiceEnd([car,mod,mg,tine,tg,g],car)}
function chord(t,ms,dur,v){for(const m of ms)epNote(t+Math.random()*.012,m,dur,v)}
function padChord(t,ms,dur,v){const lp=BQ('lowpass',300,1),g=G(0),oscs=[];lp.connect(g);g.connect(mout());
  lp.frequency.setValueAtTime(300,t);lp.frequency.linearRampToValueAtTime(1100,t+dur*.5);lp.frequency.linearRampToValueAtTime(450,t+dur);
  const a=v*.16/Math.sqrt(ms.length);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+Math.min(1.2,dur*.4));g.gain.setValueAtTime(a,t+dur);g.gain.linearRampToValueAtTime(0,t+dur+.9);
  for(const m of ms)for(const dt of [-7,7]){const o=OSC('sawtooth',mtof(m));o.detune.value=dt;o.connect(lp);o.start(t);o.stop(t+dur+1);oscs.push(o)}voiceEnd([...oscs,lp,g],oscs[0])}
function stab(t,ms,dur,v){const lp=BQ('lowpass',3500,2),g=G(0),oscs=[];lp.connect(g);g.connect(mout());lp.frequency.setValueAtTime(3800,t);lp.frequency.setTargetAtTime(500,t,.07);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v*.16,t+.004);g.gain.setTargetAtTime(0,t+dur,.03);
  for(const m of ms)for(const [w,dt] of [['sawtooth',-9],['square',9]]){const o=OSC(w,mtof(m));o.detune.value=dt;o.connect(lp);o.start(t);o.stop(t+dur+.2);oscs.push(o)}voiceEnd([...oscs,lp,g],oscs[0])}
function brass(t,m,dur,v,wah){const lp=BQ('lowpass',500,wah?6:1.5),g=G(0),oscs=[];lp.connect(g);g.connect(mout());
  if(wah){lp.frequency.setValueAtTime(350,t);lp.frequency.linearRampToValueAtTime(1500,t+Math.min(.18,dur*.4));lp.frequency.linearRampToValueAtTime(400,t+dur)}
  else{lp.frequency.setValueAtTime(500,t);lp.frequency.linearRampToValueAtTime(2800,t+.05);lp.frequency.setTargetAtTime(1500,t+.06,.2)}
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v*.15,t+.03);g.gain.setValueAtTime(v*.15,t+dur);g.gain.linearRampToValueAtTime(0,t+dur+.12);
  for(const dt of [-6,6]){const o=OSC('sawtooth',mtof(m));o.detune.value=dt;o.connect(lp);o.start(t);o.stop(t+dur+.2);oscs.push(o)}
  if(wah&&dur>.6){const l=OSC('sine',5.5),ld=G(0);ld.gain.setValueAtTime(0,t);ld.gain.linearRampToValueAtTime(18,t+dur);l.connect(ld);for(const o of oscs)ld.connect(o.detune);l.start(t);l.stop(t+dur+.2);oscs.push(l,ld)}
  voiceEnd([...oscs,lp,g],oscs[0])}
function ksBuf(m){return cached('ks'+m,()=>{const f=mtof(m),x=D.arr(2.6),P=Math.max(2,Math.round(SR/f)),r=RNG(m*31),d=new Float32Array(P);let pv=0;
  for(let i=0;i<P;i++){pv=pv*.45+(r()*2-1)*.55;d[i]=pv}const dec=.9965-Math.max(0,m-60)*.0003;let idx=0;
  for(let i=0;i<x.length;i++){const a=d[idx],b=d[(idx+1)%P];x[i]=a;d[idx]=(a+b)*.5*dec;idx=(idx+1)%P}
  const body=x.slice();D.filt(body,'bp',110,2);D.add(x,body,0,.6);D.env(x,.0015,1.4);return D.buf([D.norm(D.fade(x,.2),.8)])})}
function guitar(t,m,v){const s=ctx.createBufferSource();s.buffer=ksBuf(m);const g=G(v*.8);s.connect(g);g.connect(mout());s.start(t);s.onended=()=>{s.disconnect();g.disconnect()}}

/* ---------------------------------------------------------------- music: songs and sequencer (original material) */
const SONGS={
  hub:{bpm:96,swing:.14,bars:8,
    ch:[{b:43,v:[59,62,66,69]},{b:42,v:[57,61,64,66]},{b:40,v:[55,59,62,66]},{b:45,v:[57,62,64,67],v2:[57,61,64,67]},{b:47,v:[57,59,62,66]},{b:40,v:[55,59,62,64]},{b:43,v:[54,59,62,67]},{b:45,v:[55,59,62,66]}],
    play(bar,s,t,d){const c=this.ch[bar%8],n=this.ch[(bar+1)%8];
      if(s===0||s===8||(s===10&&bar%2))drum('kick',t,s===0?1:.8);if(s===7&&bar%4===3)drum('kick',t,.5);
      if(s===4||s===12)drum('snare',t,.75);if(s===15&&bar%2===0)drum('snare',t,.15);if(s===9)drum('rim',t,.25);
      drum(s===14&&bar%2===1?'ohat':'hat',t,[.6,.22,.4,.25][s%4],.25);
      if(s===0&&bar%8===0&&MUS.loops>0)drum('crash',t,.5);
      for(const [st,iv,len,vel] of [[0,0,3,1],[3,12,1,.6],[6,0,1,.75],[8,7,2,.85],[11,0,1,.6],[12,12,1,.55],[14,'A',2,.75]])
        if(st===s)bassNote(t,iv==='A'?n.b+(bar%2?-1:2):c.b+iv,len*d*.9,vel,'finger');
      const v=(s>=8&&c.v2)?c.v2:c.v;
      if(s===2)chord(t,v,d*3.5,.5);if(s===6)chord(t,v,d*1.5,.35);if(s===10)chord(t,v,d*3,.45);if(s===14&&bar%2)chord(t,n.v,d*2.5,.4);
      if(bar%4===3&&MUS.int>.3){const L={8:81,10:78,12:76,14:74}[s];if(L)epNote(t,L,d*1.8,.5)}
      if(bar%8===7&&s===0&&MUS.int>.3)for(const [k,m] of [[0,74],[3,76],[6,78]])epNote(t+k*d,m,d*2,.4)}},
  tension:{bpm:84,swing:0,bars:4,
    ch:[{b:38,p:[62,65,69,76]},{b:38,p:[62,65,69,74]},{b:34,p:[58,62,65,69]},{b:33,p:[57,61,64,67]}],
    play(bar,s,t,d){const c=this.ch[bar%4];
      if(s===0)padChord(t,c.p,d*16,.9);
      if(s%(MUS.int>.4?2:4)===0)bassNote(t,c.b,d*1.6,s%4===0?.6:.38,'synth');
      if(s===0)drum('tom',t,.55);if(s===10&&bar%2)drum('tom',t,.3);
      if(s%4===2)drum('hat',t,.25,.4);if(MUS.int>.5&&s%2===1)drum('shaker',t,.35,-.3);
      const P=[{8:81},{12:77},{4:76},{8:73}][bar%4];if(P[s])epNote(t,P[s],d*6,.35)}},
  combat:{bpm:148,swing:0,bars:4,ch:[40,36,38,35],
    play(bar,s,t,d){const r=this.ch[bar%4];
      if([0,3,8,11].includes(s)||(bar%4===3&&s===14))drum('kick',t,1);
      if(s===4||s===12)drum('snare',t,.9);if(bar%4===3&&s>=12)drum('snare',t,.3+.15*(s-12));
      if(s%2===0)drum(s===14?'ohat':'hat',t,s%4===0?.7:.45,-.2);if(MUS.int>.6&&s%2===1)drum('shaker',t,.4,.3);
      if(s===0&&bar%4===0)drum('crash',t,.55);
      bassNote(t,r+[0,0,12,0,0,0,7,0,0,0,12,0,0,10,7,3][s],d*.85,s%4===0?.85:.6,'synth');
      if(s===0||s===6||s===10)stab(t,[r+12,r+19,r+24],d*(s===6?1:2),.6);
      if(bar%4===2&&MUS.int>.4&&s%4===0)brass(t,[71,74,76,79][s/4],d*3,.35)}},
  victory:{bpm:120,swing:0,bars:4,once:true,
    play(bar,s,t,d){const C=[[60,64,67,72],[65,69,72,77],[62,67,71,74],[60,64,67,72,76]][bar],M=[{0:67,3:72,6:76,8:79,14:76},{0:77,3:76,6:74,8:72},{0:71,4:74,8:79},{0:84}][bar];
      if(bar===3&&s>0)return;const L=bar===3?d*14:0;
      if(s===0)for(const m of C)brass(t,m,L||d*6,.32);if(M[s]!=null)brass(t,M[s],L||d*2,.45);if(s===0||s===8)chord(t,C,L||d*6,.5);
      if(s%4===0)drum('kick',t,.8);if(s===4||s===12)drum('snare',t,.6);if(bar===2&&s>=12)drum('snare',t,.5);if(s===0&&(bar===0||bar===3))drum('crash',t,.6);
      if(s===0)bassNote(t,[48,41,43,36][bar],L||d*7,.75,'finger');if(s===8&&bar<3)bassNote(t,[48,41,43][bar]+7,d*7,.6,'finger')}},
  home:{bpm:74,swing:.1,bars:4,ch:[[43,50,55,59,62,67],[48,52,55,62,64,67],[40,47,52,55,59,62],[38,50,54,57,62,66]],
    play(bar,s,t,d){const c=this.ch[bar%4];
      if(s%2===0){const i=[0,3,4,2,5,3,4,2][s/2];guitar(t,c[i],i===0?.75:.45)}
      if(s===0||s===8)bassNote(t,c[0],d*7,.32,'finger');
      if(s%2===1&&MUS.int>.3)drum('shaker',t,.35,.2);
      if(bar%4===3&&MUS.int>.2){const L={8:74,12:71,14:69}[s];if(L)guitar(t,L,.5)}}},
};
const MUS={song:null,id:null,next:undefined,bar:0,step:0,t:0,loops:0,int:.5,quick:false};
function musTick(h){
  if(!MUS.song){if(MUS.next===undefined)return;const n=MUS.next;MUS.next=undefined;if(!n||!SONGS[n])return;
    Object.assign(MUS,{song:SONGS[n],id:n,bar:0,step:0,loops:0,t:Math.max(MUS.t,ctx.currentTime+.06)});N.music.gain.cancelScheduledValues(ctx.currentTime);N.music.gain.setTargetAtTime(S.vol.music,ctx.currentTime,.05)}
  let guard=0;
  while(MUS.song&&MUS.t<h&&guard++<512){const sg=MUS.song,s16=60/sg.bpm/4;
    if(MUS.next!==undefined&&(MUS.step===0||(MUS.quick&&MUS.step%4===0))){const n=MUS.next;MUS.next=undefined;MUS.quick=false;
      if(!n||!SONGS[n]){MUS.song=null;MUS.id=null;N.music.gain.setTargetAtTime(0,MUS.t,.6);N.music.gain.setTargetAtTime(S.vol.music,MUS.t+4,.05);return}
      Object.assign(MUS,{song:SONGS[n],id:n,bar:0,step:0,loops:0});if(n==='combat')drum('crash',MUS.t,.6);continue}
    sg.play(MUS.bar,MUS.step,MUS.t+(MUS.step%2?sg.swing*s16:0),s16);
    MUS.t+=s16;if(++MUS.step>=16){MUS.step=0;MUS.bar++;if(MUS.bar>=sg.bars){MUS.bar=0;MUS.loops++;if(sg.once&&MUS.next===undefined)MUS.next=sg.then||null}}}}
function music(state,o={}){if(!ctx)return;if(state==='off'||state==='none')state=null;
  if(o.intensity!=null)MUS.int=clamp(o.intensity,0,1);
  if(state===MUS.id){MUS.next=undefined;return}
  MUS.quick=!!(o.quick||(state==='combat'&&MUS.id&&MUS.id!=='combat'));MUS.next=state;if(!live)musTick(ctx.currentTime+.1)}
function stinger(kind){if(!ctx)return;const t=ctx.currentTime+.03;MOUT=N.sting;try{
  if(kind==='start'){for(let k=0;k<14;k++)drum('snare',t+k*.05,.15+k*.045);for(const m of [50,57,62,66])brass(t,m,.65,.25);
    const h=t+.72;drum('kick',h,1);drum('crash',h,.8);for(const m of [50,57,62,66,69])brass(h,m,.5,.45);bassNote(h,38,.6,.9,'finger')}
  else if(kind==='win'){[60,64,67,72,76].forEach((m,i)=>{epNote(t+i*.08,m+12,.5,.6);brass(t+i*.08,m,.12,.3)});const h=t+.42;
    for(const m of [60,64,67,72,76])brass(h,m,1.3,.4);chord(h,[72,76,79,84],1.5,.6);drum('kick',h,1);drum('crash',h,.8);bassNote(h,36,1.4,.9,'finger');
    const s=ctx.createBufferSource();s.buffer=uiBuf('headshot');const g=G(.15);s.connect(g);g.connect(N.ui);s.start(h+.15)}
  else if(kind==='fail'){[[55,0,.32],[54,.36,.32],[53,.72,.32],[52,1.08,1.2]].forEach(([m,at,d])=>brass(t+at,m,d,.55,true));drum('tom',t+1.08,.5);bassNote(t+1.08,40,1.1,.6,'finger')}
}finally{MOUT=null}}

/* ---------------------------------------------------------------- ambience */
function birdBuf(k,v){return cached('bird'+k+v,()=>{const r=RNG(hash(k)+v*17);let x;
  switch(k){
    case 'chirp':x=D.arr(.5);{const n=2+(r()*3|0),f0=4200+r()*1200;for(let i=0;i<n;i++){const c=D.osc(.06,t=>f0-1600*t/.06);D.mul(c,t=>Math.sin(Math.PI*t/.06));D.add(x,c,i*.085,1)}}break;
    case 'whistle':x=D.arr(.6);{const f=2600+r()*600;for(const [at,ff,dur] of [[0,f,.16],[.22,f*.8,.22]]){const c=D.osc(dur,t=>ff+40*Math.sin(TAU*28*t));D.mul(c,t=>Math.sin(Math.PI*t/dur));D.add(x,c,at,1)}}break;
    case 'trill':x=D.osc(.55,t=>5000+300*Math.sin(TAU*9*t)+r()*0);D.mul(x,t=>Math.max(0,Math.sin(TAU*24*t))*Math.sin(Math.PI*t/.55));break;
    case 'warble':x=D.arr(.7);{let at=0,f=3000+r()*1000;for(let i=0;i<8;i++){const nf=2600+r()*2000,a=f,c=D.osc(.07,t=>a+(nf-a)*t/.07);D.mul(c,t=>Math.sin(Math.PI*t/.07));D.add(x,c,at,.7+r()*.3);f=nf;at+=.075}}break;
    case 'coo':x=D.arr(1.3);for(const [at,f,dur,a] of [[0,520,.18,.6],[.25,600,.32,1],[.65,540,.18,.7],[.9,520,.2,.6]]){const c=D.osc(dur,t=>f-40*t/dur);D.mul(c,t=>Math.pow(Math.sin(Math.PI*t/dur),2));D.add(x,c,at,a)}break;
    case 'owl':x=D.arr(1.2);for(const [at,f,dur] of [[0,380,.25],[.45,360,.4]]){const c=D.osc(dur,t=>f-30*t/dur);D.mul(c,t=>Math.pow(Math.sin(Math.PI*t/dur),2));D.add(x,c,at,1)}break;
  }
  return D.buf([D.norm(x,.8)])})}
const mowerBuf=()=>cached('mower',()=>{const r=RNG(3);return D.buf([D.norm(D.loop(s=>{const x=D.arr(s);let t=0;while(t<s-.05){const b=D.white(.05,r);D.filt(b,'lp',900,.8);D.env(b,.001,.008);D.add(x,b,t,.7+.3*r());t+=1/(27+2*Math.sin(t*1.3))}
  D.add(x,D.osc(s,54,'saw'),0,.12);D.filt(x,'lp',1400,.7);return x},3),.8)])});
const sprinklerBuf=()=>cached('sprink',()=>{const r=RNG(4),x=D.arr(6);for(let k=0;k<14;k++){clk(x,k*.3,3000,.6,.006,r,0);const s=D.white(.25,r);D.filt(s,'hp',5000,.7);D.env(s,.01,.08);D.add(x,D.norm(s),k*.3+.01,.25)}
  for(let k=0;k<26;k++)clk(x,4.3+k*.032,3400,.35,.003,r,0);const h=D.white(6,r);D.filt(h,'bp',7000,.8);D.mul(h,t=>.06*(t<5.2?1:Math.exp(-(t-5.2)/.2)));D.add(x,h);return D.buf([D.norm(x,.8)])});
const carPassBuf=()=>cached('carpass',()=>{const r=RNG(8),x=D.brown(6,r);D.filt(x,'bp',t=>300+300*Math.exp(-Math.pow((t-3)/1.2,2))-80*Math.tanh(t-3),1);D.mul(x,t=>Math.exp(-Math.pow((t-3)/1.4,2)));
  const w=D.pink(6,r);D.filt(w,'bp',1200,.6);D.mul(w,t=>.25*Math.exp(-Math.pow((t-3)/.8,2)));D.add(x,D.norm(w),0,.2);return D.buf([D.norm(x,.8)])});
const cricketBuf=k=>cached('crk'+k,()=>{const r=RNG(40+k),f=4300+r()*700,per=.55+r()*.4,np=3+(r()*2|0),len=per*8,x=D.arr(len);
  for(let c=0;c<8;c++)for(let p=0;p<np;p++){const b=D.osc(.016,f);D.mul(b,t=>Math.sin(Math.PI*t/.016));D.add(x,b,c*per+p*.028,.8+.2*r())}return D.buf([x])});
const clockBuf=k=>cached('clk'+k,()=>{const r=RNG(k?61:62),x=D.arr(.06);clk(x,0,k?3200:2500,1,.003,r,.6);return D.buf([D.norm(x,.8)])});
const dripBuf=v=>cached('drip'+v,()=>{const r=RNG(70+v),f=700+r()*500,x=D.osc(.12,t=>f*(1+1.2*Math.min(1,t/.02)));D.env(x,.001,.03);return D.buf([D.norm(x,.8)])});
const creakBuf=v=>cached('creak'+v,()=>{const r=RNG(80+v),f=250+r()*150,x=D.osc(.7,t=>f+60*Math.sin(TAU*.9*t)+f*.04*Math.sin(TAU*31*t),'tri');D.filt(x,'bp',f*3,1.5);D.mul(x,t=>Math.sin(Math.PI*t/.7)*(.5+.5*r()));return D.buf([D.norm(x,.6)])});
const beepBuf=()=>cached('beeper',()=>{const x=D.arr(6);for(let k=0;k<6;k++)D.add(x,D.env(D.osc(.45,1050),.005,4,.4),k,1);D.fade(x);return D.buf([D.norm(x,.7)])});
const hissBuf=()=>cached('hiss',()=>{const r=RNG(9),x=D.white(1.2,r);D.filt(x,'hp',3000,.7);D.mul(x,t=>Math.min(1,t/.03)*Math.exp(-t/.4));return D.buf([D.norm(x,.6)])});
function Scene(kind){
  const now=ctx.currentTime,g=G(0),nodes=[],ev=[];g.connect(N.amb);
  g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(1,now+2.5);
  const sc={kind,g,
    loop(buf,o={}){const s=loopSrc(buf,o.rate||1);let n=s;const chainN=[s];
      for(const [t,f,q] of [['lowpass',o.lp,o.q],['highpass',o.hp],['bandpass',o.bp,o.q]])if(f){const b=BQ(t,f,q||.7);n.connect(b);n=b;chainN.push(b);
        if(o.lfo&&t!=='highpass'){const l=OSC('sine',o.lfo[0]),ld=G(o.lfo[1]);l.connect(ld);ld.connect(b.frequency);l.start(now);nodes.push(l)}}
      const gg=G(o.gain||.1);n.connect(gg);chainN.push(gg);let last=gg;
      if(o.glfo){const l=OSC('sine',o.glfo[0]),ld=G((o.gain||.1)*o.glfo[1]);l.connect(ld);ld.connect(gg.gain);l.start(now);nodes.push(l)}
      if(o.pan){const p=PAN(o.pan);gg.connect(p);last=p}last.connect(g);s.start(now);nodes.push(s);return gg},
    one(buf,t,o={}){const s=ctx.createBufferSource();s.buffer=buf;s.playbackRate.value=o.rate||1;const gg=G(o.gain||.1);s.connect(gg);let n=gg;
      if(o.lp){const b=BQ('lowpass',o.lp,.7);n.connect(b);n=b}if(o.pan){const p=PAN(o.pan);n.connect(p);n=p}n.connect(g);
      if(o.verb){const v=G(o.verb);n.connect(v);v.connect(N.ambVerb)}s.start(Math.max(t,ctx.currentTime));if(o.pan2!=null&&n.pan)n.pan.linearRampToValueAtTime(o.pan2,t+buf.duration);
      s.onended=()=>{try{s.disconnect();gg.disconnect();n.disconnect()}catch(e){}}},
    every(a,b,fn,first){ev.push({next:now+(first!=null?first:a*Math.random()),a,b,fn})},
    tick(h){for(const e of ev){let k=0;while(e.next<h&&k++<64){e.fn(Math.max(e.next,ctx.currentTime+.01));e.next+=e.a+Math.random()*(e.b-e.a)}}},
    stop(){const t=ctx.currentTime;g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(g.gain.value,t);g.gain.linearRampToValueAtTime(0,t+2.5);ev.length=0;
      for(const n of nodes)try{n.stop(t+2.6)}catch(e){}if(nodes[0])nodes[0].onended=()=>{try{g.disconnect()}catch(e){}}}};
  return sc}
const SCENES={
  suburb(s){s.loop(noiseLoop('pink'),{lp:700,lfo:[.07,350],gain:.09,glfo:[.05,.4]});s.loop(noiseLoop('pink'),{bp:3500,q:.5,gain:.035,glfo:[.11,.6],rate:.9});
    const BIRDS=['chirp','whistle','trill','warble','coo'];
    s.every(.5,3.5,t=>{const b=pick(BIRDS);s.one(birdBuf(b,Math.random()*2|0),t,{gain:rr(.05,b==='coo'?.1:.18),pan:rr(-.9,.9),rate:rr(.92,1.08),verb:.5})});
    const mg=s.loop(mowerBuf(),{lp:1100,gain:0,pan:.55});s.every(18,40,t=>mg.gain.linearRampToValueAtTime(Math.random()<.35?0:rr(.025,.06),t+6),2);
    const sp=rr(-.7,.7);s.every(6.5,9,t=>s.one(sprinklerBuf(),t,{gain:.035,pan:sp,lp:6000}),1);
    s.every(7,18,t=>{for(let i=0,n=1+(Math.random()*3|0);i<n;i++)s.one(voiceBuf('kid',pick(['haha','yay','woo']),Math.random()*3|0),t+i*rr(.3,.7),{gain:rr(.012,.03),lp:2200,pan:rr(-.8,.8),rate:rr(.95,1.1),verb:.6})},4);
    s.every(20,45,t=>{const p=rr(-.9,.9);for(let i=0,n=1+(Math.random()*3|0);i<n;i++)s.one(voiceBuf('dog','bark',Math.random()*3|0),t+i*.3,{gain:.03,lp:1600,pan:p,verb:.7})},9);
    s.every(25,55,t=>s.one(carPassBuf(),t,{gain:.07,pan:-.8,pan2:.8,lp:2000}),12)},
  industrial(s){s.loop(noiseLoop('brown'),{lp:140,gain:.13});s.loop(noiseLoop('pink'),{hp:1200,lp:4000,gain:.04,glfo:[.06,.6]});
    for(const [f,a] of [[60,.012],[120,.008],[180,.004]]){const o=OSC('sine',f),gg=G(a);o.connect(gg);gg.connect(s.g);o.start();s._o=(s._o||[]).concat(o)}
    s.every(5,15,t=>s.one(impactBuf('metal',Math.random()*4|0),t,{gain:.035,lp:2500,pan:rr(-.9,.9),rate:rr(.6,.9),verb:.8}));
    s.every(40,80,t=>s.one(beepBuf(),t,{gain:.012,pan:rr(-.8,.8),lp:3000,verb:.5}),15);
    s.every(12,25,t=>s.one(hissBuf(),t,{gain:.025,pan:rr(-.8,.8),verb:.5}));
    s.every(15,35,t=>s.one(birdBuf('coo',Math.random()*2|0),t,{gain:.03,pan:rr(-.7,.7),verb:.4}),6)},
  den(s){s.loop(noiseLoop('pink'),{lp:350,gain:.05});s.loop(noiseLoop('brown'),{lp:90,gain:.06});
    const hum=OSC('sawtooth',120),hl=BQ('lowpass',1100,1),hg=G(.01);hum.connect(hl);hl.connect(hg);hg.connect(s.g);hum.start();s._o=[hum];
    s.every(10,30,t=>{for(let k=0;k<6;k++){hg.gain.setValueAtTime(k%2?.002:.022,t+k*.05+Math.random()*.03)}hg.gain.setValueAtTime(.01,t+.4)});
    s.every(1.5,5,t=>s.one(dripBuf(Math.random()*4|0),t,{gain:rr(.015,.035),pan:rr(-.7,.7),verb:.4}));
    const spb=60/100;let k=0;const BL=[33,33,45,33,36,33,31,33];
    s.every(spb/2,spb/2,t=>{if(k%2===0)s.one(drumBuf('kick'),t,{gain:.09,lp:160});
      const f=mtof(BL[(k>>0)%8]),o=OSC('sawtooth',f),lp=BQ('lowpass',180,1),gg=G(0);o.connect(lp);lp.connect(gg);gg.connect(s.g);
      gg.gain.setValueAtTime(0,t);gg.gain.linearRampToValueAtTime(.025,t+.01);gg.gain.setTargetAtTime(0,t+spb*.35,.04);o.start(t);o.stop(t+spb*.5+.2);o.onended=()=>{o.disconnect();lp.disconnect();gg.disconnect()};k++},.5)},
  dusk(s){s.loop(noiseLoop('pink'),{lp:500,lfo:[.05,200],gain:.11,glfo:[.04,.4]});
    for(const [k,p,gn] of [[0,.7,.025],[1,-.55,.02],[2,.1,.012],[3,-.85,.015]])s.loop(cricketBuf(k),{gain:gn,pan:p,rate:rr(.98,1.02)});
    s.every(25,50,t=>s.one(carPassBuf(),t,{gain:.05,pan:.8,pan2:-.8,lp:1500}),10);
    s.every(30,60,t=>s.one(birdBuf('owl',0),t,{gain:.03,pan:rr(-.8,.8),verb:.8}),15);
    s.every(35,70,t=>s.one(voiceBuf('dog','bark',Math.random()*3|0),t,{gain:.02,lp:1300,pan:rr(-.9,.9),verb:.8}),20)},
  home(s){s.loop(noiseLoop('pink'),{lp:250,gain:.05});
    const fr=[OSC('sine',50),OSC('sine',100),OSC('sine',150)],fg=G(.012);fr.forEach((o,i)=>{const gg=G([1,.6,.25][i]);o.connect(gg);gg.connect(fg);o.start()});fg.connect(s.g);s._o=fr;
    s.every(30,60,t=>fg.gain.linearRampToValueAtTime(fg.gain.value>.006?.0:.012,t+1.5),20);
    let tk=0;s.every(1,1,t=>s.one(clockBuf(tk++%2),t,{gain:.02,pan:.4,verb:.2}),.3);
    s.every(15,40,t=>s.one(creakBuf(Math.random()*3|0),t,{gain:.012,pan:rr(-.7,.7)}),8);
    s.every(25,60,t=>s.one(voiceBuf('kid',pick(['haha','yay']),Math.random()*3|0),t,{gain:.012,lp:1600,pan:rr(-.8,.8),verb:.5}),12)},
};
let SCN=[],AMB=null;
function ambience(kind){if(!ctx)return;if(kind==='none'||kind==='off')kind=null;if(kind===AMB)return;AMB=kind;
  for(const s of SCN){s.stop();if(s._o)for(const o of s._o)try{o.stop(ctx.currentTime+2.6)}catch(e){}}
  SCN=[];
  if(kind&&SCENES[kind]){const s=Scene(kind);SCENES[kind](s);SCN.push(s);s.tick(ctx.currentTime+.3)}}

/* ---------------------------------------------------------------- mix helpers, lifecycle */
function duck(amt=.4,dur=.35){if(!ctx)return;const t=ctx.currentTime,p=N.duck.gain;p.cancelScheduledValues(t);p.setValueAtTime(p.value,t);p.linearRampToValueAtTime(1-clamp(amt,0,.8)*.5,t+.01);p.setTargetAtTime(1,t+.04,dur*.6)}
function tick(h){musTick(h);for(const s of SCN)s.tick(h)}
/* pre-render buffers a few at a time while the main thread is idle, most-used first */
function warm(){const ids=['pistol','shotgun','rifle','smg','revolver','hunter','double','beanbag','nailer','flare'],jobs=[];
  for(const id of ids)jobs.push(()=>gunClose(id,0),()=>gunSub(id),()=>gunTailOut(id,0),()=>gunTailIn(id,0));
  jobs.splice(8,0,()=>noiseLoop('pink'),()=>noiseLoop('brown'),()=>noiseLoop('white'),()=>mowerBuf(),()=>sprinklerBuf(),()=>carPassBuf(),...['chirp','whistle','trill','warble','coo'].map(k=>()=>birdBuf(k,0)));
  for(const id of ids){if(GUNS[id].cyc)for(const [a] of GUNS[id].cyc)jobs.push(()=>mechBuf(id,a));jobs.push(()=>mechBuf(id,'reload_out'),()=>mechBuf(id,'reload_in'),()=>mechBuf(id,'dry'),()=>mechBuf(id,'equip'))}
  for(const s of ['concrete','wood','metal','dirt','cloth','glass'])jobs.push(()=>impactBuf(s,0));for(const s of ['asphalt','concrete','grass','wood'])jobs.push(()=>stepBuf(s,0),()=>stepBuf(s,1));
  for(const k of ['hitmarker','headshot','kill','ziptie','pickup','cash','click','hover'])jobs.push(()=>uiBuf(k));
  for(const id of ids)jobs.push(()=>gunClose(id,1),()=>gunClose(id,2),()=>gunTailOut(id,1),()=>gunTailIn(id,1));
  for(const m of new Set(SONGS.home.ch.flat().concat([74,71,69])))jobs.push(()=>ksBuf(m));
  const my=ctx,ric=window.requestIdleCallback||(f=>setTimeout(()=>f({timeRemaining:()=>8}),40));
  const step=dl=>{if(ctx!==my)return;let n=0;while(jobs.length&&(n++===0||dl.timeRemaining()>6))jobs.shift()();if(jobs.length)ric(step,{timeout:400})};ric(step,{timeout:400})}
function init(o={}){
  if(o.context){if(timer){clearInterval(timer);timer=null}ctx=o.context;live=false}
  else if(ctx&&live){if(ctx.state==='suspended')ctx.resume();return HT.Audio}
  else{try{ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'})}catch(e){ctx=null;return HT.Audio}live=true}
  S.bypass=!!o.bypass;SR=ctx.sampleRate;CACHE=new Map();VO.length=0;SCN=[];AMB=null;Object.assign(MUS,{song:null,id:null,next:undefined,bar:0,step:0,t:0,loops:0});
  build();
  if(live){if(ctx.state==='suspended')ctx.resume();timer=setInterval(()=>{if(ctx.state==='running')tick(ctx.currentTime+.3)},60);if(o.warm!==false)warm()}
  return HT.Audio}
function setVolume(v={}){for(const k of ['master','sfx','music','ambience'])if(v[k]!=null)S.vol[k]=clamp(+v[k],0,1.5);
  if(!ctx)return;const t=ctx.currentTime;N.master.gain.setTargetAtTime(S.vol.master,t,.05);N.sfx.gain.setTargetAtTime(S.vol.sfx,t,.05);if(MUS.song)N.music.gain.setTargetAtTime(S.vol.music,t,.05);N.amb.gain.setTargetAtTime(S.vol.ambience,t,.05)}
function listener(x,y,z,yaw){const L=S.L;if(typeof x==='object'&&x){L.x=x.x;L.y=x.y;L.z=x.z;if(y!=null)L.yaw=y}else{L.x=x;L.y=y;L.z=z;L.yaw=yaw||0}}
/* drop-in for the old snd(kind,vol) calls */
function legacy(kind,vol=1){if(!ctx)return;const L=S.L,ahead={x:L.x-Math.sin(L.yaw)*20,y:L.y,z:L.z-Math.cos(L.yaw)*20};
  switch(kind){case 'pistol':case 'shotgun':case 'rifle':return gun(kind,{vol});case 'enemy':return gun('pistol',{pos:ahead,vol:vol*2});
    case 'click':return mech('pistol','dry');case 'smash':return impact('glass',null);case 'cuff':return ui('ziptie');
    case 'hit':return play(crashBuf(vol>.6?2:vol>.3?1:0,0),{gain:.3+.5*vol,prio:4});case 'reload':return mech('pistol','reload_in');default:return ui('click')}}

HT.Audio={_ver:1,init,setVolume,listener,gun,mech,shellCasing,impact,whizz,footstep,ui,stinger,voice,vehicle,ambience,music,legacy,duck,
  hitmarker:()=>ui('hitmarker'),headshot:()=>ui('headshot'),zipTie:()=>ui('ziptie'),pickup:()=>ui('pickup'),cash:()=>ui('cash'),uiHover:()=>ui('hover'),uiClick:()=>ui('click'),
  setIndoor(b){S.indoor=!!b},setIntensity(x){MUS.int=clamp(x,0,1)},
  pause(b){if(!ctx||!live)return;b?ctx.suspend():ctx.resume()},
  get ctx(){return ctx},get output(){return N.out},get ready(){return !!ctx},
  /* job synths (js/jobs/*.js): play through the game's sfx/ui buses so the volume sliders and ducking apply.
     bus(name) -> the GainNode ('sfx' default, 'ui', 'music'); tone({f,to,type,d,gain,at,bus,attack}) -> a short enveloped oscillator */
  bus(name){return N[name||'sfx']||N.sfx||null},
  tone(o){o=o||{};if(!ctx||!N.sfx)return null;const t=ctx.currentTime+(o.at||0),d=o.d||.15,g=ctx.createGain(),os=ctx.createOscillator();os.type=o.type||'sine';os.frequency.setValueAtTime(o.f||440,t);
    if(o.to)os.frequency.exponentialRampToValueAtTime(Math.max(20,o.to),t+d);const v=o.gain==null?.2:o.gain,a=o.attack||.008;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    os.connect(g);g.connect(N[o.bus||'sfx']||N.sfx);os.start(t);os.stop(t+d+.05);os.onended=()=>{os.disconnect();g.disconnect()};return os},
  get state(){return{ctx:ctx&&ctx.state,voices:VO.length,music:MUS.id,ambience:AMB,cached:CACHE.size}},
  guns:Object.keys(GUNS),_advance(sec){if(ctx)tick(ctx.currentTime+sec)},_maxVoices(n){MAXV=n}};
})();
