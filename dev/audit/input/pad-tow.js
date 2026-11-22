/* Pad only: Hitch Happens. Lined up behind a car in the tow truck, the HUD says "Hold E · hitch up". What does the pad do?
   node dev/audit/input/pad-tow.js */
const {boot,LEAK_SRC}=require('./lib.js');
(async()=>{const r=await boot();const {ev,p}=r;const out={};
  await p.click('.ht-title [data-act=newgame]');await r.wait(300);
  out.setup=await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('tow'),a=H.jobs.api;
    for(const d of j.def.unlock.done||[]){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true}H.prog.trustR=Math.max(H.prog.trustR||0,25);j.test.give(a);H.jobs.start('tow');H.step(3);
    let f=0;const S=HT.Tow.S;for(;f<9000;f++){for(const k in H.keys)H.keys[k]=false;j.test.step(a,f,{});if(H.CV&&S.cand&&S.cand.chk&&S.cand.chk.ok&&!S.link&&H.M.state==='go')break;H.step(1)}
    for(const k in H.keys)H.keys[k]=false;S.eT=0;S.hold=0;S.eDown=0;H.step(2);return{f,cv:H.CV&&H.CV.type,ok:!!(S.cand&&S.cand.chk.ok),link:!!S.link,state:H.M&&H.M.state}});
  await r.pad();await ev(()=>{__T.set({axes:[0,0,.6,0]});__T.set({axes:[0,0,0,0]})});
  out.hud=await ev(()=>{window.__ht.step(2);return [...document.querySelectorAll('.ht-mt,.ht-meter,.ht-pr')].map(e=>e.innerText.replace(/\n/g,' ')).filter(Boolean).join(' || ')});
  out.leaks=await ev(LEAK_SRC);await r.shot('pad-tow-lineup');
  /* hold Y for a second of game time, the way a player would "hold" */
  await ev(()=>{__T.set({buttons:{3:1}})});await r.wait(120);await ev(()=>{for(let i=0;i<30;i++){__T.tick();window.__ht.step(1)}});
  out.afterHoldY=await ev(()=>({inCar:!!window.__ht.CV,link:!!HT.Tow.S.link}));await ev(()=>{__T.set({buttons:{3:0}})});
  if(!out.afterHoldY.inCar){await ev(()=>{const H=window.__ht;/* back in */H.enterVehicle(H.vehicles.find(c=>c===HT.Tow.S.truck)||H.vehicles.find(c=>/tow/i.test(c.type||c.kind||'')));H.step(2)})}
  /* hold A */
  await ev(()=>{__T.set({buttons:{0:1}});for(let i=0;i<40;i++){__T.tick();window.__ht.step(1)}});out.afterHoldA=await ev(()=>({inCar:!!window.__ht.CV,link:!!HT.Tow.S.link,e:window.__ht.keys.e,space:window.__ht.keys[' ']}));await ev(()=>{__T.set({buttons:{0:0}});__T.tick()});
  out.keys=await ev(()=>__T.keys.join(' '));
  console.log(JSON.stringify(out,null,1));console.log('errs',r.errs.slice(0,4));await r.b.close()})().catch(e=>{console.error(e);process.exit(1)});
