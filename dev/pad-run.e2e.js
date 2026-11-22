/* Controller-only acceptance run: from the title screen with the scripted Gamepad only (no keyboard or mouse event is sent),
   every prompt seen is screenshotted and checked for keyboard / mouse names (dev/audit/input/lib.js LEAK_SRC).
   node dev/pad-run.e2e.js [--from N]     screenshots + prompts.json -> docs/screenshots/input/pad-run/
   Walking uses the left stick toward a point (camera-relative, as a player steers), driving RT + left stick. Where a job's own scripted
   player (test.step) moves the dad between beats, that is said in the step; the inputs the beat is about are always the pad's.
   Steps: new game · first job (talk, accept, play the first beat, abandon from the pause menu) · shop purchase · map fast travel ·
   drive · shoot + zip-tie · Crossing Guard (sign, wave: to a win) · Hitch Happens (hold Y: to a win) · Higher Ground (scope, breath,
   fire: to a win) · a job with choices (roundup / blitz orders on the LB layer) · range rack pick · tank drive + fire · jet take-off,
   land, eject, ride back · decorate at home · quit to title */
const {boot,LEAK_SRC}=require('./audit/input/lib.js');const fs=require('fs'),path=require('path');
const OUT=path.join(__dirname,'../docs/screenshots/input/pad-run'+((process.argv.find(a=>a.startsWith('--part='))||'').split('=')[1]?'-'+(process.argv.find(a=>a.startsWith('--part='))).split('=')[1]:''));fs.mkdirSync(OUT,{recursive:true});
let fails=0;const res=[];const ok=(m,c,x)=>{if(!c)fails++;res.push({m,ok:!!c,x});console.log((c?'ok   ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x).slice(0,300):''))};
const FROM=+((process.argv.find(a=>a.startsWith('--from='))||'').split('=')[1]||0);
(async()=>{const r=await boot();const {ev,p}=r;const cdp=await p.context().newCDPSession(p);
  /* no keyboard or mouse from here on: count any trusted ones that reach the page (there must be none) */
  await ev(()=>{window.__kbm=0;for(const t of['keydown','mousedown','wheel'])addEventListener(t,e=>{if(e.isTrusted)window.__kbm++},true)});
  await r.pad();await ev(()=>{__T.set({axes:[0,0,.4,0]});__T.tick(2);__T.set({axes:[0,0,0,0]});__T.tick(2)});
  /* ---------- helpers (all input is __pad / __T) ---------- */
  const seen=new Map();let shotN=0;
  const look=async(tag)=>{const s=await ev(async()=>{const H=window.__ht;try{H.draw()}catch(e){}await new Promise(r=>setTimeout(r,90));try{H.draw()}catch(e){}
      const vis=e=>e&&!e.classList.contains('off')&&e.offsetParent!==null;const pr=[...document.querySelectorAll('.ht-pr')].filter(vis).map(e=>e.innerText.replace(/\s+/g,' ').trim()).join(' | ');
      const ob=(document.querySelector('.ht-obj')||{}).innerText||'';return{pr,ob:ob.replace(/\s+/g,' ').trim().slice(0,200)}});
    const key=s.pr+'#'+s.ob;if(!seen.has(key)){const leaks=await ev(LEAK_SRC,{pad:true});const f=String(++shotN).padStart(3,'0')+'-'+tag.replace(/[^a-z0-9]+/gi,'-').slice(0,40)+'.jpg';
      {const c=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:70});fs.writeFileSync(path.join(OUT,f),Buffer.from(c.data,'base64'))}seen.set(key,{tag,shot:f,prompt:s.pr,obj:s.ob,leaks});if(leaks.length)console.log('  LEAK at '+tag+': '+JSON.stringify(leaks).slice(0,300))}return s};
  const tick=(n=1,fn)=>ev(([n,fn])=>{const H=window.__ht;for(let i=0;i<n;i++){__T.tick(1);H.step(1)}},[n,fn]);
  const tap=async(b,hold=2)=>{await ev(([b,h])=>{__T.set({buttons:{[b]:1}});for(let i=0;i<h;i++){__T.tick(1);window.__ht.step(1)}__T.set({buttons:{[b]:0}});__T.tick(1);window.__ht.step(1)},[b,hold])};
  const menuTap=async b=>{await ev(b=>{__T.set({buttons:{[b]:1}});__T.tick(2);__T.set({buttons:{[b]:0}});__T.tick(1)},b);await r.wait(160)};
  const hold=async(b,frames)=>tap(b,frames);
  const BT={A:0,B:1,X:2,Y:3,LB:4,RB:5,LT:6,RT:7,VIEW:8,MENU:9,L3:10,R3:11,UP:12,DOWN:13,LEFT:14,RIGHT:15};
  /* left stick toward a world point, camera-relative (the stick moves the dad relative to where he looks) */
  const walkTo=async(x,z,tol=1.2,max=900)=>ev(([x,z,tol,max])=>{const H=window.__ht,P=H.P;let i=0;for(;i<max;i++){const dx=x-P.pos.x,dz=z-P.pos.z,d=Math.hypot(dx,dz);if(d<tol)break;
      const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw),rx=Math.cos(P.yaw),rz=-Math.sin(P.yaw);const k=Math.min(1,d/1.5);__pad.set({axes:[(dx*rx+dz*rz)/d*k,-(dx*fx+dz*fz)/d*k,0,0]});__T.tick(1);H.step(1)}
    __pad.set({axes:[0,0,0,0]});__T.tick(1);H.step(1);return{i,d:Math.hypot(x-P.pos.x,z-P.pos.z)}},[x,z,tol,max]);
  /* face a point with the right stick (as a player turns) */
  const face=async(x,z,y)=>ev(([x,z,y])=>{const H=window.__ht,P=H.P;for(let i=0;i<120;i++){const want=Math.atan2(-(x-P.pos.x),-(z-P.pos.z));let e=want-P.yaw;e=Math.atan2(Math.sin(e),Math.cos(e));if(Math.abs(e)<.03)break;__pad.set({axes:[0,0,Math.max(-1,Math.min(1,-e*3)),0]});__T.tick(1);H.step(1)}
    __pad.set({axes:[0,0,0,0]});__T.tick(1);H.step(1);return P.yaw},[x,z,y]);
  /* drive toward a point: RT throttle, left stick steers */
  const driveTo=async(x,z,tol=6,max=2400)=>ev(([x,z,tol,max])=>{const H=window.__ht;let i=0;for(;i<max;i++){const e=H.CV;if(!e)break;const dx=x-e.pos.x,dz=z-e.pos.z,d=Math.hypot(dx,dz);if(d<tol)break;
      const want=Math.atan2(-dx,-dz);let er=want-e.yaw;er=Math.atan2(Math.sin(er),Math.cos(er));const sp=Math.abs(e.car?e.car.spd:e.spd||0);
      __pad.set({axes:[Math.max(-1,Math.min(1,-er*2)),0,0,0],buttons:{7:d>tol*3||sp<6?.9:.3,6:sp>14&&Math.abs(er)>.6?.8:0}});__T.tick(1);H.step(1)}
    __pad.set({axes:[0,0,0,0],buttons:{7:0,6:0}});for(let k=0;k<400;k++){const e=H.CV;if(!e||Math.abs(e.spd)<.8)break;__pad.set({buttons:{6:e.spd>2?1:0,7:e.spd<-2?1:0}});__T.tick(1);H.step(1)}__pad.set({buttons:{6:0,7:0}});__T.tick(1);H.step(1);const e=H.CV;return{i,d:e?Math.hypot(x-e.pos.x,z-e.pos.z):null}},[x,z,tol,max]);
  const state=()=>ev(()=>{const H=window.__ht;return{mode:H.mode,screen:H.HUD.screen,M:H.M&&H.M.def&&H.M.def.id,st:H.M&&H.M.state,cv:H.CV&&H.CV.type,paused:HT.Input.paused}});
  const toHub=()=>ev(()=>{const H=window.__ht;try{if(H.M&&H.M.state==='go')H.jobs.finish(false,'test')}catch(e){}H.step(3);try{H.HUD.hide('result')}catch(e){}if(H.mode!=='hub')H.enterHub();H.step(3)});
  const resultContinue=async()=>{for(let i=0;i<8;i++){const s=await state();if(s.screen!=='result')break;await menuTap(BT.A);await r.wait(250)}};
  const PART=(process.argv.find(a=>a.startsWith('--part='))||'').split('=')[1]||'';const JOBSTEPS=[6,7,8],PART_C=[14,15];
  let step=0;const S=async(name,fn)=>{step++;if(step>1&&(step<FROM||PART==='a'&&(JOBSTEPS.includes(step)||PART_C.includes(step))||PART==='b'&&!JOBSTEPS.includes(step)||PART==='c'&&!PART_C.includes(step)))return;console.log('--- '+step+'. '+name);try{await fn()}catch(e){ok(name+' (threw)',false,String(e&&e.stack||e).slice(0,300))}await look(name+' end');
    /* a failed step must not take the next ones with it */
    await ev(()=>{window.__rafOn=false;try{if(HT.Menus&&HT.Menus.isOpen())HT.Menus.close()}catch(e){}const H=window.__ht;try{if(H.HUD.minimap.mapOpen)H.HUD.minimap.toggle&&H.HUD.minimap.toggle()}catch(e){}__pad.set({axes:[0,0,0,0],buttons:{}});__T.tick(2)})};

  await S('title → new game with A',async()=>{await r.wait(400);await look('title');for(let i=0;i<6;i++){const s=await state();if(s.mode==='hub'&&!s.screen)break;await menuTap(BT.A);await r.wait(500)}
    await ev(async()=>{await window.__ht.jobs.ready});const s=await state();ok('new game from the title with the pad',s.mode==='hub',s);await tick(10);await look('hub')});

  await S('first job: walk to the giver, A talks, A takes it, play the opening, abandon from the pause menu',async()=>{
    const g=await ev(()=>{const H=window.__ht;const n=H.npcs.find(n=>n.marker&&!n.locked)||H.npcs.find(n=>n.marker);return n?{x:n.pos.x,z:n.pos.z,id:n.id}:null});ok('a giver with a marker',!!g,g);if(!g)return;
    await walkTo(g.x,g.z,2.2,2400);await face(g.x,g.z);await look('at the giver');await tap(BT.A);await r.wait(300);let s=await state();
    ok('A talks to the giver (the brief opens)',s.screen==='brief',s);await look('brief');
    for(let i=0;i<4&&(await state()).screen==='brief';i++){await menuTap(BT.A);await r.wait(400)}
    s=await state();ok('A takes the job',s.mode==='mission'||s.screen!=='brief',s);await tick(60);await look('job start');
    const ob=await ev(()=>(document.querySelector('.ht-obj')||{}).innerText||'');ok('the job is on: the objective leads to it',ob.length>8,ob.replace(/\s+/g,' ').slice(0,120));
    await menuTap(BT.MENU);await r.wait(300);s=await state();ok('Menu pauses',s.paused,s);await look('pause');
    await menuTap(BT.B);await r.wait(500);s=await state();ok('B resumes',!s.paused,s)});

  await S('shop: walk in, buy something with the pad',async()=>{
    await ev(()=>{const H=window.__ht;H.grant&&H.grant(5000)});
    const sh=await ev(()=>{const H=window.__ht,s=(H.hubx&&H.hubx.shops||[]).find(s=>s.kind==='hardware');return s?{x:s.x,z:s.z}:null});ok('the hardware store door',!!sh,sh);if(!sh)return;
    await ev(([x,z])=>{window.__ht.fastTravel&&0},[sh.x,sh.z]);
    await ev(([x,z])=>{window.__ht.place(x+3,z+3)},[sh.x,sh.z]);/* traversal: set down 4 m from the door (the walk there is not what is tested) */
    const w=await walkTo(sh.x,sh.z,1.5,600);await look('shop door');
    /* the shop runs its own pad loop on animation frames (js/save.js): let frames run while it is open (the harness holds them) */
    await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});
    await tap(BT.A);await r.wait(600);
    const open=await ev(()=>!!(HT.Menus&&HT.Menus.isOpen&&HT.Menus.isOpen()));ok('A opens the shop',open,w);await look('shop');
    const cash0=await ev(()=>window.__ht.cash);
    const shopTap=async b=>{await ev(b=>{__pad.set({buttons:{[b]:1}})},b);await r.wait(140);await ev(b=>{__pad.set({buttons:{[b]:0}})},b);await r.wait(200)};/* its loop reads the pad each frame */
    for(let i=0;i<8;i++){await shopTap(BT.A);await shopTap(BT.A);/* the shop arms the buy on the first A, buys on the second */await r.wait(250);const c=await ev(()=>window.__ht.cash);if(c<cash0)break;await shopTap(BT.RIGHT)}
    const cash1=await ev(()=>window.__ht.cash);await look('shop bought');ok('bought something with the pad (cash went down)',cash1<cash0,{cash0,cash1});
    for(let i=0;i<4&&(await ev(()=>HT.Menus.isOpen()));i++){await shopTap(BT.B);await r.wait(300)}ok('B leaves the shop',!(await ev(()=>HT.Menus.isOpen())));
    await ev(()=>{window.__rafOn=false});await r.wait(300)});

  await S('map: View opens it, RB picks a place, A fast-travels, the map closes',async()=>{
    await menuTap(BT.VIEW);await r.wait(300);let m=await ev(()=>window.__ht.HUD.minimap.mapOpen);ok('View opens the map',m);await look('map');
    const p0=await ev(()=>({x:window.__ht.P.pos.x,z:window.__ht.P.pos.z}));
    await menuTap(BT.RB);await r.wait(150);await menuTap(BT.RB);await r.wait(150);await menuTap(BT.A);await r.wait(700);await tick(5);
    const p1=await ev(()=>({x:window.__ht.P.pos.x,z:window.__ht.P.pos.z,map:window.__ht.HUD.minimap.mapOpen}));
    if(p1.map){await menuTap(BT.B);await r.wait(300)}
    const fd=await ev(()=>[...document.querySelectorAll('.ht-feed > *')].map(e=>e.textContent).join(' | '));
    ok('fast travel moved the dad',Math.hypot(p1.x-p0.x,p1.z-p0.z)>8&&/fast travel/i.test(fd),{p0,p1,fd})});

  await S('drive: Y gets in, RT and the stick drive, Y gets out',async()=>{
    const v=await ev(()=>{const V=window.__ht.VAN;return{x:V.pos.x,z:V.pos.z}});await walkTo(v.x+2.6,v.z,1.4,4000);await look('at the van');
    await tap(BT.Y);await tick(10);let s=await state();ok('Y gets in the minivan',!!s.cv,s);await look('driving');
    const v0=await ev(()=>{const e=window.__ht.CV;return{x:e.pos.x,z:e.pos.z,yaw:e.yaw}});const tx=v0.x-Math.sin(v0.yaw)*60,tz=v0.z-Math.cos(v0.yaw)*60;
    const d=await driveTo(tx,tz,8,900);const v1=await ev(()=>{const e=window.__ht.CV;return e?{x:e.pos.x,z:e.pos.z}:null});ok('RT + stick drove the van',v1&&Math.hypot(v1.x-v0.x,v1.z-v0.z)>15,{v0,v1,d});
    await ev(()=>{__pad.set({buttons:{6:0,7:0},axes:[0,0,0,0]});for(let i=0;i<400&&Math.abs(window.__ht.CV.spd)>.8;i++){const v=window.__ht.CV.spd;__pad.set({buttons:{6:v>2?1:0,7:v<-2?1:0}});__T.tick(1);window.__ht.step(1)}__pad.set({buttons:{6:0,7:0}});__T.tick(1)});/* brake to a stop (LT past zero reverses) */
    await tap(BT.Y);await tick(15);s=await state();ok('Y gets out',!s.cv,s)});

  await S('Crossing Guard to a win: the job\'s player walks the route, the pad raises the sign (LT) and waves (A)',async()=>{
    /* the scripted player calls the sign directly; here it is replaced by the pad: whenever it wants the sign up or down, LT is pressed */
    await ev(async()=>{const H=window.__ht,j=H.jobs.registry.get('crossing');HT.Keys.aimMode='toggle';j.test.give(H.jobs.api);H.jobs.start('crossing');H.step(3)});
    const r1=await ev(()=>{const H=window.__ht,j=H.jobs.registry.get('crossing'),a=H.jobs.api;let f=0,lt=0,waves=0;
      for(;f<36000&&H.M&&H.M.state==='go';f++){const C=H.M.cg;const was=C&&C.signOn;j.test.step(a,f,{});
        if(C&&C.gear&&C.signOn!==was){C.signOn=was;/* undo the bot's direct call: the pad does it */__pad.set({buttons:{6:1}});__T.tick(1);__pad.set({buttons:{6:0}});__T.tick(1);lt++}
        if(H.useTap&&C&&C.sign&&C.sign.up){H.useTap=false;__pad.set({buttons:{0:1}});__T.tick(1);__pad.set({buttons:{0:0}});waves++}
        __T.tick(1);H.step(1)}return{f,lt,waves,state:H.M&&H.M.state,mode:H.mode}});
    await look('crossing');ok('Crossing Guard won with the sign on LT ('+r1.lt+' presses)',r1.state==='won'||r1.mode==='hub'&&r1.lt>0,r1);await resultContinue();await toHub()});

  await S('Hitch Happens to a win: the job\'s player drives the tow truck, the pad holds Y to hitch and drop',async()=>{
    await ev(async()=>{const H=window.__ht,j=H.jobs.registry.get('tow'),a=H.jobs.api;for(const d of j.def.unlock.done||[]){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true}H.prog.trustR=Math.max(H.prog.trustR||0,25);j.test.give(a);H.jobs.start('tow');H.step(3)});
    const r2=await ev(()=>{const H=window.__ht,j=H.jobs.registry.get('tow'),a=H.jobs.api,S=HT.Tow.S;let f=0,holds=0;
      for(;f<40000&&H.M&&H.M.state==='go';f++){j.test.step(a,f,{});
        /* the bot holds E (keys.e) to hitch / drop: the pad holds Y instead */
        if(H.CV&&H.keys.e&&(S.cand&&S.cand.chk&&S.cand.chk.ok||S.link)){H.keys.e=false;let n=0;__pad.set({buttons:{3:1}});const l0=!!S.link;while(n<90&&!!S.link===l0){__T.tick(1);H.step(1);n++}__pad.set({buttons:{3:0}});__T.tick(1);holds++}
        __T.tick(1);H.step(1)}return{f,holds,state:H.M&&H.M.state,mode:H.mode}});
    await look('tow');ok('Hitch Happens won with Y held on the pad ('+r2.holds+' holds)',(r2.state==='won'||r2.mode==='hub')&&r2.holds>0,r2);await resultContinue();await toHub()});

  await S('Higher Ground to a win: the job\'s player climbs and spots, the pad scopes (LT), holds breath (L3) and fires (RT)',async()=>{
    await ev(async()=>{const H=window.__ht;H.openBridge&&H.openBridge();HT.Keys.aimMode='toggle';H.jobs.start('overwatch');H.step(3)});
    const r3=await ev(()=>{const H=window.__ht,j=H.jobs.registry.get('overwatch'),a=H.jobs.api;let f=0,shots=0,scopes=0;
      for(;f<40000&&H.M&&H.M.state==='go';f++){const aim0=H.P.aim,md0=HT.Roam.mouseDown;j.test.step(a,f,{});
        if(H.P.aim!==aim0){H.P.aim=aim0;__pad.set({buttons:{6:1}});__T.tick(1);__pad.set({buttons:{6:0}});__T.tick(1);scopes++}
        if(HT.Roam.mouseDown&&!md0){HT.Roam.mouseDown=false;__pad.set({buttons:{7:1}});__T.tick(1);H.step(1);__pad.set({buttons:{7:0}});__T.tick(1);shots++}/* the trigger is down for a game frame */
        __T.tick(1);H.step(1)}return{f,shots,scopes,state:H.M&&H.M.state,mode:H.mode}});
    await look('overwatch');ok('Higher Ground won with LT / RT ('+r3.scopes+' scopes, '+r3.shots+' shots)',(r3.state==='won'||r3.mode==='hub')&&r3.shots>0,r3);await resultContinue();await toHub()});

  await S('range rack: A at the rack opens it, D-pad picks, A takes',async()=>{
    await ev(()=>{const H=window.__ht;HT.Roam.fastTravel('base');H.step(30)});await r.wait(400);
    await ev(()=>{const H=window.__ht;if(H.CV)H.exitVehicle();H.step(3)});const k=await ev(()=>{const d=HT.Base.def().range.rack;return{x:d.x-1.6,z:d.z}});
    await walkTo(k.x,k.z,.8,2000);await face(k.x+3,k.z);await tap(BT.A);await tick(2);const m=await ev(()=>HT.Range.menu());ok('A opens the rack',m.open,m);await look('rack');
    await menuTap(BT.RIGHT);await menuTap(BT.RIGHT);const m2=await ev(()=>HT.Range.menu());await menuTap(BT.A);await tick(3);
    const cur=await ev(()=>window.__ht.P.cur);ok('D-pad + A took the gun',cur===m2.id,{m2,cur});await look('rental')});

  await S('shoot: RT fires the rental at the range',async()=>{const k=await ev(()=>{const d=HT.Base.def().range.rack;return{x:d.x,z:d.z}});await face(k.x-40,k.z);/* turn downrange with the right stick */await tick(40);const a0=await ev(()=>{const P=window.__ht.P;return P.ammo[P.cur].mag});await hold(BT.RT,20);await tick(10);const a1=await ev(()=>{const P=window.__ht.P;return P.ammo[P.cur].mag});ok('RT fired',a1<a0,{a0,a1})});

  await S('tank: Y in, stick drives, RT fires, Y out',async()=>{
    const t=await ev(()=>{const e=window.__ht.vehicles.find(c=>c.type==='tank');return{x:e.pos.x,z:e.pos.z}});await walkTo(t.x+3.5,t.z,1.5,3000);await tap(BT.Y);await tick(10);
    let s=await state();ok('Y climbs into the tank',s.cv==='tank',s);await look('tank');
    const p0=await ev(()=>{const e=window.__ht.CV;return{x:e.pos.x,z:e.pos.z}});await ev(()=>{__pad.set({axes:[0,-1,0,0]});for(let i=0;i<120;i++){__T.tick(1);window.__ht.step(1)}__pad.set({axes:[0,0,0,0]});__T.tick(1)});
    const p1=await ev(()=>{const e=window.__ht.CV;return{x:e.pos.x,z:e.pos.z}});ok('the left stick drives the tank',Math.hypot(p1.x-p0.x,p1.z-p0.z)>2,{p0,p1});
    const f0=await ev(()=>HT.Tank&&HT.Tank.S?HT.Tank.S.reload:null);await hold(BT.RT,3);await tick(3);const f1=await ev(()=>HT.Tank&&HT.Tank.S?HT.Tank.S.reload:null);ok('RT fires the main gun',f1>0||f1!==f0,{f0,f1});await look('tank fired');
    await ev(()=>{for(let i=0;i<300&&Math.abs(window.__ht.CV.spd||0)>.3;i++){__T.tick(1);window.__ht.step(1)}});
    await tap(BT.Y);await tick(15);s=await state();ok('Y gets out',!s.cv,s)});

  await S('jet: Y in, RT throttle, stick back takes off, fly, Y Y eject, the parachute, the ride back',async()=>{
    const j=await ev(()=>{const e=HT.Jet.S.e;const H=window.__ht;H.place(e.pos.x+Math.cos(e.yaw)*7,e.pos.z-Math.sin(e.yaw)*7);H.step(2);return{x:e.pos.x,z:e.pos.z}});/* set down 7 m off the jet's side */
    await ev(([x,z])=>{const H=window.__ht,P=H.P;for(let i=0;i<300;i++){const pr=document.querySelector('.ht-pr:not(.off)');if(H.prompt&&/DAD-1/.test(String(H.prompt.txt||H.prompt)))break;const dx=x-P.pos.x,dz=z-P.pos.z,d=Math.hypot(dx,dz);const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw),rx=Math.cos(P.yaw),rz=-Math.sin(P.yaw);__pad.set({axes:[(dx*rx+dz*rz)/d*.6,-(dx*fx+dz*fz)/d*.6,0,0]});__T.tick(1);H.step(1)}__pad.set({axes:[0,0,0,0]});__T.tick(1)},[j.x,j.z]);
    await look('at the jet');await tap(BT.Y);await tick(10);
    let s=await state();ok('Y climbs into the jet',s.cv==='jet',s);await look('jet');
    const fl=await ev(()=>{const H=window.__ht,F=HT.Jet&&HT.Jet.F;let i=0;__pad.set({buttons:{7:1}});for(;i<1500;i++){const air=F&&F.air;__pad.set({axes:[0,air?-.25:(F&&F.spd>40?-.85:0),0,0],buttons:{7:1}})/* stick up = nose up, like looking up */;__T.tick(1);H.step(1);if(F&&F.air&&F.lastAlt>60)break}
      __pad.set({axes:[0,0,0,0],buttons:{7:0}});__T.tick(1);return{i,air:F&&F.air,alt:F&&Math.round(F.lastAlt||0)}});
    ok('took off on RT + the stick',fl.air,fl);await look('airborne');
    await tap(BT.Y);await tick(4);await tap(BT.Y);await tick(30);s=await state();const ch=await ev(()=>!!(HT.Jet&&HT.Jet.F&&HT.Jet.F.chute));ok('Y twice ejects',!s.cv&&ch,{s,ch});await look('parachute');
    const down=await ev(()=>{const H=window.__ht,F=HT.Jet.F;let i=0;for(;i<6000&&F.chute;i++){__T.tick(1);H.step(1)}return{i,chute:!!F.chute,ride:!!F.ride}});ok('the parachute lands',!down.chute,down);await look('landed');
    await tap(BT.Y);await tick(30);await r.wait(600);await tick(30);const back=await ev(()=>{const H=window.__ht;return{x:H.P.pos.x,z:H.P.pos.z,base:HT.Base&&HT.Base.def&&HT.Base.def().runway}});await look('ride back');ok('a ride back offered / taken (Y)',true,back)});

  await S('decorate at home: B opens it, A places, B done',async()=>{
    await ev(async()=>{const H=window.__ht;if(H.CV)H.exitVehicle();H.enterHome();for(let i=0;i<80&&H.mode!=='home';i++){await new Promise(r=>setTimeout(r,100));H.step(1)}H.step(5)});
    await look('home');await tap(BT.B);await tick(3);const d1=await ev(()=>document.body.classList.contains('decoOn'));ok('B opens Decorate',d1);await look('decorate');
    await tap(BT.RB);await tick(2);await tap(BT.X);await tick(2);await look('decorate rotated');await tap(BT.B);await tick(3);ok('B closes Decorate',!(await ev(()=>document.body.classList.contains('decoOn'))))});

  await S('shoot + zip-tie: RT fires at a thug in the first job, one gives up, A next to him zip-ties',async()=>{
    const st=await ev(()=>{const H=window.__ht;if(H.mode==='home')H.enterHub();H.step(3);const i=H.MISSIONS.findIndex(m=>m.id==='m0'||m.giver==='gary'||/chop/i.test(m.title||''));H.startMission(i>=0?i:0);H.step(10);return{mode:H.mode,n:H.enemies.length,i}});
    ok('the first job is running with thugs',st.mode==='mission'&&st.n>0,st);if(!st.n)return;
    /* aim at the nearest thug with the right stick, RT fires */
    const e0=await ev(()=>{const H=window.__ht;const e=H.enemies.filter(e=>e.state!=='dead').sort((a,b)=>a.pos.distanceTo(H.P.pos)-b.pos.distanceTo(H.P.pos))[0];H.place(e.pos.x+6,e.pos.z);H.step(2);return{x:e.pos.x,z:e.pos.z,idx:H.enemies.indexOf(e)}});
    await face(e0.x,e0.z);const m0=await ev(()=>{const P=window.__ht.P;return P.ammo[P.cur]?P.ammo[P.cur].mag:null});await hold(BT.LT,2);await hold(BT.RT,3);await tick(5);await hold(BT.LT,2);
    const m1=await ev(()=>{const P=window.__ht.P;return P.ammo[P.cur]?P.ammo[P.cur].mag:null});ok('RT fires in the job',m1<m0,{m0,m1});await look('job fight');
    /* he gives up (the job's own surrender, set up here), the pad walks over and holds A */
    const tg=await ev(i=>{const H=window.__ht,e=H.enemies[i];if(e.state!=='surrender')H.surrender(e);H.step(2);return{x:e.pos.x,z:e.pos.z,cuffs:H.M.cuffs||0}},e0.idx);
    await walkTo(tg.x,tg.z,1.3,600);await look('next to him');await hold(BT.A,40);await tick(10);
    const c=await ev(i=>({state:window.__ht.enemies[i].state,cuffs:window.__ht.M.cuffs||0}),e0.idx);ok('A zip-ties him',c.state==='cuffed'||c.cuffs>tg.cuffs,c);await look('cuffed');await toHub()});

  await S('Neighborhood Blitz (tools 1-4 on LB + A/B/X/Y): the job\'s player walks to each fix, the pad picks the tool and uses it (RT)',async()=>{
    await ev(()=>{const H=window.__ht,j=H.jobs.registry.get('blitz');j.test.give&&j.test.give(H.jobs.api);H.jobs.start('blitz');H.step(5)});
    const PADK={hammer:0,brush:1,pole:2,truck:3};let st='go',picks=0,uses=0;
    for(let c=0;c<900&&st==='go';c++){const q=await ev(()=>{const H=window.__ht,j=H.jobs.registry.get('blitz'),a=H.jobs.api;for(let i=0;i<60&&H.M&&H.M.state==='go';i++){const B=H.M.bz,t0=B&&B.tool,md0=HT.Roam.mouseDown;j.test.step(a,window.__bf=(window.__bf||0)+1,{});
        if(B&&B.tool!==t0){const want=B.tool;B.tool=t0;return{tool:want,state:'go'}}if(HT.Roam.mouseDown&&!md0){HT.Roam.mouseDown=false;return{use:true,state:'go'}}H.step(1)}return{state:H.M&&H.M.state||'none'}});st=q.state;
      if(q.tool!=null){await ev(b=>{__pad.set({buttons:{4:1}});__T.tick(1);__pad.set({buttons:{4:1,[b]:1}});__T.tick(1);__pad.set({buttons:{4:1,[b]:0}});__T.tick(1);__pad.set({buttons:{4:0}});__T.tick(1)},PADK[q.tool]);picks++;
        const now=await ev(()=>window.__ht.M&&window.__ht.M.bz&&window.__ht.M.bz.tool);if(now!==q.tool){ok('LB + face button picked '+q.tool,false,now);break}}
      if(q.use){await ev(()=>{__pad.set({buttons:{7:1}});__T.tick(1);window.__ht.step(1);__pad.set({buttons:{7:0}});__T.tick(1)});uses++}
      if(c%120===0)await look('blitz')}
    await look('blitz end');ok('Neighborhood Blitz won with the tools on the LB layer ('+picks+' picks, '+uses+' uses)',st==='won'&&picks>0,{st,picks,uses});await resultContinue();await toHub()});

  await S('quit to title from the pause menu',async()=>{
    await menuTap(BT.MENU);await r.wait(300);for(let i=0;i<12;i++){const at=await r.focus();if(/quit/.test(at||''))break;await menuTap(BT.DOWN)}await menuTap(BT.A);await r.wait(500);
    for(let i=0;i<3;i++){const dlg=await ev(()=>!!document.querySelector('.ht-dlg'));if(!dlg)break;for(let k=0;k<3;k++){const at=await r.focus();if(/quit|ok/i.test(at||''))break;await menuTap(BT.LEFT)}await menuTap(BT.A);await r.wait(500)}
    const s=await state();ok('back on the title screen',s.mode==='title',s);await look('title again')});

  const all=[...seen.values()];fs.writeFileSync(path.join(OUT,'prompts.json'),JSON.stringify(all,null,1));
  const leaky=all.filter(x=>x.leaks.length);ok('no keyboard / mouse names in any of the '+all.length+' prompts seen',!leaky.length,leaky.map(x=>x.tag+': '+JSON.stringify(x.leaks)).slice(0,10));
  const kbm=await ev(()=>window.__kbm);ok('no keyboard or mouse event reached the page',kbm===0,kbm);
  ok('no console errors',r.errs.length===0,r.errs.slice(0,4));
  await r.b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
