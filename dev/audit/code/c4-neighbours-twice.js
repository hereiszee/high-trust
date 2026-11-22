/* C-4: index.html declares function owNeighbours twice (two merged implementations); the later one wins for both call sites, so
   HT.OpenWorld.neighbours runs twice per hub frame and the first implementation is dead. node dev/audit/code/c4-neighbours-twice.js */
const {open}=require('../../ai-ingame-lib.js');const fs=require('fs');
const src=fs.readFileSync(__dirname+'/../../../index.html','utf8').split('\n');
src.forEach((l,i)=>{if(/function owNeighbours\(/.test(l))console.log('index.html:'+(i+1)+' declares '+l.trim().slice(0,60));if(/\bowNeighbours\(dt/.test(l)&&!/function owNeighbours/.test(l))console.log('index.html:'+(i+1)+' calls   '+(l.match(/owNeighbours\([^)]*\)/)||[''])[0])});
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{try{localStorage.removeItem('ht-save')}catch(_){}const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(3)});
  const r=await ev(()=>{const O=HT.OpenWorld;let n=0,dts=[];const f=O.neighbours;O.neighbours=(dt,o)=>{n++;dts.push(+dt.toFixed(4));return f(dt,o)};
    window.__ht.step(10);O.neighbours=f;return{steps:10,calls:n,dts:dts.slice(0,6),OWS_nb:window.__ht.OWS.nb===undefined?'never created (first owNeighbours is dead)':window.__ht.OWS.nb.length}});
  console.log(JSON.stringify(r));console.log(errs.length?'console errors: '+errs.slice(0,4).join(' | '):'no console errors');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
