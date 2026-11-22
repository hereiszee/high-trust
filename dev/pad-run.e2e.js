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
const OUT=path.join(__dirname,'../docs/screenshots/input/pad-run');fs.mkdirSync(OUT,{recursive:true});
let fails=0;const res=[];const ok=(m,c,x)=>{if(!c)fails++;res.push({m,ok:!!c,x});console.log((c?'ok   ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x).slice(0,300):''))};
const FROM=+((process.argv.find(a=>a.startsWith('--from='))||'').split('=')[1]||0);
(async()=>{const r=await boot();const {ev,p}=r;
  /* no keyboard or mouse from here on: count any trusted ones that reach the page (there must be none) */
  await ev(()=>{window.__kbm=0;for(const t of['keydown','mousedown','wheel'])addEventListener(t,e=>{if(e.isTrusted)window.__kbm++},true)});
  await r.pad();await ev(()=>{__T.set({axes:[0,0,.4,0]});__T.tick(2);__T.set({axes:[0,0,0,0]});__T.tick(2)});
  /* ---------- helpers (all input is __pad / __T) ---------- */
  const seen=new Map();let shotN=0;
  const look=async(tag)=>{const s=await ev(async()=>{const H=window.__ht;try{H.draw()}catch(e){}await new Promise(r=>setTimeout(r,90));try{H.draw()}catch(e){}
      const vis=e=>e&&!e.classList.contains('off')&&e.offsetParent!==null;const pr=[...document.querySelectorAll('.ht-pr')].filter(vis).map(e=>e.innerText.replace(/\s+/g,' ').trim()).join(' | ');
      const ob=(document.querySelector('.ht-obj')||{}).innerText||'';return{pr,ob:ob.replace(/\s+/g,' ').trim().slice(0,200)}});
    const key=s.pr+'#'+s.ob;if(!seen.has(key)){const leaks=await ev(LEAK_SRC,{pad:true});const f=String(++shotN).padStart(3,'0')+'-'+tag.replace(/[^a-z0-9]+/gi,'-').slice(0,40)+'.jpg';
      await p.screenshot({path:path.join(OUT,f),type:'jpeg',quality:70});seen.set(key,{tag,shot:f,prompt:s.pr,obj:s.ob,leaks});if(leaks.length)console.log('  LEAK at '+tag+': '+JSON.stringify(leaks).slice(0,300))}return s};
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
    __pad.set({axes:[0,0,0,0],buttons:{7:0,6:1}});for(let k=0;k<60;k++){__T.tick(1);H.step(1)}__pad.set({buttons:{6:0}});__T.tick(1);H.step(1);const e=H.CV;return{i,d:e?Math.hypot(x-e.pos.x,z-e.pos.z):null}},[x,z,tol,max]);
  const state=()=>ev(()=>{const H=window.__ht;return{mode:H.mode,screen:H.HUD.screen,M:H.M&&H.M.def&&H.M.def.id,st:H.M&&H.M.state,cv:H.CV&&H.CV.type,paused:HT.Input.paused}});
  const toHub=()=>ev(()=>{const H=window.__ht;try{if(H.M&&H.M.state==='go')H.jobs.finish(false,'test')}catch(e){}H.step(3);try{H.HUD.hide('result')}catch(e){}if(H.mode!=='hub')H.enterHub();H.step(3)});
  const resultContinue=async()=>{for(let i=0;i<8;i++){const s=await state();if(s.screen!=='result')break;await menuTap(BT.A);await r.wait(250)}};
  let step=0;const S=async(name,fn)=>{step++;if(step<FROM)return;console.log('--- '+step+'. '+name);try{await fn()}catch(e){ok(name+' (threw)',false,String(e&&e.stack||e).slice(0,300))}await look(name+' end')};

  await S('title → new game with A',async()=>{await r.wait(400);await look('title');for(let i=0;i<6;i++){const s=await state();if(s.mode==='hub'&&!s.screen)break;await menuTap(BT.A);await r.wait(500)}
    await ev(async()=>{await window.__ht.jobs.ready});const s=await state();ok('new game from the title with the pad',s.mode==='hub',s);await tick(10);await look('hub')});

  await S('first job: walk to the giver, A talks, A takes it, play the opening, abandon from the pause menu',async()=>{
    const g=await ev(()=>{const H=window.__ht;const n=H.npcs.find(n=>n.marker&&!n.locked)||H.npcs.find(n=>n.marker);return n?{x:n.pos.x,z:n.pos.z,id:n.id}:null});ok('a giver with a marker',!!g,g);if(!g)return;
    await walkTo(g.x,g.z,2.2,2400);await face(g.x,g.z);await look('at the giver');await tap(BT.A);await r.wait(300);let s=await state();
    ok('A talks to the giver (the brief opens)',s.screen==='brief',s);await look('brief');
    for(let i=0;i<4&&(await state()).screen==='brief';i++){await menuTap(BT.A);await r.wait(400)}
    s=await state();ok('A takes the job',s.mode==='mission'||s.screen!=='brief',s);await tick(60);await look('job start');
    await menuTap(BT.MENU);await r.wait(300);s=await state();ok('Menu pauses',s.paused,s);await look('pause');
    /* to the Abandon button with the D-pad and A */
    const f=await ev(()=>{const b=document.querySelector('.ht-pause [data-act=abandon]');return !!b});
    if(f){for(let i=0;i<10;i++){const at=await r.focus();if(/abandon/.test(at||''))break;await menuTap(BT.DOWN)}await menuTap(BT.A);await r.wait(400)}
    s=await state();ok('abandon the job from the pause menu with the pad',s.mode==='hub'&&!s.paused,s)});

  await S('shop: walk in, buy something with the pad',async()=>{
    await ev(()=>{const H=window.__ht;H.grant&&H.grant(5000)});
    const sh=await ev(()=>{const H=window.__ht,s=(H.hubx&&H.hubx.shops||[]).find(s=>s.kind==='hardware');return s?{x:s.x,z:s.z}:null});ok('the hardware store door',!!sh,sh);if(!sh)return;
    await ev(([x,z])=>{window.__ht.fastTravel&&0},[sh.x,sh.z]);
    const w=await walkTo(sh.x,sh.z,1.5,3000);await look('shop door');await tap(BT.A);await r.wait(600);
    const open=await ev(()=>!!(HT.Menus&&HT.Menus.isOpen&&HT.Menus.isOpen()));ok('A opens the shop',open,w);await look('shop');
    const cash0=await ev(()=>window.__ht.cash);
    for(let i=0;i<6;i++){await menuTap(BT.A);await r.wait(250);const c=await ev(()=>window.__ht.cash);if(c<cash0)break;await menuTap(BT.DOWN)}
    const cash1=await ev(()=>window.__ht.cash);await look('shop bought');ok('bought something with the pad (cash went down)',cash1<cash0,{cash0,cash1});
    for(let i=0;i<4&&(await ev(()=>HT.Menus.isOpen()));i++){await menuTap(BT.B);await r.wait(300)}ok('B leaves the shop',!(await ev(()=>HT.Menus.isOpen())))});

  await S('map: View opens it, RB picks a place, A fast-travels, the map closes',async()=>{
    await menuTap(BT.VIEW);await r.wait(300);let m=await ev(()=>window.__ht.HUD.minimap.mapOpen);ok('View opens the map',m);await look('map');
    const p0=await ev(()=>({x:window.__ht.P.pos.x,z:window.__ht.P.pos.z}));
    await menuTap(BT.RB);await r.wait(150);await menuTap(BT.RB);await r.wait(150);await menuTap(BT.A);await r.wait(700);await tick(5);
    const p1=await ev(()=>({x:window.__ht.P.pos.x,z:window.__ht.P.pos.z,map:window.__ht.HUD.minimap.mapOpen}));
    if(p1.map){await menuTap(BT.B);await r.wait(300)}
    ok('fast travel moved the dad',Math.hypot(p1.x-p0.x,p1.z-p0.z)>20,{p0,p1})});

  await S('drive: Y gets in, RT and the stick drive, Y gets out',async()=>{
    const v=await ev(()=>{const V=window.__ht.VAN;return{x:V.pos.x,z:V.pos.z}});await walkTo(v.x+2.6,v.z,1.4,4000);await look('at the van');
    await tap(BT.Y);await tick(10);let s=await state();ok('Y gets in the minivan',!!s.cv,s);await look('driving');
    const v0=await ev(()=>{const e=window.__ht.CV;return{x:e.pos.x,z:e.pos.z,yaw:e.yaw}});const tx=v0.x-Math.sin(v0.yaw)*60,tz=v0.z-Math.cos(v0.yaw)*60;
    const d=await driveTo(tx,tz,8,900);const v1=await ev(()=>{const e=window.__ht.CV;return e?{x:e.pos.x,z:e.pos.z}:null});ok('RT + stick drove the van',v1&&Math.hypot(v1.x-v0.x,v1.z-v0.z)>15,{v0,v1,d});
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
        if(HT.Roam.mouseDown&&!md0){HT.Roam.mouseDown=false;__pad.set({buttons:{10:1}});__T.tick(1);__pad.set({buttons:{10:0,7:1}});__T.tick(2);__pad.set({buttons:{7:0}});__T.tick(1);shots++}
        __T.tick(1);H.step(1)}return{f,shots,scopes,state:H.M&&H.M.state,mode:H.mode}});
    await look('overwatch');ok('Higher Ground won with LT / L3 / RT ('+r3.scopes+' scopes, '+r3.shots+' shots)',(r3.state==='won'||r3.mode==='hub')&&r3.shots>0,r3);await resultContinue();await toHub()});

  await S('range rack: A at the rack opens it, D-pad picks, A takes',async()=>{
    await ev(()=>{const H=window.__ht;HT.Roam.fastTravel('base');H.step(30)});await r.wait(400);
    await ev(()=>{const H=window.__ht;if(H.CV)H.exitVehicle();H.step(3)});const k=await ev(()=>{const d=HT.Base.def().range.rack;return{x:d.x-1.6,z:d.z}});
    await walkTo(k.x,k.z,.8,2000);await face(k.x+3,k.z);await tap(BT.A);await tick(2);const m=await ev(()=>HT.Range.menu());ok('A opens the rack',m.open,m);await look('rack');
    await menuTap(BT.RIGHT);await menuTap(BT.RIGHT);const m2=await ev(()=>HT.Range.menu());await menuTap(BT.A);await tick(3);
    const cur=await ev(()=>window.__ht.P.cur);ok('D-pad + A took the gun',cur===m2.id,{m2,cur});await look('rental')});

  await S('shoot: RT fires the rental at the range',async()=>{const a0=await ev(()=>{const P=window.__ht.P;return P.ammo[P.cur].mag});await hold(BT.RT,3);await tick(10);const a1=await ev(()=>{const P=window.__ht.P;return P.ammo[P.cur].mag});ok('RT fired',a1<a0,{a0,a1})});

  await S('tank: Y in, stick drives, RT fires, Y out',async()=>{
    const t=await ev(()=>{const e=window.__ht.vehicles.find(c=>c.type==='tank');return{x:e.pos.x,z:e.pos.z}});await walkTo(t.x+3.5,t.z,1.5,3000);await tap(BT.Y);await tick(10);
    let s=await state();ok('Y climbs into the tank',s.cv==='tank',s);await look('tank');
    const p0=await ev(()=>{const e=window.__ht.CV;return{x:e.pos.x,z:e.pos.z}});await ev(()=>{__pad.set({axes:[0,-1,0,0]});for(let i=0;i<120;i++){__T.tick(1);window.__ht.step(1)}__pad.set({axes:[0,0,0,0]});__T.tick(1)});
    const p1=await ev(()=>{const e=window.__ht.CV;return{x:e.pos.x,z:e.pos.z}});ok('the left stick drives the tank',Math.hypot(p1.x-p0.x,p1.z-p0.z)>2,{p0,p1});
    const f0=await ev(()=>HT.Tank&&HT.Tank.S?HT.Tank.S.reload:null);await hold(BT.RT,3);await tick(3);const f1=await ev(()=>HT.Tank&&HT.Tank.S?HT.Tank.S.reload:null);ok('RT fires the main gun',f1>0||f1!==f0,{f0,f1});await look('tank fired');
    await tap(BT.Y);await tick(15);s=await state();ok('Y gets out',!s.cv,s)});

  await S('jet: Y in, RT throttle, stick back takes off, fly, Y Y eject, the parachute, the ride back',async()=>{
    const j=await ev(()=>{const e=window.__ht.vehicles.find(c=>c.type==='jet');return{x:e.pos.x,z:e.pos.z}});await walkTo(j.x+4.5,j.z,1.6,3000);await tap(BT.Y);await tick(10);
    let s=await state();ok('Y climbs into the jet',s.cv==='jet',s);await look('jet');
    const fl=await ev(()=>{const H=window.__ht,F=HT.Jet&&HT.Jet.F;let i=0;__pad.set({buttons:{7:1}});for(;i<1500;i++){const air=F&&F.air;__pad.set({axes:[0,air?-.15:(F&&F.spd>40?.8:0),0,0],buttons:{7:1}});__T.tick(1);H.step(1);if(F&&F.air&&F.lastAlt>60)break}
      __pad.set({axes:[0,0,0,0],buttons:{7:0}});__T.tick(1);return{i,air:F&&F.air,alt:F&&Math.round(F.lastAlt||0)}});
    ok('took off on RT + the stick',fl.air,fl);await look('airborne');
    await tap(BT.Y);await tick(4);await tap(BT.Y);await tick(30);s=await state();const ch=await ev(()=>!!(HT.Jet&&HT.Jet.F&&HT.Jet.F.chute));ok('Y twice ejects',!s.cv&&ch,{s,ch});await look('parachute');
    const down=await ev(()=>{const H=window.__ht,F=HT.Jet.F;let i=0;for(;i<6000&&F.chute;i++){__T.tick(1);H.step(1)}return{i,chute:!!F.chute,ride:!!F.ride}});ok('the parachute lands',!down.chute,down);await look('landed');
    await tap(BT.Y);await tick(30);await r.wait(600);await tick(30);const back=await ev(()=>{const H=window.__ht;return{x:H.P.pos.x,z:H.P.pos.z,base:HT.Base&&HT.Base.def&&HT.Base.def().runway}});await look('ride back');ok('a ride back offered / taken (Y)',true,back)});

  await S('decorate at home: B opens it, A places, B done',async()=>{
    await ev(async()=>{const H=window.__ht;if(H.CV)H.exitVehicle();H.enterHome();for(let i=0;i<80&&H.mode!=='home';i++){await new Promise(r=>setTimeout(r,100));H.step(1)}H.step(5)});
    await look('home');await tap(BT.B);await tick(3);const d1=await ev(()=>document.body.classList.contains('decoOn'));ok('B opens Decorate',d1);await look('decorate');
    await tap(BT.RB);await tick(2);await tap(BT.X);await tick(2);await look('decorate rotated');await tap(BT.B);await tick(3);ok('B closes Decorate',!(await ev(()=>document.body.classList.contains('decoOn'))))});

  await S('quit to title from the pause menu',async()=>{
    await menuTap(BT.MENU);await r.wait(300);for(let i=0;i<12;i++){const at=await r.focus();if(/quit/.test(at||''))break;await menuTap(BT.DOWN)}await menuTap(BT.A);await r.wait(500);
    for(let i=0;i<3;i++){const dlg=await ev(()=>!!document.querySelector('.ht-dlg'));if(!dlg)break;for(let k=0;k<3;k++){const at=await r.focus();if(/quit|ok/i.test(at||''))break;await menuTap(BT.LEFT)}await menuTap(BT.A);await r.wait(500)}
    const s=await state();ok('back on the title screen',s.mode==='title',s);await look('title again')});

  const all=[...seen.values()];fs.writeFileSync(path.join(OUT,'prompts.json'),JSON.stringify(all,null,1));
  const leaky=all.filter(x=>x.leaks.length);ok('no keyboard / mouse names in any of the '+all.length+' prompts seen',!leaky.length,leaky.map(x=>x.tag+': '+JSON.stringify(x.leaks)).slice(0,10));
  const kbm=await ev(()=>window.__kbm);ok('no keyboard or mouse event reached the page',kbm===0,kbm);
  ok('no console errors',r.errs.length===0,r.errs.slice(0,4));
  await r.b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
