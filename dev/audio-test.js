/* Offline audio test: renders every sound through OfflineAudioContext in headless Chromium and checks
   that it is non-silent, does not clip, has a sensible length and that each gun is measurably distinct.
   Run: node dev/audio-test.js   (needs the playwright package; exits non-zero on failure) */
const path=require('path');
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch();const page=await browser.newPage();const errors=[];
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('file://'+path.resolve(__dirname,'audio.html'));
  const res=await page.evaluate(async()=>{
    const A=HT.Audio,SR=48000;let seed=12345;Math.random=()=>(seed=(Math.imul(seed,1103515245)+12345)>>>0)/4294967296;  // reproducible variants
    function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]]}}
      for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a);for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let j=0;j<len/2;j++){const ur=re[i+j],ui=im[i+j],vr=re[i+j+len/2]*cr-im[i+j+len/2]*ci,vi=re[i+j+len/2]*ci+im[i+j+len/2]*cr;
        re[i+j]=ur+vr;im[i+j]=ui+vi;re[i+j+len/2]=ur-vr;im[i+j+len/2]=ui-vi;const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t}}}}
    function spectrum(x,from,n){const re=new Float64Array(n),im=new Float64Array(n);for(let i=0;i<n&&from+i<x.length;i++)re[i]=x[from+i]*(.5-.5*Math.cos(2*Math.PI*i/n));fft(re,im);
      const p=new Float64Array(n/2);for(let i=0;i<n/2;i++)p[i]=re[i]*re[i]+im[i]*im[i];return p}
    function band(p,n,f0,f1){let s=0;for(let i=Math.floor(f0*n/SR);i<Math.min(p.length,f1*n/SR);i++)s+=p[i];return s}
    /* sounds start at t=1 s: the master compressor needs its release time to settle after creation */
    async function render(sec,fn){const PRE=1,oc=new OfflineAudioContext(2,Math.round((sec+PRE)*SR),SR);A.init({context:oc});A.listener(0,1.6,0,0);
      oc.suspend(PRE).then(()=>{fn(A);A._advance(sec);oc.resume()});
      const b=await oc.startRendering(),o0=PRE*SR,L=b.getChannelData(0).slice(o0),R=b.getChannelData(1).slice(o0),x=new Float32Array(L.length);for(let i=0;i<x.length;i++)x[i]=(L[i]+R[i])*.5;
      let peak=0,nan=0,ss=0;for(let i=0;i<L.length;i++){const v=Math.max(Math.abs(L[i]),Math.abs(R[i]));if(!(v===v))nan++;if(v>peak)peak=v;ss+=x[i]*x[i]}
      let on=0;while(on<x.length&&Math.abs(x[on])<peak*.05)on++;
      // decay: last sample whose 10 ms RMS is above -40 dB of the loudest 10 ms window
      const w=480,rms=[];for(let i=0;i+w<=x.length;i+=w){let s=0;for(let j=i;j<i+w;j++)s+=x[j]*x[j];rms.push(Math.sqrt(s/w))}
      const mx=Math.max(...rms);let last=0;for(let i=0;i<rms.length;i++)if(rms[i]>mx*.01)last=i;
      const n=8192,p=spectrum(x,on,n),tot=band(p,n,20,20000)||1e-12;let cen=0;for(let i=0;i<p.length;i++)cen+=i*SR/n*p[i];
      const p1=spectrum(x,on,512),t1=band(p1,512,20,20000)||1e-12;
      let pk=0,pkI=on;for(let i=on;i<Math.min(x.length,on+SR*.05);i++)if(Math.abs(x[i])>pk){pk=Math.abs(x[i]);pkI=i}
      let e0=0,eT=0;for(let i=on;i<x.length;i++){const v=x[i]*x[i];eT+=v;if(i<on+SR*.15)e0+=v}
      return{peak:+peak.toFixed(3),rms:+Math.sqrt(ss/x.length).toFixed(4),nan,onset:+(on/SR).toFixed(3),dur:+((last+1)*w/SR-on/SR).toFixed(2),
        centroid:Math.round(cen/tot),hi3k:+(band(p,n,3000,20000)/tot).toFixed(4),low:+(band(p,n,20,200)/tot).toFixed(3),hiAttack:+(band(p1,512,4000,20000)/t1).toFixed(3),
        rise_ms:+((pkI-on)/SR*1000).toFixed(2),tail:+(1-e0/(eT||1)).toFixed(3),width:(()=>{let d=0,s=0;for(let i=0;i<L.length;i++){d+=(L[i]-R[i])**2;s+=(L[i]+R[i])**2}return +(d/(s||1)).toFixed(3)})()}}
    const out={guns:{},gunsNear:{},gunsFar:{},gunsIndoor:{},other:{}};
    for(const g of A.guns)out.guns[g]=await render(4,a=>a.gun(g,{pos:null,cycle:false}));
    out.variants={};for(const g of ['pistol','rifle'])for(let v=0;v<3;v++)out.variants[g+v]=await render(1,a=>a.gun(g,{cycle:false,variant:v}));
    for(const g of A.guns)out.gunsNear[g]=await render(4,a=>a.gun(g,{pos:{x:2,y:1.6,z:-5}}));
    for(const g of A.guns)out.gunsFar[g]=await render(4,a=>a.gun(g,{pos:{x:30,y:1.6,z:-60}}));
    for(const g of ['pistol','shotgun','rifle'])out.gunsIndoor[g]=await render(3,a=>a.gun(g,{pos:null,indoor:true,cycle:false}));
    out.other['pistol suppressed']=await render(3,a=>a.gun('pistol',{suppressed:true}));
    const O=(k,sec,fn)=>render(sec,fn).then(r=>out.other[k]=r);
    for(const g of ['pistol','shotgun','revolver','double','hunter','nailer'])for(const m of ['equip','reload_out','reload_in','pump','bolt','dry','shell'])await O(`mech ${g} ${m}`,1.5,a=>a.mech(g,m));
    for(const s of ['concrete','wood','grass','metal'])await O('casing '+s,1.5,a=>a.shellCasing(s));
    for(const s of ['concrete','wood','metal','glass','dirt','cloth'])await O('impact '+s,1.5,a=>a.impact(s,{x:2,y:1,z:-5}));
    await O('whizz',1,a=>a.whizz({x:1,y:1.6,z:-1}));
    for(const s of ['asphalt','concrete','grass','wood','tile'])for(const m of ['walk','run','crouch'])await O(`step ${s} ${m}`,.6,a=>a.footstep(s,{run:m==='run',crouch:m==='crouch'}));
    for(const k of ['hitmarker','headshot','ziptie','pickup','cash','hover','click','start','win','fail'])await O('ui '+k,3,a=>a.ui(k));
    for(const k of ['dad','dad_alert','dad_hurt','thug_alert','thug_surrender','kid','kid_laugh','dog'])await O('voice '+k,1.5,a=>a.voice(k,{x:2,y:1.6,z:-3}));
    await O('voice dad radio',1.5,a=>a.voice('dad',null,{radio:true}));
    await O('vehicle idle',2.5,a=>{const v=a.vehicle();v.set({rpm:.05,throttle:0,speed:0})});
    await O('vehicle cruise',2.5,a=>{const v=a.vehicle({start:false});v.set({rpm:.6,throttle:.8,speed:20})});
    await O('vehicle skid',2.5,a=>{const v=a.vehicle({start:false});v.set({rpm:.4,throttle:0,speed:15,skid:1})});
    await O('vehicle horn+door+crash',2.5,a=>{const v=a.vehicle({start:false});v.horn('double');v.door('slide');v.crash(1)});
    for(const k of ['suburb','industrial','den','dusk','home'])await O('ambience '+k,8,a=>a.ambience(k));
    for(const k of ['hub','tension','combat','victory','home'])await O('music '+k,8,a=>a.music(k));
    // bar-synced transition: hub then combat requested 1 s in (no real time passes offline, so request before render)
    await O('music hub->combat',8,a=>{a.music('hub');a._advance(1.2);a.music('combat')});
    await O('ambience suburb->den',8,a=>{a.ambience('suburb');a.ambience('den')});
    return out});
  await browser.close();
  const fails=[];const chk=(c,m)=>{if(!c)fails.push(m)};
  const all={...res.guns,...Object.fromEntries(Object.entries(res.gunsFar).map(([k,v])=>['far '+k,v])),...Object.fromEntries(Object.entries(res.gunsIndoor).map(([k,v])=>['indoor '+k,v])),...res.other};
  for(const [k,r] of Object.entries(all)){chk(r.nan===0,k+': NaN');chk(r.peak>.02,k+': silent (peak '+r.peak+')');chk(r.peak<=.995,k+': clipping (peak '+r.peak+')')}
  const G=res.guns;
  console.log('\nPlayer guns, outdoor, through the master chain:');
  console.table(Object.fromEntries(Object.entries(G).map(([k,v])=>[k,{peak:v.peak,rms:v.rms,'dur(s)':v.dur,'centroid(Hz)':v.centroid,'low<200Hz':v.low,'hi>4k attack':v.hiAttack,'rise(ms)':v.rise_ms,'tail>150ms':v.tail}])));
  console.log('Enemy guns at 67 m:');console.table(Object.fromEntries(Object.entries(res.gunsFar).map(([k,v])=>[k,{peak:v.peak,'dur(s)':v.dur,'centroid(Hz)':v.centroid,'>3k':v.hi3k,'tail>150ms':v.tail,onset:v.onset}])));
  console.log('Enemy guns at 5 m:');console.table(Object.fromEntries(Object.entries(res.gunsNear).map(([k,v])=>[k,{peak:v.peak,'dur(s)':v.dur,'centroid(Hz)':v.centroid,'>3k':v.hi3k,'hi>4k attack':v.hiAttack}])));
  console.log('Indoor:');console.table(res.gunsIndoor);
  // spectral character checks
  chk(G.shotgun.low>G.pistol.low,'shotgun should have more low end than pistol');
  chk(G.shotgun.dur>G.pistol.dur,'shotgun tail should be longer than pistol');
  chk(G.double.low>=G.shotgun.low*.9&&G.double.dur>=G.shotgun.dur,'double should be at least as big as the pump');
  {const V=res.variants,pa=[0,1,2].map(v=>V['pistol'+v].hiAttack),ra=[0,1,2].map(v=>V['rifle'+v].hiAttack);console.log('attack >4k share per variant  pistol:',pa.join(' '),' rifle:',ra.join(' '));
   chk(Math.min(...ra)>Math.max(...pa),'rifle transient should be sharper than pistol on every variant')}
  chk(G.hunter.dur>G.rifle.dur,'hunting rifle echo should outlast carbine');
  chk(G.nailer.dur<G.pistol.dur&&G.nailer.centroid>G.pistol.centroid,'nailer should be short and bright');
  chk(G.smg.dur<G.rifle.dur,'smg tail shorter than rifle');
  chk(G.revolver.low>G.pistol.low&&G.revolver.dur>G.pistol.dur,'revolver bigger than pistol');
  for(const g of Object.keys(res.gunsFar)){const f=res.gunsFar[g],n=res.gunsNear[g];chk(f.onset>.15,`far ${g}: no speed-of-sound delay`);chk(n.hi3k<.003||f.hi3k<n.hi3k*.7,`far ${g}: not darker than close (${f.hi3k} vs ${n.hi3k})`)}
  chk(res.gunsIndoor.pistol.dur<G.pistol.dur,'indoor pistol tail should be shorter than outdoor rolling echo');
  // pairwise distinctness on a normalized feature vector
  const ids=Object.keys(G),F=ids.map(k=>[Math.log(G[k].centroid),G[k].low*4,Math.log(G[k].dur+.05),G[k].hiAttack*2,G[k].tail*2,Math.log(G[k].rms)]);
  let minD=1e9,minP='';for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const d=Math.hypot(...F[i].map((v,k)=>v-F[j][k]));if(d<minD){minD=d;minP=ids[i]+'/'+ids[j]}}
  console.log(`Closest gun pair in feature space: ${minP} (distance ${minD.toFixed(3)})`);chk(minD>.15,'two guns are too similar: '+minP);
  console.log('\nOther sounds:');console.table(Object.fromEntries(Object.entries(res.other).map(([k,v])=>[k,{peak:v.peak,rms:v.rms,'dur(s)':v.dur,'centroid(Hz)':v.centroid}])));
  chk(errors.length===0,'console errors: '+errors.join(' | '));
  if(fails.length){console.log('\nFAIL\n - '+fails.join('\n - '));process.exit(1)}else console.log('\nAll audio checks passed.');
})().catch(e=>{console.error(e);process.exit(1)});
