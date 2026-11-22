/* Pad only: can a controller player raise the stop sign in "crossing"? (the sign is the job's core action)
   node dev/audit/input/pad-crossing.js */
const {boot,LEAK_SRC}=require('./lib.js');
(async()=>{const r=await boot();const {ev,p}=r;
  await p.click('.ht-title [data-act=newgame]');await r.wait(300);
  const st=await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('crossing');j.test.give(H.jobs.api);H.jobs.start('crossing');H.step(3);
    let f=0;for(;f<3000&&!(H.M&&H.M.cg&&H.M.cg.gear);f++){j.test.step(H.jobs.api,f,{});H.step(1)}
    for(const k in H.keys)H.keys[k]=false;H.M.cg.signOn=false;H.step(2);return{f,gear:!!H.M.cg.gear,stage:H.M.cg.stage,state:H.M.state,cv:!!H.CV}});
  console.log('job state',JSON.stringify(st));
  await r.pad();await ev(()=>{__T.set({axes:[0,0,.6,0]});__T.set({axes:[0,0,0,0]})});/* pad becomes the last device */
  const tries={};
  const sign=()=>ev(()=>{window.__ht.step(2);return !!window.__ht.M.cg.signOn});
  await ev(()=>{__T.set({buttons:{6:1}});__T.tick(3)});tries.LT_held=await sign();await ev(()=>{__T.set({buttons:{6:0}});__T.tick(2)});tries.LT_released=await sign();
  for(const [n,b] of [['A',0],['B',1],['X',2],['Y',3],['RB',5],['LB',4],['L3',10],['R3',11],['DUP',12]]){await ev(()=>{window.__ht.M.cg.signOn=false});await ev(b=>__T.tap(b),b);tries[n]=await sign()}
  await ev(()=>{window.__ht.M.cg.signOn=false});await ev(()=>{__T.set({buttons:{4:1}});for(const b of[0,1,2,3,12,13,14,15]){__T.tap(b)}__T.set({buttons:{4:0}});__T.tick()});tries.LB_layer_all=await sign();
  console.log('sign up after each pad input:',JSON.stringify(tries));
  const hud=await ev(()=>({obj:document.querySelector('.ht-obj').innerText.replace(/\n/g,' | '),chips:[...document.querySelectorAll('.ht-gc')].map(c=>c.innerText.replace(/\n/g,' '))}));
  console.log('HUD on pad:',JSON.stringify(hud));console.log('leaks:',JSON.stringify(await ev(LEAK_SRC)));
  console.log('shot',await r.shot('pad-crossing-sign'));
  /* control: a real right click on the 3D view does raise it */
  await ev(()=>{window.__ht.M.cg.signOn=false});const c=await ev(()=>{const b=window.__ht.renderer.domElement.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2}});
  await p.mouse.move(c.x,c.y);await p.mouse.down({button:'right'});await p.mouse.up({button:'right'});console.log('control: real right click ->',await sign());
  console.log('errs',r.errs.slice(0,4));await r.b.close()})().catch(e=>{console.error(e);process.exit(1)});
