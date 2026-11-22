/* Fort Sensible play-through: node dev/base-check.js [drive,range,tank,jet,eggs|all] [--shots] [--keep]
   Drives the minivan from home to the base with real keys, runs the range course (E at the officer, real mouse clicks to fire),
   rents a gun, borrows the tank (E), drives it and fires the main gun (left click), takes the jet (E), takes off with the keys,
   flies a circuit, buzzes the house, lands, then ejects on a second flight; finds the easter eggs. Fails on any console error.
   The bot aims by setting the view like a mouse would (P.yaw/P.pitch); every press, click and hold is a Playwright event.
   --shots writes the play-through jpgs to docs/screenshots/base/. Numbers go to docs/screenshots/base/evidence.txt. */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs'),path=require('path');
const OUT=path.join(__dirname,'../docs/screenshots/base');fs.mkdirSync(OUT,{recursive:true});
const args=process.argv.slice(2),SHOTS=args.includes('--shots');let phases=(args.find(a=>!a.startsWith('--'))||'all').split(',');
if(phases.includes('all'))phases=['drive','range','tank','jet','pilot','eggs'];
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
  const aimAt=(x,y,z)=>ev(([x,y,z])=>{const H=window.__ht,P=H.P;P.bloom=0;P.rDebt=0;/* the bot waits for the crosshair to settle */for(let k=0;k<2;k++){const c=H.camera.position;const dx=x-c.x,dy=y-c.y,dz=z-c.z;P.yaw=Math.atan2(-dx,-dz);P.pitch=Math.atan2(dy,Math.hypot(dx,dz));H.step(1);H.draw()/* the camera follows the view in the real frame */}},[x,y,z]);
  const click=async(n=1)=>{for(let k=0;k<n;k++){await p.mouse.down();await step(2);await p.mouse.up();await step(4)}};
  const press=async k=>{await p.keyboard.press(k);await step(3)};
  /* audit SAV-02: what is on disk (the save the game writes), and which achievement rules (js/platform.js) it meets */
  const disk=()=>ev(()=>{let d=null;try{d=JSON.parse(localStorage.getItem('ht-save')||'null')}catch(_){}const b=d&&d.base||{};return{borrows:(b.tank&&b.tank.borrows)|0,flights:(b.jet&&b.jet.flights)|0,ach:d&&HT.Steam&&HT.Steam.evaluate?HT.Steam.evaluate(d):[]}});
  const promptText=()=>ev(()=>{const H=window.__ht;H.draw();const el=[...document.querySelectorAll('*')].filter(x=>x.children.length===0&&/(Climb into|Borrow|Drive)/.test(x.textContent||''));return el.map(x=>x.textContent).join(' | ')});
  /* stand at an approach angle around a vehicle (ang 0 = in front of the nose, PI/2 = its left...), dist m off its hull */
  const around=(e,ang,hl,hw,dist)=>ev(([ex,ez,yaw,ang,hl,hw,dist])=>{const fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=-fz,rz=fx;const ca=Math.cos(ang),sa=Math.sin(ang);const al=ca*(hl+dist),sd=sa*(hw+dist);const P=window.__ht.P;P.pos.set(ex+fx*al+rx*sd,0,ez+fz*al+rz*sd);P.yaw=Math.atan2(-(ex-P.pos.x),-(ez-P.pos.z));window.__ht.step(3)},[e.x,e.z,e.yaw,ang,hl,hw,dist]);
  const T0=Date.now();
  /* a fresh game in the open world */
  await ev(()=>{try{localStorage.removeItem('ht-save')}catch(_){}const H=window.__ht;H.HUD.hide('title');H.enterHub();H.step(3)});
  await p.mouse.click(640,360);await step(2);/* the first click asks for pointer lock (refused headless) */
  const perf=async(label)=>{const r=await ev(()=>{const H=window.__ht,R=H.renderer;H.draw();/* warm-up: shader compiles for whatever just streamed in */const t0=performance.now();H.draw();const ms=performance.now()-t0;R.info.autoReset=false;R.info.reset();H.draw();const calls=R.info.render.calls,tris=R.info.render.triangles;R.info.autoReset=true;
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
    await route([[d.rack.x-1.8,d.rack.z+3],[d.rack.x-1.6,d.rack.z]],.5);await step(4);/* to the rack's front (it faces into the shed, toward the line) */
    /* look at the carbine on its peg: the prompt names it */
    {const ids=await ev(()=>HT.Range.rackIds());const i7=ids.indexOf('rifle'),gz=d.rack.z+(i7-(ids.length-1)/2)*.46;for(let k=0;k<5;k++)await aimAt(d.rack.x,1.1,gz);/* the third-person camera eases into place over a few frames */
     const pr=await ev(()=>{const el=[...document.querySelectorAll('*')].find(x=>/^Take .* \(rack menu\)$/i.test((x.textContent||'').trim())&&x.children.length===0);return el?el.textContent:''});
     ok(/Carbine/i.test(pr),'looking at a gun on the rack names it: "'+pr+'"');await shot('range-rack')}
    await p.keyboard.press('e');await ev(()=>{const H=window.__ht;H.step(1)});let mn=await ev(()=>HT.Range.menu());ok(mn.open&&mn.id==='rifle','E opens the rack menu on the gun you looked at ('+mn.id+')');await shot('range-rack-menu');
    await p.keyboard.press('ArrowRight');await step(2);mn=await ev(()=>HT.Range.menu());ok(mn.id==='smg','→ moves along the rack ('+mn.id+')');
    await p.keyboard.press('Enter');await step(6);r=await ev(()=>HT.Range.state());const cur=await ev(()=>window.__ht.P.cur);ok(r.rent&&cur==='smg','Enter takes it: '+cur);
    const wd=await ev(()=>{window.__ht.draw();const el=[...document.querySelectorAll('*')].find(x=>/The Carpool · \d+ \/ \d+/.test(x.textContent||'')&&x.children.length===0);return el?el.textContent:''});ok(!!wd,'the HUD shows the rental with its ammo: '+wd);
    await press('e');await p.keyboard.press('1');await step(6);const c1=await ev(()=>window.__ht.P.cur);ok(c1==='pistol','number keys pick straight away (1 · '+c1+')');
    await press('e');await p.keyboard.press('9');await step(6);const c9=await ev(()=>window.__ht.P.cur);ok(c9==='hunter','9 · the .308 ('+c9+')');
    await press('e');await p.keyboard.press('7');await step(6);
    await walk(d.rack.x-4.2,d.rack.z,.6);await aimAt(d.line-50,1.4,d.lanes[3]);await click(3);await shot('range-rental');
    const ammoFull=await ev(()=>{const P=window.__ht.P,a=P.ammo[P.cur],w=window.__ht.WEAPONS?null:null;return a&&a.res>0});ok(ammoFull,'free ammo on the line');
    /* the muzzle has to point downrange */
    const m0=await ev(()=>{const P=window.__ht.P;return P.ammo[P.cur].mag});await ev(()=>{window.__ht.P.yaw=-Math.PI/2});await click(1);const m1=await ev(()=>{const P=window.__ht.P;return P.ammo[P.cur].mag});ok(m1===m0,'firing away from downrange is refused');
    await route([[d.rack.x-1.8,d.rack.z+3.2],[d.rack.x+1.5,d.rack.z+3.4],[131,206],[140,190]],1.5);/* round the end of the rack */r=await ev(()=>HT.Range.state());const back=await ev(()=>window.__ht.P.cur);const drawn=await ev(()=>HT.Roam.drawn);ok(!r.rent&&!drawn,'leaving the range returns the rental ('+back+') and holsters');
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
    {const te=await ev(()=>{const c=window.__ht.L.cars.find(q=>q.type==='tank');return c?{x:c.pos.x,z:c.pos.z,yaw:c.yaw}:null});const got=[];
     for(const[nm,ang]of[['front',0],['left',Math.PI/2],['back',Math.PI],['right',-Math.PI/2]]){await around(te,ang,3.8,1.8,1.6);got.push(nm+':'+(/Climb into|Borrow/.test(await promptText())?'yes':'no'))}
     ok(!got.join().includes(':no'),'the tank can be boarded from every side ('+got.join(' ')+')');await around(te,Math.PI/2,3.8,1.8,1.2)}
    const dk0=await disk();
    await press('e');s=await st();ok(s.car&&s.car.type==='tank','E borrows the tank');
    {const dk=await disk();ok(dk.borrows===dk0.borrows+1&&dk.ach.includes('ACH_BORROWED'),'the borrow is on disk at once ('+dk0.borrows+' → '+dk.borrows+') and meets ACH_BORROWED');}
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
    /* a child whose model is still loading (hidden stand-in) 45 m down the line of fire: the gun refuses */
    {await ev(()=>{HT.Tank.S.reload=0});const r0=await ev(()=>{const H=window.__ht,e=H.CV,t=e.obj.userData.tank,v=new THREE.Vector3(),d=new THREE.Vector3();e.obj.updateMatrixWorld(true);t.muzzle.getWorldPosition(v);d.set(1,0,0).transformDirection(t.mantle.matrixWorld);
        const k=HT.People.make('neighbour',{variant:'nb_kid'});k.root.position.set(v.x+d.x*45,0,v.z+d.z*45);H.L.group.add(k.root);
        if(!k.root._htPend){k.root._htVis=true;k.root._htPend=true;Object.defineProperty(k.root,'visible',{configurable:true,enumerable:true,get(){return this._htVis&&!this._htPend},set(q){this._htVis=!!q}})}
        window.__kid=k;return{hidden:!k.root.visible,last:HT.Tank.S.lastFireT,prot:!!HT.People.protectedNear(v.x+d.x*45,v.z+d.z*45,2)}});
      await p.mouse.down();await step(2);await p.mouse.up();const r1=await ev(()=>({last:HT.Tank.S.lastFireT,reload:HT.Tank.S.reload}));
      ok(r0.hidden&&r0.prot&&r1.last===r0.last&&r1.reload<1,'a hidden, still-loading child 45 m down the line of fire: the main gun refuses ('+JSON.stringify({r0,r1})+')');
      await ev(()=>{const k=window.__kid;k.root.parent&&k.root.parent.remove(k.root);HT.Tank.S.reload=0});await step(2);
      await p.mouse.down();await step(2);await p.mouse.up();const r2=await ev(()=>HT.Tank.S.lastFireT);ok(r2!==r0.last,'with the child gone it fires again')}
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
    {const je=await ev(()=>{const e=HT.Jet.S.e;return{x:e.pos.x,z:e.pos.z,yaw:e.yaw}});const got=[];
     for(const[nm,ang]of[['nose',0],['left',Math.PI/2],['tail',Math.PI],['right',-Math.PI/2],['left-front',Math.PI/4]]){await around(je,ang,5.7,.95,2.6);got.push(nm+':'+(/Climb into DAD-1/.test(await promptText())?'yes':'no'))}
     ok(!got.join().includes(':no'),'the jet can be boarded from any side within 3.5 m of the fuselage ('+got.join(' ')+')');
     await around(je,Math.PI/2+.5,5.7,.95,2.4);await shot('jet-board-prompt')}
    const fl0=await disk();
    await press('e');j=await js();ok(j.on,'E climbs into the jet');
    {const dk=await disk();ok(dk.flights===fl0.flights,'sitting in the jet is not a flight ('+dk.flights+')')}
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
    {const dk=await disk();ok(dk.flights===fl0.flights+1&&dk.ach.includes('ACH_CLEARED_FOR_TAKEOFF'),'wheels-up counts the flight on disk ('+fl0.flights+' → '+dk.flights+') and meets ACH_CLEARED_FOR_TAKEOFF')}
    await press('g');j=await js();ok(j.gear===0,'G raises the gear');
    await fly({to:[-200,230],alt:90,max:140});await perf('jet climbing out');
    await press('v');await step(4);await shot('jet-cockpit');await press('v');await step(2);await ev(()=>{window.__ht.P.fp=false});
    await press('c');j=await js();const lk1=j.look;await step(10);await press('c');j=await js();ok(lk1&&!j.look,'C toggles the look back on and off (no held keys)');
    j=await js();ok(j.thr>.3,'the throttle holds with no key down ('+Math.round(j.thr*100)+'%)');
    /* the circuit: north over Maple Heights, low and fast over the house (the family comes out), a sonic boom */
    await fly({to:[250,120],alt:80,max:300,until:q=>Math.hypot(q.x-250,q.z-120)<60});
    const home=await ev(()=>({x:window.__ht.L.start.x,z:window.__ht.L.start.z}));
    await fly({to:[home.x,home.z],alt:q=>Math.hypot(q.x-home.x,q.z-home.z)<700?34:90,spd:78,max:500,until:q=>Math.hypot(q.x-home.x,q.z-home.z)<220});
    await shot('jet-inbound');await perf('jet inbound to Maple Heights');
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
      j=await js();const autoG=j.gear===1;if(!autoG)await press('g');j=await js();ok(j.gear===1,'gear down for landing ('+(autoG?'came down by itself on the approach':'G')+')');
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
    /* owner's playtest: E under the canopy cuts to the landing, by his car (the van if it's on the post, else the jet's ladder), facing it */
    await step(45);{const tp=await ev(()=>HT.Jet.tip&&HT.Jet.tip());ok(tp==='chute','under the canopy the screen says E cuts to the landing ('+tp+')')}
    const dp=await ev(()=>HT.Jet.dropPoint());await press('e');await step(12);
    for(let i=0;i<500;i++){j=await js();if(!j.chute)break;await step(4)}const pp=await st();
    ok(!j.chute,'landed under the parachute at '+pp.x.toFixed(0)+','+pp.z.toFixed(0)+(pp.z>160&&pp.x<290?' (back on the post)':''));
    {const dd=Math.hypot(pp.x-dp.x,pp.z-dp.z);let dy=pp.yaw-dp.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));ok(dd<8&&Math.abs(dy)<.4,'E cut to the landing: by '+(dp.by==='van'?'his van':'the jet\'s ladder')+' ('+dd.toFixed(1)+' m, facing it)');await shot('jet-chute-landing')}
    const jb=await ev(()=>{const e=HT.Jet.S.e;return e?{x:e.pos.x,z:e.pos.z}:null});ok(jb&&Math.hypot(jb.x-256,jb.z-221)<2,'the jet is back on the apron (it was a rental)');
  }
  if(phases.includes('pilot')){say('== a new pilot who only does what the screen says');
    let s=await st();if(s.car){await press('e');await step(4)}
    const d=await ev(()=>HT.Base.def());const js=()=>ev(()=>HT.Jet.state());const tip=()=>ev(()=>HT.Jet.tip&&HT.Jet.tip());
    await ev(()=>{const b=HT.Jobs.api.SV().base;if(b&&b.jet)b.jet.tut={};HT.Jet.home()});/* first flights again */
    await ev(()=>{const e=HT.Jet.S.e,P=window.__ht.P;P.pos.set(e.pos.x+Math.cos(e.yaw)*5.2,0,e.pos.z-Math.sin(e.yaw)*5.2);window.__ht.step(4)});await step(4);await press('e');
    /* two of the crew came along to the apron (they stay there while he flies) */
    await press('e');await ev(()=>{const a=HT.Jobs.api,P=window.__ht.P;for(const[id,k]of[['gary',0],['rick',1]])a.spawnAlly(id,P.pos.x+(k?2.4:-2.4),P.pos.z+2);
      /* every step: the highest any follower gets off the ground, and the biggest single-step jump */
      const H=window.__ht;window.__crew={maxY:0,maxJump:0,last:null};if(!H.__stepW){const s0=H.step.bind(H);H.__stepW=true;H.step=(n,dt)=>{s0(n,dt);const c=window.__crew;const al=HT.Jobs.api.allies;const pos=al.map(q=>({x:q.pos.x,z:q.pos.z}));
        for(const q of al){c.maxY=Math.max(c.maxY,q.dude.root.position.y,q.pos.y||0)}if(c.last&&c.last.length===pos.length&&c.track)for(let k=0;k<pos.length;k++)c.maxJump=Math.max(c.maxJump,Math.hypot(pos[k].x-c.last[k].x,pos[k].z-c.last[k].z)/Math.max(1,n));c.last=pos}}});
    const crew0=await ev(()=>HT.Jobs.api.allies.map(q=>({x:q.pos.x,z:q.pos.z})));await press('e');
    let j=await js();ok(j.on,'E climbs in');
    const strip=await ev(()=>{const el=[...document.querySelectorAll('div')].find(x=>x.textContent.includes('Nose up / down')&&x.style.display==='flex');return el?el.textContent:''});
    ok(/Throttle/.test(strip)&&/Gear/.test(strip)&&/SPACE/.test(strip)&&/Eject/.test(strip),'the controls strip is on screen: '+strip.replace(/\s+/g,' ').slice(0,120));
    const seen={},shotTip=async id=>{if(seen[id])return;seen[id]=1;await shot('jet-tip-'+id)};let gPress=0;
    /* the prompt loop: read the prompt, press what it names (taxi: steer onto the centreline with A / D) */
    for(let n=0;n<700;n++){const t=await tip();j=await js();if(j.air&&j.alt>3&&t!=='rotate')break;
      if(t)await shotTip(t);
      if(t==='taxi'){if(j.thr<.25)await p.keyboard.press('w');const want=Math.atan2(-(d.runway.end.x-j.x),-(d.runway.z-j.z));let he=want-j.hdg;he=Math.atan2(Math.sin(he),Math.cos(he));await key('a',he>.04);await key('d',he<-.04)}
      else if(t==='thr'){await release();await p.keyboard.press('w')}
      else if(t==='rotate'){await key(' ',true)}
      else{await release()}
      if(!j.air){const want=Math.atan2(-(d.runway.end.x-j.x),-(d.runway.z-j.z));let he=want-j.hdg;he=Math.atan2(Math.sin(he),Math.cos(he));if(t!=='taxi'){await key('a',he>.03);await key('d',he<-.03)}}
      await step(2)}
    await release();j=await js();ok(j.air,'took off by following the prompts ('+Object.keys(seen).join(' → ')+')');
    for(let n=0;n<300&&j.gear;n++){j=await js();const t=await tip();if(t)await shotTip(t);await step(2)}ok(j.gear===0&&gPress===0,'hands off it climbs out and the gear comes up by itself (no G; '+(j.alt*3.28).toFixed(0)+' ft)');
    /* the bank prompt: hold A for a moment, as it says */
    for(let n=0;n<120;n++){const t=await tip();if(t==='bank'){await shotTip('bank');await key('a',true);await step(30);await release();break}await step(2)}
    await shot('jet-strip');
    /* back round to runway 27 with the prompted keys only: A / D bank, SPACE / Q nose, W / S throttle */
    const fly=async(o)=>{let n=0;for(;n<(o.max||900);n++){j=await js();if(o.until&&o.until(j))break;const TT=typeof o.to==='function'?o.to(j):o.to;const want=Math.atan2(-(TT[0]-j.x),-(TT[1]-j.z));let he=want-j.hdg;he=Math.atan2(Math.sin(he),Math.cos(he));
        const bankW=Math.max(-1,Math.min(1,-he*1.8));await key('a',j.bank>bankW+.08);await key('d',j.bank<bankW-.08);const altW=typeof o.alt==='function'?o.alt(j):o.alt,pw=Math.max(-.3,Math.min(.32,(altW-j.alt)*.03))+Math.abs(j.bank)*.06;
        await key(' ',j.pitch<pw-.03);await key('q',j.pitch>pw+.05);const sw=o.spd||75,mt=o.minThr==null?.35:o.minThr;await key('w',j.spd<sw||j.thr<mt);await key('s',j.spd>sw+(o.minThr==null?8:2)&&j.thr>mt-.05);
        const t=await tip();if(t)await shotTip(t);if(process.env.FLYLOG&&n%10===0)console.log('    pfly',n,j.x.toFixed(0),j.z.toFixed(0),'alt',j.alt.toFixed(1),'pitch',j.pitch.toFixed(2),'spd',j.spd.toFixed(0),'thr',j.thr.toFixed(2),'gear',j.gear,'air',j.air);await step(2)}await release();return n};
    await fly({to:[520,d.runway.z],alt:80,spd:70,max:700,until:q=>q.x>470&&Math.abs(q.z-d.runway.z)<80});
    await fly({to:[860,d.runway.z],alt:40,spd:60,max:500,until:q=>q.x>820});
    await fly({to:q=>[Math.min(q.x-150,440),d.runway.z],alt:26,spd:55,max:500,until:q=>q.x<560&&Math.abs(q.hdg-Math.PI/2)<.12&&Math.abs(q.z-d.runway.z)<8});
    await fly({to:q=>[q.x-120,d.runway.z],alt:q=>Math.max(0,(q.x-290)*.09),spd:42,minThr:.1,max:700,until:q=>!q.air});
    for(let i=0;i<10;i++)await p.keyboard.press('s');for(let i=0;i<200;i++){j=await js();if(j.spd<1)break;await step(2)}
    ok(seen.land,'the landing prompt came up on the approach');ok(!j.air&&Math.abs(j.z-d.runway.z)<12,'landed on runway 27, gear down by itself ('+j.x.toFixed(0)+','+j.z.toFixed(0)+')');
    /* eject far from the post (over Maple Heights), land there, take the ride back */
    {const c1=await ev(()=>HT.Jobs.api.allies.map(q=>({x:q.pos.x,z:q.pos.z})));const moved=Math.max(...c1.map((q,k)=>Math.hypot(q.x-crew0[k].x,q.z-crew0[k].z)));const my=await ev(()=>window.__crew.maxY);
     ok(moved<1&&my<.5,'the crew stayed on the apron while he flew ('+moved.toFixed(2)+' m, highest '+my.toFixed(2)+' m)')}
    await press('e');await ev(()=>{window.__crew.track=true;window.__crew.maxJump=0});
    for(let i=0;i<300;i++){const dd=await ev(()=>{const P=window.__ht.P;return Math.max(...HT.Jobs.api.allies.map(q=>Math.hypot(q.pos.x-P.pos.x,q.pos.z-P.pos.z)))});if(dd<4)break;await step(4)}
    {const r=await ev(()=>{const P=window.__ht.P;return{d:Math.max(...HT.Jobs.api.allies.map(q=>Math.hypot(q.pos.x-P.pos.x,q.pos.z-P.pos.z))),jump:window.__crew.maxJump}});ok(r.d<4.5&&r.jump<1,'landed near the base: the crew walked over from where he left them ('+r.d.toFixed(1)+' m, biggest step '+r.jump.toFixed(2)+' m, no teleport)')}
    await ev(()=>{window.__crew.track=false});
    /* out, the Air Wing tows it to the apron (as when you leave it), back in, and off again down runway 27 */
await ev(()=>HT.Jet.home());await ev(()=>{const e=HT.Jet.S.e,P=window.__ht.P;P.pos.set(e.pos.x+Math.cos(e.yaw)*5.2,0,e.pos.z-Math.sin(e.yaw)*5.2);window.__ht.step(4)});await step(4);await press('e');
    for(let i=0;i<10;i++)await p.keyboard.press('w');for(let i=0;i<300;i++){j=await js();const want=Math.atan2(-(d.runway.end.x-j.x),-(d.runway.z-j.z));let he=want-j.hdg;he=Math.atan2(Math.sin(he),Math.cos(he));await key('a',he>.04);await key('d',he<-.04);if(j.air&&j.alt>12)break;await step(2)}await release();
    await fly({to:[40,30],alt:110,spd:70,max:700,until:q=>Math.hypot(q.x-40,q.z-30)<60});
    j=await js();say('    (before eject: '+JSON.stringify({x:Math.round(j.x),z:Math.round(j.z),alt:Math.round(j.alt),on:j.on,air:j.air})+')');
    await press('e');await step(4);await press('e');await step(10);j=await js();ok(!!j.chute,'E twice: out over Maple Heights'+(j.chute?'':' '+JSON.stringify({on:j.on,air:j.air,tip:await tip()})));
    const fed=await ev(()=>!!(window.__ht&&document.body.textContent.includes('back at Fort Sensible')));
    const t0=await ev(()=>HT.Jobs.api.simT);let poseOk=0,poseN=0;for(let i=0;i<600;i++){j=await js();if(!j.chute)break;poseN++;if(j.pose==='chute')poseOk++;if(i===12)await shot('jet-parachute-pose');await step(4)}
    {const dt=await ev(()=>HT.Jobs.api.simT)-t0;ok(dt<=15.5,'the parachute ride took '+dt.toFixed(1)+' s (owner: not "forever"; cap ~13 s from any height)')}
    ok(poseN>0&&poseOk===poseN,'hanging under the canopy the whole way down (pose "chute" '+poseOk+'/'+poseN+', no run cycle)');
    ok((await ev(()=>window.__crew.maxY))<.5,'no follower ever left the ground (highest '+(await ev(()=>window.__crew.maxY)).toFixed(2)+' m)');
    const where=await st();const far=Math.hypot(where.x-d.jet.x,where.z-d.jet.z);ok(far>200,'landed where he came down, '+far.toFixed(0)+' m from the jet (no long drift)');
    let t=await tip();ok(t==='ride','the screen offers the ride back ('+t+')');ok(fed,'the feed says where the jet went');
    const mk=await ev(()=>{const H=window.__ht;H.draw();return !![...document.querySelectorAll('*')].find(x=>x.textContent==='DAD-1 · Hangar 2')});ok(mk,'a marker on the jet (DAD-1 · Hangar 2)');
    /* far from the base: the crew turn up out of sight and jog over */
    {await step(2);const log=await ev(()=>HT.Jet.crewLog.slice(-2));const seen=await ev(lg=>{const H=window.__ht,cam=H.camera;H.draw();const fr=new THREE.Frustum();cam.updateMatrixWorld();fr.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse));return lg.filter(q=>fr.containsPoint(new THREE.Vector3(q.x,1,q.z))).length},log);
     ok(log.length===2&&seen===0,'landed far out: the crew appeared out of the camera\'s view ('+log.length+' spawned, '+seen+' in view)');let shotDone=false;
     for(let i=0;i<300;i++){const dd=await ev(()=>{const P=window.__ht.P;return Math.max(...HT.Jobs.api.allies.map(q=>Math.hypot(q.pos.x-P.pos.x,q.pos.z-P.pos.z)))});if(!shotDone&&dd<16){shotDone=true;await ev(()=>{const H=window.__ht,P=H.P;P.yaw=Math.atan2(-(HT.Jobs.api.allies[0].pos.x-P.pos.x),-(HT.Jobs.api.allies[0].pos.z-P.pos.z))});await step(2);await shot('jet-crew-jog')}if(dd<4)break;await step(4)}
     const dd=await ev(()=>{const P=window.__ht.P;return Math.max(...HT.Jobs.api.allies.map(q=>Math.hypot(q.pos.x-P.pos.x,q.pos.z-P.pos.z)))});ok(dd<4.5,'and jogged up ('+dd.toFixed(1)+' m)')}
    await shot('jet-ride-prompt');const dp2=await ev(()=>HT.Jet.dropPoint());await press('e');await step(10);s=await st();const back=Math.hypot(s.x-dp2.x,s.z-dp2.z);
    {let dy=s.yaw-dp2.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));ok(back<8&&Math.abs(dy)<.4,'E: dropped by '+(dp2.by==='van'?'his van':'the jet\'s ladder')+' ('+back.toFixed(1)+' m, facing it)'+(dp2.vanAway?'; the van is elsewhere':''))}
    if(dp2.vanAway){const fed2=await ev(()=>document.body.textContent.includes('Your van is still where you left it'));ok(fed2,'the feed says the van is elsewhere');const mk2=await ev(()=>{const H=window.__ht;H.draw();return !![...document.querySelectorAll('*')].find(x=>x.textContent==='Your van')});ok(mk2,'a marker on the van')}
    await step(20);{const t2=await tip();ok(t2!=='ride','no ride-back prompt at the base afterwards ('+t2+')')}
    await p.waitForTimeout(800);await shot('jet-ride-back');
    /* owner's screenshot: he landed far out, then got to the post another way (fast travel / a teleport): the prompt must go at once */
    await ev(()=>{const H=window.__ht,P=H.P,a=HT.Jobs.api;P.pos.set(40,0,30);H.step(2);HT.Jet.F.ride={until:a.simT+120,x:40,z:30}});await step(4);
    {const t3=await tip();ok(t3==='ride','(set up: far out, the ride is offered: '+t3+')')}
    await ev(()=>{const H=window.__ht,P=H.P,d=HT.Base.def();P.pos.set(d.range.line+6,0,d.range.box.z0-6);H.step(2)});await step(6);
    {const t4=await tip();const pr=await ev(()=>{const H=window.__ht;H.draw();return [...document.querySelectorAll('*')].some(x=>x.children.length===0&&/You landed a long way out/.test(x.textContent||'')&&x.offsetParent!==null&&getComputedStyle(x).visibility!=='hidden')});ok(t4!=='ride'&&!pr,'at the base by other means (by the range): no ride-back prompt ('+t4+')');await shot('jet-no-prompt-at-base')}
    {const dd=await ev(()=>{const P=window.__ht.P;return Math.max(...HT.Jobs.api.allies.map(q=>Math.hypot(q.pos.x-P.pos.x,q.pos.z-P.pos.z)))});ok(dd<6,'the crew rode back too: at the apron with him ('+dd.toFixed(1)+' m)')}
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
    await ev(([x,z])=>{const P=window.__ht.P;P.pos.set(x-1.6,0,z);window.__ht.step(4)},[d.rack.x,d.rack.z]);await step(4);await press('e');await p.keyboard.press('9');await step(6);/* the .308 from the rental rack: a pistol doesn't reach 100 m */
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
