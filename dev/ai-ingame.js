/* In-game AI validation: node dev/ai-ingame.js [--missions 0,1,2,3] [--no-shots]
   Runs the real index.html in headless Chromium (SwiftShader), plays every mission with a scripted dad through
   window.__ht.step(), probes the AI each tick and writes docs/screenshots/ai-ingame/evidence.json, evidence.txt and
   jpg screenshots. See dev/ai-ingame-lib.js for how the page is served and paused. */
const {open,ROOT}=require('./ai-ingame-lib'),fs=require('fs'),path=require('path');
const OUT=path.join(ROOT,'docs/screenshots/ai-ingame');fs.mkdirSync(OUT,{recursive:true});
const arg=k=>{const i=process.argv.indexOf(k);return i>0?process.argv[i+1]:null};
const MISSIONS=(arg('--missions')||'0,1,2,3').split(',').map(Number),SHOTS=!process.argv.includes('--no-shots');
const lines=[];const log=s=>{console.log(s);lines.push(s)};
(async()=>{const {b,p,errs,loadMs}=await open({viewport:{width:1280,height:720}});
  await p.addScriptTag({path:path.join(__dirname,'ai-ingame-bot.js')});await p.addScriptTag({path:path.join(__dirname,'ai-ingame-probe.js')});
  log(`loaded index.html in ${loadMs} ms (assets done)`);
  /* screenshot: let pending UI timers (the result card) fire, hide the cards and the banner, then render from the game camera,
     or from a free camera {from:[x,y,z],at:[x,y,z]} without moving the dad's */
  const shot=async(name,view)=>{if(!SHOTS)return;await p.waitForTimeout(1300);
    await p.evaluate(view=>{for(const el of document.querySelectorAll('#cTitle,#cResult,#cBrief,#cPause'))el.hidden=true;document.getElementById('banner').classList.remove('on');
      /* the paused render loop never expires old tracers and dust puffs: hide them for the picture (the game removes them itself) */
      for(const o of __ht.scene.children){if(o.isLine||(o.isMesh&&o.geometry&&o.geometry.parameters&&o.geometry.parameters.width===.08))o.visible=false}
      const H=__ht,ban=document.getElementById('banner');ban.style.visibility='hidden';if(!view){H.draw();ban.classList.remove('on');return}H.draw();ban.classList.remove('on');const c=H.camera,o=c.position.clone(),q=c.quaternion.clone();c.position.set(...view.from);c.lookAt(new THREE.Vector3(...view.at));
      for(const a of H.allies)a.dude.root.visible=true;H.render.draw();c.position.copy(o);c.quaternion.copy(q)},view||null);
    await p.screenshot({path:path.join(OUT,name+'.jpg'),type:'jpeg',quality:82});log('  screenshot docs/screenshots/ai-ingame/'+name+'.jpg')};
  const evidence={loadMs,missions:[]};
  /* ---------- full playthroughs ---------- */
  for(const mi of MISSIONS){
    await p.evaluate(mi=>{Math.random=(()=>{let a=1234+mi*77;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}})();
      __ht.AI.seed(99+mi);__ht.aiStats.thinkMs=0;__ht.aiStats.thinks=0;__ht.aiStats.allyMs=0;__ht.aiStats.allyCalls=0;__ht.aiStats.barks.length=0;
      __ht.prog.trust=50;__ht.startMission(mi);__probe.reset(mi);Object.assign(__bot.st,{path:null,log:[],shots:0,noHitT:0})},mi);
    const wall0=Date.now();let res;
    for(;;){res=await p.evaluate(()=>{const H=__ht;const t0=performance.now();let n=0;
        while(n<240&&H.M.state==='go'&&H.M.elapsed<400){__bot.tick(1/30);H.step(1);__probe.tick();n++;if(__probe.R.snap)break}
        return{state:H.M.state,t:H.simT,snap:__probe.R.snap,ms:performance.now()-t0,n}});
      if(res.snap){await shot(res.snap,await p.evaluate(()=>__probe.R.snapView||null));await p.evaluate(()=>{__probe.R.snaps.push(__probe.R.snap);__probe.R.snap=null;__probe.R.snapView=null})}
      if(res.state!=='go'||res.n===0)break}
    const r=await p.evaluate(()=>{const H=__ht,M=H.M,R=__probe.R;const s=H.aiStats;
      return{mission:M.def.title,type:M.def.type,result:M.state,simTime:+M.elapsed.toFixed(1),kills:M.kills,cuffs:M.cuffs,trust:H.prog.trust,reinforced:M.reinforced||0,
        thinkUsPerCall:+(1000*s.thinkMs/Math.max(1,s.thinks)).toFixed(2),thinkCalls:s.thinks,thinkMsPerSimSecond:+(s.thinkMs/Math.max(1,M.elapsed)).toFixed(3),allyUsPerCall:+(1000*s.allyMs/Math.max(1,s.allyCalls)).toFixed(2),
        probe:R,barks:s.barks.slice(),botShots:__bot.st.shots,botLog:__bot.st.log.slice(0,40),hp:H.P.hp,enemies:H.enemies.length,
        roomNames:H.L.nav.rooms.map(r=>r.name)}});
    r.wallSec=+((Date.now()-wall0)/1000).toFixed(1);evidence.missions.push(r);const R=r.probe;
    log(`\n== mission ${mi} · ${r.mission} (${r.type}) → ${r.result.toUpperCase()} in ${r.simTime}s sim (${r.wallSec}s wall)`);
    log(`  dad: min hp ${Math.round(R.minHp)}, damage taken ${Math.round(R.dmg)}; ${r.kills} down, ${r.cuffs} zip-tied, trust ${Math.round(r.trust)} (started 50)`);
    log(`  first contact: enemy entered combat at ${R.firstCombat}s, first shot at the dad ${R.firstShotDad}s ; per-enemy spot→first shot median ${R.reacts.length?R.reacts.slice().sort((a,b)=>a-b)[R.reacts.length>>1]:'-'}s, min ${R.reacts.length?Math.min(...R.reacts):'-'}s (${R.reacts.length} enemies)`);
    log(`  enemy shots ${R.eShots} (${R.eShotsDad} at the dad); mean hit chance vs dad moving ${(R.hitChMove[0]/Math.max(1,R.hitChMove[1])).toFixed(2)} (${R.hitChMove[1]} shots), standing ${(R.hitChStill[0]/Math.max(1,R.hitChStill[1])).toFixed(2)} (${R.hitChStill[1]} shots)`);
    log(`  fire tokens: peak ${R.poolPeak} holders (pool max ${R.poolMax}), most enemies aiming/firing at once ${R.maxConc}, shots without a token ${R.noToken}`);
    log(`  cover: ${R.cover.checked} hide checks behind cover the AI thinks blocks the dad → ${R.cover.unshootable} could not be hit by the dad's shot (camera ray + shoulder check, ${(100*R.cover.unshootable/Math.max(1,R.cover.checked)).toFixed(1)}%), ${R.cover.hidden} not even visible to the camera ray (${(100*R.cover.hidden/Math.max(1,R.cover.checked)).toFixed(1)}%); probe rays reaching a body ${R.cover.rayHits}/${R.cover.rays}, of those shootable ${R.cover.shotRays}; crouched samples ${R.cover.crouchedN}, highest crouched hitbox top ${R.cover.maxTopCrouched.toFixed(2)} m (crate top 1.15)`);
    if(R.cover.leaks.length)log('  cover leaks: '+JSON.stringify(R.cover.leaks.slice(0,5)));
    log(`  flanks: ${R.flanks.length} (${R.flanks.filter(f=>f.cross).length} counted across adjacent-room squads) ${JSON.stringify(R.flanks.slice(0,4))}`);
    if(R.boss.events.length)log('  boss: '+JSON.stringify(R.boss.events));
    if(R.waves.length)log('  waves: '+JSON.stringify(R.waves));
    if(R.spawns.length)log(`  spawns: ${R.spawns.length}, min distance ${Math.min(...R.spawns.map(s=>s.dist))} m, in the dad's view ${R.spawns.filter(s=>s.seen).length}; by wave ${JSON.stringify(R.spawns.reduce((o,s)=>(o[s.wave]=(o[s.wave]||[]).concat(s.t),o),{}))}`);
    log(`  trust: ${JSON.stringify(R.trustEv)}`);
    log(`  crew vs camera: ${R.crew.frames} samples, a crewman between camera and dad's chest ${R.crew.occl} (${(100*R.crew.occl/Math.max(1,R.crew.frames)).toFixed(1)}%), on the crosshair line within 20 m ${R.crew.crosshair} (${(100*R.crew.crosshair/Math.max(1,R.crew.frames)).toFixed(1)}%), any crewman inside the camera cone ${R.crew.inCone}, hidden for being on top of the camera ${R.crew.hiddenNearCam}`);
    const cb=r.barks.filter(x=>/^contact/.test(x.ev));log(`  crew callouts ${cb.length}: ${cb.slice(0,6).map(x=>x.who+': '+x.text).join(' | ')}`);
    log(`  barks ${r.barks.length} (${[...new Set(r.barks.map(x=>x.ev))].join(', ')})`);
    log(`  think(): ${r.thinkUsPerCall} µs per call over ${r.thinkCalls} calls = ${r.thinkMsPerSimSecond} ms per simulated second; crew ally(): ${r.allyUsPerCall} µs per call`);
  }
  /* ---------- crew stacks on a door (enemies taken out of play so there is no fight on) ---------- */
  {const r=await p.evaluate(()=>{const H=__ht,P=H.P;H.startMission(3);const L=H.L,nav=L.nav;for(const e of H.enemies)e.state='cuffed';
      const cand=nav.doors.filter(d=>d.cells.length<=4&&d.rooms.some(i=>nav.rooms[i]&&!nav.rooms[i].indoor));
      const d=(cand.length?cand:nav.doors.filter(d=>d.cells.length<=4)).sort((a,b)=>Math.hypot(a.x-L.start.x,a.z-L.start.z)-Math.hypot(b.x-L.start.x,b.z-L.start.z))[0];
      const ax=d.axis==='x'?1:0,az=1-ax;const side=Math.sign((L.start.x-d.x)*ax+(L.start.z-d.z)*az)||-1;
      P.pos.set(d.x+ax*side*2.6+az*.6,0,d.z+az*side*2.6+ax*.6);P.yaw=Math.atan2(-(d.x-P.pos.x),-(d.z-P.pos.z));P.pitch=-.12;
      H.allies.forEach((a,k)=>a.pos.set(P.pos.x+ax*side*(3+k*.8)+az*(k%2?1.5:-1.5),0,P.pos.z+az*side*(3+k*.8)+ax*(k%2?1.5:-1.5)));
      P.crouch=true;H.step(150);
      return{door:{x:+d.x.toFixed(1),z:+d.z.toFixed(1),axis:d.axis,room:nav.rooms[d.rooms.find(i=>nav.rooms[i].indoor)]?.name},allies:H.allies.map(a=>({id:a.id,state:a.ai.intent.state,stance:a.ai.stance,distDoor:+Math.hypot(a.pos.x-d.x,a.pos.z-d.z).toFixed(2),onDoorway:nav.isDoor(a.pos.x,a.pos.z),
          sameSideAsDad:Math.sign((a.pos.x-d.x)*ax+(a.pos.z-d.z)*az)===side})),barks:H.aiStats.barks.filter(b=>b.ev==='stack').map(b=>b.who+': '+b.text)}});
    log(`\n== crew stack (mission 3, house door, dad crouched beside it, no fight on): ${JSON.stringify(r)}`);evidence.stack=r;await shot('m3-crew-stack-at-door');
    await shot('m3-crew-stack-at-door-overhead',await p.evaluate(()=>{const H=__ht,P=H.P,f=[-Math.sin(P.yaw),-Math.cos(P.yaw)];return{from:[P.pos.x-f[0]*3.5,5.5,P.pos.z-f[1]*3.5],at:[P.pos.x+f[0]*2,0,P.pos.z+f[1]*2]}}));
    const r2=await p.evaluate(()=>{const H=__ht,P=H.P;P.crouch=false;const n0=H.aiStats.barks.length;
      for(let i=0;i<75;i++){H.keys.w=true;H.step(1)}H.keys.w=false;H.step(45);return{breach:H.aiStats.barks.slice(n0).filter(b=>b.ev==='breach').map(b=>b.who+': '+b.text),crewInside:H.allies.filter(a=>H.L.nav.rooms[H.L.nav.roomAt(a.pos.x,a.pos.z)].indoor).length}});
    log(`  dad stands and walks through → ${JSON.stringify(r2)}`);evidence.breach=r2}
  /* ---------- crouched behind crates: forced hides, checked against the dad's camera rays from several stances ---------- */
  for(const mi of[0,3]){const r=await p.evaluate(mi=>{const H=__ht,P=H.P,AI=H.AI;H.startMission(mi);const L=H.L,nav=L.nav;const out={samples:0,hidden:0,unshootable:0,maxTop:0,leaks:[],bossTop:null};
      const crateSpots=nav.covers.filter(c=>c.low&&!c.door);let used=0;
      for(const sp of crateSpots){if(used>=14)break;
        /* a dad position 7-16 m away that the crate hides a crouched man from but not a standing one */
        let pp=null;for(let k=0;k<nav.N&&!pp;k+=1){if(!nav.walk[k])continue;const x=nav.wx(k),z=nav.wz(k),d=Math.hypot(x-sp.x,z-sp.z);if(d<7||d>16)continue;if(nav.hides(sp,x,z)==='crouch'&&nav.los(x,z,sp.x,sp.z,false)&&nav.clearPt(x,z,.4))pp={x,z}}
        if(!pp)continue;used++;
        for(const e of H.enemies)if(e.state==='idle')e.state='cuffed';
        const boss=mi===3&&used===1&&L.boss;const e=boss?L.boss:H.enemies.find(x=>x.state==='cuffed'&&!x.boss);e.state='idle';e.pos.set(sp.x,0,sp.z);e.ck=0;e.hp=e.maxHp;
        const ai=AI.mem(e,{t:H.simT});ai.mode='combat';ai.sub='cover';ai.cover={spot:sp,hide:'crouch',peek:{side:'over',x:sp.x,z:sp.z},score:0};ai.phase='hide';ai.phaseT=H.simT+999;ai.target='player';ai.lkp={x:pp.x,z:pp.z,t:H.simT};ai.visT=H.simT;ai.stance='crouch';ai.glanceT=H.simT+999;ai.retreated=true;
        for(const a of H.allies)a.down=true,a.downT=999;
        for(const st of[{crouch:false,pitch:-.05},{crouch:true,pitch:0},{crouch:false,pitch:-.3}]){P.pos.set(pp.x,0,pp.z);P.crouch=st.crouch;P.hp=100;
          H.step(20);__bot.aimAt(new THREE.Vector3(e.pos.x,.8,e.pos.z));P.pitch=Math.min(P.pitch,st.pitch);H.step(1);__bot.aimAt(new THREE.Vector3(e.pos.x,.8,e.pos.z));H.step(1);
          if(e.ai.stance!=='crouch'||(e.ck||0)<.95)continue;const x=__bot.exposure(e,5);out.samples++;if(x.hit===0)out.hidden++;if(x.shot===0)out.unshootable++;out.maxTop=Math.max(out.maxTop,+x.top.toFixed(3));if(boss)out.bossTop=Math.max(out.bossTop||0,+x.top.toFixed(3));
          if(x.hit&&out.leaks.length<6)out.leaks.push({boss:!!boss,dist:+Math.hypot(pp.x-sp.x,pp.z-sp.z).toFixed(1),dadCrouch:st.crouch,camY:+H.camera.position.y.toFixed(2),hit:x.hit,shot:x.shot,top:+x.top.toFixed(2)});
          if(mi===0&&used===2&&!st.crouch&&st.pitch>-.1)out.shotPose={e:e.id,x:sp.x,z:sp.z}}}
      return out},mi);
    log(`\n== crouched behind crates (mission ${mi}, forced hides, dad standing / crouched / standing looking down): ${r.samples} samples → ${r.hidden} fully hidden from the camera, ${r.unshootable} not shootable; highest crouched hitbox top ${r.maxTop} m${r.bossTop?' (the King '+r.bossTop+' m)':''}; crate top 1.15 m${r.leaks.length?'; leaks '+JSON.stringify(r.leaks):''}`);
    (evidence.crouch=evidence.crouch||{})[mi]=r}
  /* a screenshot of one: the dad looking at a hoodie crouched behind a crate */
  {await p.evaluate(()=>{const H=__ht,P=H.P,AI=H.AI;H.startMission(0);const L=H.L,nav=L.nav;
      const sp=nav.covers.filter(c=>c.low&&!c.door).find(sp=>{for(let k=0;k<nav.N;k++){if(!nav.walk[k])continue;const x=nav.wx(k),z=nav.wz(k),d=Math.hypot(x-sp.x,z-sp.z);if(d>6&&d<9&&nav.hides(sp,x,z)==='crouch'&&nav.los(x,z,sp.x,sp.z,false)){sp._pp={x,z};return true}}return false});
      for(const e of H.enemies)e.state='cuffed';const e=H.enemies[0],e2=H.enemies[1];e.state='idle';e.pos.set(sp.x,0,sp.z);
      const ai=AI.mem(e,{t:H.simT});Object.assign(ai,{mode:'combat',sub:'cover',cover:{spot:sp,hide:'crouch',peek:{side:'over',x:sp.x,z:sp.z}},phase:'hide',phaseT:H.simT+999,target:'player',lkp:{x:sp._pp.x,z:sp._pp.z,t:H.simT},visT:H.simT,stance:'crouch',glanceT:H.simT+999,retreated:true});
      /* a second one standing in the open beside him, for comparison */
      e2.state='idle';const s2=nav.nearestWalkable(sp.x+(sp.x-sp._pp.x)*.0+2.2,sp.z+2.2);e2.pos.set(nav.wx(s2),0,nav.wz(s2));AI.mem(e2,{t:H.simT}).mode='idle';
      P.pos.set(sp._pp.x,0,sp._pp.z);P.crouch=false;for(const a of H.allies)a.down=true,a.downT=999;H.step(20);__bot.aimAt(new THREE.Vector3(sp.x,.9,sp.z));H.step(1);__bot.aimAt(new THREE.Vector3(sp.x,.9,sp.z));H.step(1);for(const a of H.allies)a.dude.root.visible=false;
      const dx=sp.x-sp._pp.x,dz=sp.z-sp._pp.z,l=Math.hypot(dx,dz);window.__side={from:[sp.x-dz/l*4.2+dx/l*1.2,1.7,sp.z+dx/l*4.2+dz/l*1.2],at:[sp.x-dx/l*.6,.6,sp.z-dz/l*.6]}});
    await shot('m0-hoodie-crouched-behind-crate-dad-view');await shot('m0-hoodie-crouched-behind-crate-side-view',await p.evaluate(()=>window.__side))}
  /* ---------- a passive dad (doesn't shoot, can't die) in the compound yard: squads, tokens, flankers across rooms ---------- */
  {const r=await p.evaluate(()=>{const H=__ht,P=H.P,AI=H.AI;H.startMission(3);__probe.reset(3);const L=H.L,nav=L.nav;
      /* stand in the yard in front of the house, where the yard guards and the front rooms both have a view */
      const door=nav.doors.filter(d=>d.cells.length<=4&&d.rooms.some(i=>!nav.rooms[i].indoor)).sort((a,b)=>Math.hypot(a.x-L.start.x,a.z-L.start.z)-Math.hypot(b.x-L.start.x,b.z-L.start.z))[0];
      P.pos.set(door.x,0,door.z-7);const flankT=[];let tokPeak=0,tokOver=0,maxSq={};
      for(let i=0;i<30*45;i++){P.hp=100;P.crouch=(i/60|0)%2===1;P.yaw=Math.atan2(-(door.x-P.pos.x),-(door.z-P.pos.z));H.step(1);__probe.tick();
        if(H.M.pool){tokPeak=Math.max(tokPeak,H.M.pool.holders.size);if(H.M.pool.holders.size>H.M.pool.max)tokOver++}
        for(const s of H.M.squads.values()){const k=s.name;maxSq[k]=Math.max(maxSq[k]||0,s.tokens.size)}}
      const R=__probe.R;return{flanks:R.flanks,tokPeak,poolMax:H.M.pool.max,tokOver,perSquadPeak:maxSq,squadMax:H.M.aiDiff.maxShooters,shots:R.eShots,noToken:R.noToken,maxConc:R.maxConc,
        modes:H.enemies.filter(e=>e.state==='idle').map(e=>e.ai.mode+'/'+e.ai.sub).join(' '),dmgSoaked:Math.round(R.dmg)}});
    log(`\n== passive dad in the compound yard for 45 s (god mode, not shooting): ${JSON.stringify(r)}`);evidence.passive=r}
  /* ---------- surrender / zip-tie / trust rules ---------- */
  {const r=await p.evaluate(()=>{const H=__ht,P=H.P;H.startMission(0);__probe.reset(0);Object.assign(__bot.st,{path:null,log:[],shots:0,noHitT:0});H.prog.trust=50;const out={};
      let s=null;for(let i=0;i<9000&&!s&&H.M.state==='go';i++){__bot.tick(1/30);H.step(1);s=H.enemies.find(e=>e.state==='surrender')}
      if(!s)return{err:'nobody surrendered'};out.surrenderAt=+H.simT.toFixed(1);out.squadMorale=+s.squad.morale.toFixed(2);out.chanceNow=+H.AI.surrenderChance(s,.5).toFixed(2);
      /* he's no target for the AI any more and his squad counted it */
      H.step(2);out.inSquadAlive=s.squad.alive().includes(s);out.squadSurrendered=s.squad.stats.surrendered;
      /* shoot him after the grace period: an execution costs trust */
      H.keys.w=false;H.mouse=false;H.step(Math.ceil(.8*30));const t0=H.prog.trust,ss0=H.prog.shotSurr;
      for(let i=0;i<90&&s.state==='surrender';i++){const b=__bot.meshBox(s);const c=b.getCenter(new THREE.Vector3());__bot.aimAt(c);H.mouse=true;H.step(1)}
      out.executed=s.state==='dead';out.trustDelta=+(H.prog.trust-t0).toFixed(1);out.shotSurrDelta=H.prog.shotSurr-ss0;
      /* next one who gives up gets zip-tied: trust goes up */
      let s2=null;for(let i=0;i<9000&&!s2&&H.M.state==='go';i++){__bot.tick(1/30);H.step(1);s2=H.enemies.find(e=>e.state==='surrender')}
      if(s2){H.mouse=false;const t1=H.prog.trust;for(let i=0;i<600&&s2.state==='surrender';i++){H.keys.e=false;H.use=false;if(Math.hypot(s2.pos.x-P.pos.x,s2.pos.z-P.pos.z)<1.8){H.keys.w=false;H.use=true}else __bot.go(s2.pos.x,s2.pos.z,1/30);H.step(1)}out.cuffed=s2.state==='cuffed';out.cuffTrustDelta=+(H.prog.trust-t1).toFixed(1)}
      return out});
    log(`\n== surrender rules (mission 0): ${JSON.stringify(r)}`);evidence.surrender=r}
  log(`\nconsole errors: ${errs.length}${errs.length?' '+JSON.stringify(errs.slice(0,8)):''}`);evidence.consoleErrors=errs;
  fs.writeFileSync(path.join(OUT,'evidence.json'),JSON.stringify(evidence,null,1));fs.writeFileSync(path.join(OUT,'evidence.txt'),lines.join('\n')+'\n');
  await b.close()})();
