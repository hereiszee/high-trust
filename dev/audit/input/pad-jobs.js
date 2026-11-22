/* Pad only, in-job actions the keyboard has: Higher Ground scope / breath / zoom / rounds; HOA phone camera raise + shutter; tank sight.
   node dev/audit/input/pad-jobs.js */
const {boot,LEAK_SRC}=require('./lib.js');
(async()=>{const r=await boot();const {ev,p}=r;const out={};
  await p.click('.ht-title [data-act=newgame]');await r.wait(300);
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.WM.beat=true;if(H.save&&H.save.flags)H.save.flags.act2Intro=true;H.step(2)});
  await r.pad();await ev(()=>{__T.set({axes:[0,0,.6,0]});__T.set({axes:[0,0,0,0]})});
  /* --- Higher Ground --- */
  await ev(()=>{const H=window.__ht;H.openBridge&&H.openBridge();H.jobs.start('overwatch');H.step(3);const M=H.M;for(let i=0;i<300&&M.ow.stage!=='ladder';i++)H.step(1);H.jobs.registry.get('overwatch').test.roof();H.step(5);H.P.aim=false;H.step(5)});
  const sc=()=>ev(()=>{const H=window.__ht,O=H.M.ow,R=O.rifle;H.step(20);return{aim:H.P.aim,scopeT:+R.scopeT.toFixed(2),held:R.breath.held,zoom:R.zoom!=null?R.zoom:(R.zi!=null?R.zi:JSON.stringify(Object.keys(R)).slice(0,0)),rounds:R.rounds||R.ammo||O.rounds||null}});
  out.roof=await ev(()=>window.__ht.M.ow.roof.on);
  await ev(()=>{__T.set({buttons:{6:1}});__T.tick(2)});out.LT_scope_held=await sc();
  await ev(()=>{__T.tap(10)});out.L3_breath=await sc();
  await ev(()=>{__T.set({buttons:{10:1}});__T.tick(30)});out.L3_held_breath=await sc();await ev(()=>{__T.set({buttons:{10:0}});__T.tick()});
  await ev(()=>{__T.set({axes:[0,-.5,0,0]});__T.tap(10);__T.tick(5)});out.L3_with_stick_breath=await sc();await ev(()=>{__T.set({axes:[0,0,0,0]});__T.tick(3)});
  await ev(()=>{__T.set({buttons:{6:0}});__T.tick(2)});out.LT_released=await sc();out.keys_sent=await ev(()=>__T.keys.join(' '));
  out.ow_hud=await ev(()=>[...document.querySelectorAll('.ht-gc,.ht-obj')].map(c=>c.innerText.replace(/\n/g,' ')).join(' || '));
  out.ow_leaks=await ev(LEAK_SRC);await r.shot('pad-overwatch-scope');
  await ev(()=>{try{window.__ht.jobs.finish(false,'test')}catch(e){}window.__ht.step(3);try{window.__ht.HUD.hide('result')}catch(e){}window.__ht.enterHub();window.__ht.step(3)});
  /* --- HOA phone camera --- */
  const hs=await ev(()=>{const H=window.__ht;H.jobs.start('hoa');H.step(5);if(HT.Photo&&!HT.Photo.S)HT.Photo.begin({job:'test'});HT.Photo.raise(false);H.P.aim=false;H.step(5);return{mode:H.mode,photo:!!(HT.Photo&&HT.Photo.S)}});
  out.hoa=hs;
  await ev(()=>{__T.set({buttons:{6:1}});__T.tick(2);window.__ht.step(20)});out.LT_phone_raised_while_held=await ev(()=>HT.Photo.isRaised());await ev(()=>{__T.set({buttons:{6:0}});__T.tick(2);window.__ht.step(5)});
  await ev(()=>{HT.Keys.aimMode='toggle';__T.set({buttons:{6:1}});__T.tick(2);__T.set({buttons:{6:0}});__T.tick(2);window.__ht.step(20)});out.LT_toggle_phone_raised=await ev(()=>HT.Photo.isRaised());out.P_aim=await ev(()=>window.__ht.P.aim);await ev(()=>{HT.Keys.reset()});
  out.photo_leaks=await ev(LEAK_SRC);
  await ev(()=>{try{window.__ht.jobs.finish(false,'test')}catch(e){}window.__ht.step(3);try{window.__ht.HUD.hide('result')}catch(e){}window.__ht.enterHub();window.__ht.step(3)});
  /* --- tank: LT = sight, R3 = sight --- */
  await ev(()=>{const H=window.__ht,e=H.vehicles.find(c=>c.type==='tank');H.P.pos.set(e.pos.x+3,0,e.pos.z);H.step(2);H.enterVehicle(e);H.step(4);H.P.fp=false});
  out.inTank=await ev(()=>window.__ht.CV&&window.__ht.CV.type);
  await ev(()=>{__T.set({buttons:{6:1}});__T.tick(2)});out.tank_LT_down=await ev(()=>window.__ht.P.fp);await ev(()=>{__T.set({buttons:{6:0}});__T.tick(2)});out.tank_LT_up=await ev(()=>window.__ht.P.fp);
  out.tank_leaks=await ev(LEAK_SRC);await r.shot('pad-tank');
  console.log(JSON.stringify(out,null,1));console.log('errs',r.errs.slice(0,4));await r.b.close()})().catch(e=>{console.error(e);process.exit(1)});
