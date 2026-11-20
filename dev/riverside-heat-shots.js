/* Staged screenshots for Riverside free roam + heat (docs/riverside-heat.md). node dev/riverside-heat-shots.js [--only=name]
   Writes docs/screenshots/riverside-heat/*.jpg at 1280x720 @2x: loitering crew, an incident, a heat-3 turf war, cooling off, the full map with turf tints, calm high-trust Riverside. */
const {open}=require('./ai-ingame-lib.js'),fs=require('fs'),path=require('path');
const SD=path.join(__dirname,'../docs/screenshots/riverside-heat'),ONLY=(process.argv.find(a=>a.startsWith('--only='))||'').slice(7);
(async()=>{fs.mkdirSync(SD,{recursive:true});const {b,p,errs}=await open({dpr:2});
  await p.evaluate(()=>{window.__rafOn=true});try{await p.waitForFunction(()=>window.__ht.assets.stream.idle(),null,{timeout:180000})}catch(e){}
  await p.evaluate(()=>{try{window.HT.People.preload(['wife','son','daughter'])}catch(e){}});
  try{await p.waitForFunction(()=>['wife','son','daughter'].every(k=>window.HT.People.has(k)),null,{timeout:90000})}catch(e){console.log('family models not ready')}
  await p.setViewportSize({width:1280,height:720});
  await p.evaluate(()=>{window.__rafOn=false;const H=window.__ht;H.enterHub();H.HUD.hide('title');H.step(3);H.openBridge();H.ow.buildAll();
    const lk=document.getElementById('lock');if(lk)lk.style.display='none';
    window.__stage=(trust,x,z)=>{const H=window.__ht;H.prog.trustR=trust;H.dress(trust);H.frReset();const F=H.fr;F.ambT=1e9;F.incT=1e9;H.P.hp=100;if(H.VAN.on){H.VAN.spd=0;H.exitVan()}
      H.P.pos.set(x,0,z);H.collide(H.P.pos,.35);H.step(40);H.HUD.banner(null);H.HUD.settings={subs:false}};
    window.__look=(x,z,off,pitch)=>{const P=window.__ht.P;P.yaw=Math.atan2(-(x-P.pos.x),-(z-P.pos.z))+(off||0);P.pitch=pitch==null?-.08:pitch};
    /* framing: a camera over the dad's shoulder (or set by the shot) looking at the subject; the HUD is drawn from the game camera first */
    window.__frame=null;
    /* centre of the Riverside intersection nearest (x,z): an open street spot for the dad and the camera */
    window.__cross=(x,z)=>{let b=null,bd=1e9;for(const vx of[156,172,188,204,220])for(const hz of[6,20,34,48,62]){const cx=(vx+1)*2+1,cz=(hz+1)*2+1,d=Math.hypot(cx-x,cz-z);if(d<bd){bd=d;b={x:cx,z:cz}}}return b};
    window.__render=()=>{const H=window.__ht;for(let i=0;i<3;i++)H.draw();const f=window.__frame;if(!f)return;const c=H.camera;c.position.set(f.cx,f.cy,f.cz);c.lookAt(f.tx,f.ty,f.tz);c.updateMatrixWorld();H.ow.update(c);H.render.draw()};
    window.__over=(tx,tz,back,up,side,ty)=>{const P=window.__ht.P;const dx=tx-P.pos.x,dz=tz-P.pos.z,l=Math.hypot(dx,dz)||1,ux=dx/l,uz=dz/l;
      window.__frame={cx:P.pos.x-ux*back+uz*side,cy:up,cz:P.pos.z-uz*back-ux*side,tx,ty:ty==null?1.1:ty,tz}}});
  const shot=async(name,fn)=>{if(ONLY&&ONLY!==name)return;await p.evaluate(()=>{window.__frame=null});await p.evaluate(fn);await p.waitForTimeout(900);await p.evaluate(()=>window.__render());await p.waitForTimeout(200);
    const f=path.join(SD,name+'.jpg');await p.screenshot({path:f,type:'jpeg',quality:84});console.log('wrote',path.relative(path.join(__dirname,'..'),f))};
  await p.evaluate(()=>{document.querySelector('canvas').style.imageRendering='auto'});
  const dpr=await p.evaluate(()=>window.devicePixelRatio);

  /* a crew loitering on a corner of 2nd St, the dad walking up holstered */
  await shot('loitering-crew',()=>{const H=window.__ht,P=H.P;__stage(5,357,38);const g=H.spawnCrew('coupon',349.4,37.4,3);H.step(4);P.pos.set(357.5,0,40.5);H.collide(P.pos,.35);
    __look(g.x,g.z,-.32,-.1);H.step(50);__look(g.x,g.z,-.32,-.1);__over(g.x,g.z,3.2,2.3,1.1,1.2)});

  /* an incident: a scuffle between two crews on a corner, "Break it up · optional" */
  await shot('incident-scuffle',()=>{const H=window.__ht,P=H.P,F=H.fr;__stage(5,379,43);F.incT=1e9;let ok=false;for(let k=0;k<6&&!ok;k++)ok=H.frIncident('scuffle');const I=F.inc;
    if(I){const c=__cross(I.x,I.z);P.pos.set(c.x,0,c.z);H.collide(P.pos,.35);H.step(60);__look(I.x,I.z,-.3,-.1);H.step(2);__look(I.x,I.z,-.3,-.1);__over(I.x,I.z,3.6,3.2,1.0,1.0)}});

  /* heat 3: two crews and the dads in a three-way fight */
  await shot('heat3-turf-war',()=>{const H=window.__ht,P=H.P,F=H.fr;__stage(5,379,43);H.frDraw('pistol');
    const a=H.spawnCrew('coupon',372,24,3,{hostile:true}),b=H.spawnCrew('returns',397,26,3,{hostile:true});H.heat=3.4;F.war=['returns','coupon'];F.hotCrew=H.crews[1];
    for(let i=0;i<150;i++){P.hp=100;F.shotT=H.simT;H.heat=Math.max(H.heat,3.4);if(i%9===0){H.mouse=true}H.step(1);H.mouse=false;const t=a.members.find(e=>e.state==='idle')||a.members[0];__look(t.pos.x,t.pos.z,0,.02)}
    P.aim=true;H.step(6);const t=a.members.find(e=>e.state==='idle')||a.members[0];__look(t.pos.x,t.pos.z,.18,.0);H.step(2);const mx=(372+397)/2,mz=25;__over(mx,mz,4.5,3.2,1.6,1.0)});

  /* cooling off: guns quiet, the crew walking off the block, blue pips */
  await shot('cooling-off',()=>{const H=window.__ht,P=H.P,F=H.fr;__stage(5,379,43);H.frDraw('pistol');const g=H.spawnCrew('returns',386,36,3,{hostile:true});H.heat=1.3;
    for(let i=0;i<40;i++){P.hp=100;H.step(1)}H.frHolster();H.heat=.85;F.shotT=H.simT-12;for(const c of H.crews)F.crewState[c.id].provT=-99;
    for(let i=0;i<35;i++){P.hp=100;H.step(1)}const e=g.members.find(m=>m.leave&&m.dude.root.parent)||g.members[0];__look(e.pos.x,e.pos.z,-.25,-.06);H.step(2);__over(e.pos.x,e.pos.z,3.2,2.3,1.1,1.1)});

  /* the full map: crew turf tints over Riverside Flats */
  if(!ONLY||ONLY==='map-turf-tints'){await p.evaluate(()=>{const H=window.__ht;__stage(5,379,43);H.HUD.minimap.openMap();const m=document.querySelector('.ht-map');if(m)m.classList.add('on');window.__rafOn=true});await p.waitForTimeout(800);
    const v=p.viewportSize();for(let i=0;i<3;i++){await p.mouse.move(v.width*.78,v.height*.5);await p.mouse.wheel(0,-240);await p.waitForTimeout(250);await p.evaluate(()=>window.__ht.draw())}await p.mouse.move(v.width*.7,v.height*.55);await p.mouse.down();await p.mouse.move(v.width*.42,v.height*.55,{steps:8});await p.mouse.up();await p.waitForTimeout(400);await p.evaluate(()=>{window.__ht.draw();window.__ht.draw()});
    await p.screenshot({path:path.join(SD,'map-turf-tints.jpg'),type:'jpeg',quality:84});console.log('wrote map-turf-tints');await p.evaluate(()=>{window.__rafOn=false})}
  await p.evaluate(()=>{try{window.__ht.HUD.minimap.closeMap()}catch(e){}});

  /* high-trust Riverside: no crews, neighbours out, kids' chalk on the sidewalk */
  await shot('calm-high-trust',()=>{const H=window.__ht,P=H.P,F=H.fr;__stage(92,379,71);F.ambT=0;F.calmSince=-99;for(let i=0;i<300&&F.civ.length<3;i++)H.step(1);
    let best=null;for(const c of F.civ)if(!best||c.pos.distanceTo(P.pos)<best.pos.distanceTo(P.pos))best=c;
    if(best){P.pos.set(best.look.x,0,best.look.z);H.collide(P.pos,.35);H.step(20);__look(best.pos.x,best.pos.z,-.3,-.12);__over(best.pos.x,best.pos.z,3.2,2.6,1.2,1.0)}
    window.__calm={civ:F.civ.length,members:F.members.length}});
  console.log(JSON.stringify(await p.evaluate(()=>window.__calm||null)),'dpr',dpr,errs.length?errs.slice(0,3):'no errors');await b.close()})();
