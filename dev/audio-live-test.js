/* Live smoke test: real AudioContext, warm-up timing, every button on dev/audio.html, a burst of automatic fire. Usage: node dev/audio-live-test.js */
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage();const errs=[];
p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.type()+': '+m.text())});p.on('pageerror',e=>errs.push(String(e)));
await p.goto('file://'+require('path').resolve(__dirname,'audio.html'));await p.click('#go');const w0=Date.now();await p.waitForFunction(()=>HT.Audio.state.cached>150,null,{timeout:20000,polling:50});console.log('warm-up finished in',Date.now()-w0,'ms, buffers:',await p.evaluate(()=>HT.Audio.state.cached));
const t=await p.evaluate(()=>{const A=HT.Audio,o={};for(const g of A.guns){const t0=performance.now();A.gun(g);o[g]=(performance.now()-t0).toFixed(1)}
  const t1=performance.now();A.gun('rifle');o['rifle (cached)']=(performance.now()-t1).toFixed(2);
  let t2=performance.now();A.ambience('suburb');o.ambSuburb=(performance.now()-t2).toFixed(1);t2=performance.now();A.music('hub');o.musicHub=(performance.now()-t2).toFixed(1);
  t2=performance.now();A.voice('dad');o.voiceFirst=(performance.now()-t2).toFixed(1);return o});
console.log('first-call ms (includes one-time buffer synthesis):',t);
const btns=await p.$$('button');for(const bt of btns){await bt.click();await p.waitForTimeout(40)}
const st=await p.evaluate(async()=>{const A=HT.Audio;let n=0,maxV=0;await new Promise(r=>{const T=setInterval(()=>{A.gun('rifle');A.gun('smg',{pos:{x:10,y:1.6,z:-20}});A.impact('concrete',{x:3,y:0,z:-8});n++;maxV=Math.max(maxV,A.state.voices);if(n>30){clearInterval(T);r()}},100)});
  return{shots:n,maxVoices:maxV,state:A.state}});
console.log('stress:',st);await p.waitForTimeout(3000);
console.log('final state',await p.evaluate(()=>HT.Audio.state));console.log('console errors/warnings:',errs.length?errs:'none');await b.close()})();
