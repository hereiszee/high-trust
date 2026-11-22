/* SAV-03 regression: the Frame rate cap limiter (js/fpscap.js) simulated against common refresh rates, with frame-time jitter.
   Expect min(cap, refresh) within 1.5% for caps 30/60/120/144 at 60/75/90/120/144/165/240 Hz, and an even pace (no frame
   interval longer than two refresh periods past the target). Also checks index.html still uses it. Run: node dev/fpscap.test.js */
'use strict';
const fs=require('fs'),path=require('path');const FC=require('../js/fpscap.js');
const src=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
ok(/HT\.FrameCap/.test(src)&&/<script src="js\/fpscap\.js">/.test(src),'index.html loads js/fpscap.js and gates frames with HT.FrameCap');
ok(!/now-last<1000\/cap-2/.test(src),'the old vsync-skipping gate is gone');
let seed=1;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
function sim(hz,cap,secs=20,jit=.5,seedHz){const g=FC.make(seedHz),T=1000/hz;let n=0,lastR=null,worst=0;
  for(let k=1;k<=hz*secs;k++){const now=k*T+(rnd()-.5)*jit;if(g.gate(now,cap)){n++;if(lastR!=null)worst=Math.max(worst,now-lastR);lastR=now}}
  return{fps:n/secs,worst}}
const rows=[];
for(const hz of[60,75,90,120,144,165,240]){const cells=[];
  for(const cap of[30,60,120,144]){const want=Math.min(cap,hz);
    for(const seedHz of[undefined,hz]){const r=sim(hz,cap,20,.5,seedHz);const good=Math.abs(r.fps-want)/want<.015&&r.worst<=1000/cap+2*1000/hz+1;
      if(!good)ok(false,`${hz} Hz cap ${cap}${seedHz?' (seeded)':''}: ${r.fps.toFixed(1)} fps (want ${want}), worst interval ${r.worst.toFixed(1)} ms`);
      if(!seedHz)cells.push(`cap ${cap} -> ${r.fps.toFixed(1)}`)}}
  rows.push(`${String(hz).padStart(3)} Hz: ${cells.join(' | ')}`)}
console.log(rows.join('\n'));
/* no cap: every frame */
ok(sim(144,0).fps>143.9,'cap 0 renders every frame');
/* a 300 ms stall must not be followed by a burst */
{const g=FC.make(),T=1000/144;let burst=0,t=0;for(let k=1;k<400;k++){t+=k===200?300:T;if(g.gate(t,60)&&k>200&&k<206)burst++}ok(burst<=2,'no catch-up burst after a stall ('+burst+' frames in the next 5 vsyncs)')}
console.log(fails?fails+' FAILED':'all ok');process.exitCode=fails?1:0;
