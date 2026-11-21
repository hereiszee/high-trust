/* Owner rule: no child or family member can ever be shot, beanbagged, rammed or play a hit reaction, and no gun is out within 25 m of them.
   node dev/kids-safe.e2e.js [--shots]   (headless Chromium + SwiftShader; real key/mouse events for draw and fire)
   For every protected character (nb_kid, nb_teen, son, daughter, wife, and every job's kid cast) it records any HT.People.hit/die
   call on a protected model (the last-line guard drops them, so a logged call means a hit test upstream let a kid through), and checks:
   - the predicate: kids/family protected, dads/crew/thugs not
   - hub (Maple) and Riverside: pistol and beanbag at point blank, even when a kid is wrongly registered as an enemy: no damage, no hit
   - Riverside free roam: a gun can't be drawn within 25 m of a kid (key 1), and holsters when a kid walks up
   - the minivan rammed through a kid on the road: nothing
   - Higher Ground: aiming at Kevin refuses the shot and drops the scope (FRIENDLY marker), a .308 and a beanbag fired straight at him pass by
   - Crossing Guard, Dad Taxi, the finale: every kid on set, shot at with guns forced on (noGuns lifted to test the hit tests themselves) */
const {open}=require('./ai-ingame-lib.js'),path=require('path'),fs=require('fs');
const SHOTS=process.argv.includes('--shots'),DIR=path.join(__dirname,'../docs/screenshots/release');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
(async()=>{const {b,p,errs}=await open();const ev=(f,a)=>p.evaluate(f,a);
  await p.click('.ht-title [data-act=newgame]').catch(()=>ev(()=>{const H=window.__ht;H.HUD.hide('title');H.enterHub()}));await p.waitForTimeout(400);
  await p.evaluate(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);await HT.People.preload(['nb_kid','nb_teen','son','daughter','wife']).catch(()=>{})});
  /* page helpers */
  await ev(()=>{const H=window.__ht,PP=HT.People,K=window.__K={log:[]};
    for(const f of['hit','die']){const o=PP[f];PP[f]=function(d){if(PP.isProtected(d))K.log.push(f+':'+(d.rb&&d.rb.key)+'@'+(H.M?H.M.def.id:H.mode));return o.apply(this,arguments)}}
    K.kid=(key,x,z)=>{const role=key==='son'||key==='daughter'||key==='wife'?key:'neighbour';const d=H.dude.make({role,variant:key});d.root.position.set(x,0,z);H.scene.add(d.root);return d};
    K.aimAt=(x,y,z)=>{const P=H.P;P.fp=true;const ey=P.pos.y+(P.crouch?1.15:1.65);P.yaw=Math.atan2(-(x-P.pos.x),-(z-P.pos.z));P.pitch=Math.atan2(y-ey,Math.hypot(x-P.pos.x,z-P.pos.z));H.draw()};
    /* worst case: the kid wrongly registered as an enemy with hitboxes */
    K.asEnemy=d=>{const e={kind:'enemy',dude:d,pos:d.root.position,hp:100,maxhp:100,state:'idle',alert:false,fireT:9,id:'kidtest'};d.meshes.forEach(m=>m.userData.ent=e);H.enemies.push(e);H.rebuildTargets&&H.rebuildTargets();H.dude.rebuildTargets();return e};
    K.unEnemy=e=>{const i=H.enemies.indexOf(e);if(i>=0)H.enemies.splice(i,1);H.dude.rebuildTargets()};
    K.shootAll=(guns,n)=>{let shots=0;for(const g of guns){H.give(g,{mag:30,extra:30});H.swap(g,true);H.step(20);for(let i=0;i<n;i++){const d=K.cur;if(d)K.aimAt(d.x,d.y,d.z);H.P.fireT=0;H.P.equipT=0;H.fire();shots++;H.step(3)}}return shots};
    K.prot=()=>PP.live.filter(d=>d.root.parent&&d.root.visible&&PP.isProtected(d));});
  /* 1. predicate */
  const pr=await ev(()=>{const PP=HT.People,H=window.__ht,r={};for(const k of['nb_kid','nb_teen','son','daughter','wife','dad_gary','thug_hoodie','nb_pops']){const role=k==='son'||k==='daughter'||k==='wife'?k:k.startsWith('nb_')?'neighbour':k==='dad_gary'?'gary':'thug';
    const d=role==='gary'?H.dude.make(H.dude.HOMIES.gary):H.dude.make({role,variant:k});r[k]=PP.isProtected(d)+'/'+(d.rb?d.rb.key:'box');r[k+'.mesh']=d.meshes[0]?PP.isProtected(d.meshes[0]):null}return r});
  ok(['nb_kid','nb_teen','son','daughter','wife'].every(k=>pr[k].startsWith('true')&&pr[k+'.mesh']!==false),'protected: '+JSON.stringify(pr));
  ok(['dad_gary','thug_hoodie','nb_pops'].every(k=>pr[k].startsWith('false')),'not protected: dads, crew, adults');
  /* 2. hub (Maple) point blank, kid as enemy */
  const hub=await ev(()=>{const H=window.__ht,K=window.__K,P=H.P,out=[];for(const key of['nb_kid','nb_teen','son','daughter','wife']){const d=K.kid(key,P.pos.x,P.pos.z-4);const e=K.asEnemy(d);K.cur={x:P.pos.x,y:1.1,z:P.pos.z-4};
      /* the hub has no gun mode: fire straight through the game's hit test */const n=K.shootAll(['pistol','beanbag','shotgun'],3);H.hurtEnemy(e,999,'player',{});out.push(key+':'+e.hp+'/'+e.state+'/'+n);K.unEnemy(e);H.scene.remove(d.root)}return{out,log:K.log.slice()}});
  ok(hub.out.every(s=>/:100\/idle\//.test(s))&&!hub.log.length,'hub: pistol, beanbag, shotgun and a direct hurtEnemy on each kid/family member: no damage, no hit '+JSON.stringify(hub));
  /* 3. Riverside: draw refused near a kid, holsters when one walks up, point blank as enemy, ram */
  const rv=await ev(async()=>{const H=window.__ht,K=window.__K,P=H.P;H.openBridge();try{HT.Save.data.flags.act2Intro=true}catch(_){}const s=H.save;try{H.prog.done[1]=true;H.prog.done[0]=true}catch(_){}
    const T=H.WORLD.places.g_earl||H.WORLD.places.g_dee;H.enterHub();H.step(2);P.pos.set(T.x+3,0,T.z+3);H.step(30);
    for(let i=0;i<30&&H.region!=='river';i++)H.step(5);
    const r={region:H.region};H.give('pistol',{mag:12,extra:24});
    /* no kids nearby: the gun comes out with key 1 (real key below) */
    r.liveKids=K.prot().map(d=>d.rb.key);return r});
  ok(rv.region==='river','in Riverside ('+JSON.stringify(rv)+')');
  /* move any porch kid far away first, then draw with the real key */
  await ev(()=>{const K=window.__K,H=window.__ht;for(const d of K.prot())d.root.visible=false;H.frHolster();H.step(2)});
  await ev(()=>{window.__ht.running=true;window.__ht.HUD.hide('pause')});await p.keyboard.press('q');await ev(()=>window.__ht.step(2));
  const armed0=await ev(()=>window.__ht.frArmed);
  await ev(()=>{const H=window.__ht;H.frHolster();H.step(2);window.__K.k1=window.__K.kid('nb_kid',H.P.pos.x+12,H.P.pos.z);H.step(2)});
  await ev(()=>{window.__ht.running=true;window.__ht.HUD.hide('pause')});await p.keyboard.press('q');await ev(()=>window.__ht.step(2));
  const armedKid=await ev(()=>window.__ht.frArmed);
  ok(armed0===true&&armedKid===false,'Riverside: key 1 draws with no kid around (key Q) ('+armed0+'), refused with a kid 12 m away ('+armedKid+')');
  const walkUp=await ev(()=>{const H=window.__ht,K=window.__K;H.running=true;K.k1.root.position.x=H.P.pos.x+60;H.frDraw('pistol');H.step(2);const a=H.frArmed;K.k1.root.position.x=H.P.pos.x+20;H.step(3);return{before:a,after:H.frArmed,running:H.running,dist:+Math.hypot(K.k1.root.position.x-H.P.pos.x,K.k1.root.position.z-H.P.pos.z).toFixed(1)}});
  const crew=await ev(()=>{const H=window.__ht,K=window.__K;H.step(12);const kp=K.k1.root.position;return H.allies.map(a=>({id:a.id,d:+Math.hypot(a.pos.x-kp.x,a.pos.z-kp.z).toFixed(1),gun:!!a.dude.gun}))});
  ok(crew.filter(a=>a.d<25).every(a=>!a.gun)&&crew.some(a=>a.d<25),'Riverside: the crew within 25 m of the kid put their guns away '+JSON.stringify(crew));
  ok(walkUp.before===true&&walkUp.after===false,'Riverside: drawn at 60 m, holstered when the kid comes within 20 m '+JSON.stringify(walkUp));
  if(SHOTS){fs.mkdirSync(DIR,{recursive:true});await ev(()=>{const H=window.__ht,K=window.__K;K.k1.root.position.set(H.P.pos.x+3,0,H.P.pos.z-6);K.aimAt(H.P.pos.x+3,1.2,H.P.pos.z-6);H.P.fp=false;H.frDraw('pistol');window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c);if(H.HUD.screen&&H.HUD.screen!=='pause')H.HUD.hide(H.HUD.screen);H.running=true});
    await p.waitForTimeout(1500);await ev(()=>{window.__rafOn=false;window.__ht.draw()});await p.screenshot({path:path.join(DIR,'riverside-kid-holster.jpg'),type:'jpeg',quality:84})}
  const rvShoot=await ev(()=>{const H=window.__ht,K=window.__K,P=H.P,out=[];for(const key of['nb_kid','nb_teen','son','daughter','wife']){const d=K.kid(key,P.pos.x,P.pos.z-5);const e=K.asEnemy(d);K.cur={x:P.pos.x,y:1.1,z:P.pos.z-5};
      H.frDraw('pistol');const n=K.shootAll(['pistol','beanbag'],3);out.push(key+':'+e.hp+'/'+e.state+'/'+n+'/armed '+H.frArmed);K.unEnemy(e);H.scene.remove(d.root)}return{out,log:K.log.slice()}});
  ok(rvShoot.out.every(s=>/:100\/idle\//.test(s))&&!rvShoot.log.length,'Riverside: point blank on each kid/family member (registered as an enemy): no damage, no hit '+JSON.stringify(rvShoot));
  const ram=await ev(()=>{const H=window.__ht,K=window.__K,V=H.VAN,G=H.ow.roads(),P=H.P;H.frHolster();H.running=true;const r=G.nearestRoad(P.pos.x,P.pos.z),A_=G.nodes[r.a],B_=G.nodes[r.b];
    V.pos.set(A_.x,0,A_.z);V.yaw=Math.atan2(-(B_.x-A_.x),-(B_.z-A_.z));V.spd=0;if(V.car)V.car.spd=0;H.syncVan();P.pos.set(A_.x+2.5,0,A_.z);H.enterVan();H.step(2);
    const L=Math.hypot(B_.x-A_.x,B_.z-A_.z),f=Math.min(18,L*.6),kx=A_.x+(B_.x-A_.x)/L*f,kz=A_.z+(B_.z-A_.z)/L*f;const kids=['nb_kid','son','daughter'].map((k,i)=>K.kid(k,kx+(i-1)*.6,kz+i*.8));
    const p0=kids.map(d=>d.root.position.clone());let minD=99;H.keys.w=true;for(let i=0;i<120;i++){H.step(1);const c=H.CV||V;minD=Math.min(minD,...kids.map(d=>Math.hypot(d.root.position.x-c.pos.x,d.root.position.z-c.pos.z)))}H.keys.w=false;
    const moved=kids.some((d,i)=>d.root.position.distanceTo(p0[i])>.01),dead=kids.some(d=>d.rb&&d.rb.dead);for(const d of kids)H.scene.remove(d.root);H.step(30);
    return{minD:+minD.toFixed(1),moved,dead,log:K.log.slice()}});
  ok(ram.minD<2.5&&!ram.moved&&!ram.dead&&!ram.log.length,'Riverside: the minivan driven through three kids on the road: nothing happens to them '+JSON.stringify(ram));
  /* 4. jobs */
  const job=async(id,fn)=>{const r=await p.evaluate(async id=>{const H=window.__ht,pm=HT.People;if(H.CV)H.exitVehicle();await pm.preload(H.jobs.castKeys(id)).catch(()=>{});if(H.mode==='mission'){H.jobs.finish(false);H.HUD.hide('result')}H.enterHub();H.step(2);
      const m=H.jobs.start(id);const w=H.jobs.castWait;if(w)await w;H.step(5);return{mode:H.mode,job:H.M&&H.M.def.id}},id);ok(r.mode==='mission'&&r.job===id,'started '+id+' '+JSON.stringify(r));if(r.mode!=='mission')return null;return fn?ev(fn):null};
  const sweep=()=>{const H=window.__ht,K=window.__K,P=H.P,out=[];if(H.M)H.M.noGuns=false;const start=K.log.length;
    for(let k=0;k<200&&K.prot().length<1&&H.M&&H.M.state==='go';k++)H.step(5);
    const kids=K.prot();for(const d of kids.slice(0,8)){const v=new THREE.Vector3();d.root.getWorldPosition(v);P.pos.set(v.x+.5,v.y,v.z+5);H.collide&&H.collide(P.pos,.35);K.cur={x:v.x,y:v.y+1,z:v.z};
      const hp0=H.M&&H.M.state;K.shootAll(['pistol','beanbag'],2);out.push(d.rb.key+(d.rb.dead?':DEAD':''))}
    return{kids:out,state:H.M&&H.M.state,why:H.M&&H.M.why,log:K.log.slice(start)}};
  const ow=await job('overwatch',()=>{const H=window.__ht,K=window.__K,M=H.M,O=M.ow,P=H.P;const R=H.WORLD.sites.roof;
    O.kevin={x:395.6,z:35.6,st:'pending',delay:0,t:0,ided:false};for(let i=0;i<10&&!O.kevin.d;i++)H.step(1);const Kv=O.kevin;if(!Kv.d)return{err:'no kevin'};
    O.roof.on=true;O.roof.fade=0;const r=R.roof;P.pos.set((r.x0+r.x1)/2,R.roofY||8,(r.z0+r.z1)/2);P.cur='hunter';P.equipT=0;P.rl=null;O.rifle.boltT=0;
    const look=(x,y,z)=>{const e={x:P.pos.x-Math.sin(P.yaw)*.7,y:(P.visY!=null?P.visY:P.pos.y)+1.62,z:P.pos.z-Math.cos(P.yaw)*.7};P.yaw=Math.atan2(-(x-e.x),-(z-e.z));P.pitch=Math.atan2(y-e.y,Math.hypot(x-e.x,z-e.z))};
    const jt=H.jobs.registry.get('overwatch').test;P.aim=true;H.step(2);const shots0=O.stats.shots;look(Kv.x,.9,Kv.z);look(Kv.x,.9,Kv.z);O.rifle.boltT=0;const fr=jt.friendly();H.fire();H.step(2);const refused=O.stats.shots===shots0,dropped=!P.aim,hold=O.stats.holdFire||0;
    /* off him by 12 m: the shot goes */O.rifle.boltT=0;O.rifle.lowerT=0;look(Kv.x+12,.9,Kv.z+12);P.aim=true;H.step(1);H.fire();const offFired=O.stats.shots>shots0;
    /* rounds fired straight at him from 25 m, both kinds */const T=THREE,hits=[];for(const type of['live','bean']){const from=new T.Vector3(Kv.x+25,1.2,Kv.z),to=new T.Vector3(Kv.x,1,Kv.z),dir=to.clone().sub(from).normalize();
      const mesh=new T.Group();mesh.userData.tail=new T.Object3D();mesh.add(mesh.userData.tail);H.scene.add(mesh);O.proj.push({type,pos:from.clone(),vel:dir.multiplyScalar(type==='bean'?90:300),g:0,t:0,trail:[],mesh,near:new Set()});O.lastHit=null;
      for(let i=0;i<30;i++)H.step(1);hits.push(O.lastHit?O.lastHit.k:'none')}
    return{fr,y:+P.pos.y.toFixed(2),visY:P.visY,refused,dropped,hold,offFired,hits,kevinStat:O.stats.kevin,state:M.state,log:K.log.slice()}});
  if(ow)ok(ow.refused&&ow.dropped&&ow.hold>0&&ow.offFired&&!ow.hits.includes('kevin')&&ow.kevinStat!==-1&&ow.state==='go'&&!ow.log.length,'Higher Ground: aiming at Kevin refuses the shot and lowers the rifle, 12 m off it fires, rounds at him fly past '+JSON.stringify(ow));
  /* no scope screenshot: headless, the job's camera hook doesn't draw the roof view reliably; the checks above cover the scope logic */
  for(const id of['crossing','taxi','finale']){const r=await job(id,sweep);if(r)ok(r.state==='go'&&!r.log.length&&!r.kids.some(k=>/DEAD/.test(k)),id+': every kid on set shot at point blank with guns forced on: no hit '+JSON.stringify(r))}
  const bad=errs.filter(e=>!/favicon|net::ERR/.test(e));ok(!bad.length,'no console errors '+bad.slice(0,3).join(' | '));
  await b.close();console.log(fails?`FAIL ${fails}`:'PASS');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
