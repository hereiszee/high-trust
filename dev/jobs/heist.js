/* Good Fences: drive the core loop with REAL mouse and keyboard events (Playwright), and take a screenshot of every stage.
   node dev/jobs/heist.js [--shots] [--out=dir] [--touch]
   Real input: the right mouse button raises the phone and the left one takes the photo (scope); E presses and holds (errands,
   the ladder, the keypad, the padlock, picking things up, loading); the plan board opens with E, the mouse is released and
   the board is driven with digit keys AND real mouse clicks on its rows, chips and approach, then Enter. Travel between those
   moments is a teleport (the job's own bot fills in the rest of each stage). Then the bluff and the loud branch are played by
   the job's bot for their screenshots. Prints ok/FAIL per check; exit code 1 on any failure or console error. */
const {open}=require('../ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:process.argv.includes('--'+k)?true:d};
const SHOTS=!!arg('shots',false),TOUCH=!!arg('touch',false),OUT=path.resolve(__dirname,'../../',arg('out','docs/screenshots/jobs/heist'));
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
async function session(main,app){const {b,p,errs}=await open(TOUCH?{viewport:{width:844,height:390},dpr:2}:{});const ev=(f,a)=>p.evaluate(f,a);if(SHOTS)fs.mkdirSync(OUT,{recursive:true});
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(300);
  if(SHOTS)await ev(async()=>{const H=window.__ht;try{H.render.apply('high')}catch(_){}for(let i=0;i<60&&H.assets.stream&&!H.assets.stream.idle();i++)await new Promise(r=>setTimeout(r,500))});
  /* a placed camera for framing shots (the job's camera hook returns undefined; ours is a system hook used only here) */
  await ev(()=>{window.HT.Jobs.on('camera',()=>{const c=window.__cam;if(!c)return;const C=window.__ht.camera;C.position.set(c[0],c[1],c[2]);C.lookAt(c[3],c[4],c[5]);return true})});
  const step=n=>ev(n=>{window.__ht.step(n)},n);
  const st=()=>ev(()=>{const H=window.__ht,M=H.M;return M?{state:M.state,s0:M.stage0,stage:M.stage,tags:Object.keys(M.tags||{}),gear:Object.keys(M.gear||{}),board:!!M.board,app:M.app,loaded:M.loaded,lock:M.lock,inside:M.inside,loud:M.loud,carry:(M.carrying||[]).length,prompt:H.prompt&&H.prompt.text,raised:!!(window.HT.Photo&&HT.Photo.isRaised()),cv:!!H.CV}:null});
  const tp=(x,z,yaw,pitch)=>ev(([x,z,yaw,pitch])=>{const H=window.__ht;H.P.pos.set(x,0,z);H.collide(H.P.pos,.35);if(yaw!=null)H.P.yaw=yaw;if(pitch!=null)H.P.pitch=pitch;H.step(2)},[x,z,yaw,pitch]);
  const look=(x,z,pitch)=>ev(([x,z,pitch])=>{const P=window.__ht.P;P.yaw=Math.atan2(-(x-P.pos.x),-(z-P.pos.z));P.pitch=pitch==null?-.15:pitch},[x,z,pitch]);
  /* the job's bot, until a condition holds (page-side expression on M) */
  const until=(cond,max,o)=>ev(([cond,max,o])=>{const H=window.__ht,a=H.jobs.api,j=H.jobs.registry.get('heist'),f=new Function('M','H','return '+cond);let t=0;
    for(;t<max&&H.M&&H.M.state==='go'&&!f(H.M,H);t++){j.test.step(a,(window.__T=(window.__T||0)+1),o||{});H.P.hp=Math.max(H.P.hp,60);H.step(1)}for(const k of['w','a','s','d','e'])H.keys[k]=false;return{t,ok:!!(H.M&&f(H.M,H))}},[cond,max,o]);
  const shot=async(n,cam)=>{if(!SHOTS)return;await ev(c=>{window.__cam=c||null},cam||null);
    if(true){await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});await p.waitForTimeout(/result/.test(n)?1800:/brief|plan/.test(n)?900:1500);await ev(()=>{window.__rafOn=false})}
    await ev(()=>{const H=window.__ht,O=window.HT.OpenWorld;try{O.buildAll();O.update(H.camera,1/30)}catch(e){console.warn(e)}H.step(1);try{O.buildAll();O.update(H.camera,1/30)}catch(_){}H.draw()});await p.screenshot({path:path.join(OUT,(TOUCH?'touch-':'')+n+'.jpg'),type:'jpeg',quality:82});await ev(()=>{window.__cam=null})};
  const keyHold=async(k,frames)=>{await p.keyboard.down(k);await step(frames);await p.keyboard.up(k)};
  async function branchRun(app){await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('heist');j.test.give(H.jobs.api);await Promise.race([window.HT.People.preload(H.jobs.castKeys('heist')).catch(()=>{}),new Promise(r=>setTimeout(r,30000))]);H.jobs.start('heist');H.step(4)});
    let r=await until("M.stage0==='job'",6000,{app});ok(r.ok,app+': planned and started');await step(30);await shot('20-'+app+'-start');let s;
    if(app==='bluff'){r=await until('M.ch&&M.bluffR>=1',1500,{app});await shot('21-bluff-talk',null);r=await until('M.bluffDone',2000,{app});s=await st();ok(r.ok,'bluff finished ('+(s.loud?'went loud':'Dwayne bought it')+')');
      r=await until('M.truckIn&&M.loaded>=2',4000,{app});await shot('22-bluff-loading',[244.5,2.1,147.6,256,.7,148.6])}
    else{r=await until('M.truckIn',3000,{app});await step(40);await tp(244.5,148.3);await look(256,148.4,-.12);await step(2);await shot('21-loud-fight');
      r=await until("M.stage0==='getaway'&&M.truck.pos.x<205.5&&M.chasers&&M.chasers.some(c=>!c.gone&&Math.hypot(c.c.x-M.truck.pos.x,c.c.z-M.truck.pos.z)<45)",8000,{app});
      const cc=await ev(()=>{const M=window.__ht.M,e=M.truck,c=M.chasers.find(c=>!c.gone)||M.chasers[0];const fx=-Math.sin(e.yaw),fz=-Math.cos(e.yaw),rx=Math.cos(e.yaw),rz=-Math.sin(e.yaw);return[e.pos.x+fx*6+rx*7,4.5,e.pos.z+fz*6+rz*7,(e.pos.x+c.c.x)/2,.8,(e.pos.z+c.c.z)/2]});await shot('22-loud-chase',cc)}
    r=await until("M.state!=='go'",12000,{app});s=await st();ok(s.state==='won',app+' run won');await step(40);await shot('23-'+app+'-result');
    const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,app+': no console errors'+(bad.length?': '+bad.slice(0,5).join(' | '):''));await b.close()}
  if(!main)return branchRun(app);
  /* ---- start ---- */
  await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);const j=H.jobs.registry.get('heist');j.test.give(H.jobs.api);await Promise.race([window.HT.People.preload(H.jobs.castKeys('heist')).catch(()=>{}),new Promise(r=>setTimeout(r,30000))]);H.jobs.start('heist');H.step(4)});
  let s=await st();ok(s&&s.s0==='scope','job started in the scope stage');
  /* the van pulled up; the first thing to do is the keypad (marker) */
  await tp(205.4,141.8,null,-.05);await look(207.2,145.6,-.25);await step(20);await shot('01-scope-start');
  /* ---- SCOPE with the real mouse: click to take the pointer, RMB raises the phone, LMB shoots ---- */
  const cx=TOUCH?422:640,cy=TOUCH?195:360;await p.mouse.move(cx,cy);await p.mouse.down();await p.mouse.up();await step(4);
  await tp(206.3,143.6);await ev(()=>{const P=window.__ht.P,Ph=window.HT.Photo;P.yaw=Math.atan2(-(207.2-P.pos.x),-(145.6-P.pos.z));P.pitch=Math.atan2(1.2-1.6,Math.hypot(207.2-P.pos.x,145.6-P.pos.z))});
  await p.mouse.down({button:'right'});await step(3);await p.mouse.up({button:'right'});await step(12);s=await st();
  if(!s.raised){/* some builds raise on LMB with the phone item: that's the documented fallback */await p.mouse.down();await step(2);await p.mouse.up();await step(12);s=await st()}
  ok(s.raised,'a mouse button raised the phone (toggle: stays up after release)');
  await ev(()=>{const Ph=window.HT.Photo;Ph.aimAt(207.2,1.23,145.6)});await step(30);await shot('02-scope-phone-keypad');
  await p.mouse.down();await step(2);await p.mouse.up();await step(10);s=await st();ok(s.tags.includes('keypad'),'LMB took the keypad photo -> tagged ('+s.tags+')');
  await p.mouse.down({button:'right'});await step(3);await p.mouse.up({button:'right'});await step(6);s=await st();ok(!s.raised,'RMB again lowers the phone');
  let r=await until('M.tags.u47&&M.tags.dwayne&&M.tags.board&&M.tags.cams',3000);ok(r.ok,'the rest of the scope (bot): '+JSON.stringify(r));
  await ev(()=>{const H=window.__ht,M=H.M;H.P.pos.set(262,144.2,0);H.P.pos.set(262,0,144.2);H.P.yaw=0;H.P.pitch=-.1});await step(4);await shot('03-scope-unit47',[258.5,3.2,143.5,262,1.2,150]);
  await ev(()=>{const H=window.__ht,M=H.M;H.P.pos.set(M.dw.pos.x+.4,0,M.dw.pos.z-3.6);H.P.yaw=Math.atan2(-(M.dw.pos.x-H.P.pos.x),-(M.dw.pos.z-H.P.pos.z));H.P.pitch=-.05});await step(10);await shot('04-scope-dwayne');
  r=await until("M.stage0==='gear'",600);ok(r.ok,'into the van: gear stage');
  /* ---- GEAR: real E at Rick's ring; the ladder held with E ---- */
  await ev(()=>{const H=window.__ht;if(H.CV)H.exitVehicle()});await step(3);
  await tp(75,46.2);await look(75,47.9,-.1);await step(6);await shot('05-gear-rick');await p.keyboard.press('e');await step(140);s=await st();ok(s.gear.includes('blankets'),'E at Rick\'s ring: moving blankets packed');
  await tp(51,18.2);await look(51,19.9);await step(4);await p.keyboard.press('e');await step(200);
  await tp(53.2,19.9);await keyHold('e',40);s=await st();const lc=await ev(()=>!!(window.__ht.M.ladderCarry));ok(lc,'held E on Linda\'s porch: carrying the ladder');
  await ev(()=>{const P=window.__ht.P;P.pos.set(51.5,0,17.4);P.yaw=Math.PI*.9;P.pitch=-.12});await step(4);await shot('06-gear-ladder-carry');
  r=await until("M.gear.ladder&&M.gear.walkies&&M.gear.dolly&&M.gear.pack",3000);ok(r.ok,'the rest of the errands (bot): '+JSON.stringify(r));
  await tp(27,17.6);await look(27,20.3,-.12);await step(6);await shot('07-plan-driveway',[27.5,2.2,15.2,27,1.1,20.6]);
  /* ---- THE PLAN: E opens the board; digits and real clicks drive it ---- */
  await p.keyboard.press('e');await step(4);s=await st();ok(s.board,'E at Gary\'s driveway opens the plan board');
  const locked=await ev(()=>!!document.pointerLockElement);ok(!locked,'the pointer is free while the board is up (clickable)');
  /* the board opens with the saved or suggested plan; re-cast it: keys for two roles, the mouse for the others (picking the same person again clears a role) */
  /* after an assignment the card moves the selection to the next open role (the next digit picks a person); Esc drops it */
  const desel=async()=>{if(await p.$('.htp .rr.sel')){await p.keyboard.press('Escape');await step(1)}};
  await desel();await p.keyboard.press('1');await step(1);await p.keyboard.press('1');await step(1);/* lookout -> Gary */
  const click=async sel=>{const el=await p.$(sel);if(!el)return false;await el.click();await step(1);return true};
  await desel();ok(await click('.htp .rr[data-r="driver"]')&&await click('.htp .cc[data-c="doug"]'),'mouse: driver row, then Doug');
  await desel();await p.keyboard.press('3');await step(1);await p.keyboard.press('2');await step(1);/* lifter -> Rick */
  await desel();
  ok(await click('.htp .rr[data-r="distraction"]')&&await click('.htp .cc[data-c="dave"]'),'mouse: distraction row, then Big Dave');
  ok(await click('.htp .er[data-e="quiet"]'),'mouse: the quiet approach');
  const plan=await ev(()=>window.__ht.M.board.get());ok(plan.assign.lookout==='gary'&&plan.assign.driver==='doug'&&plan.assign.lifter==='rick'&&plan.assign.distraction==='dave'&&plan.entry==='quiet','board state from keys + clicks: '+JSON.stringify(plan));
  await shot('08-plan-board');
  await p.keyboard.press('Enter');await step(6);s=await st();ok(s.s0==='job'&&s.app==='quiet'&&!s.board,'Enter: that\'s the plan -> the job, quiet');
  await step(20);await shot('09-job-staging');
  /* ---- THE JOB: real E holds (keypad, padlock, a pick-up) and a press (load) ---- */
  r=await until("M.S&&M.S.max()<.2&&Math.hypot(M.rg.pos.x-211,M.rg.pos.z-146)>18&&M.rg.pos.x>225",4000);
  await tp(206.9,145.1);await look(207.2,145.6,-.2);await keyHold('e',50);await step(20);s=await st();const gk=await ev(()=>window.__ht.M.gateK);ok(gk>0,'held E at the keypad: the gate slides open ('+gk+')');
  await step(100);await tp(211.4,148.2);await step(6);
  await tp(262,148.4);await look(262,150,-.15);await keyHold('e',80);await step(60);s=await st();ok(s.lock==='cut','held E at unit 47: padlock cut, door up');
  await shot('10-job-unit-open',[258.2,2.3,145.6,262,1,149.4]);
  r=await until('M.truckIn',2400);ok(r.ok,'the driver backed the truck in');
  await tp(258.6,147.2);await look(250,148.2,-.2);await step(3);await shot('11-job-truck-in');
  await ev(()=>{const H=window.__ht,M=H.M,t=M.it.find(t=>t.state==='pile');H.P.pos.set(t.x,0,t.z-.3);H.P.yaw=Math.atan2(-(t.x-H.P.pos.x),-(t.z-H.P.pos.z))});await keyHold('e',30);s=await st();ok(s.carry>=1,'held E at the pile: carrying '+s.carry);
  await ev(()=>{const H=window.__ht,M=H.M,R={x:M.truck.pos.x+Math.sin(M.truck.yaw)*3.3,z:M.truck.pos.z+Math.cos(M.truck.yaw)*3.3};H.P.pos.set(R.x+1.6,0,R.z);H.P.yaw=Math.PI/2;H.P.pitch=-.1});await step(3);await shot('12-job-carrying');
  const n0=await ev(()=>window.__ht.M.loaded);await ev(()=>{const H=window.__ht,M=H.M,e=M.truck,S=H.jobs.api.carSize(e);H.P.pos.set(e.pos.x+Math.sin(e.yaw)*(S.l/2+.75),0,e.pos.z+Math.cos(e.yaw)*(S.l/2+.75))});await step(2);
  await p.keyboard.press('e');await step(3);const n1=await ev(()=>window.__ht.M.loaded);ok(n1>n0,'E at the back of the truck: loaded ('+n0+' -> '+n1+')');
  r=await until('M.cr.lifter&&M.cr.lifter.st==="carry"',900);await shot('13-job-lifter',[244.5,2.1,147.6,256,.7,148.6]);
  r=await until('M.hide',1500);if(r.ok)await shot('14-job-hidden',[264,2.2,145,262,1,149.6]);
  r=await until("M.loaded>=12||M.stage0==='getaway'",6000);ok(r.ok,'loaded everything: '+JSON.stringify(await st()));
  r=await until("M.stage0==='getaway'&&H.CV",900);ok(r.ok,'in Ron\'s truck: the getaway');await step(30);await shot('15-getaway-drive');
  r=await until("M.state!=='go'",4000);s=await st();ok(s.state==='won','the truck made it to Gary\'s: won');await step(40);await p.waitForTimeout(1200);await shot('16-result-quiet');
  const res=await ev(()=>{const r=document.querySelector('.ht-result');return r?{h2:r.querySelector('h2').textContent,stats:[...r.querySelectorAll('.ht-stats b')].map(x=>x.textContent),lf:r.querySelectorAll('.htp-lf li').length}:null});
  ok(res&&res.lf===12&&res.stats.includes('Recovered'),'result card: headline, job stats and the Lost & Found list '+JSON.stringify(res));
  /* ---- afterwards: free roam, the things on their owners' porches ---- */
  await ev(()=>{const H=window.__ht;H.HUD.hide('result');H.UIacts['result:go']&&H.UIacts['result:go']();H.step(6)});await tp(73.5,17.8);await look(73.4,21.2,-.25);await step(20);
  const home=await ev(()=>{const H=window.__ht,h=H.jobs.registry.get('heist').home;console.log(JSON.stringify({mode:H.mode,flags:(H.jobs.api.SV().flags||{}).heistReturned,built:h.built,n:h.list.length}));return h.list.length});ok(home>=3,'free roam: returned things on porches ('+home+')');await shot('30-homecoming-patel');
  const bad=errs.filter(e=>!/favicon/.test(e));ok(!bad.length,'no console errors'+(bad.length?': '+bad.slice(0,5).join(' | '):''));
  await b.close()}
/* the quiet run with real input, then the bluff and the loud branch each in a fresh session */
(async()=>{await session(true);for(const app of['bluff','loud'])await session(false,app);console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
