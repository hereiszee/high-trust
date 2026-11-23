/* Renders the trailer's music cues and spot effects from the game's own synth (js/audio.js, HT.Audio) through an
   OfflineAudioContext in headless Chromium: HT.Audio.init({context}) drives the same instruments, sequencer and sound
   functions the game uses live, just faster than real time and sample-exact. Output: <scratch>/audio/*.wav (48 kHz stereo).
   node tools/trailer/audio.js [cue ...] */
'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const {ROOT,SCRATCH}=require('./lib.js');
const OUT=path.join(SCRATCH,'audio');
/* each cue: seconds, and a page-side function body run with (A,oc,at) where at(t,fn) schedules fn at t seconds */
const CUES={
  /* music: the game's own songs (js/audio.js SONGS), started on bar 0 and left to run */
  hub:[62,`A.music('hub',{intensity:.7})`],
  hub_low:[22,`A.music('hub',{intensity:.1})`],
  combat:[16,`A.music('combat',{intensity:.9})`],
  tension:[13,`A.music('tension',{intensity:.6})`],
  home:[27,`A.music('home',{intensity:.6})`],
  victory:[9,`A.music('victory')`],
  st_start:[3,`at(.05,()=>A.stinger('start'))`],
  st_win:[4,`at(.05,()=>A.stinger('win'))`],
  /* effects */
  ziptie:[1.2,`at(.05,()=>A.zipTie())`],
  cash:[2.8,`at(.05,()=>A.cash())`],
  objective:[1.8,`at(.05,()=>A.ui('objective'))`],
  horn_shave:[2.2,`const v=A.vehicle({start:false,inside:false});v.set({rpm:.15});at(.1,()=>v.horn('shave'))`],
  horn_double:[1,`const v=A.vehicle({start:false,inside:false});at(.05,()=>v.horn('double'))`],
  horn_long:[1.4,`const v=A.vehicle({start:false,inside:false});at(.05,()=>v.horn('long'))`],
  engine_pull:[4.5,`const v=A.vehicle({start:true,inside:false});for(let i=0;i<=40;i++){const t=.9+i*.08;at(t,()=>v.set({rpm:Math.min(1,.15+i*.03),throttle:i<30?1:.4,speed:i*.5}))}`],
  engine_launch:[4,`const v=A.vehicle({start:false,inside:false});at(.02,()=>v.set({rpm:.85,throttle:1,speed:0}));for(let i=0;i<=40;i++){const t=.6+i*.08;at(t,()=>v.set({rpm:Math.min(1,.5+((i*.04)%0.5)),throttle:1,speed:i*1.4,skid:i<6?1:0}))}`],
  chirp:[1.2,`const v=A.vehicle({start:false,inside:false});at(.02,()=>v.set({rpm:.6,throttle:.8,speed:10,skid:1}));at(.45,()=>v.set({rpm:.4,throttle:.3,speed:10,skid:0}))`],
  tree:[2.2,`const b=(f,d)=>A.tone({f,type:'square',d,gain:.08,bus:'ui'});at(.05,()=>b(600,.12));at(.55,()=>b(600,.12));at(1.05,()=>b(600,.12));at(1.55,()=>b(1200,.4))`],
  crowd:[6,`for(let i=0;i<46;i++){const t=.1+Math.random()*5.2;const k=['dad_cheer','kid_yay','kid','dad_laugh','dad_cheer'][i%5];at(t,()=>A.voice(k,{x:(Math.random()-.5)*30,y:1.6,z:-6-Math.random()*20},{vol:.8}))}`],
  amb_suburb:[14,`A.ambience('suburb')`],
  amb_dusk:[10,`A.ambience('dusk')`],
  /* the tank's own report (js/tank.js boom) and the jet's engine voice + sonic boom (js/jet.js jetSound/boom), rebuilt on the same graph */
  tank:[3,`at(.05,()=>{const ctx=A.ctx,out=A.bus('sfx'),t=ctx.currentTime,g=ctx.createGain(),len=2.4,buf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*len),ctx.sampleRate),d=buf.getChannelData(0);let b=0;for(let i=0;i<d.length;i++){b=b*.985+(Math.random()*2-1)*.06;d[i]=b*Math.exp(-i/ctx.sampleRate*1.7)*3}
    const n=ctx.createBufferSource();n.buffer=buf;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(900,t);lp.frequency.exponentialRampToValueAtTime(120,t+1.6);n.connect(lp);lp.connect(g);g.gain.setValueAtTime(.9,t);g.gain.exponentialRampToValueAtTime(.001,t+len);g.connect(out);n.start(t);
    const o=ctx.createOscillator(),og=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(70,t);o.frequency.exponentialRampToValueAtTime(28,t+.5);og.gain.setValueAtTime(.8,t);og.gain.exponentialRampToValueAtTime(.001,t+.7);o.connect(og);og.connect(out);o.start(t);o.stop(t+.8)})`],
  jet:[6,`at(.02,()=>{const ctx=A.ctx,out=A.bus('sfx'),t=ctx.currentTime,len=2,buf=ctx.createBuffer(1,ctx.sampleRate*len,ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    const n=ctx.createBufferSource();n.buffer=buf;n.loop=true;const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.Q.value=.7;const g=ctx.createGain();n.connect(bp);bp.connect(g);
    const o=ctx.createOscillator();o.type='sawtooth';const og=ctx.createGain();const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2400;o.connect(lp);lp.connect(og);
    const pan=ctx.createStereoPanner();g.connect(pan);og.connect(pan);pan.connect(out);
    /* a pass: the engine swells, peaks at 2.6 s and falls away with a doppler drop, panning left to right */
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55,t+2.6);g.gain.exponentialRampToValueAtTime(.01,t+5.8);og.gain.setValueAtTime(0,t);og.gain.linearRampToValueAtTime(.05,t+2.5);og.gain.exponentialRampToValueAtTime(.001,t+5);
    bp.frequency.setValueAtTime(900,t);bp.frequency.linearRampToValueAtTime(2300,t+2.5);bp.frequency.linearRampToValueAtTime(700,t+3.2);o.frequency.setValueAtTime(1500,t);o.frequency.linearRampToValueAtTime(1350,t+2.5);o.frequency.linearRampToValueAtTime(800,t+3.1);
    pan.pan.setValueAtTime(-.8,t);pan.pan.linearRampToValueAtTime(.8,t+4);n.start(t);o.start(t);n.stop(t+6);o.stop(t+6);
    for(const[dl,v]of[[2.7,1],[2.82,.8]]){const L=1.6,bb=ctx.createBuffer(1,ctx.sampleRate*L,ctx.sampleRate),dd=bb.getChannelData(0);let b=0;for(let i=0;i<dd.length;i++){b=b*.97+(Math.random()*2-1)*.1;dd[i]=b*Math.exp(-i/ctx.sampleRate*3)*4}
      const s=ctx.createBufferSource();s.buffer=bb;const l2=ctx.createBiquadFilter();l2.type='lowpass';l2.frequency.value=500;const g2=ctx.createGain();g2.gain.value=v;s.connect(l2);l2.connect(g2);g2.connect(out);s.start(t+dl)}})`],
  /* v2 cut accents, on the game's sfx bus: a whoosh (noise through a sweeping band-pass) and a low impact (the tank report's sub thump, short) */
  whoosh:[1.2,`at(.02,()=>{const ctx=A.ctx,out=A.bus('sfx'),t=ctx.currentTime,len=1,buf=ctx.createBuffer(1,ctx.sampleRate*len,ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    const n=ctx.createBufferSource();n.buffer=buf;const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.Q.value=1.4;bp.frequency.setValueAtTime(300,t);bp.frequency.exponentialRampToValueAtTime(3200,t+.32);bp.frequency.exponentialRampToValueAtTime(700,t+.6);
    const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55,t+.3);g.gain.exponentialRampToValueAtTime(.001,t+.75);const pan=ctx.createStereoPanner();pan.pan.setValueAtTime(-.6,t);pan.pan.linearRampToValueAtTime(.6,t+.6);
    n.connect(bp);bp.connect(g);g.connect(pan);pan.connect(out);n.start(t);n.stop(t+1)})`],
  impact:[1.4,`at(.02,()=>{const ctx=A.ctx,out=A.bus('sfx'),t=ctx.currentTime;const o=ctx.createOscillator(),og=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(90,t);o.frequency.exponentialRampToValueAtTime(32,t+.45);og.gain.setValueAtTime(.95,t);og.gain.exponentialRampToValueAtTime(.001,t+.8);o.connect(og);og.connect(out);o.start(t);o.stop(t+.9);
    const len=.6,buf=ctx.createBuffer(1,ctx.sampleRate*len,ctx.sampleRate),d=buf.getChannelData(0);let b=0;for(let i=0;i<d.length;i++){b=b*.9+(Math.random()*2-1)*.2;d[i]=b*Math.exp(-i/ctx.sampleRate*9)*2.5}
    const n=ctx.createBufferSource();n.buffer=buf;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1400;n.connect(lp);lp.connect(out);n.start(t)})`],
  chute:[1,`at(.05,()=>A.tone({f:200,to:900,type:'triangle',d:.5,gain:.15}))`],
  shot_beanbag:[1.5,`at(.05,()=>A.gun('beanbag'))`],
  shot_pistol:[1.5,`at(.05,()=>A.gun('pistol'))`],
  shot_rifle:[2,`at(.05,()=>A.gun('rifle'))`],
  ding:[1.2,`at(.05,()=>{A.tone({f:1320,to:1300,type:'sine',d:.6,gain:.32});A.tone({f:3577,to:3540,type:'sine',d:.3,gain:.09})})`],
  slide_door:[1.3,`at(.05,()=>{const v=A.vehicle({start:false,inside:false});v.door('slide')})`],
};
function wav(chs,sr){const n=chs[0].length,c=chs.length,b=Buffer.alloc(44+n*c*2);b.write('RIFF',0);b.writeUInt32LE(36+n*c*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(c,22);
  b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*c*2,28);b.writeUInt16LE(c*2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*c*2,40);
  for(let i=0;i<n;i++)for(let k=0;k<c;k++){const v=Math.max(-1,Math.min(1,chs[k][i]));b.writeInt16LE(Math.round(v*32767),44+(i*c+k)*2)}return b}
(async()=>{fs.mkdirSync(OUT,{recursive:true});const want=process.argv.slice(2);
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage();
  await p.route('http://ht.local/**',r=>{const u=new URL(r.request().url());if(u.pathname==='/blank.html')return r.fulfill({status:200,body:'<!doctype html><meta charset=utf-8><body>',headers:{'content-type':'text/html'}});
    const f=path.join(ROOT,u.pathname);r.fulfill({status:200,body:fs.readFileSync(f),headers:{'content-type':'application/javascript'}})});
  await p.goto('http://ht.local/blank.html');await p.addScriptTag({url:'http://ht.local/js/audio.js'});
  for(const[k,[sec,body]]of Object.entries(CUES)){if(want.length&&!want.includes(k))continue;
    const r=await p.evaluate(async([sec,body])=>{const SR=48000,A=window.HT.Audio,oc=new OfflineAudioContext(2,Math.round(sec*SR),SR);A.init({context:oc});A.listener(0,1.6,0,0);
      const Q=new Map(),at=(t,fn)=>{const q=Math.max(128,Math.round(t*SR/128)*128);if(q>=sec*SR)return;if(!Q.has(q)){Q.set(q,[]);oc.suspend(q/SR).then(()=>{for(const f of Q.get(q)){try{f()}catch(e){console.error(e)}}oc.resume()})}Q.get(q).push(fn)};
      /* the music sequencer and ambience scheduler look ahead from currentTime: tick them every half second */
      for(let t=.25;t<sec;t+=.5)at(t,()=>A._advance(.6));
      new Function('A','oc','at',body)(A,oc,at);
      const buf=await oc.startRendering();return[buf.getChannelData(0),buf.getChannelData(1)].map(a=>Array.from(a))},[sec,body]);
    const f=path.join(OUT,k+'.wav');fs.writeFileSync(f,wav(r.map(a=>Float32Array.from(a)),48000));let pk=0;for(const a of r)for(const v of a)pk=Math.max(pk,Math.abs(v));console.log(k.padEnd(14),sec+'s','peak',pk.toFixed(3))}
  await b.close()})();
