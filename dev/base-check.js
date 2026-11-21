/* Fort Sensible play-through: node dev/base-check.js [drive,range,tank,jet,eggs|all] [--shots] [--keep]
   Drives the minivan from home to the base with real keys, runs the range course (E at the officer, real mouse clicks to fire),
   rents a gun, borrows the tank (E), drives it and fires the main gun (left click), takes the jet (E), takes off with the keys,
   flies a circuit, buzzes the house, lands, then ejects on a second flight; finds the easter eggs. Fails on any console error.
   The bot aims by setting the view like a mouse would (P.yaw/P.pitch); every press, click and hold is a Playwright event.
   --shots writes the play-through jpgs to docs/screenshots/base/. Numbers go to docs/screenshots/base/evidence.txt. */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs'),path=require('path');
const OUT=path.join(__dirname,'../docs/screenshots/base');fs.mkdirSync(OUT,{recursive:true});
const args=process.argv.slice(2),SHOTS=args.includes('--shots');let phases=(args.find(a=>!a.startsWith('--'))||'all').split(',');
if(phases.includes('all'))phases=['drive','range','tank','jet','eggs'];
const log=[];const say=(...a)=>{const s=a.join(' ');console.log(s);log.push(s)};let fails=0;
const ok=(c,m)=>{say((c?'  ok   ':'  FAIL ')+m);if(!c)fails++};
(async()=>{const {b,p,errs}=await open({viewport:{width:1280,height:720}});
  const ev=(f,a)=>p.evaluate(f,a);/* stepping also streams the world (index.html does that in the draw pass, which stepping skips) */
  const step=n=>ev(n=>{const H=window.__ht;H.step(n);H.ow.update(H.camera)},n);
  const shot=async(name,o)=>{if(!SHOTS)return;await ev(o=>{const H=window.__ht;if(o&&o.hideHud){for(const el of document.body.querySelectorAll('body > *'))if(el!==H.renderer.domElement&&el.style&&!el.contains(H.renderer.domElement))el.style.visibility='hidden'}H.draw();H.draw()},o||{});
    await p.screenshot({path:path.join(OUT,name+'.jpg'),type:'jpeg',quality:82});
    await ev(()=>{for(const el of document.body.querySelectorAll('body > *'))if(el.style)el.style.visibility=''});say('  shot '+name+'.jpg')};
  const st=()=>ev(()=>{const H=window.__ht,P=H.P,CV=H.CV;return{x:P.pos.x,z:P.pos.z,yaw:P.yaw,car:CV?{x:CV.pos.x,z:CV.pos.z,yaw:CV.yaw,spd:CV.spd,type:CV.type}:null,mode:H.mode}});
  const keys=new Set();const key=async(k,down)=>{if(down&&!keys.has(k)){keys.add(k);await p.keyboard.down(k)}else if(!down&&keys.has(k)){keys.delete(k);await p.keyboard.up(k)}};
  const release=async()=>{for(const k of[...keys])await key(k,false)};
  /* drive the current car along waypoints with W/A/S/D (steering duty-cycled like a person tapping) */
  const drive=async(wps,o={})=>{let i=0,t=0;const vmax=o.vmax||13;
    while(i<wps.length&&t<(o.max||2400)){t++;const s=await st();if(!s.car){say('  (not in a car)');break}const c=s.car,[wx,wz]=wps[i],dx=wx-c.x,dz=wz-c.z,d=Math.hypot(dx,dz);
      if(d<(o.reach||5)){i++;continue}
      let err=Math.atan2(-dx,-dz)-c.yaw;err=Math.atan2(Math.sin(err),Math.cos(err));const duty=Math.min(1,Math.abs(err)*1.6),ph=(t%4)/4<duty;
      await key('a',err>0.04&&ph);await key('d',err<-0.04&&ph);
      const last=i===wps.length-1,want=Math.min(vmax,Math.abs(err)>.6?5:last?Math.max(3,d*.8):vmax);
      await key('w',c.spd<want);await key('s',c.spd>want+2.5);await step(2)}
    await release();for(let k=0;k<60;k++){const s=await st();if(!s.car||Math.abs(s.car.spd)<.4)break;await key(s.car.spd>0?'s':'w',true);await step(2);await release()}await release();await step(10);return i>=wps.length};
  /* walk to a point (W held, the view turned toward it like a mouse would) */
  const walk=async(x,z,r=1)=>{let last=null,stuck=0;for(let t=0;t<900;t++){const s=await st();const d=Math.hypot(x-s.x,z-s.z);if(d<r)break;
      if(last&&Math.hypot(s.x-last.x,s.z-last.z)<.03)stuck++;else stuck=0;last=s;
      await ev(([x,z])=>{const P=window.__ht.P;P.yaw=Math.atan2(-(x-P.pos.x),-(z-P.pos.z))},[x,z]);await key('w',true);await key('d',stuck>4&&stuck<16);await step(2)}
    await release();await step(4);const s=await st();const okk=Math.hypot(x-s.x,z-s.z)<r+.5;if(!okk)say('  (walk to '+x.toFixed(0)+','+z.toFixed(0)+' stopped at '+s.x.toFixed(1)+','+s.z.toFixed(1)+')');return okk};
  const route=async(pts,r)=>{for(const[x,z]of pts)if(!await walk(x,z,r||1))return false;return true};
  const aimAt=(x,y,z)=>ev(([x,y,z])=>{const H=window.__ht,P=H.P;P.bloom=0;P.rDebt=0;/* the bot waits for the crosshair to settle */for(let k=0;k<2;k++){const c=H.camera.position;const dx=x-c.x,dy=y-c.y,dz=z-c.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));H.step(1)}},[x,y,z]);
  const click=async(n=1)=>{for(let k=0;k<n;k++){await p.mouse.down();await step(2);await p.mouse.up();await step(4)}};
  const press=async k=>{await p.keyboard.press(k);await step(3)};
  const T0=Date.now();
  /* a fresh game in the open world */
  await ev(()=>{try{localStorage.removeItem('ht-save')}catch(_){}const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(3)});
  await p.mouse.click(640,360);await step(2);/* the first click asks for pointer lock (refused headless) */
  const perf=async(label)=>{const r=await ev(()=>{const H=window.__ht,R=H.renderer;const t0=performance.now();H.draw();const ms=performance.now()-t0;R.info.autoReset=false;R.info.reset();H.draw();const calls=R.info.render.calls,tris=R.info.render.triangles;R.info.autoReset=true;
      const t1=performance.now();for(let i=0;i<10;i++)H.step(1);const js=(performance.now()-t1)/10;return{calls,tris,drawMs:+ms.toFixed(1),stepMs:+js.toFixed(2)}});say('  perf '+label+' '+JSON.stringify(r));return r};

  if(phases.includes('drive')){say('== drive: home to Fort Sensible in the minivan');
    await ev(()=>{const H=window.__ht,V=H.VAN;H.P.pos.set(V.pos.x,0,V.pos.z+2.4);H.step(2)});await press('e');
    let s=await st();ok(!!s.car,'E gets in the minivan');
    await shot('drive-start');
    const done=await drive([[90,15],[160,15],[179,22],[179,38],[186,43.5],[198,44],[203,52],[203,90],[203,130],[203,158],[203,176],[203,186]],{vmax:14});
    s=await st();ok(done&&s.car&&s.car.z>165,'drove through the gate ('+(s.car?s.car.x.toFixed(0)+','+s.car.z.toFixed(0):'?')+')');
    const reg=await ev(()=>window.__ht.ow&&HT.WorldGen.regionAt(window.__ht.P.pos.x,window.__ht.P.pos.z));ok(reg==='base','region is the base');
    const pin=await ev(()=>{const w=HT.Roam.owW();return w.pins.includes('base')});ok(pin,'Fort Sensible pin is open for fast travel after the visit');
    await perf('base gate (driving)');
  }
  if(phases.includes('range')){say('== range');
    let s=await st();if(!s.car||s.car.z<160){await ev(()=>{const H=window.__ht;HT.Roam.fastTravel('base');});await step(30);await ev(()=>new Promise(r=>setTimeout(r,500)));await step(5)}
    s=await st();if(s.car){await drive([[150,187],[124,187]],{vmax:9});await press('e')}
    s=await st();ok(!s.car,'out of the car by the range');
    const d=await ev(()=>HT.Base.def().range);
    s=await st();say('  on foot at '+s.x.toFixed(0)+','+s.z.toFixed(0));ok(await route([[131,191],[131,206.4],[d.officer.x+1.6,d.officer.z]],.6),'walked to the range officer');await shot('range-arrive');
    await press('e');let r=await ev(()=>HT.Range.state());ok(r.met,'E talks to Sgt. Pruitt');
    await press('e');r=await ev(()=>HT.Range.state());ok(r.course&&r.course.state==='count','E again starts the timed course');
    let guard=0,shots=0;while(guard++<1200){const q=await ev(()=>{const S=HT.Range.S,c=S.course;if(!c)return{none:1};const stg=c.stage;let tg=null;if(stg&&c.state==='run'&&stg.pause<=0&&stg.need.size){const t=[...stg.need][0];t.mesh.updateMatrixWorld();const v=new THREE.Vector3();t.mesh.getWorldPosition(v);tg=[v.x,v.y,v.z,t.kind]}
        return{state:c.state,tg,stage:c.stageI}});
      if(q.none||q.state==='done')break;
      if(q.tg){await aimAt(q.tg[0],q.tg[1],q.tg[2]);await click(1);shots++;if(SHOTS&&q.stage===0&&shots===2)await shot('range-course')}else await step(4)}
    r=await ev(()=>HT.Range.state());ok(r.course&&r.course.state==='done'&&r.card,'course finished: score '+(r.course&&r.course.total)+', medal '+(r.course&&r.course.medal)+', '+(r.course&&r.course.shots)+' shots');
    await step(10);await shot('range-result');
    const saved=await ev(()=>{const s=HT.Jobs.api.SV();return s&&s.base&&s.base.range});ok(saved&&Object.keys(saved).length===1,'best saved per gun: '+JSON.stringify(saved).slice(0,90));
    await p.keyboard.press('Enter');await step(3);r=await ev(()=>HT.Range.state());ok(!r.card,'Enter closes the results card');
    await ev(()=>HT.Range.showLast&&HT.Range.showLast());r=await ev(()=>HT.Range.state());if(r.card){await p.keyboard.press('e');await step(3);r=await ev(()=>HT.Range.state());ok(!r.card,'E closes it too')}
    /* rental rack */
    await walk(d.rack.x+1.2,d.rack.z,.5);await step(4);say('  rack prompt: '+await ev(()=>JSON.stringify(window.__ht.prompt)));await press('e');r=await ev(()=>HT.Range.state());const cur=await ev(()=>window.__ht.P.cur);ok(r.rent&&cur!=='pistol','E at the rack rents '+cur);
    await aimAt(d.line-50,1.4,d.lanes[3]);await click(3);await shot('range-rental');
    const ammoFull=await ev(()=>{const P=window.__ht.P,a=P.ammo[P.cur],w=window.__ht.WEAPONS?null:null;return a&&a.res>0});ok(ammoFull,'free ammo on the line');
    /* the muzzle has to point downrange */
    const m0=await ev(()=>{const P=window.__ht.P;return P.ammo[P.cur].mag});await ev(()=>{window.__ht.P.yaw=-Math.PI/2});await click(1);const m1=await ev(()=>{const P=window.__ht.P;return P.ammo[P.cur].mag});ok(m1===m0,'firing away from downrange is refused');
    await route([[131,206],[140,190]],1.5);r=await ev(()=>HT.Range.state());const back=await ev(()=>window.__ht.P.cur);const drawn=await ev(()=>HT.Roam.drawn);ok(!r.rent&&!drawn,'leaving the range returns the rental ('+back+') and holsters');
    await press('1');const drawn2=await ev(()=>HT.Roam.drawn);ok(!drawn2,'the gun stays holstered elsewhere on the post');
    const heat=await ev(()=>window.__ht.heat||0);ok(!heat,'no heat from range shooting');
    await perf('range');
  }
  if(phases.includes('tank')){say('== tank');
    let s=await st();if(s.car){await ev(()=>HT.Jobs.api.exitCar());await step(4)}
    const d=await ev(()=>HT.Base.def());
    if(Math.hypot(s.x-200,s.z-190)>60){await ev(()=>{const P=window.__ht.P;P.pos.set(150,0,190)});await step(4)}
    ok(await route([[150,190],[206,190],[213.6,199]],.5),'walked to the motor pool');
    let t=await ev(()=>HT.Tank.state());ok(t.e,'the tank is parked in the motor pool');
    if(SHOTS){await ev(()=>{const H=window.__ht;H.P.dude&&(H.P.dude.root.visible=false)});await ev(()=>{const H=window.__ht,c=H.camera;H.step(1);H.draw();c.position.set(205,3.2,212);c.lookAt(216,1.6,199);H.render.draw()});await p.screenshot({path:path.join(OUT,'tank-outside.jpg'),type:'jpeg',quality:82});say('  shot tank-outside.jpg')}
    await press('e');s=await st();ok(s.car&&s.car.type==='tank','E borrows the tank');
    const y0=s.car.yaw;await key('a',true);await step(40);await key('a',false);await step(4);s=await st();ok(Math.abs(s.car.yaw-y0)>.4&&Math.abs(s.car.spd)<1.5,'A turns it on the spot ('+(s.car.yaw-y0).toFixed(2)+' rad)');
    await key('d',true);await step(40);await key('d',false);
    const p0=await st();await key('w',true);await step(70);await key('w',false);await step(20);s=await st();const moved=Math.hypot(s.car.x-p0.car.x,s.car.z-p0.car.z);ok(moved>3,'W drives it ('+moved.toFixed(1)+' m, top '+(await ev(()=>window.__ht.CV.car.stats.maxSpeed)).toFixed(1)+' m/s)');
    await ev(()=>{const P=window.__ht.P;P.yaw+=1.0;P.pitch=-.05});await step(70);t=await ev(()=>{const H=window.__ht,e=H.CV;let d=e.yaw+HT.Tank.S.turretYaw-H.P.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));return{err:d,turret:HT.Tank.S.turretYaw}});ok(Math.abs(t.err)<.08&&Math.abs(t.turret)>.3,'the turret follows the mouse look (turret '+t.turret.toFixed(2)+' rad, off by '+t.err.toFixed(3)+')');
    await shot('tank-turret');
    /* aim west down the apron, fire with a real left click */
    await ev(()=>{const H=window.__ht,P=H.P;P.yaw=Math.PI/2+.25;P.pitch=-.3});await step(70);
    await p.mouse.down();await step(2);await p.mouse.up();t=await ev(()=>HT.Tank.state());ok(t.shells===1||t.reload>3,'left click fires the main gun');
    await step(2);await shot('tank-firing');await step(8);await shot('tank-impact');
    await p.mouse.down();await step(2);await p.mouse.up();t=await ev(()=>HT.Tank.state());ok(t.shells<=1&&t.reload>2,'a second click while reloading does nothing ('+t.reload.toFixed(1)+' s left)');
    await press('v');await step(6);await shot('tank-sight');await press('v');
    /* the cone slalom and the hay bales: drive through them */
    await drive([[214,213],[245,213]],{vmax:7,reach:3});t=await ev(()=>HT.Tank.state());ok(t.props>0,'drove through the cones and hay bales ('+t.props+' knocked over)');
    /* a parked car: put one in front of the tank and roll over it */
    const r=await ev(()=>{const H=window.__ht,c=H.CV,cars=H.L.cars.filter(q=>q!==c&&q!==H.VAN&&q.owner==='neighbour');const v=cars[0];if(!v)return null;const fx=-Math.sin(c.yaw),fz=-Math.cos(c.yaw);
      v.pos.set(c.pos.x+fx*9,0,c.pos.z+fz*9);v.yaw=c.yaw+Math.PI/2;window.HT.Jobs.api.syncCar(v);return{name:v.name,hp:window.HT.Jobs.api.carHp(v)}});
    await key('w',true);await step(80);await key('w',false);await step(10);t=await ev(()=>HT.Tank.state());const hp1=await ev(()=>{const H=window.__ht;const v=[...HT.Tank.S.flat][0];return v?window.HT.Jobs.api.carHp(v):null});
    ok(t.flat>=1&&hp1===0,'flattened '+(r&&r.name)+"'s car through the car-damage API (hp "+(r&&r.hp)+' -> '+hp1+')');
    await shot('tank-flattened');
    await perf('tank driving');
    /* jobs refuse it */
    const nj=await ev(()=>window.__ht.CV.noJobs);ok(/bake sale/.test(nj||''),'jobs refuse the tank: "'+nj+'"');
    await key('s',true);for(let i=0;i<60;i++){const q=await st();if(Math.abs(q.car.spd)<.5)break;await step(2)}await release();await step(4);
    await press('e');s=await st();ok(!s.car,'E gets out');
  }
  if(phases.includes('jet')){say('== jet');
    let s=await st();if(s.car){await press('e');await step(4)}
    const d=await ev(()=>HT.Base.def());const js=()=>ev(()=>HT.Jet.state());
    await ev(()=>{const P=window.__ht.P;P.pos.set(240,0,214)});await step(6);
    ok(await route([[256,215.6]],.7),'walked to the jet on the apron');let j=await js();ok(j.e,'the jet is parked by Hangar 2');
    if(SHOTS){await ev(()=>{const H=window.__ht,c=H.camera;H.P.dude&&(H.P.dude.root.visible=false);H.step(1);H.draw();c.position.set(266,3.6,238);c.lookAt(255,1.8,221);H.render.draw()});await p.screenshot({path:path.join(OUT,'jet-apron.jpg'),type:'jpeg',quality:82});say('  shot jet-apron.jpg')}
    await press('e');j=await js();ok(j.on,'E climbs into the jet');
    /* a tiny autopilot that only presses keys: heading by roll (A/D), climb by pitch (arrows), speed by throttle (W/S, Shift) */
    let famMax=0;const fly=async(o)=>{const t0=o.max||900;let n=0;for(;n<t0;n++){j=await js();famMax=Math.max(famMax,j.fam||0);if(o.until&&o.until(j))break;
        const TT=typeof o.to==='function'?o.to(j):o.to,tx=TT[0],tz=TT[1];/* o.to may be a function (a look-ahead point) */const want=Math.atan2(-(tx-j.x),-(tz-j.z));let he=want-j.hdg;he=Math.atan2(Math.sin(he),Math.cos(he));
        const bankW=Math.max(-1,Math.min(1,-he*1.8));await key('a',j.bank>bankW+.08);await key('d',j.bank<bankW-.08);
        const altW=typeof o.alt==='function'?o.alt(j):o.alt,pw=Math.max(-.3,Math.min(.32,(altW-j.alt)*.03))+Math.abs(j.bank)*.06;
        await key('ArrowUp',j.pitch<pw-.03);await key('ArrowDown',j.pitch>pw+.05);
        const sw=o.spd||75,mt=o.minThr==null?.35:o.minThr;await key('w',j.spd<sw||j.thr<mt);await key('s',j.spd>sw+(o.minThr==null?8:2)&&j.thr>mt-.05);
        if(process.env.FLYLOG&&n%10===0)console.log('    fly',n,j.x.toFixed(0),j.z.toFixed(0),'alt',j.alt.toFixed(1),'hdg',j.hdg.toFixed(2),'bank',j.bank.toFixed(2),'pitch',j.pitch.toFixed(2),'spd',j.spd.toFixed(0),'thr',j.thr.toFixed(2));if(!!o.ab!==j.abOn&&(!o.ab||j.thr>.95)){await p.keyboard.press('Shift')}/* Shift toggles the afterburner */await step(2)}
      await release();return n};
    /* taxi onto runway 27 and roll: full throttle, A steers south onto the centreline, then pull up past 94 mph */
    for(let i=0;i<10;i++)await p.keyboard.press('w');/* ten taps: full throttle, and it stays */await step(4);j=await js();ok(j.thr>.99,'ten taps of W set full throttle, nothing held ('+Math.round(j.thr*100)+'%)');
    for(let i=0;i<260;i++){j=await js();const want=Math.atan2(-(d.runway.end.x-j.x),-(d.runway.z-4*Math.sign(d.runway.z-j.z)*0-j.z));let he=want-j.hdg;he=Math.atan2(Math.sin(he),Math.cos(he));
      await key('a',he>.04);await key('d',he<-.04);await key('ArrowUp',j.spd>42);if(j.air)break;if(i===40)await shot('jet-takeoff');await step(2)}
    await release();j=await js();ok(j.air,'took off ('+(j.spd*2.237).toFixed(0)+' mph at x '+j.x.toFixed(0)+')');
    await press('g');j=await js();ok(j.gear===0,'G raises the gear');
    await fly({to:[-200,230],alt:90,max:140});await perf('jet climbing out');
    await press('v');await step(4);await shot('jet-cockpit');await press('v');await step(2);await ev(()=>{window.__ht.P.fp=false});
    await press('c');j=await js();const lk1=j.look;await step(10);await press('c');j=await js();ok(lk1&&!j.look,'C toggles the look back on and off (no held keys)');
    j=await js();ok(j.thr>.3,'the throttle holds with no key down ('+Math.round(j.thr*100)+'%)');
    /* the circuit: north over Maple Heights, low and fast over the house (the family comes out), a sonic boom */
    await fly({to:[250,120],alt:80,max:300,until:q=>Math.hypot(q.x-250,q.z-120)<60});
    const home=await ev(()=>({x:window.__ht.L.start.x,z:window.__ht.L.start.z}));
    await fly({to:[home.x,home.z],alt:q=>Math.hypot(q.x-home.x,q.z-home.z)<700?34:90,spd:78,max:500,until:q=>Math.hypot(q.x-home.x,q.z-home.z)<220});
    await shot('jet-maple');await perf('jet over Maple Heights (inbound, looking at the houses)');
    await fly({to:[home.x,home.z],alt:34,spd:78,max:300,until:q=>Math.hypot(q.x-home.x,q.z-home.z)<30});
    await fly({to:[home.x+260,home.z+40],alt:45,spd:100,ab:true,max:120});
    if(SHOTS){/* the lawn, from the street: a fixed camera on the family (the bot's jet is already past) */
      await ev(()=>{const H=window.__ht,c=H.camera,d=HT.Jobs.api.WORLD.doors.home;for(const el of document.body.querySelectorAll('body > *'))if(el!==H.renderer.domElement&&el.style&&!el.contains(H.renderer.domElement))el.style.visibility='hidden';
        H.draw();const put=()=>{c.position.set(d.x-7,1.8,d.z-9.5);c.lookAt(d.x-3.6,1.1,d.z-1.5);c.updateMatrixWorld()};put();for(let i=0;i<4;i++){H.ow.update(c);if(HT.World.update)HT.World.update(H.L,c.position)}put();H.render.draw()});
      await p.screenshot({path:path.join(OUT,'jet-family.jpg'),type:'jpeg',quality:82});say('  shot jet-family.jpg');await ev(()=>{for(const el of document.body.querySelectorAll('body > *'))if(el.style)el.style.visibility=''})}
    j=await js();const ach=await ev(()=>{const s=HT.Jobs.api.SV();return s.base.jet});ok(ach.buzz&&famMax===3,'buzzed the house: the family came out ('+famMax+' waving)');ok(ach.boom,'sonic boom over the neighborhood');
    /* the High Bridge: north along the river, under the deck */
    const HB=await ev(()=>HT.Jet.HB);
    await fly({to:[294,720],alt:60,spd:70,max:700,until:q=>Math.hypot(q.x-294,q.z-720)<80});/* well south of town first: a long straight run up the river */
    await fly({to:q=>[294,Math.min(q.z,600)-250],alt:q=>q.z<330?22:45,spd:62,max:400,until:q=>q.z<120||(q.z<200&&Math.abs(q.x-294)<5&&Math.abs(q.hdg)<.1)});/* line up on the river, look-ahead 150 m */
    await fly({to:q=>[294,q.z-150],alt:q=>q.z<30?7:22,/* past the Route 9 bridge (z 38-46), down on the water */spd:62,max:600,until:q=>q.z<HB.z-30||!q.on});
    await shot('jet-bridge');j=await js();const ach2=await ev(()=>HT.Jobs.api.SV().base.jet);ok(ach2.bridge,'flew under the High Bridge ('+(j.on?'still flying':'crashed')+')');
    /* back to Fort Sensible: around to the east, line up with runway 27, gear down, land heading west */
    if(!j.on){say('  (back to the jet for the landing)');await ev(()=>{const P=window.__ht.P;P.pos.set(256,0,215.6)});await step(4);await press('e')}
    else{await fly({to:[520,d.runway.z],alt:90,spd:70,max:500,until:q=>q.x>470&&Math.abs(q.z-d.runway.z)<80});
      await fly({to:[720,d.runway.z],alt:40,spd:60,max:300,until:q=>q.x>680});/* out past the threshold, then a long final */
      await fly({to:q=>[Math.min(q.x-150,440),d.runway.z],alt:26,spd:55,max:400,until:q=>q.x<480&&Math.abs(q.hdg-Math.PI/2)<.12&&Math.abs(q.z-d.runway.z)<8});
      await press('g');j=await js();ok(j.gear===1,'G lowers the gear for landing');
      await fly({to:q=>[q.x-120,d.runway.z],alt:q=>Math.max(0,(q.x-290)*.09),spd:42,minThr:.1,max:700,until:q=>!q.air});
      for(let i=0;i<10;i++)await p.keyboard.press('s');/* taps to idle: idle on the ground brakes on its own */for(let i=0;i<200;i++){j=await js();if(j.spd<1)break;await step(2)}
      j=await js();ok(!j.air&&j.spd<2&&Math.abs(j.z-d.runway.z)<12,'landed on runway 27 ('+j.x.toFixed(0)+','+j.z.toFixed(0)+')')}
    await press('e');s=await st();ok(!s.car,'E gets out on the ground');
    /* eject: take off again, climb, E twice */
    await ev(()=>HT.Jet.home());/* what the Air Wing does with a jet left far away (20 s out of sight) */
    await ev(()=>{const e=HT.Jet.S.e,P=window.__ht.P;P.pos.set(e.pos.x+Math.cos(e.yaw)*5.2,0,e.pos.z-Math.sin(e.yaw)*5.2);window.__ht.step(4)});await step(4);await press('e');
    {const h0=(await js()).hdg;await key('w',true);for(let i=0;i<300;i++){j=await js();let he=h0-j.hdg;he=Math.atan2(Math.sin(he),Math.cos(he));await key('a',he>.04);await key('d',he<-.04);await key('ArrowUp',j.spd>42);if(j.air&&j.alt>12)break;await step(2)}await release()}
    await fly({to:[-100,d.runway.z],alt:110,max:200,until:q=>q.alt>80});
    await press('e');await step(4);j=await js();const still=j.on;await press('e');await step(30);j=await js();ok(still&&!!j.chute&&!j.on,'E twice ejects (one tap arms it): parachute at '+(j.chute?j.chute.y.toFixed(0):'?')+' m');
    await shot('jet-parachute');
    for(let i=0;i<500;i++){j=await js();if(!j.chute)break;await step(4)}const pp=await st();
    ok(!j.chute,'landed under the parachute at '+pp.x.toFixed(0)+','+pp.z.toFixed(0)+(pp.z>160&&pp.x<290?' (back on the post)':''));
    const jb=await ev(()=>{const e=HT.Jet.S.e;return e?{x:e.pos.x,z:e.pos.z}:null});ok(jb&&Math.hypot(jb.x-256,jb.z-221)<2,'the jet is back on the apron (it was a rental)');
  }
  if(phases.includes('eggs')){say('== easter eggs');
    let s=await st();if(s.car){await key('s',true);await step(30);await release();await press('e')}
    const sp=await ev(()=>HT.Eggs.spots());const found=id=>ev(id=>!!((HT.Jobs.api.SV().base.eggs||{})[id]),id);
    const near=async(x,z,face)=>{await ev(([x,z])=>{const P=window.__ht.P;P.pos.set(x,0,z);window.__ht.step(2)},[x+3,z+3]);await walk(x+.9,z+.9,.5);await ev(([x,z])=>{const P=window.__ht.P;P.yaw=Math.atan2(-(x-P.pos.x),-(z-P.pos.z));P.pitch=-.2},[x,z]);await step(4)};
    for(const id of['gnome','lights','phone','smoker']){const q=sp[id];if(!q){ok(false,id+' placed');continue}await near(q.x,q.z);await press('e');await step(6);ok(await found(id),'found the '+id+' (E at '+q.x.toFixed(0)+','+q.z.toFixed(0)+')');await shot('egg-'+id)}
    /* five taps of H in a car, then wait: two bits */
    await ev(()=>{const H=window.__ht,V=H.VAN;H.P.pos.set(V.pos.x,0,V.pos.z+2.4);H.step(2)});await press('e');for(let i=0;i<5;i++){await p.keyboard.press('h');await p.waitForTimeout(i===2?380:180)}
    await p.waitForTimeout(1900);await step(4);ok(await found('honk'),'shave and a haircut on the horn: two bits');await press('e');
    /* Walt's glovebox */
    const walt=await ev(()=>{const c=window.__ht.L.cars.find(q=>/walt/i.test(q.name||''));return c?{x:c.pos.x,z:c.pos.z,yaw:c.yaw,w:2}:null});
    if(walt){await ev(([x,z,yaw])=>{const P=window.__ht.P;P.pos.set(x+Math.cos(yaw)*2.2,0,z-Math.sin(yaw)*2.2);window.__ht.step(4)},[walt.x,walt.z,walt.yaw]);await press('e');s=await st();await p.keyboard.press('g');await step(4);await shot('egg-mug');ok(await found('mug'),"G in Walt's car finds the mug");await press('e')}else ok(false,"Walt's car exists");
    /* cardboard Bigfoot on the range berm */
    const d=await ev(()=>HT.Base.def().range);await ev(([x,z])=>{const P=window.__ht.P;P.pos.set(x+1.2,0,z);window.__ht.step(4)},[d.rack.x,d.rack.z]);await step(4);
    for(let i=0;i<10&&(await ev(()=>window.__ht.P.cur))!=='hunter';i++){await press('e');await step(4)}/* the .308 from the rental rack: a pistol doesn't reach 100 m */
    await ev(([x,z])=>{const P=window.__ht.P;P.pos.set(x,0,z);window.__ht.step(4)},[d.stand,d.lanes[1]+1.3]);await step(10);
    await p.mouse.down({button:'right'});await step(30);/* aim down the scope (right mouse held), like a person would at 100 m */
    for(let i=0;i<6&&!(await found('bigfoot'));i++){await aimAt(sp.bigfoot.x,sp.bigfoot.y,sp.bigfoot.z);await step(20);await aimAt(sp.bigfoot.x,sp.bigfoot.y,sp.bigfoot.z);await click(1);await step(8)}
    if(SHOTS)await shot('egg-bigfoot');await p.mouse.up({button:'right'});await step(4);
    ok(await found('bigfoot'),'hit the cardboard Bigfoot at 100 m');
    /* the pause menu lists them */
    await p.keyboard.press('Escape');await p.waitForTimeout(300);const tab=await p.$('[data-tab="found"]');ok(!!tab,'pause menu has "Things your dad found"');if(tab){await tab.click();await p.waitForTimeout(300)}
    const txt=await ev(()=>{const e=document.querySelector('.ht-pause .ht-pane');return e?e.textContent:''});ok(/7\/7/.test(txt),'the list fills in: '+(txt.match(/\d\/\d/)||['?'])[0]);
    if(SHOTS){await p.screenshot({path:path.join(OUT,'eggs-pause.jpg'),type:'jpeg',quality:82});say('  shot eggs-pause.jpg')}
    await p.keyboard.press('Escape');await p.waitForTimeout(200);
  }
  if(SHOTS)fs.writeFileSync(path.join(OUT,'evidence.txt'),log.join('\n')+'\n');
  say(errs.length?'CONSOLE ERRORS:\n'+errs.slice(0,12).join('\n'):'no console errors');if(errs.length)fails++;
  say((fails?fails+' FAILED':'all ok')+' · '+((Date.now()-T0)/1000).toFixed(0)+' s');
  if(SHOTS)fs.writeFileSync(path.join(OUT,'evidence.txt'),log.join('\n')+'\n');
  await b.close();process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
