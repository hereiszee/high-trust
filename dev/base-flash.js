/* Fort Sensible: no hitch when the flashlight (F) or the goggles (N) go on.  node dev/base-flash.js [--json]
   Each case is a fresh session (the hitch, when there is one, is the first press): get into the state, settle, time six ordinary frames
   (logic step + render, ms), press the real key, time the frame that follows and the worst of the next three. Cases: under the parachute
   (the whole town in the flight draw radius), in the jet in the air, in the tank, on foot at night, goggles at night.
   Fails if the frame after the press costs more than max(3x the median frame, median + 120 ms), or on console errors. */
const {open}=require('./ai-ingame-lib.js');
let fails=0;const ok=(c,m)=>{console.log((c?'  ok   ':'  FAIL ')+m);if(!c)fails++};
const CASES={
  chute:async(ev,p)=>{await ev(()=>{const H=window.__ht,d=HT.Base.def();H.P.pos.set(d.jet.x,0,d.jet.z-4.6);H.step(4)});await p.keyboard.press('e');await ev(()=>window.__ht.step(4));
    await ev(()=>{const F=HT.Jet.F;F.air=true;F.gear=0;F.gearK=0;F.spd=70;F.thr=.6;F.pos.set(120,170,80);window.__ht.step(2)});await p.keyboard.press('e');await ev(()=>window.__ht.step(2));await p.keyboard.press('e');
    await ev(()=>{const H=window.__ht;for(let i=0;i<40;i++){H.step(1);H.ow.update(H.camera)}});return'f'},
  jet:async(ev,p)=>{await ev(()=>{const H=window.__ht,d=HT.Base.def();H.P.pos.set(d.jet.x,0,d.jet.z-4.6);H.step(4)});await p.keyboard.press('e');
    await ev(()=>{const H=window.__ht,F=HT.Jet.F;F.air=true;F.gear=0;F.gearK=0;F.spd=80;F.thr=.6;F.pos.set(150,100,120);for(let i=0;i<40;i++){H.step(1);H.ow.update(H.camera);F.pos.y=100}});return'f'},
  tank:async(ev,p)=>{await ev(()=>{const H=window.__ht,d=HT.Base.def();H.P.pos.set(d.tank.x+2.6,0,d.tank.z);H.step(4)});await p.keyboard.press('e');await ev(()=>{const H=window.__ht;for(let i=0;i<20;i++){H.step(1);H.ow.update(H.camera)}});return'f'},
  night:async(ev,p)=>{await ev(()=>{const H=window.__ht;H.P.pos.set(60,0,40);H.setNight(1);for(let i=0;i<30;i++){H.step(1);H.ow.update(H.camera)}});return'f'},
  nvg:async(ev,p)=>{await ev(()=>{const H=window.__ht;H.P.pos.set(60,0,40);H.giveNvg(1);H.setNight(1);for(let i=0;i<30;i++){H.step(1);H.ow.update(H.camera)}});return'n'}};
(async()=>{const want=process.argv.slice(2).filter(a=>!a.startsWith('--'));const rows={};
  for(const name of Object.keys(CASES)){if(want.length&&!want.includes(name))continue;
    const {b,p,errs}=await open({viewport:{width:1280,height:720}});const ev=(f,a)=>p.evaluate(f,a);
    await ev(()=>{try{localStorage.removeItem('ht-save')}catch(_){}const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(3)});
    const key=await CASES[name](ev,p);
    const frame=()=>ev(()=>{const H=window.__ht,t=performance.now();H.step(1);H.ow.update(H.camera);H.draw();return performance.now()-t});
    for(let i=0;i<4;i++)await frame();/* warm */const base=[];for(let i=0;i<6;i++)base.push(await frame());base.sort((a,b)=>a-b);const med=base[3];
    await p.keyboard.press(key);const after=await frame();let worst=after;for(let i=0;i<3;i++)worst=Math.max(worst,await frame());
    const st=await ev(()=>({flash:window.NIGHT&&NIGHT.flash,nvg:window.NIGHT&&NIGHT.nvg,lights:(()=>{let n=0;window.__ht.scene.traverse(o=>{if(o.isLight)n++});return n})()}));
    rows[name]={key,medianMs:+med.toFixed(1),afterMs:+after.toFixed(1),worstNext3Ms:+worst.toFixed(1),...st};
    ok(after<=Math.max(3*med,med+120)&&(key==='f'?st.flash||name==='tank'||name==='jet':st.nvg),name+': '+key.toUpperCase()+' → frame '+after.toFixed(1)+' ms (ordinary frame '+med.toFixed(1)+' ms) '+JSON.stringify(st));
    if(errs.length){ok(false,name+' console errors: '+errs.slice(0,3).join(' | '))}await b.close()}
  if(process.argv.includes('--json'))console.log(JSON.stringify(rows));
  console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
